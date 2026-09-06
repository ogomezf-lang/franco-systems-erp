// =====================================================
// FRANCO SYSTEMS · COTIZACIÓN CLÁSICA CLOUD
// Interfaz v1.0 + almacenamiento/API en la nube
// =====================================================

let clientes = [];
let productos = [];
let editQuoteId = null;
let loadedQuote = null;

const $ = (id) => document.getElementById(id);
const money2 = (n) => Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;

const numeroCotizacion = $("numeroCotizacion");
const fechaEmision = $("fechaEmision");
const documentoClienteCot = $("documentoClienteCot");
const clienteCot = $("clienteCot");
const direccionCot = $("direccionCot");
const monedaCot = $("monedaCot");
const comprobanteCot = $("comprobanteCot");
const modoPrecioCot = $("modoPrecioCot");
const descuentoCot = $("descuentoCot");
const condicionesCot = $("condicionesCot");
const detalleCotizacion = $("detalleCotizacion");
const btnAgregarItem = $("btnAgregarItem");
const btnBuscarCliente = $("btnBuscarCliente");
const btnGuardarCotizacion = $("btnGuardarCotizacion");
const btnLimpiarCotizacion = $("btnLimpiarCotizacion");
const listaClientes = $("listaClientes");
const listaCodigosProductos = $("listaCodigosProductos");
const cabeceraPrecio = $("cabeceraPrecio");
const subtotalCot = $("subtotalCot");
const textoDescuentoCot = $("textoDescuentoCot");
const montoDescuentoCot = $("montoDescuentoCot");
const baseImponibleCot = $("baseImponibleCot");
const textoImpuestoCot = $("textoImpuestoCot");
const montoImpuestoCot = $("montoImpuestoCot");
const importeTotalCot = $("importeTotalCot");
const importeLetras = $("importeLetras");
const filaImpuestoCot = $("filaImpuestoCot");

function simboloMoneda() {
  return monedaCot.value === "DOLARES" ? "$" : "S/";
}

function formatoDinero(valor) {
  return `${simboloMoneda()} ${Number(valor || 0).toFixed(2)}`;
}

function escapeAttr(valor) {
  return FrancoAPI.esc(String(valor ?? ""));
}

// -----------------------------------------------------
// NÚMEROS A LETRAS (mismo concepto del cotizador v1.0)
// -----------------------------------------------------
function enteroEnLetras(n) {
  n = Math.floor(Math.abs(Number(n) || 0));
  if (n === 0) return "CERO";
  const u = ["","UNO","DOS","TRES","CUATRO","CINCO","SEIS","SIETE","OCHO","NUEVE","DIEZ","ONCE","DOCE","TRECE","CATORCE","QUINCE","DIECISÉIS","DIECISIETE","DIECIOCHO","DIECINUEVE","VEINTE","VEINTIUNO","VEINTIDÓS","VEINTITRÉS","VEINTICUATRO","VEINTICINCO","VEINTISÉIS","VEINTISIETE","VEINTIOCHO","VEINTINUEVE"];
  const dec = ["","","VEINTE","TREINTA","CUARENTA","CINCUENTA","SESENTA","SETENTA","OCHENTA","NOVENTA"];
  const cen = ["","CIENTO","DOSCIENTOS","TRESCIENTOS","CUATROCIENTOS","QUINIENTOS","SEISCIENTOS","SETECIENTOS","OCHOCIENTOS","NOVECIENTOS"];
  const menor100 = x => x < 30 ? u[x] : `${dec[Math.floor(x / 10)]}${x % 10 ? ` Y ${u[x % 10]}` : ""}`;
  const menor1000 = x => {
    if (x === 100) return "CIEN";
    return `${cen[Math.floor(x / 100)]}${x % 100 ? `${x >= 100 ? " " : ""}${menor100(x % 100)}` : ""}`.trim();
  };
  if (n < 1000) return menor1000(n);
  if (n < 1000000) {
    const miles = Math.floor(n / 1000), resto = n % 1000;
    return `${miles === 1 ? "MIL" : `${menor1000(miles)} MIL`}${resto ? ` ${menor1000(resto)}` : ""}`;
  }
  if (n < 1000000000) {
    const millones = Math.floor(n / 1000000), resto = n % 1000000;
    return `${millones === 1 ? "UN MILLÓN" : `${enteroEnLetras(millones)} MILLONES`}${resto ? ` ${enteroEnLetras(resto)}` : ""}`;
  }
  return String(n);
}

