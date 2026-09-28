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
    unidad: Optional[str] = None
    tipo_material: Optional[str] = None
    batch: Optional[str] = None
    ultimo_ingreso_fecha: Optional[date] = None
    ultimo_ingreso_cantidad: Optional[Decimal] = None
    notas: Optional[str] = None


class MaterialIn(BaseModel):
    codigo: str
    descripcion: Optional[str] = None
    storage_bin: Optional[str] = None
    stock: Optional[Decimal] = None
    reservado: Optional[Decimal] = None
    pendiente: Optional[Decimal] = None
    unidad: Optional[str] = "EA"
    tipo_material: Optional[str] = None
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
