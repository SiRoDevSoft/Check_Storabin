from sqlalchemy import Column, String, Numeric, DateTime, Integer, Text, Date
from sqlalchemy.sql import func
from .database import Base


class Material(Base):
    __tablename__ = "materiales"

    codigo = Column(String, primary_key=True, index=True)       # SAP "Material"
    descripcion = Column(String, index=True)
    planta = Column(String, default="1608")
    sloc = Column(String, default="1117")
    storage_bin = Column(String, index=True)                    # ubicacion
    stock = Column(Numeric)                                     # Unrestricted use, SLoc 1117
    reservado = Column(Numeric)
    pendiente = Column(Numeric)                                 # On-Order Stock
    redeployment_stock = Column(Numeric)                        # Unrestricted use, SLoc 9001 (redeployment)
    unidad = Column(String, default="EA")
    tipo_material = Column(String)                               # ZSCP, ZMRO, etc
    batch = Column(String)
    profit_center = Column(String)
    ultimo_ingreso_fecha = Column(Date)
    ultimo_ingreso_cantidad = Column(Numeric)
    notas = Column(Text)
    actualizado_en = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())


class Reserva(Base):
    __tablename__ = "reservas"

    id = Column(Integer, primary_key=True, index=True)          # correlativo interno (BLK-001 se arma con el id)
    fecha = Column(Date, nullable=False)
    material_codigo = Column(String, index=True)
    descripcion = Column(String)
    cantidad = Column(Numeric, nullable=False)
    unidad = Column(String, default="EA")
    sloc = Column(String)
    psl = Column(String, index=True)
    subdestino = Column(String)
    retira = Column(String)
    movimiento_sap = Column(String)                              # 961, 911, 101...
    orden_wbs = Column(String)
    observaciones = Column(Text)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