function importeEnLetras(valor) {
  const monto = money2(valor);
  const entero = Math.floor(monto);
  const centimos = Math.round((monto - entero) * 100);
  const moneda = monedaCot.value === "DOLARES" ? "DÓLARES" : "SOLES";
  return `SON ${enteroEnLetras(entero)} Y ${String(centimos).padStart(2,"0")}/100 ${moneda}`;
}

// -----------------------------------------------------
// INICIO
// -----------------------------------------------------
document.addEventListener("DOMContentLoaded", async () => {
  const me = await FrancoShell.init();
  if (!me) return;

  editQuoteId = new URLSearchParams(location.search).get("id");
  establecerFechaActual();
  comprobanteCot.value = "BOLETA";
  modoPrecioCot.value = "SIN_IGV";
  descuentoCot.value = "";

  btnAgregarItem.addEventListener("click", () => agregarFila());
  $("quoteForm").addEventListener("submit", guardarCotizacion);
  btnLimpiarCotizacion.addEventListener("click", limpiarCotizacion);
  btnBuscarCliente.addEventListener("click", buscarClientePorDocumento);
  documentoClienteCot.addEventListener("keydown", (evento) => {
    if (evento.key === "Enter") {
      evento.preventDefault();
      buscarClientePorDocumento();
    }
  });
  clienteCot.addEventListener("change", completarClientePorNombre);
  monedaCot.addEventListener("change", calcularTotales);
  comprobanteCot.addEventListener("change", calcularTotales);
  descuentoCot.addEventListener("input", calcularTotales);
  modoPrecioCot.addEventListener("change", () => {
    actualizarCabeceraPrecio();
    refrescarPreciosProductos();
    calcularTotales();
  });

  await Promise.all([cargarClientes(), cargarProductos()]);

  if (editQuoteId) {
    await cargarCotizacion(editQuoteId);
  } else {
    await actualizarNumeroCotizacion();
    agregarFila();
    actualizarCabeceraPrecio();
  }
});

function establecerFechaActual() {
  fechaEmision.value = new Date().toISOString().slice(0,10);
}

async function actualizarNumeroCotizacion() {
  if (editQuoteId) return;
  try {
    const data = await FrancoAPI.apiFetch("/api/quotes/next-number");
    numeroCotizacion.value = data.quote_number || "COT01-0001";
  } catch {
    numeroCotizacion.value = "Se asigna al guardar";
  }
}

// -----------------------------------------------------
// CLIENTES CLOUD, MISMA EXPERIENCIA CLÁSICA
// -----------------------------------------------------
async function cargarClientes() {
  const data = await FrancoAPI.apiFetch("/api/clients");
  clientes = data.clients || [];
  cargarListaClientes();
}

function cargarListaClientes() {
  listaClientes.innerHTML = "";
  clientes.forEach((cliente) => {
    const opcion = document.createElement("option");
    opcion.value = cliente.name || "";
    opcion.label = cliente.document || "";
    listaClientes.appendChild(opcion);
  });
}

function encontrarClientePorNombre(nombre) {
  const objetivo = String(nombre || "").trim().toLowerCase();
  return clientes.find(c => String(c.name || "").trim().toLowerCase() === objetivo);
}

function completarClientePorNombre() {
  const cliente = encontrarClientePorNombre(clienteCot.value);
  if (!cliente) return;
  documentoClienteCot.value = cliente.document || "";
  direccionCot.value = cliente.address || "";
}

async function guardarClienteConsultado(documento, nombre, direccion) {
  if (clientes.some(c => c.document === documento)) return;
  try {
    const data = await FrancoAPI.apiFetch("/api/clients", {
      method: "POST",
      body: JSON.stringify({ document: documento, name: nombre, address: direccion || "", phone: "", email: "" })
    });
    if (data.client) clientes.push(data.client);
    cargarListaClientes();
  } catch (error) {
    // Si otro dispositivo ya lo creó, simplemente volvemos a cargar.
    if (/existe/i.test(error.message || "")) {
      await cargarClientes();
      return;
    }
    console.warn("No se pudo guardar automáticamente el cliente consultado:", error);
  }
}

