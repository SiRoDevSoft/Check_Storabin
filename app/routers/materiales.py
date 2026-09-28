from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy import or_
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Material
from ..schemas import MaterialOut, MaterialIn
from ..importer import import_workbook

router = APIRouter(prefix="/api/materiales", tags=["materiales"])


@router.get("/buscar", response_model=list[MaterialOut])
def buscar(q: str = "", sin_ubicacion: bool = False, limit: int = 60, db: Session = Depends(get_db)):
    query = db.query(Material)
    if sin_ubicacion:
        query = query.filter(or_(Material.storage_bin.is_(None), Material.storage_bin == ""))
    if q.strip():
        like = f"%{q.strip()}%"
        query = query.filter(or_(
            Material.codigo.ilike(like),
            Material.descripcion.ilike(like),
            Material.storage_bin.ilike(like),
        ))
    return query.order_by(Material.codigo).limit(limit).all()


@router.get("/{codigo}", response_model=MaterialOut)
def detalle(codigo: str, db: Session = Depends(get_db)):
    material = db.get(Material, codigo)
    if not material:
        raise HTTPException(404, "Material no encontrado")
    return material


@router.post("", response_model=MaterialOut)
def crear_o_actualizar(payload: MaterialIn, db: Session = Depends(get_db)):
    material = db.get(Material, payload.codigo)
    if material is None:
        material = Material(codigo=payload.codigo)
        db.add(material)
    for field, value in payload.model_dump(exclude={"codigo"}).items():
        setattr(material, field, value)
    db.commit()
    db.refresh(material)
    return material


@router.delete("/{codigo}")
def eliminar(codigo: str, db: Session = Depends(get_db)):
    material = db.get(Material, codigo)
    if not material:
        raise HTTPException(404, "Material no encontrado")
    db.delete(material)
    db.commit()
    return {"ok": True}


@router.post("/importar")
async def importar(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.lower().endswith((".xlsx", ".xls")):
        raise HTTPException(400, "Subi un archivo .xlsx exportado de SAP")
    content = await file.read()
    result = import_workbook(db, content)
    if not result.get("ok"):
        raise HTTPException(400, result.get("error", "No se pudo procesar el archivo"))
    return result
