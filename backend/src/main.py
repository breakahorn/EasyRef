
import os
import shutil
import uuid
import cv2
from typing import List, Optional
from fastapi import FastAPI, File, UploadFile, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, func
from typing import Iterable

import models
import schemas
from database import SessionLocal, engine
from storage import get_storage_backend, LocalStorageBackend, R2StorageBackend

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
storage_backend = get_storage_backend()
STORAGE_TYPE = os.getenv("STORAGE_BACKEND", "local").lower()
# Keep STORAGE_PATH for backwards compatibility and /storage serving.
if isinstance(storage_backend, LocalStorageBackend):
    STORAGE_PATH = storage_backend.base_path
else:
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

def _normalize_tag_names(tag_names: List[str]) -> List[str]:
    return [tag.strip() for tag in tag_names if tag and tag.strip()]

def _set_file_url(file: models.File):
    if file and file.path:
        file.file_url = storage_backend.public_url(file.path)

def _set_files_url(files: Iterable[models.File]):
    for f in files:
        _set_file_url(f)

def _set_board_file_urls(board: models.Board):
    if not board:
        return
    for item in board.items:
        if item.file:
            _set_file_url(item.file)

# --- Core API Endpoints ---

@app.get("/")
def read_root():
    return {"message": "Welcome to the EasyRef API!"}

# Custom endpoint to serve files with CORS headers
@app.get("/storage/{filename}")
async def get_storage_file(filename: str):
    # For local storage, serve from disk. For remote storage we currently
    # do not proxy; clients should prefer public URLs when available.
    file_path = os.path.join(STORAGE_PATH, filename)
    if os.path.isfile(file_path):
        return FileResponse(file_path, headers={"Access-Control-Allow-Origin": "*"})
    raise HTTPException(status_code=404, detail="File not found")

@app.post("/files/upload", response_model=List[schemas.File])
def upload_files(files: List[UploadFile] = File(...), db: Session = Depends(get_db)):
    created_files = []
    for file in files:
        if ".." in file.filename: 
            # Skip this file or raise an exception for the whole batch
            print(f"Skipping invalid filename: {file.filename}")
            continue

        try:
            file_location = storage_backend.save_upload(file, filename=file.filename)
        except Exception as e:
            # Decide how to handle partial failures
            print(f"Could not save file {file.filename}: {e}")
            continue
        
        db_file = models.File(
            name=file.filename,
            path=file_location,
            storage_type=STORAGE_TYPE,
            storage_key=os.path.basename(file_location),
        )
        if file.filename.lower().endswith(VIDEO_EXTENSIONS):
            video_meta = _get_video_metadata(file_location)
            if video_meta:
                db_file.file_metadata = models.Metadata(**video_meta)

        db.add(db_file)
        db.commit()
        db.refresh(db_file)
        _set_file_url(db_file)
        created_files.append(db_file)
        
    return created_files

