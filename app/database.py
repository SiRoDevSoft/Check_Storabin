"""
Conexion a la base de datos.

- En Render: DATABASE_URL la provee el servicio de Postgres automaticamente.
- En desarrollo local: si no hay DATABASE_URL, usa SQLite (archivo local),
  para no depender de tener Postgres instalado en la maquina.
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./local_dev.db")

# Render entrega a veces "postgres://" y SQLAlchemy 2.x requiere "postgresql://"
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Forzamos el driver psycopg (v3) explicitamente. Sin esto, SQLAlchemy elige
# el driver por defecto segun lo que encuentre instalado, y eso vario entre
# la version de Python de Render y la de desarrollo local -> mejor ser
# explicitos y que use siempre el mismo (el que esta en requirements.txt).
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
