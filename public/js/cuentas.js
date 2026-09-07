let cuentas = [];
let logoBase64 = "";
let indiceEditar = null;
let configSnapshot = null;
let esAdmin = false;
const $ = id => document.getElementById(id);

function inferirTipo(entidad, kind) {
  if (kind === "BILLETERA") return "BILLETERA";
  return ["YAPE", "PLIN"].includes(String(entidad || "").toUpperCase()) ? "BILLETERA" : "BANCO";
}
function normalizarCuenta(m, i) {
  const entidad = String(m.entity || m.type || "").toUpperCase();
  const tipo = inferirTipo(entidad, m.kind);
  return {
    id: m.id || `pm-${i}-${Date.now()}`,
    tipo,
    entidad,
    nombrePersonalizado: m.custom_name || m.name || "",
    moneda: m.currency || (tipo === "BANCO" ? "SOLES" : ""),
    numeroCuenta: m.account || "",
    cci: m.cci || "",
    celular: m.number || "",
    titular: m.holder || "",
    logo: m.logo || m.logo_data_url || "",
    mostrarPdf: m.enabled !== false
  };
}
function serializarCuenta(c) {
  const entidad = c.entidad === "OTRO" ? (c.nombrePersonalizado || "OTRO") : c.entidad;
  return {
    id: String(c.id || ""),
    kind: c.tipo,
    type: entidad,
    entity: c.entidad,
    custom_name: c.nombrePersonalizado || "",
    currency: c.tipo === "BANCO" ? c.moneda : "BILLETERA DIGITAL",
    account: c.tipo === "BANCO" ? c.numeroCuenta : "",
    number: c.tipo === "BILLETERA" ? c.celular : "",
    cci: c.tipo === "BANCO" ? c.cci : "",
    holder: c.titular || "",
    logo: c.logo || "",
    enabled: c.mostrarPdf !== false
  };
}

document.addEventListener("DOMContentLoaded", async () => {
  const me = await FrancoShell.init();
  if (!me) return;
  esAdmin = me.user?.role === "ADMIN";
  $("tipoCuenta").addEventListener("change", actualizarCamposTipo);
  $("entidadCuenta").addEventListener("change", actualizarEntidad);
  $("logoCuenta").addEventListener("change", cargarLogo);
  $("cuentaForm").addEventListener("submit", guardarCuenta);
  $("btnCancelarCuenta").addEventListener("click", limpiarFormulario);
  await cargarConfiguracion();
  limpiarFormulario();
  if (!esAdmin) {
    document.querySelectorAll("#cuentaForm input,#cuentaForm select,#cuentaForm button").forEach(el => el.disabled = true);
  }
});

async function cargarConfiguracion() {
  try {
    configSnapshot = await FrancoAPI.apiFetch("/api/settings");
    const s = configSnapshot.settings || {};
    cuentas = (Array.isArray(s.payment_methods) ? s.payment_methods : []).map(normalizarCuenta);
    if (!cuentas.length) {
      const legacy = [];
      if (s.yape) legacy.push({ type:"YAPE", kind:"BILLETERA", number:s.yape, enabled:true });
      if (s.plin) legacy.push({ type:"PLIN", kind:"BILLETERA", number:s.plin, enabled:true });
      for (const [type,key] of [["BCP","bank_bcp"],["BBVA","bank_bbva"],["INTERBANK","bank_interbank"],["SCOTIABANK","bank_scotiabank"]]) {
        if (s[key]) legacy.push({ type, kind:"BANCO", currency:"SOLES", account:s[key], enabled:true });
      }
      cuentas = legacy.map(normalizarCuenta);
    }
    renderizarCuentas();
  } catch (e) { alert(e.message); }
}

