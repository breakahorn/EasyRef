
from pydantic import BaseModel
from typing import List, Optional
import datetime

# --- Tag Schemas ---
class TagBase(BaseModel):
    name: str

class TagCreate(TagBase):
    pass

class Tag(TagBase):
    id: int

    class Config:
        from_attributes = True

# --- Metadata Schemas ---
class MetadataBase(BaseModel):
    rating: Optional[int] = None
    notes: Optional[str] = None
    source_url: Optional[str] = None
    is_favorite: Optional[bool] = False
    duration: Optional[float] = None
    width: Optional[int] = None
    height: Optional[int] = None

class MetadataCreate(MetadataBase):
    pass

class MetadataUpdate(MetadataBase):
    pass

class Metadata(MetadataBase):
    id: int
    file_id: int

    class Config:
        from_attributes = True

# --- File Schemas ---
class FileBase(BaseModel):
    name: str
    path: str

class FileCreate(FileBase):
    pass

class File(FileBase):
    id: int
    created_at: datetime.datetime
    tags: List[Tag] = []
    file_metadata: Optional[Metadata] = None
    storage_type: Optional[str] = None
    storage_key: Optional[str] = None

    class Config:
        from_attributes = True

# --- BoardItem Schemas ---
class BoardItemBase(BaseModel):
    pos_x: float
    pos_y: float
    width: float
    height: float
    rotation: float
    z_index: int = 0

class BoardItemCreate(BoardItemBase):
    file_id: int

class BoardItemUpdate(BaseModel):
    pos_x: Optional[float] = None
    pos_y: Optional[float] = None
    width: Optional[float] = None
    height: Optional[float] = None
    rotation: Optional[float] = None
    z_index: Optional[int] = None

class BoardItem(BoardItemBase):
    id: int
    board_id: int
    file: File # Include full file data

    class Config:
        from_attributes = True

# --- Board Schemas ---
class BoardBase(BaseModel):
    name: str
    description: Optional[str] = None

class BoardCreate(BoardBase):
    pass

class BoardUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class Board(BoardBase):
    id: int
    created_at: datetime.datetime
    items: List[BoardItem] = []

    class Config:
        from_attributes = True

# --- Batch Operation Schemas ---
class BatchBoardItemCreate(BaseModel):
    file_id: int
    pos_x: float
    pos_y: float
    width: float
    height: float
    rotation: float = 0
    z_index: int = 0

class BatchApplyRequest(BaseModel):
    file_ids: List[int]
    add_tags: List[str] = []
    remove_tags: List[str] = []
    toggle_favorite: bool = False
    rating: Optional[int] = None
    delete_files: bool = False
    board_id: Optional[int] = None
    board_items: Optional[List[BatchBoardItemCreate]] = None

class BatchApplyResponse(BaseModel):
    updated: int
    added_to_board: int
    deleted: int
