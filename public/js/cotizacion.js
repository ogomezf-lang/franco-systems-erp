// =====================================================
// FRANCO SYSTEMS
// NUEVA / EDITAR COTIZACIÓN
// VERSION 1.0
// =====================================================

verificarSesion();


// =====================================================
// DATOS
// =====================================================

let clientes =
    JSON.parse(
        localStorage.getItem("francoClientes")
    ) || [];

let productos =
    JSON.parse(
        localStorage.getItem("francoProductos")
    ) || [];

let cotizaciones =
    JSON.parse(
        localStorage.getItem("francoCotizaciones")
    ) || [];


// =====================================================
// MODO EDICIÓN
// =====================================================

const parametrosURL =
    new URLSearchParams(
        window.location.search
    );

const indiceURL =
    parametrosURL.get("editar");

let indiceEditando =
    indiceURL !== null
        ? Number(indiceURL)
        : null;

const modoEdicion =
    indiceURL !== null &&
    Number.isInteger(indiceEditando) &&
    indiceEditando >= 0;


// =====================================================
// TOPBAR
// =====================================================

const usuario =
    obtenerUsuarioActual();

const usuarioActual =
    document.getElementById(
        "usuarioActual"
    );

const usuarioAvatar =
    document.getElementById(
        "usuarioAvatar"
    );

const empresaActual =
    document.getElementById(
        "empresaActual"
    );


if (usuarioActual) {

    usuarioActual.textContent =
        usuario;

}


if (usuarioAvatar) {

    usuarioAvatar.textContent =
        usuario
            .charAt(0)
            .toUpperCase();

}


const configuracion =
    JSON.parse(
        localStorage.getItem(
            "francoConfiguracion"
        )
    ) || {};


if (empresaActual) {

    empresaActual.textContent =
        configuracion.razonSocial ||
        "Mi Empresa";

}


// =====================================================
// ELEMENTOS
// =====================================================

const numeroCotizacion =
    document.getElementById(
        "numeroCotizacion"
    );

const fechaEmision =
    document.getElementById(
        "fechaEmision"
    );

const documentoClienteCot =
    document.getElementById(
        "documentoClienteCot"
    );

const clienteCot =
    document.getElementById(
        "clienteCot"
    );

const direccionCot =
    document.getElementById(
        "direccionCot"
    );

const monedaCot =
    document.getElementById(
        "monedaCot"
    );

const comprobanteCot =
    document.getElementById(
        "comprobanteCot"
    );

const modoPrecioCot =
    document.getElementById(
        "modoPrecioCot"
    );

const descuentoCot =
    document.getElementById(
        "descuentoCot"
    );

const condicionesCot =
    document.getElementById(
        "condicionesCot"
    );

const detalleCotizacion =
    document.getElementById(
        "detalleCotizacion"
    );

const btnAgregarItem =
    document.getElementById(
        "btnAgregarItem"
    );

const btnBuscarCliente =
    document.getElementById(
        "btnBuscarCliente"
    );

const btnGuardarCotizacion =
    document.getElementById(
        "btnGuardarCotizacion"
    );

const btnLimpiarCotizacion =
    document.getElementById(
        "btnLimpiarCotizacion"
    );

const btnCerrarSesion =
    document.getElementById(
        "btnCerrarSesion"
    );

const listaClientes =
    document.getElementById(
        "listaClientes"
    );

const listaCodigosProductos =
    document.getElementById(
        "listaCodigosProductos"
    );

const cabeceraPrecio =
    document.getElementById(
        "cabeceraPrecio"
    );


// =====================================================
// TOTALES
// =====================================================

const subtotalCot =
    document.getElementById(
        "subtotalCot"
    );

const textoDescuentoCot =
    document.getElementById(
        "textoDescuentoCot"
    );

const montoDescuentoCot =
    document.getElementById(
        "montoDescuentoCot"
    );

const baseImponibleCot =
    document.getElementById(
        "baseImponibleCot"
    );

const textoImpuestoCot =
    document.getElementById(
        "textoImpuestoCot"
    );

const montoImpuestoCot =
    document.getElementById(
        "montoImpuestoCot"
    );

const importeTotalCot =
    document.getElementById(
        "importeTotalCot"
    );

const importeLetras =
    document.getElementById(
        "importeLetras"
    );


