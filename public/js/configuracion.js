let logoBase64 = "";
let configSnapshot = null;
let esAdmin = false;
const $ = id => document.getElementById(id);

document.addEventListener("DOMContentLoaded", async () => {
  const me = await FrancoShell.init();
  if (!me) return;
  esAdmin = me.user?.role === "ADMIN";
  $("logoEmpresa").addEventListener("change", cambiarLogo);
  $("btnQuitarLogo").addEventListener("click", () => { logoBase64=""; $("logoEmpresa").value=""; mostrarLogo(); });
  $("btnGuardarConfiguracion").addEventListener("click", guardarConfiguracion);
  await cargarConfiguracion();
  if (!esAdmin) {
    $("settingsReadOnly").classList.remove("hidden");
    document.querySelectorAll(".erp-content input,.erp-content textarea,.erp-content button").forEach(el => el.disabled = true);
  }
});

async function cargarConfiguracion() {
  try {
    configSnapshot = await FrancoAPI.apiFetch("/api/settings");
    const c=configSnapshot.company||{}, s=configSnapshot.settings||{};
    $("razonSocial").value=c.name||"";
    $("rucEmpresa").value=c.ruc||"";
    $("telefonoEmpresa").value=s.phone||"";
    $("direccionEmpresa").value=s.address||"";
    $("ubicacionEmpresa").value=s.location||"";
    $("correoEmpresa").value=s.email||"";
    $("responsableEmpresa").value=s.responsible||"";
    $("cargoResponsable").value=s.responsible_role||"";
    $("mensajeFinal").value=s.final_message||"Gracias por elegirnos. Su confianza nos inspira a seguir mejorando.";
    logoBase64=s.logo_data_url||"";
    mostrarLogo();
  } catch(e){ alert(e.message); }
}
function mostrarLogo(){
  if(logoBase64){ $("previewLogoEmpresa").src=logoBase64; $("previewLogoEmpresa").style.display="block"; $("textoSinLogo").style.display="none"; }
  else { $("previewLogoEmpresa").removeAttribute("src"); $("previewLogoEmpresa").style.display="none"; $("textoSinLogo").style.display="block"; }
}
function cambiarLogo(event){
  const f=event.target.files?.[0]; if(!f)return;
  if(f.size>1024*1024){ alert("El logo es demasiado pesado. Usa una imagen menor a 1 MB."); event.target.value=""; return; }
  const r=new FileReader(); r.onload=e=>{logoBase64=e.target.result; mostrarLogo();}; r.readAsDataURL(f);
}
async function guardarConfiguracion(){
  if(!esAdmin)return;
  const razon=$("razonSocial").value.trim(); const ruc=$("rucEmpresa").value.replace(/\D/g,"");
  if(!razon){alert("Ingrese la razón social de la empresa.");$("razonSocial").focus();return;}
  if(ruc && ruc.length!==11){alert("El RUC debe tener 11 dígitos.");$("rucEmpresa").focus();return;}
  const old=configSnapshot?.settings||{};
  const payload={
    name:razon,ruc,phone:$("telefonoEmpresa").value.trim(),address:$("direccionEmpresa").value.trim(),location:$("ubicacionEmpresa").value.trim(),email:$("correoEmpresa").value.trim(),
    responsible:$("responsableEmpresa").value.trim(),responsible_role:$("cargoResponsable").value.trim(),final_message:$("mensajeFinal").value.trim(),logo_data_url:logoBase64,
    payment_methods:Array.isArray(old.payment_methods)?old.payment_methods:[],bank_bcp:old.bank_bcp||"",bank_bbva:old.bank_bbva||"",bank_interbank:old.bank_interbank||"",bank_scotiabank:old.bank_scotiabank||"",yape:old.yape||"",plin:old.plin||""
  };
  const btn=$("btnGuardarConfiguracion");btn.disabled=true;btn.textContent="Guardando...";
  try{await FrancoAPI.apiFetch("/api/settings",{method:"PUT",body:JSON.stringify(payload)});alert("Configuración guardada correctamente.");await cargarConfiguracion();document.getElementById("empresaActual").textContent=razon;}
  catch(e){alert(e.message);} finally{btn.disabled=false;btn.textContent="Guardar Configuración";}
}
