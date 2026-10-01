from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from sqlalchemy import text

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
    _autopatch_columns()


def _autopatch_columns():
    """create_all no agrega columnas nuevas a una tabla que ya existe
    (como la que ya esta corriendo en Render). Esto agrega, de forma
    segura, las columnas que se van sumando con el tiempo."""
    columnas_nuevas = [
        ("materiales", "redeployment_stock", "NUMERIC"),
    ]
    for tabla, columna, tipo in columnas_nuevas:
        # Una transaccion por columna: si Postgres rechaza el ALTER porque
        # la columna ya existe, deja esa transaccion abortada: no se puede
        # seguir usandola para las siguientes columnas.
        try:
            with engine.begin() as conn:
                conn.execute(text(f"ALTER TABLE {tabla} ADD COLUMN {columna} {tipo}"))
        except Exception:
            pass  # ya existia - no pasa nada


@app.get("/")
def home(request: Request):
    return templates.TemplateResponse(request, "buscador.html")


@app.get("/salud")
def salud():
    return {"status": "ok"}
