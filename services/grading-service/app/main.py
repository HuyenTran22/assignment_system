from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db import init_db

app = FastAPI(
    title="Grading Service",
    description="Microservice for grading service",
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
    return {"status": "healthy", "service": "grading-service"}

# Import routers
from app.api import grades
from app.api import rubrics
app.include_router(grades.router, prefix="/grades", tags=["GRADES"])
app.include_router(rubrics.router, prefix="/rubrics", tags=["RUBRICS"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8006, reload=True)
