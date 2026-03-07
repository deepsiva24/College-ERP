from fastapi import APIRouter, Depends
from typing import List
from sqlalchemy.orm import Session
import models, schemas
from database import get_tenant_db

router = APIRouter(tags=["Gallery"])


@router.get("/gallery", response_model=List[schemas.GalleryItem])
def get_gallery_items(db: Session = Depends(get_tenant_db)):
    return db.query(models.GalleryItem).order_by(models.GalleryItem.upload_date.desc()).all()
