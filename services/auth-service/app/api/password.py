from fastapi import APIRouter

router = APIRouter()


@router.post("/reset-password")
async def reset_password():
    """Reset password endpoint - placeholder"""
    return {"message": "Reset password endpoint - to be implemented"}

