import csv
import io

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Reserva
from ..schemas import ReservaIn, ReservaOut

router = APIRouter(prefix="/api/reservas", tags=["reservas"])


@router.get("", response_model=list[ReservaOut])
def listar(psl: str | None = None, limit: int = 200, db: Session = Depends(get_db)):
    query = db.query(Reserva)
    if psl:
        query = query.filter(Reserva.psl == psl)
    return query.order_by(Reserva.id.desc()).limit(limit).all()


@router.post("", response_model=ReservaOut)
def crear(payload: ReservaIn, db: Session = Depends(get_db)):
    reserva = Reserva(**payload.model_dump())
    db.add(reserva)
    db.commit()
    db.refresh(reserva)
    return reserva


@router.delete("/{reserva_id}")
def eliminar(reserva_id: int, db: Session = Depends(get_db)):
    reserva = db.get(Reserva, reserva_id)
    if not reserva:
        raise HTTPException(404, "Reserva no encontrada")
    db.delete(reserva)
    db.commit()
    return {"ok": True}


@router.get("/exportar")
def exportar(db: Session = Depends(get_db)):
    reservas = db.query(Reserva).order_by(Reserva.id).all()
    buf = io.StringIO()
    writer = csv.writer(buf, delimiter=";")
    writer.writerow(["Correlativo", "Fecha", "Material", "Descripcion", "Cantidad", "UM",
                      "SLoc", "PSL", "Sub-destino", "Retira", "Mvt SAP", "Orden/WBS", "Observaciones"])
    for r in reservas:
        writer.writerow([f"BLK-{r.id:03d}", r.fecha, r.material_codigo, r.descripcion, r.cantidad,
                          r.unidad, r.sloc, r.psl, r.subdestino, r.retira, r.movimiento_sap,
                          r.orden_wbs, r.observaciones])
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=reservas.csv"},
    )