async function buscarClientePorDocumento() {
  const documento = documentoClienteCot.value.trim().replace(/\D/g, "");
  documentoClienteCot.value = documento;

  if (!documento) return alert("Ingrese un RUC o DNI.");
  if (![8,11].includes(documento.length)) return alert("Ingrese un DNI de 8 dígitos o un RUC de 11 dígitos.");

  const guardado = clientes.find(c => c.document === documento);
  if (guardado) {
    clienteCot.value = guardado.name || "";
    direccionCot.value = guardado.address || "";
    return;
  }

  btnBuscarCliente.disabled = true;
  btnBuscarCliente.textContent = "Buscando...";
  try {
    const ruta = documento.length === 8 ? `/api/dni/${documento}` : `/api/ruc/${documento}`;
    const data = await FrancoAPI.apiFetch(ruta);
    const nombre = data.full_name || data.nombre_completo || data.razon_social || data.nombre_o_razon_social || data.nombres || "";
    const direccion = data.direccion || data.domicilio_fiscal || "";
    if (!nombre) throw new Error("No se encontraron datos para este documento.");
    clienteCot.value = nombre;
    direccionCot.value = direccion;
    await guardarClienteConsultado(documento, nombre, direccion);
  } catch (error) {
    alert(error.message || "No se pudo consultar el documento.");
  } finally {
    btnBuscarCliente.disabled = false;
    btnBuscarCliente.textContent = "Buscar";
  }
}

// -----------------------------------------------------
// PRODUCTOS CLOUD
// -----------------------------------------------------
async function cargarProductos() {
  const data = await FrancoAPI.apiFetch("/api/products");
  productos = (data.products || []).filter(p => p.active !== false);
  cargarListaProductos();
}

function cargarListaProductos() {
  listaCodigosProductos.innerHTML = "";
  productos.forEach((producto) => {
    const opcion = document.createElement("option");
    opcion.value = producto.code || "";
    opcion.label = producto.description || "";
    listaCodigosProductos.appendChild(opcion);
  });
}

function precioProducto(producto) {
  if (!producto) return 0;
  if (modoPrecioCot.value === "CON_IGV") {
    return Number(producto.price_with_igv ?? producto.unit_price ?? 0);
  }
  return Number(producto.base_price ?? (Number(producto.unit_price || 0) / 1.18));
}

function completarProductoFila(fila) {
  const codigoInput = fila.querySelector(".detalle-codigo");
  const codigo = codigoInput.value.trim().toUpperCase();
  codigoInput.value = codigo;
  const producto = productos.find(p => String(p.code || "").trim().toUpperCase() === codigo);
  if (!producto) return;
  fila.querySelector(".detalle-unidad").value = producto.unit || "UND";
  fila.querySelector(".detalle-descripcion").value = producto.description || "";
  fila.querySelector(".detalle-precio").value = precioProducto(producto).toFixed(2);
  calcularTotales();
}

function refrescarPreciosProductos() {
  detalleCotizacion.querySelectorAll("tr").forEach((fila) => {
    if (fila.querySelector(".detalle-codigo").value.trim()) completarProductoFila(fila);
  });
}

// -----------------------------------------------------
// FILAS DEL DETALLE
// -----------------------------------------------------
function agregarFila(datos = {}) {
  const fila = document.createElement("tr");
  fila.innerHTML = `
    <td class="numero-fila">1</td>
    <td><input type="text" class="detalle-unidad" value="${escapeAttr(datos.unit || datos.unidad || "")}" placeholder="Unidad"></td>
    <td><input type="text" class="detalle-codigo" list="listaCodigosProductos" value="${escapeAttr(datos.code || datos.codigo || "")}" placeholder="Código"></td>
    <td><input type="text" class="detalle-descripcion" value="${escapeAttr(datos.description || datos.descripcion || "")}" placeholder="Descripción"></td>
    <td><input type="number" class="detalle-cantidad" min="0" step="0.01" value="${datos.quantity ?? datos.cantidad ?? ""}" placeholder="0"></td>
    <td><input type="number" class="detalle-precio" min="0" step="0.01" value="${(datos.unit_price ?? datos.precio) !== undefined ? Number(datos.unit_price ?? datos.precio).toFixed(2) : ""}" placeholder="0.00"></td>
    <td class="detalle-total">${formatoDinero(datos.line_total || 0)}</td>
    <td class="detalle-accion"><button type="button" class="btn-eliminar-item">Eliminar</button></td>
  `;
  detalleCotizacion.appendChild(fila);
  asignarEventosFila(fila);
  renumerarFilas();
  calcularTotales();
}

function asignarEventosFila(fila) {
  fila.querySelector(".detalle-codigo").addEventListener("change", () => completarProductoFila(fila));
  fila.querySelector(".detalle-cantidad").addEventListener("input", calcularTotales);
  fila.querySelector(".detalle-precio").addEventListener("input", calcularTotales);
  fila.querySelector(".btn-eliminar-item").addEventListener("click", () => {
    const filas = detalleCotizacion.querySelectorAll("tr");
    if (filas.length === 1) limpiarFila(fila);
    else fila.remove();
    renumerarFilas();
    calcularTotales();
  });
}

