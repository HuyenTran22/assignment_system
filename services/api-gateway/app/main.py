"""
API Gateway - Routes requests to appropriate microservices
"""
from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
import httpx
from typing import Optional
import os
import json

app = FastAPI(
    title="Assignment Management System - API Gateway",
    description="Routes requests to microservices",
    version="1.0.0",
    redirect_slashes=False  # Disable automatic trailing slash redirects
)

# CORS
# Read comma-separated origins from environment (e.g. "https://projectm.io.vn,https://www.projectm.io.vn")
cors_origins_env = os.getenv("CORS_ORIGINS", "")
cors_origins = [origin.strip() for origin in cors_origins_env.split(",") if origin.strip()]

# Sensible fallback for local development if env is not set
if not cors_origins:
    cors_origins = ["http://localhost:3000", "http://localhost:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Service URLs
SERVICES = {
    "auth": os.getenv("AUTH_SERVICE_URL", "http://localhost:8001"),
    "user": os.getenv("USER_SERVICE_URL", "http://localhost:8002"),
    "course": os.getenv("COURSE_SERVICE_URL", "http://localhost:8003"),
    "assignment": os.getenv("ASSIGNMENT_SERVICE_URL", "http://localhost:8004"),
    "submission": os.getenv("SUBMISSION_SERVICE_URL", "http://localhost:8005"),
    "grading": os.getenv("GRADING_SERVICE_URL", "http://localhost:8006"),
    "peer-review": os.getenv("PEER_REVIEW_SERVICE_URL", "http://localhost:8007"),
    "plagiarism": os.getenv("PLAGIARISM_SERVICE_URL", "http://localhost:8008"),
    "notification": os.getenv("NOTIFICATION_SERVICE_URL", "http://localhost:8009"),
}


async def forward_request(service: str, path: str, request: Request):
    """Forward request to appropriate service."""
    service_url = SERVICES.get(service)
    if not service_url:
        raise HTTPException(status_code=404, detail=f"Service {service} not found")
    
    url = f"{service_url}{path}"
    print(f"[Gateway] Forwarding {request.method} {path} to {service} at {url}")
    
    # Get request body
    body = await request.body()
    
    # Forward headers (except host and content-length)
    # FastAPI/Starlette headers are case-insensitive, but we need to preserve them correctly
    headers = {}
    for key, value in request.headers.items():
        # Skip headers that shouldn't be forwarded
        if key.lower() in ["host", "content-length"]:
            continue
        # Preserve original header name (important for Authorization)
        headers[key] = value
    
    # Debug: Log all headers (for debugging)
    auth_header = None
    for key, value in request.headers.items():
        if key.lower() == "authorization":
            auth_header = value
            break
    
    if auth_header:
        headers["Authorization"] = auth_header
        print(f"[Gateway] Forwarding request to {service} with Authorization header: {auth_header[:20]}...")
    else:
        print(f"[Gateway] WARNING: No Authorization header in request to {service}")
        print(f"[Gateway] Available headers: {list(request.headers.keys())}")
    
    async with httpx.AsyncClient(follow_redirects=False) as client:
        try:
            response = await client.request(
                method=request.method,
                url=url,
                headers=headers,
                content=body,
                params=request.query_params,
                timeout=30.0
            )
            
            print(f"[Gateway] Response from {service}: status={response.status_code}, content-type={response.headers.get('content-type', 'unknown')}")
            
            # Log error responses for debugging
            if response.status_code >= 400:
                try:
                    error_text = response.text[:500]  # First 500 chars
                    print(f"[Gateway] Error response from {service}: {error_text}")
                except:
                    print(f"[Gateway] Error response from {service}: (could not read response text)")
            
            # Special handling for 204 No Content responses
            # Many services correctly return 204 with an empty body, but may still send
            # "application/json" as content-type. Calling response.json() on an empty
            # body would raise a JSON parse error, which previously caused the gateway
            # to return 502 to the frontend.
            if response.status_code == 204:
                print(f"[Gateway] Handling 204 No Content response from {service}")
                # Build minimal headers for 204
                response_headers = {}
                # Do NOT set content-type for empty responses to avoid parsing issues
                response_headers["Access-Control-Allow-Origin"] = "*"
                response_headers["Access-Control-Allow-Methods"] = "*"
                response_headers["Access-Control-Allow-Headers"] = "*"
                response_headers["Access-Control-Allow-Credentials"] = "true"
                
                # Return an empty 204 response directly
                return Response(
                    content=b"",
                    status_code=204,
                    headers=response_headers
                )
            
            # Handle redirects manually
            if response.status_code in [301, 302, 307, 308]:
                print(f"[Gateway] WARNING: Service {service} returned {response.status_code} redirect to {response.headers.get('location', 'unknown')}")
                return JSONResponse(
                    content={"detail": f"Service {service} returned redirect. This should not happen."},
                    status_code=502
                )
            # Get response content
            content_type = response.headers.get("content-type", "")
            if content_type.startswith("application/json"):
                try:
                    content = response.json()
                    content_bytes = None  # Not needed for JSONResponse
                except Exception as json_error:
                    print(f"[Gateway] Error parsing JSON: {json_error}, response text: {response.text[:200]}")
                    # Return error response
                    return JSONResponse(
                        content={"error": "Invalid JSON response from service", "detail": str(json_error)},
                        status_code=502
                    )
            else:
                # Non-JSON response (e.g., text/plain error)
                # Convert to JSON for consistency
                if response.status_code >= 400:
                    error_text = response.text
                    print(f"[Gateway] Non-JSON error response from {service}: {error_text[:500]}")
                    # Convert to JSON error response
                    return JSONResponse(
                        content={"error": f"Service {service} error", "detail": error_text},
                        status_code=response.status_code
                    )
                content = None
                content_bytes = response.content
            
            # Build response headers (explicitly exclude content-length)
            response_headers = {}
            # Only forward content-type
            if "content-type" in response.headers:
                response_headers["content-type"] = response.headers["content-type"]
            
            # SECURITY: Add Cache-Control headers to prevent caching of sensitive data
            response_headers["Cache-Control"] = "no-store, no-cache, must-revalidate, private"
            response_headers["Pragma"] = "no-cache"
            response_headers["Expires"] = "0"
            
            # Ensure CORS headers are set (override any from service)
            response_headers["Access-Control-Allow-Origin"] = "*"
            response_headers["Access-Control-Allow-Methods"] = "*"
            response_headers["Access-Control-Allow-Headers"] = "*"
            response_headers["Access-Control-Allow-Credentials"] = "true"
            
            # Use JSONResponse directly for JSON (simpler and more reliable)
            try:
                if content_type.startswith("application/json") and content is not None:
                    print(f"[Gateway] Returning JSONResponse with status {response.status_code}")
                    # Use JSONResponse directly - it handles content-length correctly
                    return JSONResponse(
                        content=content,
                        status_code=response.status_code,
                        headers=response_headers
                    )
                else:
                    print(f"[Gateway] Returning Response with status {response.status_code}, content_bytes length: {len(content_bytes) if content_bytes else 0}")
                    return Response(
                        content=content_bytes,
                        status_code=response.status_code,
                        headers=response_headers
                    )
            except Exception as response_error:
                print(f"[Gateway] Error creating Response: {response_error}")
                import traceback
                traceback.print_exc()
                # Fallback to simple JSONResponse
                return JSONResponse(
                    content={"error": "Failed to forward response", "detail": str(response_error)},
                    status_code=500,
                    headers=response_headers
                )
        except httpx.TimeoutException as e:
            print(f"[Gateway] Timeout error to {service} at {url}: {e}")
            import traceback
            traceback.print_exc()
            return JSONResponse(
                content={"error": "Service timeout", "detail": f"The service {service} did not respond in time", "service": service, "url": url},
                status_code=504
            )
        except httpx.ConnectError as e:
            print(f"[Gateway] Connection error to {service} at {url}: {e}")
            import traceback
            traceback.print_exc()
            return JSONResponse(
                content={"error": "Service unavailable", "detail": f"Cannot connect to service {service}. Service may be down or unreachable.", "service": service, "url": url},
                status_code=503
            )
        except httpx.RequestError as e:
            print(f"[Gateway] Request error to {service} at {url}: {e}")
            import traceback
            traceback.print_exc()
            return JSONResponse(
                content={"error": "Service unavailable", "detail": f"Error communicating with service {service}: {str(e)}", "service": service, "url": url},
                status_code=503
            )
        except Exception as e:
            print(f"[Gateway] Unexpected error forwarding to {service} at {url}: {e}")
            import traceback
            traceback.print_exc()
            return JSONResponse(
                content={"error": "Internal gateway error", "detail": f"Unexpected error: {str(e)}", "service": service, "url": url},
                status_code=500
            )


# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "Assignment Management System - API Gateway",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "auth": "/auth/{path}",
            "api": "/api/{service}/{path}"
        }
    }

