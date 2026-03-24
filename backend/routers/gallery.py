from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List
from sqlalchemy.orm import Session
import models, schemas
from database import get_tenant_db
from auth import require_current_user
from config import settings

router = APIRouter(tags=["Gallery"])


class ClientQuery(BaseModel):
    client_id: str = settings.DEFAULT_CLIENT_ID


@router.post("/gallery", response_model=List[schemas.GalleryItem])
def get_gallery_items(body: ClientQuery, db: Session = Depends(get_tenant_db), current_user: models.User = Depends(require_current_user)):
    return db.query(models.GalleryItem).order_by(models.GalleryItem.upload_date.desc()).all()
