"""
Service client for inter-service communication
"""
import httpx
from typing import Optional, Dict, Any, List
import asyncio


class ServiceClient:
    """HTTP client for calling other microservices."""
    
    def __init__(self, service_url: str, timeout: float = 30.0):
        self.service_url = service_url.rstrip('/')
        self.timeout = timeout
        self._client: Optional[httpx.AsyncClient] = None
    
    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client."""
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=self.timeout)
        return self._client
    
    async def close(self):
        """Close the HTTP client."""
        if self._client:
            await self._client.aclose()
            self._client = None
    
    async def get(self, path: str, headers: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        """GET request to service."""
        client = await self._get_client()
        url = f"{self.service_url}{path}"
        response = await client.get(url, headers=headers or {})
        response.raise_for_status()
        return response.json()
    
    async def post(self, path: str, data: Dict[str, Any], headers: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        """POST request to service."""
        client = await self._get_client()
        url = f"{self.service_url}{path}"
        response = await client.post(url, json=data, headers=headers or {})
        response.raise_for_status()
        return response.json()
    
    async def put(self, path: str, data: Dict[str, Any], headers: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        """PUT request to service."""
        client = await self._get_client()
        url = f"{self.service_url}{path}"
        response = await client.put(url, json=data, headers=headers or {})
        response.raise_for_status()
        return response.json()
    
    async def delete(self, path: str, headers: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        """DELETE request to service."""
        client = await self._get_client()
        url = f"{self.service_url}{path}"
        response = await client.delete(url, headers=headers or {})
        response.raise_for_status()
        return response.json() if response.content else {}


# Helper function for synchronous calls (for use in FastAPI dependencies)
def get_service_client(service_url: str) -> ServiceClient:
    """Get a service client instance."""
    return ServiceClient(service_url)