// =====================================================
// FECHA
// =====================================================

function establecerFechaActual() {

    const hoy =
        new Date();

    const anio =
        hoy.getFullYear();

    const mes =
        String(
            hoy.getMonth() + 1
        ).padStart(
            2,
            "0"
        );

    const dia =
        String(
            hoy.getDate()
        ).padStart(
            2,
            "0"
        );

    fechaEmision.value =
        `${anio}-${mes}-${dia}`;
}


// =====================================================
// CORRELATIVO
// =====================================================

function obtenerSiguienteCorrelativo() {

    let correlativo =
        Number(
            localStorage.getItem(
                "francoCorrelativo"
            )
        );

    if (
        !correlativo ||
        correlativo < 1
    ) {

        correlativo = 1;

    }

    return (
        "COT01-" +
        String(
            correlativo
        ).padStart(
            4,
            "0"
        )
    );
}


function actualizarNumeroCotizacion() {

    numeroCotizacion.value =
        obtenerSiguienteCorrelativo();

}


// =====================================================
// CLIENTES
// =====================================================

function cargarListaClientes() {

    listaClientes.innerHTML =
        "";

    clientes.forEach(
        function (cliente) {

            const opcion =
                document.createElement(
                    "option"
                );

            opcion.value =
                cliente.nombre;

            opcion.label =
                cliente.documento;

            listaClientes.appendChild(
                opcion
            );

        }
    );

}


// =====================================================
// BUSCAR CLIENTE
// LOCAL PRIMERO -> API DESPUÉS
// =====================================================

async function buscarClientePorDocumento() {

    const documento =
        documentoClienteCot
            .value
            .trim()
            .replace(/\D/g, "");

    documentoClienteCot.value =
        documento;


    if (documento === "") {

        alert("Ingrese un RUC o DNI.");

        documentoClienteCot.focus();

        return;

    }


    if (
        documento.length !== 8 &&
        documento.length !== 11
    ) {

        alert(
            "Ingrese un DNI de 8 dígitos o un RUC de 11 dígitos."
        );

        documentoClienteCot.focus();

        return;

    }


    // =========================================
    // 1. BUSCAR PRIMERO EN CLIENTES GUARDADOS
    // =========================================

    const clienteGuardado =
        clientes.find(
            function (cliente) {

                return (
                    cliente.documento ===
                    documento
                );

            }
        );


    if (clienteGuardado) {

        clienteCot.value =
            clienteGuardado.nombre || "";

        direccionCot.value =
            clienteGuardado.direccion || "";

        return;

    }


    // =========================================
    // 2. CONSULTAR API
    // =========================================

    try {

        btnBuscarCliente.disabled =
            true;

        btnBuscarCliente.textContent =
            "Buscando...";


        let url = "";


        if (
            documento.length === 11
        ) {

            url =
                `http://localhost:3000/api/ruc/${documento}`;

        } else {

            url =
                `http://localhost:3000/api/dni/${documento}`;

        }


        const respuesta =
            await fetch(url);


        const data =
            await respuesta.json();


        if (!respuesta.ok) {

            throw new Error(
                data.mensaje ||
                data.error ||
                "No se pudo consultar el documento."
            );

        }


        // =========================================
        // RUC
        // =========================================

        if (
            documento.length === 11
        ) {

            if (!data.razon_social) {

                alert(
                    "No se encontraron datos para este RUC."
                );

                return;

            }


            clienteCot.value =
                data.razon_social;

            direccionCot.value =
                data.direccion || "";

        }


        // =========================================
        // DNI
        // =========================================

        else {

            if (!data.full_name) {

                alert(
                    "No se encontraron datos para este DNI."
                );

                return;

            }


            clienteCot.value =
                data.full_name;

            direccionCot.value =
                "";

        }


        // =========================================
        // 3. GUARDAR AUTOMÁTICAMENTE EL CLIENTE
        // =========================================

        const nuevoCliente = {

            documento:
                documento,

            tipo:
                documento.length === 11
                    ? "EMPRESA"
                    : "PERSONA",

            nombre:
                documento.length === 11
                    ? data.razon_social
                    : data.full_name,

            direccion:
                documento.length === 11
                    ? data.direccion || ""
                    : "",

            telefono:
                "",

            correo:
                "",

            fechaRegistro:
                new Date()
                    .toISOString()

        };


        clientes.push(
            nuevoCliente
        );


        localStorage.setItem(
            "francoClientes",
            JSON.stringify(clientes)
        );


        cargarListaClientes();


    } catch (error) {

        console.error(
            "Error consultando documento:",
            error
        );


        alert(
            "No se pudo consultar el documento. Verifique que el servidor esté encendido."
        );


    } finally {

        btnBuscarCliente.disabled =
            false;

        btnBuscarCliente.textContent =
            "Buscar";

    }

}

