(function(){
"use strict";
const $ = s => document.querySelector(s);
const fmt = n => (n==null||n==="") ? null : Number(n).toLocaleString("es-AR");
function toast(m){ const t=$("#toast"); t.textContent=m; t.classList.add("show"); setTimeout(()=>t.classList.remove("show"),3000); }

let state = { q:"", sin:false, timer:null };

// ---------- PIN de administrador (provisorio, hasta el login con roles) ----------
function getAdminToken(){ return sessionStorage.getItem("admin_token") || ""; }
function askAdminToken(){
  const t = prompt("PIN de administrador:");
  if(t){ sessionStorage.setItem("admin_token", t); }
  return t || "";
}
async function adminFetch(url, opts={}){
  opts.headers = Object.assign({}, opts.headers, {"X-Admin-Token": getAdminToken()});
  let res = await fetch(url, opts);
  if(res.status === 401){
    if(!askAdminToken()) throw new Error("Sin PIN");
    opts.headers["X-Admin-Token"] = getAdminToken();
    res = await fetch(url, opts);
  }
  return res;
}

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

const ICON_COPY = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="1.5"></rect><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"></path></svg>`;
const ICON_OK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

async function copiar(texto, btn){
  try{ await navigator.clipboard.writeText(texto); }
  catch(e){
    const ta = document.createElement("textarea");
    ta.value = texto; ta.style.position="fixed"; ta.style.opacity="0";
    document.body.appendChild(ta); ta.select();
    try{ document.execCommand("copy"); }catch(e2){}
    document.body.removeChild(ta);
  }
  if(btn){
    const original = btn.innerHTML;
    btn.innerHTML = ICON_OK; btn.classList.add("copied");
    setTimeout(()=>{ btn.innerHTML = original; btn.classList.remove("copied"); }, 1400);
  }
  toast("Copiado: " + texto);
}

async function verDetalle(codigo){
  const res = await fetch("/api/materiales/" + encodeURIComponent(codigo));
  const r = await res.json();
  const ubic = String(r.storage_bin||"").trim();
  const bin = ubic ? `<div class="big">${esc(ubic)}</div>` : `<div class="big" style="font-size:20px;color:var(--danger)">Sin ubicación cargada</div>`;
  const ing = r.ultimo_ingreso_fecha ? `<div class="val">${r.ultimo_ingreso_fecha}</div>${r.ultimo_ingreso_cantidad!=null?`<div class="sub">${fmt(r.ultimo_ingreso_cantidad)} ${esc(r.unidad||"")} recibidos</div>`:""}` : `<div class="val nd">Sin datos</div>`;
  open(`
    <div class="pn">PN: <b>${esc(r.codigo)}</b></div>
    <div class="desc-row">
      <div class="txt">${esc(r.descripcion||"")}</div>
      <button class="copybtn" id="bCopyDesc" title="Copiar descripción">${ICON_COPY}</button>
    </div>
    <div class="hero">
      <div class="lbl">Ubicación</div>${bin}
      ${ubic? `<button class="copybtn" id="bCopyBin" title="Copiar ubicación">${ICON_COPY}</button>` : ""}
    </div>
    <div class="tiles">
      ${tile("Stock", r.stock, r.unidad)}
      ${tile("Redeployment · 9001", r.redeployment_stock, r.unidad)}
      ${tile("Pendiente", r.pendiente, r.unidad)}
      <div class="tile"><div class="lbl">Último ingreso</div>${ing}</div>
    </div>
    ${r.notas? `<p>${esc(r.notas)}</p>`:""}
    <div class="actions"><button class="btn grow" id="bClose">Cerrar</button></div>
  `);
  $("#bClose").onclick = close;
  $("#bCopyDesc").onclick = () => copiar(r.descripcion||"", $("#bCopyDesc"));
  if(ubic) $("#bCopyBin").onclick = () => copiar(ubic, $("#bCopyBin"));
}

function field(id,label,val,extra){ return `<div class="field"><label>${label}</label><input id="${id}" value="${esc(val==null?"":val)}" ${extra||""}></div>`; }

function editar(r){
  const isNew = !r;
  r = r || {codigo:"",descripcion:"",storage_bin:"",stock:null,unidad:"EA",notas:""};
  open(`
    <h2>${isNew? "Nuevo artículo" : "Corregir "+esc(r.codigo)}</h2>
    ${isNew? `<p class="sub">El stock inicial se puede cargar acá porque todavía no existe en SAP. Una vez creado, el stock solo se actualiza importando un reporte.</p>` :
              `<p class="sub">Stock, reservado y pendiente no se editan a mano: se actualizan importando un reporte de SAP, para que nunca queden desincronizados.</p>`}
    ${isNew? field("fCod","Código *","",'inputmode="numeric"') : ""}
    ${field("fDesc","Descripción", r.descripcion)}
    ${field("fBin","Ubicación", r.storage_bin)}
    ${isNew? `<div class="row2">${field("fStock","Stock inicial", r.stock, 'inputmode="decimal"')}${field("fUnidad","Unidad", r.unidad)}</div>` : ""}
    <div class="field"><label>Notas</label><textarea id="fNotas" rows="2">${esc(r.notas||"")}</textarea></div>
    <div class="actions"><button class="btn grow" id="bSave">Guardar</button><button class="btn sec" id="bCancel">Cancelar</button>${!isNew?'<button class="btn danger" id="bDel">Eliminar</button>':''}</div>
  `);
  $("#bCancel").onclick = close;
  $("#bSave").onclick = async () => {
    try{
      let res;
      if(isNew){
        const codigo = $("#fCod").value.trim();
        if(!codigo){ toast("Falta el código"); return; }
        const num = id => { const v=$(id).value.trim().replace(",","."); return v===""? null : Number(v); };
        const payload = { codigo, descripcion: $("#fDesc").value.trim(), storage_bin: $("#fBin").value.trim(),
          stock: num("#fStock"), unidad: $("#fUnidad").value.trim()||"EA", notas: $("#fNotas").value.trim() };
        res = await adminFetch("/api/materiales", {method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(payload)});
      } else {
        const payload = { descripcion: $("#fDesc").value.trim(), storage_bin: $("#fBin").value.trim(), notas: $("#fNotas").value.trim() };
        res = await adminFetch("/api/materiales/" + encodeURIComponent(r.codigo), {method:"PUT", headers:{"Content-Type":"application/json"}, body: JSON.stringify(payload)});
      }
      if(!res.ok){ const d = await res.json().catch(()=>({})); toast(d.detail || "No se pudo guardar"); return; }
      close(); buscar(); toast("Guardado");
    }catch(e){ /* PIN cancelado */ }
  };
  if(!isNew){ $("#bDel").onclick = async () => {
    if(!confirm(`¿Eliminar ${r.codigo}?`)) return;
    try{
      const res = await adminFetch("/api/materiales/" + encodeURIComponent(r.codigo), {method:"DELETE"});
      if(!res.ok){ toast("No se pudo eliminar"); return; }
      close(); buscar(); toast("Eliminado");
    }catch(e){ /* PIN cancelado */ }
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
  try{
    const res = await adminFetch("/api/materiales/importar", {method:"POST", body: fd});
    const data = await res.json();
    if(!res.ok){ toast(data.detail || "Error al importar"); return; }
    close(); buscar();
    const partes = [`${data.nuevos} nuevos`, `${data.actualizados} actualizados`];
    if(data.ingresos) partes.push(`${data.ingresos} con último ingreso`);
    if(data.redeployment) partes.push(`${data.redeployment} de redeployment (9001)`);
    toast(`Importado (${data.tipo_detectado}): ${partes.join(", ")}`);
  }catch(err){ /* PIN cancelado */ }
});

buscar();
})();