function limpiarFila(fila) {
  fila.querySelector(".detalle-unidad").value = "";
  fila.querySelector(".detalle-codigo").value = "";
  fila.querySelector(".detalle-descripcion").value = "";
  fila.querySelector(".detalle-cantidad").value = "";
  fila.querySelector(".detalle-precio").value = "";
  fila.querySelector(".detalle-total").textContent = formatoDinero(0);
}

function renumerarFilas() {
  detalleCotizacion.querySelectorAll("tr").forEach((fila, indice) => {
    fila.querySelector(".numero-fila").textContent = indice + 1;
  });
}

function actualizarCabeceraPrecio() {
  cabeceraPrecio.textContent = modoPrecioCot.value === "CON_IGV" ? "Precio Unit." : "Valor Unit.";
}

function obtenerItems() {
  return [...detalleCotizacion.querySelectorAll("tr")].map(fila => ({
    unit: fila.querySelector(".detalle-unidad").value.trim() || "UND",
    code: fila.querySelector(".detalle-codigo").value.trim(),
    description: fila.querySelector(".detalle-descripcion").value.trim(),
    quantity: Number(fila.querySelector(".detalle-cantidad").value || 0),
    unit_price: Number(fila.querySelector(".detalle-precio").value || 0)
  })).filter(item => item.description && item.quantity > 0);
}

// -----------------------------------------------------
// CÁLCULOS CLÁSICOS EXACTOS
// -----------------------------------------------------
function calcularTotales() {
  let subtotalIngresado = 0;
  detalleCotizacion.querySelectorAll("tr").forEach((fila) => {
    const cantidad = Number(fila.querySelector(".detalle-cantidad").value) || 0;
    const precio = Number(fila.querySelector(".detalle-precio").value) || 0;
    const totalFila = cantidad * precio;
    fila.querySelector(".detalle-total").textContent = formatoDinero(totalFila);
    subtotalIngresado += totalFila;
  });

  let porcentaje = Number(descuentoCot.value) || 0;
  porcentaje = Math.max(0, Math.min(100, porcentaje));
  const descuento = subtotalIngresado * porcentaje / 100;
  const despuesDescuento = subtotalIngresado - descuento;

  let base = 0, impuesto = 0, total = 0;
  const rh = comprobanteCot.value === "RH";

  if (rh) {
    base = despuesDescuento;
    impuesto = base > 1500 ? base * 0.08 : 0;
    total = base - impuesto;
    textoImpuestoCot.textContent = impuesto > 0 ? "RETENCIÓN 8%" : "RETENCIÓN 0%";
  } else {
    textoImpuestoCot.textContent = "IGV 18%";
    if (modoPrecioCot.value === "CON_IGV") {
      total = despuesDescuento;
      base = total / 1.18;
      impuesto = total - base;
    } else {
      base = despuesDescuento;
      impuesto = base * 0.18;
      total = base + impuesto;
    }
  }

  subtotalCot.textContent = formatoDinero(subtotalIngresado);
  textoDescuentoCot.textContent = `DESCUENTO ${Number(porcentaje.toFixed(2))}%`;
  montoDescuentoCot.textContent = `- ${formatoDinero(descuento)}`;
  baseImponibleCot.textContent = formatoDinero(base);
  montoImpuestoCot.textContent = formatoDinero(impuesto);
  importeTotalCot.textContent = formatoDinero(total);
  importeTotalCot.dataset.valor = money2(total).toFixed(2);
  importeLetras.textContent = importeEnLetras(total);
  filaImpuestoCot.classList.remove("hidden");
}

// -----------------------------------------------------
// EDITAR COTIZACIÓN EXISTENTE
// -----------------------------------------------------
async function cargarCotizacion(id) {
  try {
    const data = await FrancoAPI.apiFetch(`/api/quotes/${id}`);
    loadedQuote = data.quote;
    numeroCotizacion.value = loadedQuote.quote_number;
    fechaEmision.value = loadedQuote.quote_date;
    documentoClienteCot.value = loadedQuote.client_document || "";
    clienteCot.value = loadedQuote.client_name || "";
    direccionCot.value = loadedQuote.client_address || "";
    monedaCot.value = loadedQuote.currency || "SOLES";
    comprobanteCot.value = loadedQuote.document_type === "RHE" ? "RH" : (loadedQuote.document_type || "FACTURA");
    modoPrecioCot.value = loadedQuote.price_mode || "CON_IGV";
    descuentoCot.value = Number(loadedQuote.discount_percent || 0).toFixed(2);
    condicionesCot.value = loadedQuote.conditions || "";

    detalleCotizacion.innerHTML = "";
    (loadedQuote.items || []).forEach(agregarFila);
    if (!(loadedQuote.items || []).length) agregarFila();

    $("pageTitle").textContent = `Editar ${loadedQuote.quote_number}`;
    btnGuardarCotizacion.textContent = "Guardar Cambios";
    actualizarCabeceraPrecio();
    calcularTotales();

    if (loadedQuote.status === "ANULADA") {
      const alerta = $("quoteStatusAlert");
      alerta.classList.remove("hidden");
      alerta.textContent = "Esta cotización está ANULADA. Reactívala desde el historial antes de editarla.";
      btnGuardarCotizacion.disabled = true;
    }
  } catch (error) {
    alert(error.message || "No se pudo cargar la cotización.");
    location.href = "cotizaciones.html";
  }
}

