from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from .database import Base, engine
from .routers import materiales, reservas

BASE_DIR = Path(__file__).resolve().parent

app = FastAPI(title="Materiales - Halliburton Neuquen")

app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")
templates = Jinja2Templates(directory=BASE_DIR / "templates")

app.include_router(materiales.router)
app.include_router(reservas.router)


@app.on_event("startup")
def on_startup():
    # Crea las tablas si no existen. Para cambios de esquema mas adelante
    # conviene migrar a Alembic; por ahora alcanza para el MVP.
    Base.metadata.create_all(bind=engine)


@app.get("/")
def home(request: Request):
    return templates.TemplateResponse(request, "buscador.html")


@app.get("/salud")
def salud():
    return {"status": "ok"}
