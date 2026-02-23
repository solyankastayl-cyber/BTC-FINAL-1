#!/bin/bash
# Fractal Backend Startup Script
cd /app/backend
export FRACTAL_ONLY=1
export MINIMAL_BOOT=1
export FRACTAL_ENABLED=true
exec npx tsx src/app.fractal.ts
