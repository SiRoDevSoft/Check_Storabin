from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict


class MaterialOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    codigo: str
    descripcion: Optional[str] = None
    storage_bin: Optional[str] = None
    stock: Optional[Decimal] = None
    reservado: Optional[Decimal] = None
    pendiente: Optional[Decimal] = None
    redeployment_stock: Optional[Decimal] = None
    unidad: Optional[str] = None
    tipo_material: Optional[str] = None
    batch: Optional[str] = None
    ultimo_ingreso_fecha: Optional[date] = None
    ultimo_ingreso_cantidad: Optional[Decimal] = None
    notas: Optional[str] = None


class MaterialIn(BaseModel):
    """Alta de un articulo nuevo. Acepta un stock inicial porque todavia
    no existe ningun reporte de SAP que lo haya cargado."""
    codigo: str
    descripcion: Optional[str] = None
    storage_bin: Optional[str] = None
    stock: Optional[Decimal] = None
    unidad: Optional[str] = "EA"
    tipo_material: Optional[str] = None
    notas: Optional[str] = None


class MaterialCorreccion(BaseModel):
    """Correccion de un articulo existente. A proposito NO incluye stock,
    reservado ni pendiente: esos numeros solo deben venir de un reporte
    de SAP importado, para que la base nunca se desincronice del sistema
    real. Lo que si tiene sentido corregir a mano es la descripcion, la
    ubicacion (a veces SAP tiene la bin vieja o vacia) y las notas."""
    descripcion: Optional[str] = None
    storage_bin: Optional[str] = None
    notas: Optional[str] = None


class ReservaIn(BaseModel):
    fecha: date
    material_codigo: str
    descripcion: Optional[str] = None
    cantidad: Decimal
    unidad: str = "EA"
    sloc: Optional[str] = None
    psl: str
    subdestino: Optional[str] = None
    retira: str
    movimiento_sap: Optional[str] = "961"
    orden_wbs: Optional[str] = None
    observaciones: Optional[str] = None


class ReservaOut(ReservaIn):
    model_config = ConfigDict(from_attributes=True)
    id: int
    creado_en: datetime

    @property
    def correlativo(self) -> str:
        return f"BLK-{self.id:03d}"