// =====================================================
// EVENTO BUSCAR
// =====================================================

btnBuscarCliente.addEventListener(
    "click",
    buscarClientePorDocumento
);


documentoClienteCot.addEventListener(
    "keydown",
    function (evento) {

        if (
            evento.key ===
            "Enter"
        ) {

            evento.preventDefault();

            buscarClientePorDocumento();

        }

    }
);


// =====================================================
// SELECCIONAR CLIENTE POR NOMBRE
// =====================================================

clienteCot.addEventListener(
    "change",
    function () {

        const nombre =
            clienteCot
                .value
                .trim()
                .toLowerCase();


        const cliente =
            clientes.find(
                function (item) {

                    return (
                        String(
                            item.nombre ||
                            ""
                        )
                            .toLowerCase() ===
                        nombre
                    );

                }
            );


        if (
            !cliente
        ) {

            return;

        }


        documentoClienteCot.value =
            cliente.documento ||
            "";

        direccionCot.value =
            cliente.direccion ||
            "";

    }
);


// =====================================================
// PRODUCTOS
// =====================================================

function cargarListaProductos() {

    listaCodigosProductos.innerHTML =
        "";

    productos.forEach(
        function (producto) {

            const opcion =
                document.createElement(
                    "option"
                );

            opcion.value =
                producto.codigo;

            opcion.label =
                producto.descripcion;

            listaCodigosProductos.appendChild(
                opcion
            );

        }
    );

}


// =====================================================
// AGREGAR FILA
// =====================================================

function agregarFila(
    datos = {}
) {

    const fila =
        document.createElement(
            "tr"
        );


    fila.innerHTML = `

        <td class="numero-fila">
            1
        </td>


        <td>

            <input
                type="text"
                class="detalle-unidad"
                value="${datos.unidad || ""}"
                placeholder="Unidad"
            >

        </td>


        <td>

            <input
                type="text"
                class="detalle-codigo"
                list="listaCodigosProductos"
                value="${datos.codigo || ""}"
                placeholder="Código"
            >

        </td>


        <td>

            <input
                type="text"
                class="detalle-descripcion"
                value="${datos.descripcion || ""}"
                placeholder="Descripción"
            >

        </td>


        <td>

            <input
                type="number"
                class="detalle-cantidad"
                min="0"
                step="0.01"
                value="${datos.cantidad ?? ""}"
                placeholder="0"
            >

        </td>


        <td>

            <input
                type="number"
                class="detalle-precio"
                min="0"
                step="0.01"
                value="${datos.precio ?? ""}"
                placeholder="0.00"
            >

        </td>


        <td class="detalle-total">
            0.00
        </td>


        <td class="detalle-accion">

            <button
                type="button"
                class="btn-eliminar-item"
            >
                Eliminar
            </button>

        </td>

    `;


    detalleCotizacion.appendChild(
        fila
    );


    asignarEventosFila(
        fila
    );


    renumerarFilas();

    calcularTotales();

}


// =====================================================
// EVENTOS FILA
// =====================================================

function asignarEventosFila(
    fila
) {

    const codigo =
        fila.querySelector(
            ".detalle-codigo"
        );

    const cantidad =
        fila.querySelector(
            ".detalle-cantidad"
        );

    const precio =
        fila.querySelector(
            ".detalle-precio"
        );

    const eliminar =
        fila.querySelector(
            ".btn-eliminar-item"
        );


    codigo.addEventListener(
        "change",
        function () {

            completarProductoFila(
                fila
            );

        }
    );


    cantidad.addEventListener(
        "input",
        calcularTotales
    );


    precio.addEventListener(
        "input",
        calcularTotales
    );


    eliminar.addEventListener(
        "click",
        function () {

            const filas =
                detalleCotizacion
                    .querySelectorAll(
                        "tr"
                    );


            if (
                filas.length === 1
            ) {

                limpiarFila(
                    fila
                );

                return;

            }


            fila.remove();

            renumerarFilas();

            calcularTotales();

        }
    );

}


