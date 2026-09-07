let cotizacion=null;
let configuracion=null;
let currentQuoteId=null;
const $=id=>document.getElementById(id);
function numeroSeguro(v){return Number(v)||0;}
function simboloMoneda(){return cotizacion?.currency==="DOLARES"?"$":"S/";}
function dinero(v){return `${simboloMoneda()} ${numeroSeguro(v).toFixed(2)}`;}
function nombreComprobante(t){return t==="RHE"?"RECIBO POR HONORARIOS":t||"-";}

function enteroEnLetras(n){n=Math.floor(Math.abs(Number(n)||0));if(n===0)return"CERO";const u=["","UNO","DOS","TRES","CUATRO","CINCO","SEIS","SIETE","OCHO","NUEVE","DIEZ","ONCE","DOCE","TRECE","CATORCE","QUINCE","DIECISÉIS","DIECISIETE","DIECIOCHO","DIECINUEVE","VEINTE","VEINTIUNO","VEINTIDÓS","VEINTITRÉS","VEINTICUATRO","VEINTICINCO","VEINTISÉIS","VEINTISIETE","VEINTIOCHO","VEINTINUEVE"],d=["","","VEINTE","TREINTA","CUARENTA","CINCUENTA","SESENTA","SETENTA","OCHENTA","NOVENTA"],c=["","CIENTO","DOSCIENTOS","TRESCIENTOS","CUATROCIENTOS","QUINIENTOS","SEISCIENTOS","SETECIENTOS","OCHOCIENTOS","NOVECIENTOS"];const m100=x=>x<30?u[x]:`${d[Math.floor(x/10)]}${x%10?` Y ${u[x%10]}`:""}`;const m1000=x=>x===100?"CIEN":`${c[Math.floor(x/100)]}${x%100?`${x>=100?" ":""}${m100(x%100)}`:""}`.trim();if(n<1000)return m1000(n);if(n<1e6){const a=Math.floor(n/1000),r=n%1000;return`${a===1?"MIL":`${m1000(a)} MIL`}${r?` ${m1000(r)}`:""}`;}if(n<1e9){const a=Math.floor(n/1e6),r=n%1e6;return`${a===1?"UN MILLÓN":`${enteroEnLetras(a)} MILLONES`}${r?` ${enteroEnLetras(r)}`:""}`;}return String(n);}
function importeLetras(v){const n=Math.round((Number(v||0)+Number.EPSILON)*100)/100,e=Math.floor(n),c=Math.round((n-e)*100),m=cotizacion.currency==="DOLARES"?"DÓLARES":"SOLES";return`SON ${enteroEnLetras(e)} Y ${String(c).padStart(2,"0")}/100 ${m}`;}

document.addEventListener("DOMContentLoaded",async()=>{
  const me=await FrancoShell.init();if(!me)return;
  currentQuoteId=new URLSearchParams(location.search).get("id");if(!currentQuoteId){location.href="cotizaciones.html";return;}
  $("btnVolver").addEventListener("click",()=>location.href="cotizaciones.html");
  $("btnImprimir").addEventListener("click",imprimirDocumento);
  try{const [q,s]=await Promise.all([FrancoAPI.apiFetch(`/api/quotes/${currentQuoteId}`),FrancoAPI.apiFetch("/api/settings")]);cotizacion=q.quote;configuracion=s;render();}catch(e){alert(e.message);location.href="cotizaciones.html";}
});
function render(){const q=cotizacion,c=configuracion.company||{},s=configuracion.settings||{};
  $("razonSocialDoc").textContent=c.name||"EMPRESA";$("rucEmpresaDoc").textContent=c.ruc||"-";$("direccionEmpresaDoc").textContent=s.address||"";$("ubicacionEmpresaDoc").textContent=s.location||"";$("telefonoEmpresaDoc").textContent=s.phone||"-";$("correoEmpresaDoc").textContent=s.email||"-";
  if(s.logo_data_url){$("logoEmpresaDoc").src=s.logo_data_url;$("logoEmpresaDoc").style.display="block";}else{$("logoEmpresaDoc").style.display="none";}
  $("numeroCotizacionDoc").textContent=q.quote_number||"-";$("documentoClienteDoc").textContent=q.client_document||"-";$("clienteDoc").textContent=q.client_name||"-";$("direccionClienteDoc").textContent=q.client_address||"-";$("fechaEmisionDoc").textContent=FrancoAPI.date(q.quote_date);$("monedaDoc").textContent=q.currency||"SOLES";$("descuentoDoc").textContent=`${Number(q.discount_percent||0)}%`;$("comprobanteDoc").textContent=nombreComprobante(q.document_type);$("docTituloPrecio").textContent=q.price_mode==="CON_IGV"?"P. UNIT.":"V. UNIT.";
  $("detalleDocumento").innerHTML=(q.items||[]).map((it,i)=>`<tr><td>${i+1}</td><td>${FrancoAPI.esc(it.unit||"")}</td><td>${FrancoAPI.esc(it.code||"")}</td><td class="doc-descripcion">${FrancoAPI.esc(it.description||"")}</td><td>${numeroSeguro(it.quantity)}</td><td class="doc-monto">${numeroSeguro(it.unit_price).toFixed(2)}</td><td class="doc-monto">${numeroSeguro(it.line_total).toFixed(2)}</td></tr>`).join("");
  const subtotal=(q.items||[]).reduce((a,x)=>a+numeroSeguro(x.line_total),0);$("importeLetrasDoc").textContent=importeLetras(q.total_amount);$("subtotalDoc").textContent=dinero(subtotal);$("textoDescuentoDoc").textContent=`DESCUENTO ${Number(q.discount_percent||0)}%`;$("montoDescuentoDoc").textContent=`- ${dinero(q.discount_amount)}`;$("baseImponibleDoc").textContent=dinero(q.base_amount);const rh=q.document_type==="RHE";$("textoImpuestoDoc").textContent=rh?(numeroSeguro(q.retention_amount)>0?"RETENCIÓN 8%":"RETENCIÓN 0% "):"IGV 18%";$("impuestoDoc").textContent=dinero(rh?q.retention_amount:q.igv_amount);$("totalDoc").textContent=dinero(q.total_amount);
  $("condicionesDoc").textContent=q.conditions||"Sin condiciones adicionales.";$("mensajeEmpresaDoc").textContent=s.final_message||"Gracias por elegirnos. Su confianza nos inspira a seguir mejorando.";$("responsableDoc").textContent=s.responsible||"";$("cargoDoc").textContent=s.responsible_role||"";$("selloAnulada").style.display=q.status==="ANULADA"?"block":"none";
  window.renderMediosPagoClassic?.($("mediosPagoGrid"),s);document.title=`${q.quote_number} - ${q.client_name}`;
}
function imprimirDocumento(){const anterior=document.title;document.title=`${cotizacion.quote_number||"COTIZACION"} - ${cotizacion.client_name||"CLIENTE"}`;window.print();setTimeout(()=>document.title=anterior,1000);}
