// =====================================================
// FRANCO SYSTEMS
// VER COTIZACIÓN
// VERSION 1.0
// =====================================================


verificarSesion();


// =====================================================
// OBTENER COTIZACIONES
// =====================================================

const cotizaciones =
    JSON.parse(
        localStorage.getItem(
            "francoCotizaciones"
        )
    ) || [];


// =====================================================
// OBTENER ÍNDICE
// =====================================================

const indiceTexto =
    sessionStorage.getItem(
        "francoCotizacionVer"
    );


if (
    indiceTexto === null
) {

    alert(
        "No se seleccionó ninguna cotización."
    );

    window.location.href =
        "cotizaciones.html";

}


const indice =
    Number(
        indiceTexto
    );


const cotizacion =
    cotizaciones[
        indice
    ];


if (!cotizacion) {

    alert(
        "No se encontró la cotización."
    );

    window.location.href =
        "cotizaciones.html";

}


// =====================================================
// CONFIGURACIÓN EMPRESA
// =====================================================

const configuracion =
    JSON.parse(
        localStorage.getItem(
            "francoConfiguracion"
        )
    ) || {};


// =====================================================
// FUNCIONES
// =====================================================

function formatearFecha(
    fecha
) {

    if (!fecha) {

        return "-";

    }


    const partes =
        fecha.split("-");


    if (
        partes.length !== 3
    ) {

        return fecha;

    }


    return (
        partes[2] +
        "/" +
        partes[1] +
        "/" +
        partes[0]
    );

}


function numeroSeguro(
    valor
) {

    return (
        Number(valor) ||
        0
    );

}


function simboloMoneda() {

    return (
        cotizacion.moneda ===
        "DOLARES"
            ? "$"
            : "S/"
    );

}


// =====================================================
// EMPRESA
// =====================================================

document.getElementById(
    "razonSocialDoc"
).textContent =
    configuracion.razonSocial ||
    "EMPRESA";


document.getElementById(
    "rucEmpresaDoc"
).textContent =
    configuracion.ruc ||
    "-";


document.getElementById(
    "direccionEmpresaDoc"
).textContent =
    configuracion.direccion ||
    "";


document.getElementById(
    "ubicacionEmpresaDoc"
).textContent =
    configuracion.ubicacion ||
    "";


document.getElementById(
    "telefonoEmpresaDoc"
).textContent =
    configuracion.telefono ||
    "-";


document.getElementById(
    "correoEmpresaDoc"
).textContent =
    configuracion.correo ||
    "-";


// LOGO

const logoEmpresaDoc =
    document.getElementById(
        "logoEmpresaDoc"
    );


if (
    configuracion.logoEmpresa
) {

    logoEmpresaDoc.src =
        configuracion.logoEmpresa;


} else {

    logoEmpresaDoc.style.display =
        "none";

}


// =====================================================
// DATOS COTIZACIÓN
// =====================================================

document.getElementById(
    "numeroCotizacionDoc"
).textContent =
    cotizacion.numero ||
    "-";


document.getElementById(
    "documentoClienteDoc"
).textContent =
    cotizacion.documento ||
    "-";


document.getElementById(
    "clienteDoc"
).textContent =
    cotizacion.cliente ||
    "-";


document.getElementById(
    "direccionClienteDoc"
).textContent =
    cotizacion.direccion ||
    "-";


document.getElementById(
    "fechaEmisionDoc"
).textContent =
    formatearFecha(
        cotizacion.fechaEmision
    );


document.getElementById(
    "monedaDoc"
).textContent =
    cotizacion.moneda ||
    "SOLES";


document.getElementById(
    "descuentoDoc"
).textContent =
    (
        numeroSeguro(
            cotizacion.descuento
        )
    ) +
    "%";


document.getElementById(
    "comprobanteDoc"
).textContent =
    cotizacion.comprobante ===
    "RH"
        ? "RECIBO POR HONORARIOS"
        : (
            cotizacion.comprobante ||
            "-"
        );


// =====================================================
// TITULO PRECIO
// =====================================================

document.getElementById(
    "docTituloPrecio"
).textContent =
    cotizacion.modoPrecio ===
    "CON_IGV"
        ? "P. UNIT."
        : "V. UNIT.";


// =====================================================
// DETALLE
// =====================================================

const detalleDocumento =
    document.getElementById(
        "detalleDocumento"
    );


detalleDocumento.innerHTML =
    "";


(
    cotizacion.detalle ||
    []
).forEach(
    function (
        item,
        indiceItem
    ) {

        const fila =
            document.createElement(
                "tr"
            );


        fila.innerHTML = `

            <td>
                ${indiceItem + 1}
            </td>

            <td>
                ${item.unidad || ""}
            </td>

            <td>
                ${item.codigo || ""}
            </td>

            <td class="doc-descripcion">
                ${item.descripcion || ""}
            </td>

            <td>
                ${numeroSeguro(item.cantidad)}
            </td>

            <td class="doc-monto">
                ${numeroSeguro(item.precio).toFixed(2)}
            </td>

            <td class="doc-monto">
                ${numeroSeguro(item.total).toFixed(2)}
            </td>

        `;


        detalleDocumento.appendChild(
            fila
        );

    }
);


