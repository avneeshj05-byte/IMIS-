import os
import logging
from contextlib import asynccontextmanager

# Compatibility shim for Starlette 1.10+ / FastAPI 0.111+ APIRouter keyword args & attributes
import starlette.routing
_orig_router_init = starlette.routing.Router.__init__
def _compat_router_init(self, *args, **kwargs):
    kwargs.pop("on_startup", None)
    kwargs.pop("on_shutdown", None)
    _orig_router_init(self, *args, **kwargs)
    if not hasattr(self, "on_startup"):
        self.on_startup = []
    if not hasattr(self, "on_shutdown"):
        self.on_shutdown = []
starlette.routing.Router.__init__ = _compat_router_init

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse

from backend.app.core.config import settings
from backend.app.database.connection import init_db, SessionLocal
from backend.app.database.seed_data import seed_database
from backend.app.api.routes import (
    machines,
    documents,
    diagnostics,
    sensors,
    anomalies,
    maintenance,
    alerts,
    settings as settings_route
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("IMIS")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup & shutdown events: initialize database and seed baseline assets."""
    logger.info("Initializing IMIS Database & Assets...")
    init_db()
    db = SessionLocal()
    try:
        seed_database(db)
        logger.info("IMIS Database initialized and seeded successfully.")
    except Exception as e:
        logger.error(f"Error seeding database: {e}")
    finally:
        db.close()
    yield
    logger.info("IMIS backend shutting down.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="IMIS: Intelligent Diagnostics. Predictive Maintenance. Operational Reliability. Production-grade industrial maintenance platform combining IoT telemetry, Isolation Forest anomaly detection, and RAG document intelligence.",
    version=settings.VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API V1 Routers
app.include_router(machines.router, prefix=settings.API_V1_STR)
app.include_router(documents.router, prefix=settings.API_V1_STR)
app.include_router(diagnostics.router, prefix=settings.API_V1_STR)
app.include_router(sensors.router, prefix=settings.API_V1_STR)
app.include_router(anomalies.router, prefix=settings.API_V1_STR)
app.include_router(maintenance.router, prefix=settings.API_V1_STR)
app.include_router(alerts.router, prefix=settings.API_V1_STR)
app.include_router(settings_route.router, prefix=settings.API_V1_STR)

# Static files / Web UI directory
static_dir = os.path.join(os.path.dirname(__file__), "static")
os.makedirs(static_dir, exist_ok=True)

if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

@app.get("/health", tags=["System"])
def health_check():
    return {
        "status": "OPERATIONAL",
        "system": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "tagline": settings.PROJECT_TAGLINE
    }

@app.get("/", response_class=HTMLResponse, include_in_schema=False)
def serve_spa():
    """Serves the IMIS Industrial Operations Dashboard UI."""
    index_file = os.path.join(static_dir, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return HTMLResponse("""
    <!DOCTYPE html>
    <html>
      <head><title>IMIS - Industrial Maintenance Intelligence System</title></head>
      <body style="font-family: sans-serif; padding: 2rem; background: #F3F4F2; color: #202A25;">
        <h2>IMIS Backend Operational</h2>
        <p>Intelligent Diagnostics. Predictive Maintenance. Operational Reliability.</p>
        <p><a href="/docs" style="color: #315C49; font-weight: bold;">View Interactive Swagger API Documentation &rarr;</a></p>
      </body>
    </html>
    """)
