
import os
import shutil
import cv2
from typing import List, Optional
from fastapi import FastAPI, File, UploadFile, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
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

# --- Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Constants and Setup ---
STORAGE_PATH = "./storage"
os.makedirs(STORAGE_PATH, exist_ok=True)

IMAGE_EXTENSIONS = ('.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp')
VIDEO_EXTENSIONS = ('.mp4', '.webm', '.mov', '.avi')

# --- Dependencies ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Helper Functions ---
def _get_video_metadata(file_path: str) -> dict:
    try:
        cap = cv2.VideoCapture(file_path)
        if not cap.isOpened(): return {}
        fps = cap.get(cv2.CAP_PROP_FPS)
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = frame_count / fps if fps > 0 else 0
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        cap.release()
        return {"duration": duration, "width": width, "height": height}
    except Exception: return {}

# --- Core API Endpoints ---

@app.get("/")
def read_root():
    return {"message": "Welcome to the EasyRef API!"}

# Custom endpoint to serve files with CORS headers
@app.get("/storage/{filename}")
async def get_storage_file(filename: str):
    file_path = os.path.join(STORAGE_PATH, filename)
    if not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path, headers={"Access-Control-Allow-Origin": "*"})

@app.post("/files/upload", response_model=List[schemas.File])
def upload_files(files: List[UploadFile] = File(...), db: Session = Depends(get_db)):
    created_files = []
    for file in files:
        file_location = os.path.join(STORAGE_PATH, file.filename)
        if ".." in file.filename: 
            # Skip this file or raise an exception for the whole batch
            print(f"Skipping invalid filename: {file.filename}")
            continue

        try:
            with open(file_location, "wb+") as file_object:
                shutil.copyfileobj(file.file, file_object)
        except Exception as e:
            # Decide how to handle partial failures
            print(f"Could not save file {file.filename}: {e}")
            continue
        
        db_file = models.File(name=file.filename, path=file_location)
        if file.filename.lower().endswith(VIDEO_EXTENSIONS):
            video_meta = _get_video_metadata(file_location)
            if video_meta:
                db_file.file_metadata = models.Metadata(**video_meta)

        db.add(db_file)
        db.commit()
        db.refresh(db_file)
        created_files.append(db_file)
        
    return created_files

@app.get("/files", response_model=List[schemas.File])
def get_files(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    files = db.query(models.File).options(joinedload(models.File.file_metadata)).offset(skip).limit(limit).all()
    return files

@app.get("/files/search/", response_model=List[schemas.File])
def search_files(
    tags: Optional[str] = None,
    tag_search_mode: Optional[str] = 'or',
    min_rating: Optional[int] = None,
    is_favorite: Optional[bool] = None,
    file_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.File).options(joinedload(models.File.file_metadata), joinedload(models.File.tags))
    
    if tags:
        tag_list = [tag.strip() for tag in tags.split(",") if tag.strip()]
        if tag_list:
            if tag_search_mode == 'and':
                # For AND search, find files that have all the specified tags.
                query = query.join(models.File.tags).filter(models.Tag.name.in_(tag_list))
                query = query.group_by(models.File.id).having(func.count(models.Tag.id) == len(tag_list))
            else: # Default to OR search
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

@app.put("/files/{file_id}/metadata", response_model=schemas.Metadata)
def update_file_metadata(file_id: int, metadata: schemas.MetadataUpdate, db: Session = Depends(get_db)):
    db_file = db.query(models.File).filter(models.File.id == file_id).first()
    if db_file is None: raise HTTPException(status_code=404, detail="File not found")
    if db_file.file_metadata:
        update_data = metadata.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_file.file_metadata, key, value)
    else:
        db_file.file_metadata = models.Metadata(**metadata.model_dump(), file_id=file_id)
    db.commit()
    db.refresh(db_file.file_metadata)
    return db_file.file_metadata

@app.get("/files/random/", response_model=schemas.File)
def get_random_file(db: Session = Depends(get_db)):
    random_file = db.query(models.File).order_by(func.random()).first()
    if not random_file: raise HTTPException(status_code=404, detail="No files found in the library")
    return random_file

@app.post("/files/{file_id}/tags", response_model=schemas.File)
def add_tag_to_file(file_id: int, tag: schemas.TagCreate, db: Session = Depends(get_db)):
    db_file = db.query(models.File).options(joinedload(models.File.tags), joinedload(models.File.file_metadata)).filter(models.File.id == file_id).first()
    if db_file is None:
        raise HTTPException(status_code=404, detail="File not found")

    # Find existing tag or create a new one
    db_tag = db.query(models.Tag).filter(func.lower(models.Tag.name) == tag.name.lower()).first()
    if not db_tag:
        db_tag = models.Tag(name=tag.name)
        db.add(db_tag)
        db.commit()
        db.refresh(db_tag)

    if db_tag not in db_file.tags:
        db_file.tags.append(db_tag)
        db.commit()
        db.refresh(db_file)

    return db_file