// =====================================================
// PRODUCTO POR CÓDIGO
// =====================================================

function completarProductoFila(
    fila
) {

    const codigoInput =
        fila.querySelector(
            ".detalle-codigo"
        );


    const codigo =
        codigoInput
            .value
            .trim()
            .toUpperCase();


    codigoInput.value =
        codigo;


    const producto =
        productos.find(
            function (item) {

                return (
                    String(
                        item.codigo ||
                        ""
                    )
                        .toUpperCase() ===
                    codigo
                );

            }
        );


    if (
        !producto
    ) {

        return;

    }


    fila.querySelector(
        ".detalle-unidad"
    ).value =
        producto.unidad ||
        "";


    fila.querySelector(
        ".detalle-descripcion"
    ).value =
        producto.descripcion ||
        "";


    const precioInput =
        fila.querySelector(
            ".detalle-precio"
        );


    if (
        modoPrecioCot.value ===
        "CON_IGV"
    ) {

        precioInput.value =
            Number(
                producto.precioConIgv ||
                0
            ).toFixed(
                2
            );

    } else {

        precioInput.value =
            Number(
                producto.valorSinIgv ||
                0
            ).toFixed(
                2
            );

    }


    calcularTotales();

}


// =====================================================
// LIMPIAR FILA
// =====================================================

function limpiarFila(
    fila
) {

    fila.querySelector(
        ".detalle-unidad"
    ).value = "";

    fila.querySelector(
        ".detalle-codigo"
    ).value = "";

    fila.querySelector(
        ".detalle-descripcion"
    ).value = "";

    fila.querySelector(
        ".detalle-cantidad"
    ).value = "";

    fila.querySelector(
        ".detalle-precio"
    ).value = "";

    fila.querySelector(
        ".detalle-total"
    ).textContent =
        "0.00";


    calcularTotales();

}


// =====================================================
// RENUMERAR
// =====================================================

function renumerarFilas() {

    detalleCotizacion
        .querySelectorAll(
            "tr"
        )
        .forEach(
            function (
                fila,
                indice
            ) {

                fila.querySelector(
                    ".numero-fila"
                ).textContent =
                    indice + 1;

            }
        );

}


// =====================================================
// MODO DE PRECIO
// =====================================================

modoPrecioCot.addEventListener(
    "change",
    function () {

        cabeceraPrecio.textContent =
            modoPrecioCot.value ===
            "CON_IGV"
                ? "Precio Unit."
                : "Valor Unit.";


        detalleCotizacion
            .querySelectorAll(
                "tr"
            )
            .forEach(
                function (fila) {

                    const codigo =
                        fila.querySelector(
                            ".detalle-codigo"
                        )
                            .value
                            .trim();


                    if (
                        codigo !== ""
                    ) {

                        completarProductoFila(
                            fila
                        );

                    }

                }
            );


        calcularTotales();

    }
);


comprobanteCot.addEventListener(
    "change",
    calcularTotales
);


monedaCot.addEventListener(
    "change",
    calcularTotales
);


descuentoCot.addEventListener(
    "input",
    calcularTotales
);


// =====================================================
// CALCULAR TOTALES
// =====================================================

