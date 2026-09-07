let clientes=[];
let editingClientId=null;
let consultandoDocumento="";
const $=id=>document.getElementById(id);

document.addEventListener("DOMContentLoaded",async()=>{
  const me=await FrancoShell.init();if(!me)return;
  $("documentoCliente").addEventListener("input",detectarTipoCliente);
  $("documentoCliente").addEventListener("blur",consultarDocumentoAutomatico);
  $("btnCancelarCliente").addEventListener("click",limpiarFormularioCliente);
  $("clientForm").addEventListener("submit",guardarCliente);
  $("buscarCliente").addEventListener("input",renderClientes);
  await cargarClientes();
});
async function cargarClientes(){try{const d=await FrancoAPI.apiFetch("/api/clients");clientes=d.clients||[];renderClientes();}catch(e){$("tablaClientes").innerHTML=`<tr><td colspan="7" class="empty">${FrancoAPI.esc(e.message)}</td></tr>`;}}
function detectarTipoCliente(){const i=$("documentoCliente");const d=i.value.replace(/\D/g,"").slice(0,11);i.value=d;$("tipoCliente").value=d.length===8?"PERSONA":d.length===11?"EMPRESA":"";}
async function consultarDocumentoAutomatico(){
  const d=$("documentoCliente").value.replace(/\D/g,"");
  if(![8,11].includes(d.length)||consultandoDocumento===d)return;
  const existente=clientes.find(c=>c.document===d);
  if(existente && editingClientId!==existente.id){
    $("tipoCliente").value=existente.client_type|| (d.length===11?"EMPRESA":"PERSONA");
    $("nombreCliente").value=existente.name||"";$("direccionCliente").value=existente.address||"";$("telefonoCliente").value=existente.phone||"";$("correoCliente").value=existente.email||"";
    return;
  }
  consultandoDocumento=d;
  try{
    const data=await FrancoAPI.apiFetch(d.length===11?`/api/ruc/${d}`:`/api/dni/${d}`);
    if(d.length===11){$("tipoCliente").value="EMPRESA";$("nombreCliente").value=data.razon_social||data.nombre_o_razon_social||"";$("direccionCliente").value=data.direccion||data.domicilio_fiscal||"";}
    else{$("tipoCliente").value="PERSONA";$("nombreCliente").value=data.full_name||data.nombre_completo||data.nombres||"";}
  }catch(e){console.warn("Consulta automÃ¡tica:",e.message);}finally{consultandoDocumento="";}
}
function limpiarFormularioCliente(){editingClientId=null;$("clientForm").reset();$("tipoCliente").value="";$("tituloFormularioCliente").textContent="Nuevo Cliente";$("btnGuardarCliente").textContent="Guardar Cliente";$("btnCancelarCliente").textContent="Limpiar";$("documentoCliente").focus();}
function validarCliente(){const d=$("documentoCliente").value.trim();if(d.length!==8&&d.length!==11){alert("El documento debe tener 8 dÃ­gitos para DNI o 11 para RUC.");$("documentoCliente").focus();return false;}if(!$("nombreCliente").value.trim()){alert("Ingrese el nombre o razÃ³n social.");$("nombreCliente").focus();return false;}const c=$("correoCliente").value.trim();if(c&&!c.includes("@")){alert("Ingrese un correo vÃ¡lido.");$("correoCliente").focus();return false;}return true;}
async function guardarCliente(event){event.preventDefault();if(!validarCliente())return;const d=$("documentoCliente").value.trim();const duplicado=clientes.find(c=>c.document===d&&c.id!==editingClientId);if(duplicado){alert("Ya existe un cliente con ese RUC o DNI.");return;}const payload={document:d,name:$("nombreCliente").value.trim(),address:$("direccionCliente").value.trim(),phone:$("telefonoCliente").value.trim(),email:$("correoCliente").value.trim()};const estaba=Boolean(editingClientId);const btn=$("btnGuardarCliente");btn.disabled=true;btn.textContent=estaba?"Actualizando...":"Guardando...";try{if(estaba)await FrancoAPI.apiFetch(`/api/clients/${editingClientId}`,{method:"PUT",body:JSON.stringify(payload)});else await FrancoAPI.apiFetch("/api/clients",{method:"POST",body:JSON.stringify(payload)});await cargarClientes();limpiarFormularioCliente();alert(estaba?"Cliente actualizado correctamente.":"Cliente guardado correctamente.");}catch(e){alert(e.message);}finally{btn.disabled=false;}}
function renderClientes(){const q=$("buscarCliente").value.trim().toLowerCase();const f=clientes.filter(c=>!q||String(c.document||"").toLowerCase().includes(q)||String(c.name||"").toLowerCase().includes(q));const tb=$("tablaClientes");if(!f.length){tb.innerHTML='<tr><td colspan="7" class="empty">No hay clientes para mostrar.</td></tr>';return;}const admin=document.body.classList.contains("user-admin");tb.innerHTML=f.map(c=>`<tr><td data-label="Documento"><strong>${FrancoAPI.esc(c.document||"-")}</strong></td><td data-label="Tipo">${FrancoAPI.esc(c.client_type||"")}</td><td data-label="Cliente">${FrancoAPI.esc(c.name||"-")}</td><td data-label="DirecciÃ³n">${FrancoAPI.esc(c.address||"-")}</td><td data-label="TelÃ©fono">${FrancoAPI.esc(c.phone||"-")}</td><td data-label="Correo">${FrancoAPI.esc(c.email||"-")}</td><td data-label="Acciones" class="actions"><button class="btn btn-soft btn-sm" type="button" onclick="editarCliente('${c.id}')">Editar</button>${admin?`<button class="btn btn-danger btn-sm" type="button" onclick="eliminarCliente('${c.id}')">Eliminar</button>`:""}</td></tr>`).join("");}
function editarCliente(id){const c=clientes.find(x=>x.id===id);if(!c)return;editingClientId=id;$("tituloFormularioCliente").textContent="Editar Cliente";$("btnGuardarCliente").textContent="Actualizar Cliente";$("btnCancelarCliente").textContent="Cancelar ediciÃ³n";$("documentoCliente").value=c.document||"";$("tipoCliente").value=c.client_type||"";$("nombreCliente").value=c.name||"";$("direccionCliente").value=c.address||"";$("telefonoCliente").value=c.phone||"";$("correoCliente").value=c.email||"";window.scrollTo({top:0,behavior:"smooth"});}
async function eliminarCliente(id){const c=clientes.find(x=>x.id===id);if(!c||!confirm(`Â¿Eliminar a ${c.name}?`))return;try{await FrancoAPI.apiFetch(`/api/clients/${id}`,{method:"DELETE"});if(editingClientId===id)limpiarFormularioCliente();await cargarClientes();}catch(e){alert(e.message);}}

