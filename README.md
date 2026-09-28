# Materiales · Halliburton Neuquén

Buscador de artículos con ubicación, stock, reservado, pendiente y último
ingreso. Base de datos compartida (a diferencia de la versión anterior en
localStorage): todos los que entren ven la misma información.

## Stack

| Capa | Tecnología |
|---|---|
| Backend | FastAPI (Python) |
| Frontend | HTML + CSS + JS puro |
| Base de datos | PostgreSQL (SQLite en desarrollo local) |
| Templates | Jinja2 |
| Hosting | Render |

## Cómo funciona

- `app/main.py` levanta la app, crea las tablas al arrancar y sirve la
  página de búsqueda.
- `app/models.py` tiene dos tablas: `materiales` y `reservas` (la de
  reservas ya está creada en la base, falta la pantalla — próximo paso).
- `app/importer.py` lee un Excel exportado de SAP, **detecta las columnas
  por su nombre** (no importa el orden exacto) y actualiza la base:
  - Si el archivo tiene "Posting Date" + "Qty" → lo trata como reporte de
    movimientos (MB51) y actualiza "último ingreso" con los de mov. 101.
  - Si tiene "Material" + "Storage Bin"/"Unrestricted" → actualiza stock y
    ubicación (como el listado Plant/SL/BIN que ya usás).
  - Si tiene columnas de "Reserved"/"On-Order" → suma a reservado/pendiente.
- `app/routers/materiales.py` expone la API de búsqueda, alta, edición,
  baja e importación.
- `app/routers/reservas.py` ya tiene la API de reservas lista (crear,
  listar, exportar a CSV) para cuando armemos la pantalla.
- `app/static/app.js` es el front: pide datos a la API, sin frameworks.

## Desarrollo local

Necesitás Python 3.11+. No hace falta tener Postgres instalado: si no
configurás `DATABASE_URL`, la app usa un archivo SQLite local automático.

```bash
python3 -m venv .venv
source .venv/bin/activate          # en Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Abrís `http://127.0.0.1:8000` y ya está. La primera vez la base va a estar
vacía: entrá a **Administrar → Cargar Excel de SAP** y subí tu nómina.

## Desplegar en Render

1. Subí esta carpeta a un repositorio de GitHub.
2. En Render: **New → Blueprint**, apuntá al repo. El archivo `render.yaml`
   ya define el servicio web *y* la base de datos Postgres juntos, así que
   Render los crea y conecta solo (no hace falta copiar ninguna URL a mano).
3. Cuando termine el deploy, la web te queda en algo como
   `https://materiales-app.onrender.com`.

Nota sobre el plan gratuito de Render: el servicio "se duerme" tras un
rato sin uso y tarda unos segundos en despertar con la primera visita del
día. Si eso molesta en el día a día, el plan pago lo evita.

## Próximos pasos (ya con la base armada)

1. Pantalla de reservas (la API ya existe en `/api/reservas`).
2. Historial/auditoría de quién cargó o corrigió cada dato.
3. Roles simples (operador vs. quien administra la base).
