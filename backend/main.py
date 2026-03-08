from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings

# ── Import domain routers ─────────────────────────────────
from routers import auth, courses, attendance, performance, finance, students, gallery, dashboard

app = FastAPI(title="School/College ERP API", version="2.0.0")

# ── CORS ──────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_origin_regex=r"https?://(.*\.localhost:\d+|.*\.acharyaboard\.co\.in|localhost:\d+)",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Register routers ─────────────────────────────────────
app.include_router(auth.router)
app.include_router(courses.router)
app.include_router(attendance.router)
app.include_router(performance.router)
app.include_router(finance.router)
app.include_router(students.router)
app.include_router(gallery.router)
app.include_router(dashboard.router)


@app.get("/")
def read_root():
    return {"message": "Welcome to the School/College ERP API v2.0"}


@app.get("/config")
def get_app_config():
    """Returns runtime configuration for the frontend (no secrets)."""
    return {"default_client_id": settings.DEFAULT_CLIENT_ID}
