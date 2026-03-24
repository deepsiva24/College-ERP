from fastapi import APIRouter, HTTPException, status
from sqlalchemy.orm import Session
import models, schemas
from database import get_tenant_db_ctx
from auth import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=schemas.User)
def create_user(user: schemas.UserCreate):
    with get_tenant_db_ctx(user.client_id) as db:
        db_user = db.query(models.User).filter(models.User.email == user.email).first()
        if db_user:
            raise HTTPException(status_code=400, detail="Email already registered")
        hashed = hash_password(user.password)
        db_user = models.User(email=user.email, hashed_password=hashed, role=user.role)
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user


@router.post("/login")
def login_user(credentials: schemas.UserLogin):
    with get_tenant_db_ctx(credentials.client_id) as db:
        db_user = db.query(models.User).filter(models.User.email == credentials.email).first()
        if not db_user or not verify_password(credentials.password, db_user.hashed_password):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

        token = create_access_token(data={
            "user_id": db_user.id,
            "email": db_user.email,
            "role": db_user.role.value if hasattr(db_user.role, 'value') else db_user.role,
            "client_id": credentials.client_id
        })

        profile = db.query(models.Profile).filter(models.Profile.user_id == db_user.id).first()
        
        return {
            "access_token": token,
            "token_type": "bearer",
            "id": db_user.id,
            "email": db_user.email,
            "role": db_user.role.value if hasattr(db_user.role, 'value') else db_user.role,
            "client_id": credentials.client_id,
            "first_name": profile.first_name if profile else "",
            "last_name": profile.last_name if profile else "",
            "class_name": profile.class_name if profile else "",
        }
