from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from app.core.config import settings
from app.db import init_db

app = FastAPI(
    title="Course Service",
    description="Microservice for course service",
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
    return {"status": "healthy", "service": "course-service"}

# Import routers
from app.api import courses
from app.api import course_materials
from app.api import discussions
from app.api import quizzes
from app.api import live_classes
from app.api import certificates
from app.api import analytics
from app.api import video_call

app.include_router(courses.router, prefix="/courses", tags=["COURSES"])
app.include_router(course_materials.router, tags=["Course Materials"])
app.include_router(discussions.router, tags=["Discussions"])
app.include_router(quizzes.router, tags=["Quizzes"])
app.include_router(live_classes.router, tags=["Live Classes"])
app.include_router(certificates.router, tags=["Certificates"])
app.include_router(analytics.router, tags=["Analytics"])
app.include_router(video_call.router, prefix="/courses", tags=["Video Call"])

# Mount static files for uploads
upload_dir = Path(settings.UPLOAD_DIR)
upload_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(upload_dir)), name="uploads")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8003, reload=True)