function calcularTotales() {

    let subtotalIngresado =
        0;


    detalleCotizacion
        .querySelectorAll(
            "tr"
        )
        .forEach(
            function (fila) {

                const cantidad =
                    Number(
                        fila.querySelector(
                            ".detalle-cantidad"
                        ).value
                    ) || 0;


                const precio =
                    Number(
                        fila.querySelector(
                            ".detalle-precio"
                        ).value
                    ) || 0;


                const totalFila =
                    cantidad *
                    precio;


                fila.querySelector(
                    ".detalle-total"
                ).textContent =
                    totalFila.toFixed(
                        2
                    );


                subtotalIngresado +=
                    totalFila;

            }
        );


    let porcentajeDescuento =
        Number(
            descuentoCot.value
        ) || 0;


    porcentajeDescuento =
        Math.max(
            0,
            Math.min(
                100,
                porcentajeDescuento
            )
        );


    const montoDescuento =
        subtotalIngresado *
        porcentajeDescuento /
        100;


    const despuesDescuento =
        subtotalIngresado -
        montoDescuento;


    let baseImponible =
        0;

    let impuesto =
        0;

    let totalFinal =
        0;


    // =================================================
    // RECIBO POR HONORARIOS
    // =================================================

    if (
        comprobanteCot.value ===
        "RH"
    ) {

        baseImponible =
            despuesDescuento;


        if (
            baseImponible > 1500
        ) {

            impuesto =
                baseImponible *
                0.08;

            textoImpuestoCot.textContent =
                "RETENCIÓN 8%";

        } else {

            impuesto =
                0;

            textoImpuestoCot.textContent =
                "RETENCIÓN 0%";

        }


        totalFinal =
            baseImponible -
            impuesto;

    }


    // =================================================
    // FACTURA / BOLETA
    // =================================================

    else {

        textoImpuestoCot.textContent =
            "IGV 18%";


        if (
            modoPrecioCot.value ===
            "CON_IGV"
        ) {

            totalFinal =
                despuesDescuento;


            baseImponible =
                totalFinal /
                1.18;


            impuesto =
                totalFinal -
                baseImponible;

        } else {

            baseImponible =
                despuesDescuento;


            impuesto =
                baseImponible *
                0.18;


            totalFinal =
                baseImponible +
                impuesto;

        }

    }


    mostrarTotales(

        subtotalIngresado,

        porcentajeDescuento,

        montoDescuento,

        baseImponible,

        impuesto,

        totalFinal

    );

}


// =====================================================
// MOSTRAR TOTALES
// =====================================================

function mostrarTotales(
    subtotal,
    porcentaje,
    descuento,
    base,
    impuesto,
    total
) {

    const simbolo =
        monedaCot.value ===
        "DOLARES"
            ? "$"
            : "S/";


    subtotalCot.textContent =
        `${simbolo} ${subtotal.toFixed(2)}`;


    textoDescuentoCot.textContent =
        `DESCUENTO ${porcentaje}%`;


    montoDescuentoCot.textContent =
        `- ${simbolo} ${descuento.toFixed(2)}`;


    baseImponibleCot.textContent =
        `${simbolo} ${base.toFixed(2)}`;


    montoImpuestoCot.textContent =
        `${simbolo} ${impuesto.toFixed(2)}`;


    importeTotalCot.textContent =
        `${simbolo} ${total.toFixed(2)}`;


    importeTotalCot.dataset.valor =
        total.toFixed(
            2
        );


    importeLetras.textContent =
        convertirImporteLetras(
            total,
            monedaCot.value
        );

}


// =====================================================
// NÚMEROS A LETRAS
// =====================================================

function convertirNumero(
    numero
) {

    const unidades = [
        "",
        "UNO",
        "DOS",
        "TRES",
        "CUATRO",
        "CINCO",
        "SEIS",
        "SIETE",
        "OCHO",
        "NUEVE",
        "DIEZ",
        "ONCE",
        "DOCE",
        "TRECE",
        "CATORCE",
        "QUINCE",
        "DIECISÉIS",
        "DIECISIETE",
        "DIECIOCHO",
        "DIECINUEVE",
        "VEINTE"
    ];


    const decenas = [
        "",
        "",
        "VEINTI",
        "TREINTA",
        "CUARENTA",
        "CINCUENTA",
        "SESENTA",
        "SETENTA",
        "OCHENTA",
        "NOVENTA"
    ];


    const centenas = [
        "",
        "CIENTO",
        "DOSCIENTOS",
        "TRESCIENTOS",
        "CUATROCIENTOS",
        "QUINIENTOS",
        "SEISCIENTOS",
        "SETECIENTOS",
        "OCHOCIENTOS",
        "NOVECIENTOS"
    ];


    numero =
        Math.floor(
            numero
        );


    if (
        numero === 0
    ) {

        return "CERO";

    }


    if (
        numero === 100
    ) {

        return "CIEN";

    }


    if (
        numero <= 20
    ) {

        return unidades[
            numero
        ];

    }


    if (
        numero < 100
    ) {

        const d =
            Math.floor(
                numero / 10
            );

        const u =
            numero % 10;


        if (
            d === 2
        ) {

            return (
                u === 0
                    ? "VEINTE"
                    : "VEINTI" +
                      unidades[u]
            );

        }


        return (
            decenas[d] +
            (
                u
                    ? " Y " +
                      unidades[u]
                    : ""
            )
        );

    }


    if (
        numero < 1000
    ) {

        const c =
            Math.floor(
                numero / 100
            );

        const resto =
            numero % 100;


        return (
            centenas[c] +
            (
                resto
                    ? " " +
                      convertirNumero(
                          resto
                      )
                    : ""
            )
        );

    }


    if (
        numero < 1000000
    ) {

        const miles =
            Math.floor(
                numero / 1000
            );

        const resto =
            numero % 1000;


        return (
            (
                miles === 1
                    ? "MIL"
                    : convertirNumero(
                        miles
                    ) +
                    " MIL"
            ) +
            (
                resto
                    ? " " +
                      convertirNumero(
                          resto
                      )
                    : ""
            )
        );

    }


    return (
        numero.toLocaleString(
            "es-PE"
        )
    );

}


