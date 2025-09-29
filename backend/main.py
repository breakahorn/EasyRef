
import os
import shutil
import cv2 # Import OpenCV
from typing import List, Optional
from fastapi import FastAPI, File, UploadFile, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, func

import models
import schemas
from database import SessionLocal, engine

models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="EasyRef API",
    description="API for the EasyRef creative asset management application.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

STORAGE_PATH = "./storage"
os.makedirs(STORAGE_PATH, exist_ok=True)

app.mount("/storage", StaticFiles(directory=STORAGE_PATH), name="storage")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

IMAGE_EXTENSIONS = ('.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp')
VIDEO_EXTENSIONS = ('.mp4', '.webm', '.mov', '.avi')

# --- Helper function to get video metadata ---
def _get_video_metadata(file_path: str) -> dict:
    try:
        cap = cv2.VideoCapture(file_path)
        if not cap.isOpened():
            return {}
        
        fps = cap.get(cv2.CAP_PROP_FPS)
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = frame_count / fps if fps > 0 else 0
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        cap.release()
        
        return {"duration": duration, "width": width, "height": height}
    except Exception:
        return {}

# --- API Endpoints ---

@app.get("/")
def read_root():
    return {"message": "Welcome to the EasyRef API!"}

@app.post("/files/upload", response_model=schemas.File)
def upload_file(file: UploadFile = File(...), db: Session = Depends(get_db)):
    file_location = os.path.join(STORAGE_PATH, file.filename)
    if ".." in file.filename:
        raise HTTPException(status_code=400, detail="Invalid filename.")
    try:
        with open(file_location, "wb+") as file_object:
            shutil.copyfileobj(file.file, file_object)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not save file: {e}")
    
    db_file = models.File(name=file.filename, path=file_location)
    
    # If the file is a video, extract and save its metadata
    if file.filename.lower().endswith(VIDEO_EXTENSIONS):
        video_meta = _get_video_metadata(file_location)
        if video_meta:
            db_file.file_metadata = models.Metadata(**video_meta)

    db.add(db_file)
    db.commit()
    db.refresh(db_file)
    return db_file

@app.get("/files", response_model=List[schemas.File])
def get_files(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    files = db.query(models.File).options(joinedload(models.File.file_metadata)).offset(skip).limit(limit).all()
    return files

@app.get("/files/search/", response_model=List[schemas.File])
def search_files(
    tags: Optional[str] = None,
    min_rating: Optional[int] = None,
    is_favorite: Optional[bool] = None,
    file_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.File).options(joinedload(models.File.file_metadata))
    if tags:
        tag_list = [tag.strip() for tag in tags.split(",") if tag.strip()]
        if tag_list:
            query = query.join(models.File.tags).filter(models.Tag.name.in_(tag_list))
    if min_rating is not None and min_rating > 0:
        query = query.join(models.File.file_metadata).filter(models.Metadata.rating >= min_rating)
    if is_favorite is not None:
        if not (min_rating is not None and min_rating > 0):
             query = query.join(models.File.file_metadata)
        query = query.filter(models.Metadata.is_favorite == is_favorite)
    if file_type == "image":
        query = query.filter(or_(*[func.lower(models.File.name).endswith(ext) for ext in IMAGE_EXTENSIONS]))
    elif file_type == "video":
        query = query.filter(or_(*[func.lower(models.File.name).endswith(ext) for ext in VIDEO_EXTENSIONS]))
    return query.all()

@app.get("/files/random/", response_model=schemas.File)
def get_random_file(db: Session = Depends(get_db)):
    random_file = db.query(models.File).order_by(func.random()).first()
    if not random_file:
        raise HTTPException(status_code=404, detail="No files found in the library")
    return random_file

