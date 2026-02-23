"""
FastAPI Proxy for TypeScript Fractal Backend

This file starts the TypeScript backend in a subprocess and proxies requests.
Used because supervisor expects a uvicorn-based Python backend.
"""
import os
import sys
import subprocess
import asyncio
import signal
import httpx
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

app = FastAPI(title="Fractal Proxy")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# TypeScript backend port (internal)
TS_PORT = 8002
TS_BASE_URL = f"http://127.0.0.1:{TS_PORT}"

ts_process = None

async def start_ts_backend():
    """Start TypeScript Fractal backend"""
    global ts_process
    env = {
        **os.environ,
        'PORT': str(TS_PORT),
        'FRACTAL_ONLY': '1',
        'MINIMAL_BOOT': '1',
        'FRACTAL_ENABLED': 'true'
    }
    
    ts_process = await asyncio.create_subprocess_exec(
        'npx', 'tsx', 'src/app.fractal.ts',
        cwd='/app/backend',
        env=env,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE
    )
    print(f"[Proxy] Started TypeScript backend on port {TS_PORT}, PID: {ts_process.pid}")
    
    # Log output in background
    asyncio.create_task(log_output(ts_process.stdout, "[TS-OUT]"))
    asyncio.create_task(log_output(ts_process.stderr, "[TS-ERR]"))

async def log_output(stream, prefix):
    """Log subprocess output"""
    async for line in stream:
        print(f"{prefix} {line.decode().rstrip()}")

@app.on_event("startup")
async def startup():
    """Start TypeScript backend on app startup"""
    await start_ts_backend()
    # Wait for TS backend to start
    await asyncio.sleep(3)

@app.on_event("shutdown")
async def shutdown():
    """Cleanup on shutdown"""
    global ts_process
    if ts_process:
        ts_process.terminate()
        await ts_process.wait()

@app.api_route("/api/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])
async def proxy_api(request: Request, path: str):
    """Proxy all /api/* requests to TypeScript backend"""
    url = f"{TS_BASE_URL}/api/{path}"
    
    # Get query params
    query_params = str(request.query_params)
    if query_params:
        url = f"{url}?{query_params}"
    
    # Get request body for non-GET methods
    body = None
    if request.method in ["POST", "PUT", "PATCH"]:
        body = await request.body()
    
    # Forward headers
    headers = dict(request.headers)
    headers.pop('host', None)
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            response = await client.request(
                method=request.method,
                url=url,
                content=body,
                headers=headers
            )
            
            return Response(
                content=response.content,
                status_code=response.status_code,
                headers=dict(response.headers),
                media_type=response.headers.get('content-type')
            )
        except httpx.ConnectError:
            return JSONResponse(
                status_code=503,
                content={"error": "TypeScript backend not ready", "url": url}
            )
        except Exception as e:
            return JSONResponse(
                status_code=500,
                content={"error": str(e), "url": url}
            )

@app.get("/health")
async def health():
    """Health check"""
    return {"ok": True, "proxy": True, "ts_port": TS_PORT}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)