// =====================================================
// IMPORTE EN LETRAS
// =====================================================

function convertirImporteLetras(
    total,
    moneda
) {

    const entero =
        Math.floor(
            total
        );


    let centimos =
        Math.round(
            (
                total -
                entero
            ) *
            100
        );


    if (
        centimos === 100
    ) {

        centimos = 0;

    }


    const nombreMoneda =
        moneda ===
        "DOLARES"
            ? "DÓLARES"
            : "SOLES";


    return (
        "SON " +
        convertirNumero(
            entero
        ) +
        " Y " +
        String(
            centimos
        ).padStart(
            2,
            "0"
        ) +
        "/100 " +
        nombreMoneda
    );

}


// =====================================================
// AGREGAR ITEM
// =====================================================

btnAgregarItem.addEventListener(
    "click",
    function () {

        agregarFila();

    }
);


// =====================================================
// VALIDAR
// =====================================================

function validarCotizacion() {

    if (
        fechaEmision.value ===
        ""
    ) {

        alert(
            "Seleccione la fecha de emisión."
        );

        fechaEmision.focus();

        return false;

    }


    if (
        documentoClienteCot
            .value
            .trim() ===
        ""
    ) {

        alert(
            "Ingrese el RUC o DNI del cliente."
        );

        documentoClienteCot.focus();

        return false;

    }


    if (
        clienteCot
            .value
            .trim() ===
        ""
    ) {

        alert(
            "Ingrese el nombre o razón social."
        );

        clienteCot.focus();

        return false;

    }


    let tieneDetalle =
        false;


    detalleCotizacion
        .querySelectorAll(
            "tr"
        )
        .forEach(
            function (fila) {

                const descripcion =
                    fila.querySelector(
                        ".detalle-descripcion"
                    )
                        .value
                        .trim();


                const cantidad =
                    Number(
                        fila.querySelector(
                            ".detalle-cantidad"
                        ).value
                    ) || 0;


                if (
                    descripcion !== "" &&
                    cantidad > 0
                ) {

                    tieneDetalle =
                        true;

                }

            }
        );


    if (
        !tieneDetalle
    ) {

        alert(
            "Agregue al menos un producto o servicio válido."
        );

        return false;

    }


    return true;

}


// =====================================================
// OBTENER DETALLE
// =====================================================

function obtenerDetalle() {

    const detalle =
        [];


    detalleCotizacion
        .querySelectorAll(
            "tr"
        )
        .forEach(
            function (
                fila,
                indice
            ) {

                const descripcion =
                    fila.querySelector(
                        ".detalle-descripcion"
                    )
                        .value
                        .trim();


                const cantidad =
                    Number(
                        fila.querySelector(
                            ".detalle-cantidad"
                        ).value
                    ) || 0;


                const precio =
                    Number(
                        fila.querySelector(
                            ".detalle-precio"
                        ).value
                    ) || 0;


                if (
                    descripcion === "" ||
                    cantidad <= 0
                ) {

                    return;

                }


                detalle.push({

                    numero:
                        indice + 1,

                    unidad:
                        fila.querySelector(
                            ".detalle-unidad"
                        )
                            .value
                            .trim(),

                    codigo:
                        fila.querySelector(
                            ".detalle-codigo"
                        )
                            .value
                            .trim(),

                    descripcion:
                        descripcion,

                    cantidad:
                        cantidad,

                    precio:
                        precio,

                    total:
                        cantidad *
                        precio

                });

            }
        );


    return detalle;

}


