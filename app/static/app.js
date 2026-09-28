(function(){
"use strict";
const $ = s => document.querySelector(s);
const fmt = n => (n==null||n==="") ? null : Number(n).toLocaleString("es-AR");
function toast(m){ const t=$("#toast"); t.textContent=m; t.classList.add("show"); setTimeout(()=>t.classList.remove("show"),3000); }

let state = { q:"", sin:false, timer:null };

async function buscar(){
  const params = new URLSearchParams({q: state.q, sin_ubicacion: state.sin});
  const res = await fetch("/api/materiales/buscar?" + params);
  const data = await res.json();
  render(data);
}

function render(data){
  $("#count").textContent = data.length + (data.length===1 ? " artículo" : " artículos") + (data.length===60 ? " (primeros 60, afiná la búsqueda)" : "");
  $("#results").innerHTML = data.length ? data.map(card).join("") :
    '<div class="empty">No encontré nada.<br>Probá con menos palabras o con parte del código.</div>';
  $("#clear").style.display = state.q ? "block" : "none";
}

function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }

function card(r){
  const bin = r.storage_bin ? `<span class="bin">${esc(r.storage_bin)}</span>` : `<span class="bin none">Sin ubicación</span>`;
  const st = fmt(r.stock);
  return `<button class="card" data-c="${esc(r.codigo)}">
    <div><div class="cm">${esc(r.codigo)}</div><div class="cd">${esc(r.descripcion||"")}</div></div>
    <div>${bin}</div>
    <div class="cstock">Stock: <b>${st==null?"—":st}</b> ${esc(r.unidad||"")}</div>
  </button>`;
}

$("#q").addEventListener("input", e=>{
  state.q = e.target.value;
  clearTimeout(state.timer);
  state.timer = setTimeout(buscar, 250);
});
$("#clear").addEventListener("click", ()=>{ $("#q").value=""; state.q=""; buscar(); $("#q").focus(); });
$("#chipSin").addEventListener("click", function(){ state.sin=!state.sin; this.classList.toggle("on", state.sin); buscar(); });
$("#results").addEventListener("click", e=>{ const c=e.target.closest(".card"); if(c) verDetalle(c.dataset.c); });

const backdrop=$("#backdrop"), sheet=$("#sheet");
function open(html){ sheet.innerHTML=html; backdrop.classList.add("open"); sheet.scrollTop=0; }
function close(){ backdrop.classList.remove("open"); }
backdrop.addEventListener("click", e=>{ if(e.target===backdrop) close(); });

function tile(label, val, unit){
  const v = fmt(val);
  return `<div class="tile"><div class="lbl">${label}</div>${v==null? '<div class="val nd">Sin datos</div>' : `<div class="val">${v} <small>${esc(unit||"")}</small></div>`}</div>`;
}

async function verDetalle(codigo){
  const res = await fetch("/api/materiales/" + encodeURIComponent(codigo));
  const r = await res.json();
  const bin = r.storage_bin ? `<div class="big">${esc(r.storage_bin)}</div>` : `<div class="big" style="font-size:20px;color:var(--danger)">Sin ubicación cargada</div>`;
  const ing = r.ultimo_ingreso_fecha ? `<div class="val">${r.ultimo_ingreso_fecha}</div>${r.ultimo_ingreso_cantidad!=null?`<div class="sub">${fmt(r.ultimo_ingreso_cantidad)} ${esc(r.unidad||"")} recibidos</div>`:""}` : `<div class="val nd">Sin datos</div>`;
  open(`
    <div class="cm">${esc(r.codigo)}</div>
    <h2 style="margin:3px 0 14px">${esc(r.descripcion||"")}</h2>
    <div class="hero"><div class="lbl">Ubicación</div>${bin}</div>
    <div class="tiles">
      ${tile("Stock", r.stock, r.unidad)}
      ${tile("Reservado", r.reservado, r.unidad)}
      ${tile("Pendiente", r.pendiente, r.unidad)}
      <div class="tile"><div class="lbl">Último ingreso</div>${ing}</div>
    </div>
    ${r.notas? `<p>${esc(r.notas)}</p>`:""}
    <div class="actions"><button class="btn grow" id="bClose">Cerrar</button><button class="btn sec" id="bEdit">Corregir</button></div>
  `);
  $("#bClose").onclick = close;
  $("#bEdit").onclick = () => editar(r);
}

function field(id,label,val,extra){ return `<div class="field"><label>${label}</label><input id="${id}" value="${esc(val==null?"":val)}" ${extra||""}></div>`; }

function editar(r){
  r = r || {codigo:"",descripcion:"",storage_bin:"",stock:null,unidad:"EA",reservado:null,pendiente:null,notas:""};
  const isNew = !r.codigo || arguments.length===0;
  open(`
    <h2>${r.codigo? "Corregir "+esc(r.codigo) : "Nuevo artículo"}</h2>
    ${!r.codigo? field("fCod","Código *","",'inputmode="numeric"') : ""}
    ${field("fDesc","Descripción", r.descripcion)}
    ${field("fBin","Ubicación", r.storage_bin)}
    <div class="row2">${field("fStock","Stock", r.stock, 'inputmode="decimal"')}${field("fUnidad","Unidad", r.unidad)}</div>
    <div class="row2">${field("fRes","Reservado", r.reservado, 'inputmode="decimal"')}${field("fPen","Pendiente", r.pendiente, 'inputmode="decimal"')}</div>
    <div class="field"><label>Notas</label><textarea id="fNotas" rows="2">${esc(r.notas||"")}</textarea></div>
    <div class="actions"><button class="btn grow" id="bSave">Guardar</button><button class="btn sec" id="bCancel">Cancelar</button>${r.codigo?'<button class="btn danger" id="bDel">Eliminar</button>':''}</div>
  `);
  $("#bCancel").onclick = close;
  $("#bSave").onclick = async () => {
    const codigo = r.codigo || $("#fCod").value.trim();
    if(!codigo){ toast("Falta el código"); return; }
    const num = id => { const v=$(id).value.trim().replace(",","."); return v===""? null : Number(v); };
    const payload = { codigo, descripcion: $("#fDesc").value.trim(), storage_bin: $("#fBin").value.trim(),
      stock: num("#fStock"), unidad: $("#fUnidad").value.trim()||"EA", reservado: num("#fRes"),
      pendiente: num("#fPen"), notas: $("#fNotas").value.trim() };
    const res = await fetch("/api/materiales", {method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(payload)});
    if(!res.ok){ toast("No se pudo guardar"); return; }
    close(); buscar(); toast("Guardado");
  };
  if(r.codigo){ $("#bDel").onclick = async () => {
    if(!confirm(`¿Eliminar ${r.codigo}?`)) return;
    await fetch("/api/materiales/" + encodeURIComponent(r.codigo), {method:"DELETE"});
    close(); buscar(); toast("Eliminado");
  }; }
}

$("#btnAdm").addEventListener("click", () => {
  open(`
    <h2>Administrar</h2>
    <button class="btn block" id="aNew">+ Agregar artículo</button>
    <button class="btn block sec" id="aImp">Cargar Excel de SAP</button>
    <a class="btn block sec" href="/api/reservas/exportar" style="display:block;text-decoration:none;text-align:left">Exportar reservas a CSV</a>
    <button class="btn sec" id="aClose" style="width:100%">Cerrar</button>
  `);
  $("#aClose").onclick = close;
  $("#aNew").onclick = () => editar();
  $("#aImp").onclick = () => { $("#file").value=""; $("#file").click(); };
});

$("#file").addEventListener("change", async e => {
  const f = e.target.files[0]; if(!f) return;
  const fd = new FormData(); fd.append("file", f);
  toast("Importando...");
  const res = await fetch("/api/materiales/importar", {method:"POST", body: fd});
  const data = await res.json();
  if(!res.ok){ toast(data.detail || "Error al importar"); return; }
  close(); buscar();
  toast(`Importado (${data.tipo_detectado}): ${data.nuevos} nuevos, ${data.actualizados} actualizados, ${data.ingresos} con último ingreso`);
});

buscar();
})();