@app.get("/tags", response_model=List[schemas.Tag])
def get_tags(db: Session = Depends(get_db)):
    return db.query(models.Tag).order_by(models.Tag.name).all()

@app.delete("/files/{file_id}/tags/{tag_id}", response_model=schemas.File)
def remove_tag_from_file(file_id: int, tag_id: int, db: Session = Depends(get_db)):
    db_file = db.query(models.File).options(joinedload(models.File.tags), joinedload(models.File.file_metadata)).filter(models.File.id == file_id).first()
    if not db_file:
        raise HTTPException(status_code=404, detail="File not found")

    tag_to_remove = db.query(models.Tag).filter(models.Tag.id == tag_id).first()
    if not tag_to_remove:
        raise HTTPException(status_code=404, detail="Tag not found")

    if tag_to_remove in db_file.tags:
        db_file.tags.remove(tag_to_remove)
        db.commit()
        db.refresh(db_file)

    return db_file


@app.delete("/files/{file_id}", status_code=204)
def delete_file(file_id: int, db: Session = Depends(get_db)):
    db_file = db.query(models.File).filter(models.File.id == file_id).first()
    if db_file is None:
        # Even if file is not found, from a DELETE perspective, the state is what we want.
        # You might want to return 404 instead, depending on strictness.
        return
    
    # Delete the actual file from storage
    if os.path.exists(db_file.path):
        try:
            os.remove(db_file.path)
        except OSError as e:
            # Log this error, but don't block DB deletion
            print(f"Error deleting file {db_file.path}: {e}")

    db.delete(db_file)
    db.commit()
    return


# --- Board Endpoints ---

@app.post("/boards", response_model=schemas.Board)
def create_board(board: schemas.BoardCreate, db: Session = Depends(get_db)):
    db_board = models.Board(**board.model_dump())
    db.add(db_board)
    db.commit()
    db.refresh(db_board)
    return db_board

@app.get("/boards", response_model=List[schemas.Board])
def get_boards(db: Session = Depends(get_db)):
    boards = db.query(models.Board).order_by(models.Board.created_at.desc()).all()
    return boards

@app.get("/boards/{board_id}", response_model=schemas.Board)
def get_board(board_id: int, db: Session = Depends(get_db)):
    db_board = db.query(models.Board).options(
        joinedload(models.Board.items).joinedload(models.BoardItem.file)
    ).filter(models.Board.id == board_id).first()
    if db_board is None:
        raise HTTPException(status_code=404, detail="Board not found")
    return db_board

@app.put("/boards/{board_id}", response_model=schemas.Board)
def update_board(board_id: int, board: schemas.BoardUpdate, db: Session = Depends(get_db)):
    db_board = db.query(models.Board).filter(models.Board.id == board_id).first()
    if db_board is None:
        raise HTTPException(status_code=404, detail="Board not found")
    update_data = board.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_board, key, value)
    db.commit()
    db.refresh(db_board)
    return db_board

@app.delete("/boards/{board_id}", status_code=204)
def delete_board(board_id: int, db: Session = Depends(get_db)):
    db_board = db.query(models.Board).filter(models.Board.id == board_id).first()
    if db_board:
        db.delete(db_board)
        db.commit()
    return

# --- BoardItem Endpoints ---

@app.post("/boards/{board_id}/items", response_model=schemas.BoardItem)
def add_item_to_board(board_id: int, item: schemas.BoardItemCreate, db: Session = Depends(get_db)):
    db_board = db.query(models.Board).filter(models.Board.id == board_id).first()
    if not db_board:
        raise HTTPException(status_code=404, detail="Board not found")
    
    db_file = db.query(models.File).filter(models.File.id == item.file_id).first()
    if not db_file:
        raise HTTPException(status_code=404, detail="File not found")

    db_item = models.BoardItem(
        **item.model_dump(), board_id=board_id
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@app.put("/items/{item_id}", response_model=schemas.BoardItem)
def update_board_item(item_id: int, item: schemas.BoardItemUpdate, db: Session = Depends(get_db)):
    db_item = db.query(models.BoardItem).filter(models.BoardItem.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    update_data = item.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_item, key, value)
    db.commit()
    db.refresh(db_item)
    return db_item

@app.delete("/items/{item_id}", status_code=204)
def delete_board_item(item_id: int, db: Session = Depends(get_db)):
    db_item = db.query(models.BoardItem).filter(models.BoardItem.id == item_id).first()
    if db_item:
        db.delete(db_item)
        db.commit()
    return