// =====================================================
// GUARDAR CLIENTE AUTOMÁTICO
// =====================================================

function guardarClienteAutomaticamente() {

    const documento =
        documentoClienteCot
            .value
            .trim();


    const existe =
        clientes.some(
            function (cliente) {

                return (
                    cliente.documento ===
                    documento
                );

            }
        );


    if (
        existe
    ) {

        return;

    }


    const nuevoCliente = {

        documento:
            documento,

        tipo:
            documento.length === 11
                ? "EMPRESA"
                : "PERSONA",

        nombre:
            clienteCot
                .value
                .trim(),

        direccion:
            direccionCot
                .value
                .trim(),

        telefono:
            "",

        correo:
            "",

        fechaRegistro:
            new Date()
                .toISOString()

    };


    clientes.push(
        nuevoCliente
    );


    localStorage.setItem(
        "francoClientes",
        JSON.stringify(
            clientes
        )
    );


    cargarListaClientes();

}


// =====================================================
// OBTENER OBJETO COTIZACIÓN
// =====================================================

function obtenerDatosCotizacion() {

    calcularTotales();


    return {

        numero:
            numeroCotizacion.value,

        fechaEmision:
            fechaEmision.value,

        documento:
            documentoClienteCot
                .value
                .trim(),

        cliente:
            clienteCot
                .value
                .trim(),

        direccion:
            direccionCot
                .value
                .trim(),

        moneda:
            monedaCot.value,

        comprobante:
            comprobanteCot.value,

        modoPrecio:
            modoPrecioCot.value,

        descuento:
            Number(
                descuentoCot.value
            ) || 0,

        condiciones:
            condicionesCot
                .value
                .trim(),

        detalle:
            obtenerDetalle(),

        totalNumerico:
            Number(
                importeTotalCot
                    .dataset
                    .valor
            ) || 0,

        importeLetras:
            importeLetras
                .textContent,

        usuario:
            usuario

    };

}


// =====================================================
// GUARDAR / EDITAR
// =====================================================

btnGuardarCotizacion.addEventListener(
    "click",
    function () {

        if (
            !validarCotizacion()
        ) {

            return;

        }


        guardarClienteAutomaticamente();


        const datos =
            obtenerDatosCotizacion();


        // =================================================
        // EDITAR
        // =================================================

        if (
            modoEdicion &&
            indiceEditando !== null
        ) {

            const anterior =
                cotizaciones[
                    indiceEditando
                ];


            if (
                !anterior
            ) {

                alert(
                    "No se encontró la cotización a editar."
                );

                return;

            }


            cotizaciones[
                indiceEditando
            ] = {

                ...anterior,

                ...datos,

                numero:
                    anterior.numero,

                estado:
                    anterior.estado ||
                    "ACTIVA",

                fechaRegistro:
                    anterior.fechaRegistro ||
                    new Date()
                        .toISOString(),

                fechaModificacion:
                    new Date()
                        .toISOString()

            };


            localStorage.setItem(
                "francoCotizaciones",
                JSON.stringify(
                    cotizaciones
                )
            );


            alert(
                `Cotización ${anterior.numero} actualizada correctamente.`
            );


            window.location.href =
                "cotizaciones.html";


            return;

        }


        // =================================================
        // NUEVA
        // =================================================

        const nuevaCotizacion = {

            ...datos,

            estado:
                "ACTIVA",

            fechaRegistro:
                new Date()
                    .toISOString()

        };


        cotizaciones.push(
            nuevaCotizacion
        );


        localStorage.setItem(
            "francoCotizaciones",
            JSON.stringify(
                cotizaciones
            )
        );


        let correlativo =
            Number(
                localStorage.getItem(
                    "francoCorrelativo"
                )
            ) || 1;


        correlativo++;


        localStorage.setItem(
            "francoCorrelativo",
            correlativo
        );


        alert(
            `Cotización ${nuevaCotizacion.numero} guardada correctamente.`
        );


        limpiarCotizacion();

    }
);


// =====================================================
// LIMPIAR
// =====================================================