// -----------------------------------------------------
// GUARDAR CLIENTE MANUAL AUTOMÁTICAMENTE (COMO v1.0)
// -----------------------------------------------------
async function guardarClienteAutomaticamente() {
  const documento = documentoClienteCot.value.trim().replace(/\D/g, "");
  const nombre = clienteCot.value.trim();
  if (![8,11].includes(documento.length) || !nombre) return null;
  let existente = clientes.find(c => c.document === documento);
  if (existente) return existente;
  try {
    const data = await FrancoAPI.apiFetch("/api/clients", {
      method: "POST",
      body: JSON.stringify({ document: documento, name: nombre, address: direccionCot.value.trim(), phone: "", email: "" })
    });
    if (data.client) { clientes.push(data.client); cargarListaClientes(); return data.client; }
  } catch (error) {
    if (/existe/i.test(error.message || "")) { await cargarClientes(); return clientes.find(c => c.document === documento) || null; }
    console.warn("No se pudo guardar el cliente automáticamente:", error);
  }
  return null;
}

// -----------------------------------------------------
// GUARDAR EN SUPABASE
// -----------------------------------------------------
async function guardarCotizacion(evento) {
  evento.preventDefault();
  const items = obtenerItems();
  if (!clienteCot.value.trim()) return alert("Ingrese el cliente o razón social.");
  if (!items.length) return alert("Agrega al menos un producto o servicio.");

  const clienteAuto = await guardarClienteAutomaticamente();
  const clienteGuardado = clienteAuto || clientes.find(c => c.document === documentoClienteCot.value.trim()) || encontrarClientePorNombre(clienteCot.value);
  const payload = {
    quote_date: fechaEmision.value,
    client_id: clienteGuardado?.id || null,
    client_document: documentoClienteCot.value,
    client_name: clienteCot.value,
    client_address: direccionCot.value,
    currency: monedaCot.value,
    document_type: comprobanteCot.value === "RH" ? "RHE" : comprobanteCot.value,
    price_mode: modoPrecioCot.value,
    conditions: condicionesCot.value,
    discount_percent: Number(descuentoCot.value || 0),
    items
  };

  btnGuardarCotizacion.disabled = true;
  const textoAnterior = btnGuardarCotizacion.textContent;
  btnGuardarCotizacion.textContent = "Guardando...";
  try {
    const data = editQuoteId
      ? await FrancoAPI.apiFetch(`/api/quotes/${editQuoteId}`, { method: "PUT", body: JSON.stringify(payload) })
      : await FrancoAPI.apiFetch("/api/quotes", { method: "POST", body: JSON.stringify(payload) });
    const numero = data.quote?.quote_number || numeroCotizacion.value;
    if (editQuoteId) {
      alert(`Cotización ${numero} actualizada correctamente.`);
      location.href = "cotizaciones.html";
      return;
    }
    alert(`Cotización ${numero} guardada correctamente.`);
    await limpiarCotizacion(false);
  } catch (error) {
    alert(error.message || "No se pudo guardar la cotización.");
    btnGuardarCotizacion.disabled = false;
    btnGuardarCotizacion.textContent = textoAnterior;
  }
}

async function limpiarCotizacion(confirmar = true) {
  if (confirmar && !confirm("¿Deseas limpiar los datos de esta cotización?")) return;
  documentoClienteCot.value = "";
  clienteCot.value = "";
  direccionCot.value = "";
  monedaCot.value = "SOLES";
  comprobanteCot.value = "BOLETA";
  modoPrecioCot.value = "SIN_IGV";
  descuentoCot.value = "";
  condicionesCot.value = "";
  detalleCotizacion.innerHTML = "";
  agregarFila();
  actualizarCabeceraPrecio();
  establecerFechaActual();
  if (!editQuoteId) await actualizarNumeroCotizacion();
  calcularTotales();
  documentoClienteCot.focus();
}
