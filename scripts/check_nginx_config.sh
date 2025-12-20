#!/bin/bash

# Script to check Nginx Proxy Manager configuration
# Usage: ./scripts/check_nginx_config.sh

set -e

echo "=== Checking Nginx Proxy Manager Configuration ==="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker is running${NC}"

# Check if network 'web' exists
if docker network ls | grep -q " web "; then
    echo -e "${GREEN}✅ Network 'web' exists${NC}"
else
    echo -e "${YELLOW}⚠️  Network 'web' does not exist${NC}"
    echo "   Creating network 'web'..."
    docker network create web
    echo -e "${GREEN}✅ Network 'web' created${NC}"
fi

# Check if api_gateway container exists and is running
if docker ps | grep -q "api_gateway"; then
    echo -e "${GREEN}✅ api_gateway container is running${NC}"
    
    # Check if api_gateway is in network 'web'
    if docker network inspect web 2>/dev/null | grep -q "api_gateway"; then
        echo -e "${GREEN}✅ api_gateway is in network 'web'${NC}"
    else
        echo -e "${YELLOW}⚠️  api_gateway is NOT in network 'web'${NC}"
        echo "   Please add it to the network in docker-compose.yml and restart"
    fi
else
    echo -e "${RED}❌ api_gateway container is not running${NC}"
    echo "   Please start it with: docker-compose up -d api-gateway"
fi

# Check if frontend container exists and is running
if docker ps | grep -q "frontend"; then
    echo -e "${GREEN}✅ frontend container is running${NC}"
    
    # Check if frontend is in network 'web'
    if docker network inspect web 2>/dev/null | grep -q "frontend"; then
        echo -e "${GREEN}✅ frontend is in network 'web'${NC}"
    else
        echo -e "${YELLOW}⚠️  frontend is NOT in network 'web'${NC}"
        echo "   Please add it to the network in docker-compose.yml and restart"
    fi
else
    echo -e "${RED}❌ frontend container is not running${NC}"
    echo "   Please start it with: docker-compose up -d frontend"
fi

# Test API Gateway health endpoint (from within network)
echo ""
echo "=== Testing API Gateway ==="
if docker run --rm --network web curlimages/curl:latest curl -s -f http://api_gateway:8000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ API Gateway health check passed${NC}"
    docker run --rm --network web curlimages/curl:latest curl -s http://api_gateway:8000/health | jq . 2>/dev/null || docker run --rm --network web curlimages/curl:latest curl -s http://api_gateway:8000/health
else
    echo -e "${RED}❌ API Gateway health check failed${NC}"
    echo "   API Gateway may not be accessible from network 'web'"
fi

# Check docker-compose.yml configuration
echo ""
echo "=== Checking docker-compose.yml ==="
if grep -q "CORS_ORIGINS.*projectm.io.vn" docker-compose.yml; then
    echo -e "${GREEN}✅ CORS_ORIGINS includes projectm.io.vn${NC}"
else
    echo -e "${YELLOW}⚠️  CORS_ORIGINS may not include projectm.io.vn${NC}"
fi

if grep -q "VITE_API_BASE_URL.*api.projectm.io.vn" docker-compose.yml; then
    echo -e "${GREEN}✅ VITE_API_BASE_URL is set to api.projectm.io.vn${NC}"
else
    echo -e "${YELLOW}⚠️  VITE_API_BASE_URL may not be set correctly${NC}"
fi

# Check if both api-gateway and frontend have network 'web'
if grep -A 5 "api-gateway:" docker-compose.yml | grep -q "web:"; then
    echo -e "${GREEN}✅ api-gateway has network 'web' in docker-compose.yml${NC}"
else
    echo -e "${YELLOW}⚠️  api-gateway may not have network 'web' in docker-compose.yml${NC}"
fi

if grep -A 5 "frontend:" docker-compose.yml | grep -q "web:"; then
    echo -e "${GREEN}✅ frontend has network 'web' in docker-compose.yml${NC}"
else
    echo -e "${YELLOW}⚠️  frontend may not have network 'web' in docker-compose.yml${NC}"
fi

echo ""
echo "=== Summary ==="
echo "Please check the following in Nginx Proxy Manager:"
echo "1. Proxy host 'api.projectm.io.vn':"
echo "   - Forward Hostname: api_gateway"
echo "   - Forward Port: 8000"
echo "   - Forward Path: (empty)"
echo "   - WebSocket Support: Enabled"
echo "   - Advanced tab: Custom headers configured"
echo ""
echo "2. Proxy host 'projectm.io.vn':"
echo "   - Forward Hostname: frontend"
echo "   - Forward Port: 80"
echo "   - Forward Path: (empty)"
echo "   - SSL: Let's Encrypt"
echo ""
echo "For detailed configuration, see: NGINX_PROXY_MANAGER_CONFIG.md"
echo "For quick fix guide, see: FIX_API_ERROR_NGINX.md"