// =====================================================
// IMPORTE EN LETRAS
// =====================================================

document.getElementById(
    "importeLetrasDoc"
).textContent =
    cotizacion.importeLetras ||
    "";


// =====================================================
// CALCULAR TOTALES PARA MOSTRAR
// =====================================================

const simbolo =
    simboloMoneda();


const subtotalNumerico =
    (
        cotizacion.detalle ||
        []
    ).reduce(
        function (
            acumulado,
            item
        ) {

            return (
                acumulado +
                numeroSeguro(
                    item.total
                )
            );

        },
        0
    );


const porcentajeDescuento =
    numeroSeguro(
        cotizacion.descuento
    );


const montoDescuento =
    subtotalNumerico *
    porcentajeDescuento /
    100;


const totalFinal =
    numeroSeguro(
        cotizacion.totalNumerico
    );


let base =
    0;


let impuesto =
    0;


let textoImpuesto =
    "IGV 18%";


if (
    cotizacion.comprobante ===
    "RH"
) {

    base =
        subtotalNumerico -
        montoDescuento;


    if (
        base > 1500
    ) {

        impuesto =
            base *
            0.08;


        textoImpuesto =
            "RETENCIÓN 8%";

    } else {

        impuesto = 0;

        textoImpuesto =
            "RETENCIÓN 0%";

    }

} else {

    if (
        cotizacion.modoPrecio ===
        "CON_IGV"
    ) {

        const totalConDescuento =
            subtotalNumerico -
            montoDescuento;


        base =
            totalConDescuento /
            1.18;


        impuesto =
            totalConDescuento -
            base;

    } else {

        base =
            subtotalNumerico -
            montoDescuento;


        impuesto =
            base *
            0.18;

    }

}


// =====================================================
// MOSTRAR TOTALES
// =====================================================

document.getElementById(
    "subtotalDoc"
).textContent =
    `${simbolo} ${subtotalNumerico.toFixed(2)}`;


document.getElementById(
    "textoDescuentoDoc"
).textContent =
    `DESCUENTO ${porcentajeDescuento}%`;


document.getElementById(
    "montoDescuentoDoc"
).textContent =
    `- ${simbolo} ${montoDescuento.toFixed(2)}`;


document.getElementById(
    "baseImponibleDoc"
).textContent =
    `${simbolo} ${base.toFixed(2)}`;


document.getElementById(
    "textoImpuestoDoc"
).textContent =
    textoImpuesto;


document.getElementById(
    "impuestoDoc"
).textContent =
    `${simbolo} ${impuesto.toFixed(2)}`;


document.getElementById(
    "totalDoc"
).textContent =
    `${simbolo} ${totalFinal.toFixed(2)}`;

   
// =====================================================
// CONDICIONES
// =====================================================

document.getElementById(
    "condicionesDoc"
).textContent =
    cotizacion.condiciones ||
    "Sin condiciones adicionales.";


// =====================================================
// MENSAJE
// =====================================================

document.getElementById(
    "mensajeEmpresaDoc"
).textContent =
    configuracion.mensajeFinal ||
    "Gracias por elegirnos.";


// =====================================================
// RESPONSABLE
// =====================================================

document.getElementById(
    "responsableDoc"
).textContent =
    configuracion.responsable ||
    "";


document.getElementById(
    "cargoDoc"
).textContent =
    configuracion.cargo ||
    "";


// =====================================================
// ANULADA
// =====================================================

const selloAnulada =
    document.getElementById(
        "selloAnulada"
    );


if (
    cotizacion.estado ===
    "ANULADA"
) {

    selloAnulada.style.display =
        "block";

} else {

    selloAnulada.style.display =
        "none";

}


// =====================================================
// VOLVER
// =====================================================

document.getElementById(
    "btnVolver"
).addEventListener(
    "click",
    function () {

        window.location.href =
            "cotizaciones.html";

    }
);


// =====================================================
// IMPRIMIR / GUARDAR PDF
// =====================================================

document.getElementById(
    "btnImprimir"
).addEventListener(
    "click",
    function () {

        const tituloAnterior =
            document.title;


        const numero =
            cotizacion.numero ||
            "COTIZACION";


        const cliente =
            cotizacion.cliente ||
            "CLIENTE";


        const nombreArchivo =
            `${numero} - ${cliente}`;


        /*
        Chrome usa normalmente document.title
        como nombre sugerido al guardar como PDF.
        */

        document.title =
            nombreArchivo;


        window.print();


        /*
        Restauramos el título después.
        */

        setTimeout(
            function () {

                document.title =
                    tituloAnterior;

            },
            1000
        );

    }
);