function cargarEntidades() {
  const select = $("entidadCuenta");
  select.innerHTML = '<option value="">SELECCIONAR</option>';
  if ($("tipoCuenta").value === "BANCO") {
    select.innerHTML += '<option value="BCP">BCP</option><option value="INTERBANK">INTERBANK</option><option value="BBVA">BBVA</option><option value="SCOTIABANK">SCOTIABANK</option><option value="BANBIF">BANBIF</option><option value="OTRO">OTRO BANCO</option>';
  } else {
    select.innerHTML += '<option value="YAPE">YAPE</option><option value="PLIN">PLIN</option><option value="OTRO">OTRA BILLETERA</option>';
  }
}
function actualizarCamposTipo() {
  cargarEntidades();
  $("grupoNombrePersonalizado").style.display = "none";
  const billetera = $("tipoCuenta").value === "BILLETERA";
  $("grupoMoneda").style.display = billetera ? "none" : "block";
  $("grupoNumeroCuenta").style.display = billetera ? "none" : "block";
  $("grupoCCI").style.display = billetera ? "none" : "block";
  $("grupoCelular").style.display = billetera ? "block" : "none";
}
function actualizarEntidad() {
  const otro = $("entidadCuenta").value === "OTRO";
  $("grupoNombrePersonalizado").style.display = otro ? "block" : "none";
  if (!otro) $("nombrePersonalizado").value = "";
}
function cargarLogo(event) {
  const f = event.target.files?.[0]; if (!f) return;
  if (f.size > 1024*1024) { alert("Use una imagen menor a 1 MB."); event.target.value=""; return; }
  const r = new FileReader();
  r.onload = e => { logoBase64 = e.target.result; mostrarLogoFormulario(); };
  r.readAsDataURL(f);
}
function mostrarLogoFormulario() {
  if (logoBase64) {
    $("previewLogoCuenta").src = logoBase64;
    $("previewLogoCuenta").style.display = "block";
    $("textoLogoCuenta").style.display = "none";
  } else {
    $("previewLogoCuenta").removeAttribute("src");
    $("previewLogoCuenta").style.display = "none";
    $("textoLogoCuenta").style.display = "block";
  }
}
function limpiarFormulario() {
  indiceEditar = null;
  $("cuentaForm").reset();
  $("tipoCuenta").value = "BANCO";
  $("monedaCuenta").value = "SOLES";
  $("mostrarPdf").checked = true;
  logoBase64 = "";
  $("logoCuenta").value = "";
  $("tituloFormulario").textContent = "Nueva Cuenta";
  $("btnGuardarCuenta").textContent = "Guardar Cuenta";
  $("btnCancelarCuenta").textContent = "Limpiar";
  actualizarCamposTipo();
  mostrarLogoFormulario();
}
function escaparHTML(t){ return FrancoAPI.esc(t); }
function obtenerNombreEntidad(c){ return (c.entidad === "OTRO" ? c.nombrePersonalizado : c.entidad) || "OTRO"; }
function renderizarCuentas() {
  $("contadorCuentas").textContent = cuentas.length;
  $("sinCuentas").style.display = cuentas.length ? "none" : "block";
  $("listaCuentas").innerHTML = cuentas.map((c,i) => {
    const entidad = obtenerNombreEntidad(c);
    const esWallet = c.tipo === "BILLETERA";
    return `<article class="cuenta-card">
      <div class="cuenta-card-top">
        <div class="cuenta-card-logo">${c.logo ? `<img src="${c.logo}" alt="${escaparHTML(entidad)}">` : `<strong>${escaparHTML(entidad.slice(0,4))}</strong>`}</div>
        <div><h3>${escaparHTML(entidad)}</h3><span>${esWallet ? "BILLETERA DIGITAL" : `CUENTA EN ${c.moneda === "DOLARES" ? "DÃ“LARES" : "SOLES"}`}</span></div>
        <span class="badge ${c.mostrarPdf ? "active" : "cancelled"}">${c.mostrarPdf ? "EN PDF" : "OCULTA"}</span>
      </div>
      <div class="cuenta-card-datos">
        ${esWallet ? `<div><span>NÃšMERO</span><strong>${escaparHTML(c.celular || "-")}</strong></div>` : `<div><span>NÂ° CUENTA</span><strong>${escaparHTML(c.numeroCuenta || "-")}</strong></div><div><span>CCI</span><strong>${escaparHTML(c.cci || "-")}</strong></div>`}
        <div><span>TITULAR</span><strong>${escaparHTML(c.titular || "-")}</strong></div>
      </div>
      ${esAdmin ? `<div class="cuenta-card-actions"><button class="btn btn-soft btn-sm" type="button" onclick="editarCuenta(${i})">Editar</button><button class="btn btn-danger btn-sm" type="button" onclick="eliminarCuenta(${i})">Eliminar</button></div>` : ""}
    </article>`;
  }).join("");
}

