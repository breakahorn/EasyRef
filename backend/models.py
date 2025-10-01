
import datetime
from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    Text,
    Boolean,
    ForeignKey,
    Table,
    Float,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base

# Association table for the many-to-many relationship between files and tags
file_tags = Table(
    "file_tags",
    Base.metadata,
    Column("file_id", Integer, ForeignKey("files.id"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("tags.id"), primary_key=True),
)

class File(Base):
    __tablename__ = "files"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    path = Column(String, unique=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    tags = relationship("Tag", secondary=file_tags, back_populates="files")
    file_metadata = relationship("Metadata", uselist=False, back_populates="file", cascade="all, delete-orphan")

class Tag(Base):
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)

    files = relationship("File", secondary=file_tags, back_populates="tags")

class Metadata(Base):
    __tablename__ = "metadata"

    id = Column(Integer, primary_key=True, index=True)
    file_id = Column(Integer, ForeignKey("files.id"), unique=True, nullable=False)
    
    rating = Column(Integer)
    notes = Column(Text)
    source_url = Column(String)
    is_favorite = Column(Boolean, default=False)

    duration = Column(Float, nullable=True)
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)

    file = relationship("File", back_populates="file_metadata")

class Board(Base):
    __tablename__ = "boards"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    items = relationship("BoardItem", back_populates="board", cascade="all, delete-orphan")

class BoardItem(Base):
    __tablename__ = "board_items"

    id = Column(Integer, primary_key=True, index=True)
    board_id = Column(Integer, ForeignKey("boards.id"))
    file_id = Column(Integer, ForeignKey("files.id"))

    pos_x = Column(Float, default=0)
    pos_y = Column(Float, default=0)
    width = Column(Float, default=200)
    height = Column(Float, default=200)
    rotation = Column(Float, default=0)
    z_index = Column(Integer, default=0)

    # Store original dimensions for reset functionality
    original_width = Column(Float, nullable=True)
    original_height = Column(Float, nullable=True)

    board = relationship("Board", back_populates="items")
    file = relationship("File")