function limpiarCotizacion() {

    documentoClienteCot.value =
        "";

    clienteCot.value =
        "";

    direccionCot.value =
        "";

    monedaCot.value =
        "SOLES";

    comprobanteCot.value =
        "BOLETA";

    modoPrecioCot.value =
        "SIN_IGV";

    descuentoCot.value =
        "";

    condicionesCot.value =
        "";

    detalleCotizacion.innerHTML =
        "";


    btnGuardarCotizacion.textContent =
        "Guardar Cotización";


    agregarFila();

    establecerFechaActual();

    actualizarNumeroCotizacion();


    cabeceraPrecio.textContent =
        "Valor Unit.";


    calcularTotales();


    documentoClienteCot.focus();

}


// =====================================================
// CARGAR COTIZACIÓN PARA EDITAR
// =====================================================

function cargarCotizacionParaEditar() {

    if (
        !modoEdicion
    ) {

        return false;

    }


    const cotizacion =
        cotizaciones[
            indiceEditando
        ];


    if (
        !cotizacion
    ) {

        alert(
            "No se encontró la cotización que desea editar."
        );


        window.location.href =
            "cotizaciones.html";


        return true;

    }


    if (
        cotizacion.estado ===
        "ANULADA"
    ) {

        alert(
            "La cotización está anulada. Reactívela antes de editarla."
        );


        window.location.href =
            "cotizaciones.html";


        return true;

    }


    numeroCotizacion.value =
        cotizacion.numero ||
        "";


    fechaEmision.value =
        cotizacion.fechaEmision ||
        "";


    documentoClienteCot.value =
        cotizacion.documento ||
        "";


    clienteCot.value =
        cotizacion.cliente ||
        "";


    direccionCot.value =
        cotizacion.direccion ||
        "";


    monedaCot.value =
        cotizacion.moneda ||
        "SOLES";


    comprobanteCot.value =
        cotizacion.comprobante ||
        "BOLETA";


    modoPrecioCot.value =
        cotizacion.modoPrecio ||
        "SIN_IGV";


    descuentoCot.value =
        Number(
            cotizacion.descuento
        ) || "";


    condicionesCot.value =
        cotizacion.condiciones ||
        "";


    cabeceraPrecio.textContent =
        modoPrecioCot.value ===
        "CON_IGV"
            ? "Precio Unit."
            : "Valor Unit.";


    detalleCotizacion.innerHTML =
        "";


    const detalle =
        Array.isArray(
            cotizacion.detalle
        )
            ? cotizacion.detalle
            : [];


    if (
        detalle.length === 0
    ) {

        agregarFila();

    } else {

        detalle.forEach(
            function (item) {

                agregarFila({

                    unidad:
                        item.unidad ||
                        "",

                    codigo:
                        item.codigo ||
                        "",

                    descripcion:
                        item.descripcion ||
                        "",

                    cantidad:
                        item.cantidad,

                    precio:
                        item.precio

                });

            }
        );

    }


    btnGuardarCotizacion.textContent =
        "Guardar Cambios";


    calcularTotales();


    return true;

}


// =====================================================
// BOTÓN LIMPIAR
// =====================================================

btnLimpiarCotizacion.addEventListener(
    "click",
    function () {

        if (
            modoEdicion
        ) {

            const confirmar =
                confirm(
                    "Está editando una cotización. ¿Desea cancelar la edición?"
                );


            if (
                confirmar
            ) {

                window.location.href =
                    "cotizaciones.html";

            }


            return;

        }


        const confirmar =
            confirm(
                "¿Desea limpiar la cotización actual?"
            );


        if (
            !confirmar
        ) {

            return;

        }


        limpiarCotizacion();

    }
);


// =====================================================
// SALIR
// =====================================================

btnCerrarSesion.addEventListener(
    "click",
    function () {

        const confirmar =
            confirm(
                "¿Desea cerrar la sesión?"
            );


        if (
            confirmar
        ) {

            cerrarSesion();

        }

    }
);


// =====================================================
// INICIAR
// =====================================================

cargarListaClientes();

cargarListaProductos();


const seCargoEdicion =
    cargarCotizacionParaEditar();


if (
    !seCargoEdicion
) {

    establecerFechaActual();

    actualizarNumeroCotizacion();

    agregarFila();

    calcularTotales();

}