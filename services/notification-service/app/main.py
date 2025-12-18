from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db import init_db

app = FastAPI(
    title="Notification Service",
    description="Microservice for notification service",
    version="1.0.0"
)

@app.on_event("startup")
async def startup_event():
    """Initialize database on startup."""
    init_db()


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "notification-service"}

# Import routers
from app.api import notifications
app.include_router(notifications.router, prefix="/notifications", tags=["NOTIFICATIONS"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8009, reload=True)