# Health check
@app.get("/health")
async def health():
    return {"status": "healthy", "gateway": True}


# Auth routes (no auth required)
@app.api_route("/api/auth/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def auth_routes(path: str, request: Request):
    return await forward_request("auth", f"/auth/{path}", request)

# Root auth routes (for compatibility)
@app.api_route("/auth/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def auth_routes_root(path: str, request: Request):
    return await forward_request("auth", f"/auth/{path}", request)


# Password routes (no auth required for forgot/reset)
@app.api_route("/api/password", methods=["GET", "POST", "PUT", "DELETE"])
async def password_routes_root(request: Request):
    return await forward_request("user", "/password", request)

@app.api_route("/api/password/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def password_routes(path: str, request: Request):
    return await forward_request("user", f"/password/{path}", request)


# All other routes require authentication
# Root user route
@app.api_route("/api/users", methods=["GET", "POST", "PUT", "DELETE"])
async def user_routes_root(request: Request):
    return await forward_request("user", "/users", request)

# User routes with path parameter
@app.api_route("/api/users/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def user_routes(path: str, request: Request):
    forward_path = f"/users/{path}"
    return await forward_request("user", forward_path, request)


# Root course route (must be before path route)
@app.api_route("/api/courses", methods=["GET", "POST", "PUT", "DELETE"])
async def course_routes_root(request: Request):
    """Handle /api/courses (no path parameter)"""
    print(f"[Gateway] course_routes_root - query_params: {dict(request.query_params)}")
    return await forward_request("course", "/courses", request)

# Course routes with path parameter
@app.api_route("/api/courses/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def course_routes(path: str, request: Request):
    """Handle /api/courses/{path}"""
    print(f"[Gateway] course_routes - path: '{path}', query_params: {dict(request.query_params)}")
    
    # Check if this is an assignment route (courses/{id}/assignments)
    if "/assignments" in path:
        # Forward to assignment service
        # path will be like "{course_id}/assignments" or "{course_id}/assignments/{assignment_id}"
        # Assignment service router has prefix "/assignments", and endpoint is "/courses/{course_id}/assignments"
        # So full path in assignment service is: /assignments/courses/{course_id}/assignments
        forward_path = f"/assignments/courses/{path}"  # Full path: /assignments/courses/{course_id}/assignments
        print(f"[Gateway] course_routes - forwarding to assignment service: '{forward_path}'")
        return await forward_request("assignment", forward_path, request)
    
    # Otherwise forward to course service
    forward_path = f"/courses/{path}"
    print(f"[Gateway] course_routes - forward_path: '{forward_path}'")
    return await forward_request("course", forward_path, request)


# Root assignment route (must be before path route)
@app.api_route("/api/assignments", methods=["GET", "POST", "PUT", "DELETE"])
async def assignment_routes_root(request: Request):
    """Handle /api/assignments (no path parameter)"""
    print(f"[Gateway] assignment_routes_root - query_params: {dict(request.query_params)}")
    return await forward_request("assignment", "/assignments", request)


@app.api_route("/api/assignments/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def assignment_routes(path: str, request: Request):
    """Handle /api/assignments/{path}"""
    print(f"[Gateway] assignment_routes - path: '{path}', query_params: {dict(request.query_params)}")
    # Check if this is a submission route (assignments/{id}/submissions)
    if "/submissions" in path:
        # Forward to submission service
        # path will be like "{assignment_id}/submissions" or "{assignment_id}/submissions/my"
        # Submission service has router prefix "/submissions" and endpoint "/assignments/{assignment_id}/submissions/my"
        # So full path in submission service is: /submissions/assignments/{assignment_id}/submissions/my
        return await forward_request("submission", f"/submissions/assignments/{path}", request)
    # Check if this is a peer review route (assignments/{id}/peer-review/...)
    if "/peer-review" in path:
        # Forward to peer-review service with /peer-reviews prefix
        return await forward_request("peer-review", f"/peer-reviews/{path}", request)
    # Check if this is a plagiarism route (assignments/{id}/plagiarism-check or /plagiarism-report)
    if "/plagiarism-check" in path or "/plagiarism-report" in path:
        # Forward to plagiarism service
        return await forward_request("plagiarism", f"/{path}", request)
    # Otherwise forward to assignment service
    return await forward_request("assignment", f"/assignments/{path}", request)


@app.api_route("/api/submissions/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def submission_routes(path: str, request: Request):
    # Handle empty path
    if path == "":
        forward_path = "/submissions"
    else:
        forward_path = f"/submissions/{path}"
    return await forward_request("submission", forward_path, request)


@app.api_route("/api/grades/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def grading_routes(path: str, request: Request):
    # Handle empty path
    if path == "":
        forward_path = "/grades"
    else:
        forward_path = f"/grades/{path}"
    # Check if this is a submission grading route (submissions/{id}/grade)
    if path.startswith("submissions/") and "/grade" in path:
        # Forward to grading service with /grades prefix
        return await forward_request("grading", forward_path, request)
    # Check if this is a course grades route (courses/{id}/grades)
    if path.startswith("courses/") and "/grades" in path:
        # Forward to grading service
        return await forward_request("grading", forward_path, request)
    return await forward_request("grading", forward_path, request)


@app.api_route("/api/rubrics/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def rubric_routes(path: str, request: Request):
    # Handle empty path
    if path == "":
        forward_path = "/rubrics"
    else:
        forward_path = f"/rubrics/{path}"
    return await forward_request("grading", forward_path, request)


@app.api_route("/api/peer-reviews/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def peer_review_routes(path: str, request: Request):
    # Handle empty path
    if path == "":
        forward_path = "/peer-reviews"
    else:
        forward_path = f"/peer-reviews/{path}"
    # Check if this is an assignment peer review route (assignments/{id}/peer-review/...)
    if path.startswith("assignments/") and "/peer-review" in path:
        # Forward to peer-review service with /peer-reviews prefix
        return await forward_request("peer-review", forward_path, request)
    return await forward_request("peer-review", forward_path, request)


@app.api_route("/api/plagiarism/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def plagiarism_routes(path: str, request: Request):
    # Plagiarism service doesn't have /plagiarism prefix, forward directly
    if path == "":
        forward_path = "/"
    else:
        forward_path = f"/{path}"
    return await forward_request("plagiarism", forward_path, request)


# Notification routes - handle root path separately
@app.api_route("/api/notifications", methods=["GET", "POST", "PUT", "DELETE"], include_in_schema=False)
async def notification_root(request: Request):
    return await forward_request("notification", "/notifications", request)

@app.api_route("/api/notifications/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def notification_routes(path: str, request: Request):
    # Forward to notification service
    forward_path = f"/notifications/{path}"
    return await forward_request("notification", forward_path, request)


# Discussion routes (part of course service)
@app.api_route("/api/courses/{course_id}/discussions/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def discussion_routes(course_id: str, path: str, request: Request):
    return await forward_request("course", f"/courses/{course_id}/discussions/{path}", request)


@app.api_route("/api/courses/discussions/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def discussion_direct_routes(path: str, request: Request):
    return await forward_request("course", f"/courses/discussions/{path}", request)


@app.api_route("/api/admin/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def admin_routes(path: str, request: Request):
    # Handle empty path
    if path == "":
        forward_path = "/admin"
    else:
        forward_path = f"/admin/{path}"
    return await forward_request("user", forward_path, request)


# Profile routes
@app.api_route("/api/users/me/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def profile_routes(path: str, request: Request):
    return await forward_request("user", f"/users/me/{path}", request)


@app.api_route("/api/users/{user_id}/profile", methods=["GET"])
async def user_profile_route(user_id: str, request: Request):
    return await forward_request("user", f"/users/{user_id}/profile", request)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

