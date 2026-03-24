from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings

# ── Import domain routers ─────────────────────────────────
from routers import auth, courses, attendance, performance, finance, students, gallery, dashboard

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, JSONResponse
from utils.encryption import decrypt_payload, encrypt_payload
import json

app = FastAPI(title="School/College ERP API", version="2.0.0")

class EncryptionMiddleware:
    """Pure ASGI middleware for AES-256 encryption/decryption of request and response bodies."""
    
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        path = scope.get("path", "")
        method = scope.get("method", "GET")
        
        # Get content-type from headers
        headers = dict(
            (k.decode("latin-1").lower(), v.decode("latin-1"))
            for k, v in scope.get("headers", [])
        )
        content_type = headers.get("content-type", "")
        
        # --- Decrypt Request Body ---
        should_decrypt = (
            method in ("POST", "PUT", "PATCH")
            and not any(p in path for p in ("/docs", "/openapi.json"))
            and "multipart/form-data" not in content_type
        )
        
        if should_decrypt:
            body = b""
            while True:
                message = await receive()
                body += message.get("body", b"")
                if not message.get("more_body", False):
                    break
            
            try:
                if body:
                    encrypted_data = body.decode("utf-8").strip('"')
                    decrypted_data = decrypt_payload(encrypted_data)
                    body = json.dumps(decrypted_data).encode("utf-8")
            except Exception as e:
                # Send a 400 error response
                response = JSONResponse(
                    status_code=400,
                    content={"detail": "Invalid encrypted payload"}
                )
                await response(scope, receive, send)
                return
            
            # Replace the receive callable with our decrypted body
            body_sent = False
            async def new_receive():
                nonlocal body_sent
                if not body_sent:
                    body_sent = True
                    return {"type": "http.request", "body": body, "more_body": False}
                return {"type": "http.request", "body": b"", "more_body": False}
            
            receive = new_receive
        
        # --- Encrypt Response Body ---
        skip_response_encryption = any(p in path for p in ("/docs", "/openapi.json"))
        
        if skip_response_encryption:
            await self.app(scope, receive, send)
            return
        
        # Capture response to encrypt it
        response_started = False
        initial_message = None
        response_body = b""
        
        async def send_wrapper(message):
            nonlocal response_started, initial_message, response_body
            
            if message["type"] == "http.response.start":
                response_started = True
                initial_message = message
            elif message["type"] == "http.response.body":
                response_body += message.get("body", b"")
                if not message.get("more_body", False):
                    # All body received — encrypt and send
                    try:
                        data = json.loads(response_body.decode("utf-8"))
                        encrypted_response = encrypt_payload(data)
                        encrypted_body = json.dumps(encrypted_response).encode("utf-8")
                        
                        # Update content-length in headers
                        raw_headers = [
                            (k, v) for k, v in initial_message.get("headers", [])
                            if k.lower() != b"content-length"
                        ]
                        raw_headers.append(
                            (b"content-length", str(len(encrypted_body)).encode("latin-1"))
                        )
                        initial_message["headers"] = raw_headers
                        
                        await send(initial_message)
                        await send({"type": "http.response.body", "body": encrypted_body})
                    except (json.JSONDecodeError, UnicodeDecodeError):
                        # Not JSON — send original body unencrypted
                        await send(initial_message)
                        await send({"type": "http.response.body", "body": response_body})
        
        await self.app(scope, receive, send_wrapper)

app.add_middleware(EncryptionMiddleware)

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