async function guardarCuenta(event) {
  event.preventDefault();
  if (!esAdmin) return;
  if (!$("entidadCuenta").value) return alert("SELECCIONE LA ENTIDAD.");
  if ($("entidadCuenta").value === "OTRO" && !$("nombrePersonalizado").value.trim()) return alert("INGRESE EL NOMBRE DE LA ENTIDAD.");
  if ($("tipoCuenta").value === "BANCO" && !$("numeroCuenta").value.trim()) return alert("INGRESE EL NÃšMERO DE CUENTA.");
  if ($("tipoCuenta").value === "BILLETERA" && !$("celularCuenta").value.trim()) return alert("INGRESE EL NÃšMERO O CELULAR.");

  const cuenta = {
    id: indiceEditar === null ? String(Date.now()) : cuentas[indiceEditar].id,
    tipo: $("tipoCuenta").value,
    entidad: $("entidadCuenta").value,
    nombrePersonalizado: $("nombrePersonalizado").value.trim().toUpperCase(),
    moneda: $("tipoCuenta").value === "BANCO" ? $("monedaCuenta").value : "",
    numeroCuenta: $("tipoCuenta").value === "BANCO" ? $("numeroCuenta").value.trim() : "",
    cci: $("tipoCuenta").value === "BANCO" ? $("cciCuenta").value.trim() : "",
    celular: $("tipoCuenta").value === "BILLETERA" ? $("celularCuenta").value.trim() : "",
    titular: $("titularCuenta").value.trim().toUpperCase(),
    logo: logoBase64,
    mostrarPdf: $("mostrarPdf").checked
  };
  const editando = indiceEditar !== null;
  if (editando) cuentas[indiceEditar] = cuenta; else cuentas.push(cuenta);
  try {
    await persistirCuentas();
    renderizarCuentas();
    limpiarFormulario();
    alert(editando ? "CUENTA ACTUALIZADA CORRECTAMENTE." : "CUENTA AGREGADA CORRECTAMENTE.");
  } catch (e) {
    if (editando) await cargarConfiguracion(); else cuentas.pop();
    alert(e.message);
  }
}

async function persistirCuentas() {
  if (!configSnapshot) configSnapshot = await FrancoAPI.apiFetch("/api/settings");
  const c = configSnapshot.company || {}, s = configSnapshot.settings || {};
  const methods = cuentas.map(serializarCuenta);
  const find = name => methods.find(m => String(m.type).toUpperCase() === name && m.enabled !== false);
  const legacy = name => { const m=find(name); return m ? (m.number || m.account || "") : ""; };
  const payload = {
    name: c.name || "Mi Empresa", ruc: c.ruc || "", phone:s.phone||"", address:s.address||"", location:s.location||"", email:s.email||"",
    responsible:s.responsible||"", responsible_role:s.responsible_role||"", final_message:s.final_message||"", logo_data_url:s.logo_data_url||"",
    payment_methods: methods,
    bank_bcp:legacy("BCP"), bank_bbva:legacy("BBVA"), bank_interbank:legacy("INTERBANK"), bank_scotiabank:legacy("SCOTIABANK"), yape:legacy("YAPE"), plin:legacy("PLIN")
  };
  await FrancoAPI.apiFetch("/api/settings", { method:"PUT", body:JSON.stringify(payload) });
  configSnapshot = await FrancoAPI.apiFetch("/api/settings");
}
function editarCuenta(indice) {
  const c=cuentas[indice]; if(!c) return;
  indiceEditar=indice;
  $("tituloFormulario").textContent="Editar Cuenta";
  $("btnGuardarCuenta").textContent="Actualizar Cuenta";
  $("btnCancelarCuenta").textContent="Cancelar ediciÃ³n";
  $("tipoCuenta").value=c.tipo; actualizarCamposTipo();
  $("entidadCuenta").value=c.entidad; actualizarEntidad();
  $("nombrePersonalizado").value=c.nombrePersonalizado||"";
  $("monedaCuenta").value=c.moneda||"SOLES";
  $("numeroCuenta").value=c.numeroCuenta||"";
  $("cciCuenta").value=c.cci||"";
  $("celularCuenta").value=c.celular||"";
  $("titularCuenta").value=c.titular||"";
  $("mostrarPdf").checked=c.mostrarPdf!==false;
  logoBase64=c.logo||""; mostrarLogoFormulario();
  window.scrollTo({top:0,behavior:"smooth"});
}
async function eliminarCuenta(indice) {
  const c=cuentas[indice]; if(!c || !confirm(`Â¿ELIMINAR ${obtenerNombreEntidad(c)}?`)) return;
  const backup=[...cuentas]; cuentas.splice(indice,1);
  try { await persistirCuentas(); renderizarCuentas(); if(indiceEditar===indice) limpiarFormulario(); }
  catch(e){ cuentas=backup; renderizarCuentas(); alert(e.message); }
}

