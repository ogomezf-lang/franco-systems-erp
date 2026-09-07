window.renderMediosPagoClassic = function(contenedor, settings) {
  if (!contenedor) return;
  let cuentas = Array.isArray(settings?.payment_methods) ? settings.payment_methods : [];
  if (!cuentas.length) {
    cuentas=[];
    if(settings?.yape)cuentas.push({type:"YAPE",kind:"BILLETERA",number:settings.yape,enabled:true});
    if(settings?.plin)cuentas.push({type:"PLIN",kind:"BILLETERA",number:settings.plin,enabled:true});
    for(const [type,key] of [["BCP","bank_bcp"],["BBVA","bank_bbva"],["INTERBANK","bank_interbank"],["SCOTIABANK","bank_scotiabank"]])if(settings?.[key])cuentas.push({type,kind:"BANCO",currency:"SOLES",account:settings[key],enabled:true});
  }
  cuentas=cuentas.filter(c=>c&&c.enabled!==false&&(c.account||c.number));
  if(!cuentas.length){contenedor.innerHTML="";return;}
  const esc=FrancoAPI.esc;
  const tarjeta=c=>{
    const raw=String(c.entity||c.type||"OTRO").toUpperCase();
    const nombre=raw==="OTRO"?String(c.custom_name||c.type||"OTRO").toUpperCase():raw;
    const wallet=String(c.kind||"").toUpperCase()==="BILLETERA"||["YAPE","PLIN"].includes(raw);
    const logo=c.logo?`<div class="doc-medio-logo"><img src="${c.logo}" alt="${esc(nombre)}"></div>`:`<div class="doc-medio-logo doc-medio-logo-texto">${esc(nombre.slice(0,4))}</div>`;
    return `<article class="doc-medio-tarjeta"><div class="doc-medio-cabecera">${logo}<div class="doc-medio-nombre"><strong>${esc(nombre)}</strong><span>${wallet?"BILLETERA DIGITAL":`CUENTA EN ${String(c.currency||"SOLES").toUpperCase()==="DOLARES"?"DÃ“LARES":"SOLES"}`}</span></div></div><div class="doc-medio-contenido">${wallet?`<div class="doc-medio-dato"><span>NÃšMERO</span><strong>${esc(c.number||c.account||"-")}</strong></div>`:`<div class="doc-medio-dato"><span>NÂ° CUENTA</span><strong>${esc(c.account||c.number||"-")}</strong></div>${c.cci?`<div class="doc-medio-dato"><span>CCI</span><strong>${esc(c.cci)}</strong></div>`:""}`}${c.holder?`<div class="doc-medio-dato"><span>TITULAR</span><strong>${esc(c.holder)}</strong></div>`:""}</div></article>`;
  };
  contenedor.innerHTML=`<section class="doc-medios-pago"><div class="doc-medios-titulo"><span></span><strong>MEDIOS DE PAGO</strong><span></span></div><div class="doc-medios-grid">${cuentas.map(tarjeta).join("")}</div></section>`;
};

