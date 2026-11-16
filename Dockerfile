# IMIS - Industrial Maintenance Intelligence System
# Production Docker Container Specification
FROM python:3.12-slim

# Prevent Python from writing .pyc and enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

# Install system dependencies required for PDF parsing and C compilation if needed
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency specifications first for Docker layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application, sample technical documents, and static UI
COPY backend/ ./backend/
COPY .env.example .env

# Expose port (default 8000, overridable by hosting platform)
EXPOSE 8000

# Healthcheck to verify FastAPI is responding
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:${PORT}/health || exit 1

# Start Uvicorn ASGI server serving backend API and SCADA UI at root
CMD python -m uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT}