@app.get("/files", response_model=List[schemas.File])
def get_files(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    files = db.query(models.File).options(joinedload(models.File.file_metadata)).offset(skip).limit(limit).all()
    _set_files_url(files)
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
    results = query.all()
    _set_files_url(results)
    return results

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

@app.post("/files/batch-apply", response_model=schemas.BatchApplyResponse)
def batch_apply(payload: schemas.BatchApplyRequest, db: Session = Depends(get_db)):
    if not payload.file_ids:
        raise HTTPException(status_code=400, detail="No file ids provided")

    file_ids = list(dict.fromkeys(payload.file_ids))
    files = db.query(models.File).options(
        joinedload(models.File.tags),
        joinedload(models.File.file_metadata)
    ).filter(models.File.id.in_(file_ids)).all()

    if len(files) != len(file_ids):
        missing = set(file_ids) - {f.id for f in files}
        raise HTTPException(status_code=404, detail=f"Files not found: {sorted(missing)}")

    board = None
    if payload.board_id is not None:
        if payload.delete_files:
            raise HTTPException(status_code=400, detail="Cannot add to board while deleting files")
        board = db.query(models.Board).filter(models.Board.id == payload.board_id).first()
        if not board:
            raise HTTPException(status_code=404, detail="Board not found")
        if not payload.board_items:
            raise HTTPException(status_code=400, detail="board_items is required when board_id is provided")
        item_file_ids = {item.file_id for item in payload.board_items}
        if not item_file_ids.issubset(set(file_ids)):
            raise HTTPException(status_code=400, detail="board_items must reference selected file ids")

    add_tag_names = _normalize_tag_names(payload.add_tags)
    remove_tag_names = _normalize_tag_names(payload.remove_tags)
    add_tag_map = {}
    remove_tag_ids = set()

    if add_tag_names or remove_tag_names:
        tag_names_lower = {name.lower() for name in add_tag_names + remove_tag_names}
        existing_tags = db.query(models.Tag).filter(func.lower(models.Tag.name).in_(tag_names_lower)).all()
        tag_by_lower = {tag.name.lower(): tag for tag in existing_tags}

        for name in add_tag_names:
            tag = tag_by_lower.get(name.lower())
            if not tag:
                tag = models.Tag(name=name)
                db.add(tag)
                db.flush()
                tag_by_lower[name.lower()] = tag
            add_tag_map[tag.id] = tag

        for name in remove_tag_names:
            tag = tag_by_lower.get(name.lower())
            if tag:
                remove_tag_ids.add(tag.id)

    moved_files = []
    updated_count = 0
    added_to_board = 0
    deleted_count = 0
    trash_dir = os.path.join(STORAGE_PATH, ".trash")

    try:
        for db_file in files:
            changed = False

            if add_tag_map:
                for tag in add_tag_map.values():
                    if tag not in db_file.tags:
                        db_file.tags.append(tag)
                        changed = True

            if remove_tag_ids:
                original_len = len(db_file.tags)
                db_file.tags = [tag for tag in db_file.tags if tag.id not in remove_tag_ids]
                if len(db_file.tags) != original_len:
                    changed = True

            if payload.toggle_favorite or payload.rating is not None:
                if not db_file.file_metadata:
                    db_file.file_metadata = models.Metadata(file_id=db_file.id)
                if payload.toggle_favorite:
                    db_file.file_metadata.is_favorite = not bool(db_file.file_metadata.is_favorite)
                if payload.rating is not None:
                    db_file.file_metadata.rating = payload.rating
                changed = True

            if changed:
                updated_count += 1

        if board and payload.board_items:
            for item in payload.board_items:
                db_item = models.BoardItem(
                    board_id=board.id,
                    file_id=item.file_id,
                    pos_x=item.pos_x,
                    pos_y=item.pos_y,
                    width=item.width,
                    height=item.height,
                    rotation=item.rotation,
                    z_index=item.z_index,
                    original_width=item.width,
                    original_height=item.height,
                )
                db.add(db_item)
                added_to_board += 1

        if payload.delete_files:
            os.makedirs(trash_dir, exist_ok=True)
            for db_file in files:
                if not os.path.exists(db_file.path):
                    raise HTTPException(status_code=400, detail=f"Missing file on disk: {db_file.path}")
                trash_name = f"{uuid.uuid4()}_{os.path.basename(db_file.path)}"
                trash_path = os.path.join(trash_dir, trash_name)
                shutil.move(db_file.path, trash_path)
                moved_files.append((db_file.path, trash_path))

            for db_file in files:
                db.delete(db_file)
            deleted_count = len(files)

        db.commit()

    except HTTPException:
        db.rollback()
        for original_path, trash_path in moved_files:
            if os.path.exists(trash_path):
                shutil.move(trash_path, original_path)
        raise
    except Exception as e:
        db.rollback()
        for original_path, trash_path in moved_files:
            if os.path.exists(trash_path):
                shutil.move(trash_path, original_path)
        raise HTTPException(status_code=500, detail=f"Batch operation failed: {e}")

    for _, trash_path in moved_files:
        if os.path.exists(trash_path):
            try:
                os.remove(trash_path)
            except OSError:
                pass

    return schemas.BatchApplyResponse(
        updated=updated_count,
        added_to_board=added_to_board,
        deleted=deleted_count
    )

@app.get("/files/random/", response_model=schemas.File)
def get_random_file(db: Session = Depends(get_db)):
    random_file = db.query(models.File).order_by(func.random()).first()
    if not random_file: raise HTTPException(status_code=404, detail="No files found in the library")
    _set_file_url(random_file)
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
    _set_file_url(db_file)

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
    _set_file_url(db_file)

    return db_file


@app.delete("/files/{file_id}", status_code=204)
def delete_file(file_id: int, db: Session = Depends(get_db)):
    db_file = db.query(models.File).filter(models.File.id == file_id).first()
    if db_file is None:
        # Even if file is not found, from a DELETE perspective, the state is what we want.
        # You might want to return 404 instead, depending on strictness.
        return
    
    # Delete the actual file from storage
    storage_backend.delete(db_file.path)

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
    _set_board_file_urls(db_board)
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

    # Set original dimensions on creation
    item_data = item.model_dump()
    item_data['original_width'] = item.width
    item_data['original_height'] = item.height

    db_item = models.BoardItem(
        **item_data, board_id=board_id
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

@app.put("/items/{item_id}/reset", response_model=schemas.BoardItem)
def reset_board_item(item_id: int, db: Session = Depends(get_db)):
    db_item = db.query(models.BoardItem).filter(models.BoardItem.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")

    # Reset properties
    db_item.rotation = 0
    # You might want to reset position as well, for now we reset size and rotation
    if db_item.original_width and db_item.original_height:
        db_item.width = db_item.original_width
        db_item.height = db_item.original_height

    db.commit()
    db.refresh(db_item)
    return db_item
