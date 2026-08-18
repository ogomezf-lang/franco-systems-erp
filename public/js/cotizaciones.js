// =====================================================
// FRANCO SYSTEMS
// HISTORIAL DE COTIZACIONES
// VERSION 1.0
// =====================================================

verificarSesion();


// =====================================================
// TOPBAR
// =====================================================

const usuario =
    obtenerUsuarioActual();


document.getElementById(
    "usuarioActual"
).textContent =
    usuario;


document.getElementById(
    "usuarioAvatar"
).textContent =
    usuario
        .charAt(0)
        .toUpperCase();


const configuracion =
    JSON.parse(
        localStorage.getItem(
            "francoConfiguracion"
        )
    ) || {};


document.getElementById(
    "empresaActual"
).textContent =
    configuracion.razonSocial ||
    "Mi Empresa";


// =====================================================
// DATOS
// =====================================================

let cotizaciones =
    JSON.parse(
        localStorage.getItem(
            "francoCotizaciones"
        )
    ) || [];


let filtroActual =
    "TODAS";


// =====================================================
// ELEMENTOS
// =====================================================

const tablaCotizaciones =
    document.getElementById(
        "tablaCotizaciones"
    );


const buscarCotizacion =
    document.getElementById(
        "buscarCotizacion"
    );


const botonesFiltro =
    document.querySelectorAll(
        ".filtro-cotizacion"
    );


const btnCerrarSesion =
    document.getElementById(
        "btnCerrarSesion"
    );


// =====================================================
// GUARDAR STORAGE
// =====================================================

function guardarCotizaciones() {

    localStorage.setItem(
        "francoCotizaciones",
        JSON.stringify(
            cotizaciones
        )
    );

}


// =====================================================
// FILTRAR
// =====================================================

function obtenerCotizacionesFiltradas() {

    const texto =
        buscarCotizacion
            .value
            .trim()
            .toLowerCase();


    return cotizaciones.filter(
        function (cotizacion) {

            const numero =
                String(
                    cotizacion.numero ||
                    ""
                )
                    .toLowerCase();


            const cliente =
                String(
                    cotizacion.cliente ||
                    ""
                )
                    .toLowerCase();


            const documento =
                String(
                    cotizacion.documento ||
                    ""
                )
                    .toLowerCase();


            const estado =
                cotizacion.estado ||
                "ACTIVA";


            const coincideTexto =
                numero.includes(texto)
                ||
                cliente.includes(texto)
                ||
                documento.includes(texto);


            const coincideEstado =
                filtroActual ===
                "TODAS"

                    ? true

                    : estado ===
                      filtroActual;


            return (
                coincideTexto &&
                coincideEstado
            );

        }
    );

}


// =====================================================
// FECHA
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


// =====================================================
// CARGAR TABLA
// =====================================================

function cargarTablaCotizaciones() {

    tablaCotizaciones.innerHTML =
        "";


    const filtradas =
        obtenerCotizacionesFiltradas();


    if (
        filtradas.length === 0
    ) {

        tablaCotizaciones.innerHTML = `

            <tr>

                <td
                    colspan="6"
                    class="tabla-vacia"
                >
                    No hay cotizaciones para mostrar.
                </td>

            </tr>

        `;


        return;

    }


    filtradas
        .slice()
        .reverse()
        .forEach(
            function (cotizacion) {

                const indiceReal =
                    cotizaciones.findIndex(
                        function (item) {

                            return (
                                item.numero ===
                                cotizacion.numero
                            );

                        }
                    );


                const estado =
                    cotizacion.estado ||
                    "ACTIVA";


                const simbolo =
                    cotizacion.moneda ===
                    "DOLARES"

                        ? "$"

                        : "S/";


                const total =
                    Number(
                        cotizacion.totalNumerico
                    ) || 0;


                const fila =
                    document.createElement(
                        "tr"
                    );


                if (
                    estado ===
                    "ANULADA"
                ) {

                    fila.classList.add(
                        "fila-anulada"
                    );

                }


                let acciones = `

                    <button
                        type="button"
                        class="btn-historial-ver"
                        data-indice="${indiceReal}"
                    >
                        Ver
                    </button>

                `;


                if (
                    estado ===
                    "ACTIVA"
                ) {

                    acciones += `

                        <button
                            type="button"
                            class="btn-historial-editar"
                            data-indice="${indiceReal}"
                        >
                            Editar
                        </button>


                        <button
                            type="button"
                            class="btn-historial-anular"
                            data-indice="${indiceReal}"
                        >
                            Anular
                        </button>

                    `;

                } else {

                    acciones += `

                        <button
                            type="button"
                            class="btn-historial-reactivar"
                            data-indice="${indiceReal}"
                        >
                            Reactivar
                        </button>

                    `;

                }


                fila.innerHTML = `

                    <td class="texto-centro">

                        ${cotizacion.numero || "-"}

                    </td>


                    <td>

                        <strong>

                            ${
                                cotizacion.cliente ||
                                "Sin cliente"
                            }

                        </strong>


                        <small
                            class="historial-documento"
                        >

                            ${
                                cotizacion.documento ||
                                ""
                            }

                        </small>

                    </td>


                    <td class="texto-centro">

                        ${
                            formatearFecha(
                                cotizacion.fechaEmision
                            )
                        }

                    </td>


                    <td class="texto-monto">

                        ${simbolo}
                        ${total.toFixed(2)}

                    </td>


                    <td class="texto-centro">

                        <span
                            class="
                                estado-badge
                                ${
                                    estado ===
                                    "ANULADA"

                                        ? "estado-anulada"

                                        : "estado-activa"
                                }
                            "
                        >

                            ${estado}

                        </span>

                    </td>


                    <td
                        class="historial-acciones"
                    >

                        ${acciones}

                    </td>

                `;


                tablaCotizaciones.appendChild(
                    fila
                );

            }
        );


    asignarEventosTabla();

}


// =====================================================
// EVENTOS TABLA
// =====================================================

function asignarEventosTabla() {


    // VER

    document
        .querySelectorAll(
            ".btn-historial-ver"
        )
        .forEach(
            function (boton) {

                boton.addEventListener(
                    "click",
                    function () {

                        abrirCotizacion(
                            Number(
                                boton.dataset.indice
                            )
                        );

                    }
                );

            }
        );


    // EDITAR

    document
        .querySelectorAll(
            ".btn-historial-editar"
        )
        .forEach(
            function (boton) {

                boton.addEventListener(
                    "click",
                    function () {

                        editarCotizacion(
                            Number(
                                boton.dataset.indice
                            )
                        );

                    }
                );

            }
        );


    // ANULAR

    document
        .querySelectorAll(
            ".btn-historial-anular"
        )
        .forEach(
            function (boton) {

                boton.addEventListener(
                    "click",
                    function () {

                        anularCotizacion(
                            Number(
                                boton.dataset.indice
                            )
                        );

                    }
                );

            }
        );


    // REACTIVAR

    document
        .querySelectorAll(
            ".btn-historial-reactivar"
        )
        .forEach(
            function (boton) {

                boton.addEventListener(
                    "click",
                    function () {

                        reactivarCotizacion(
                            Number(
                                boton.dataset.indice
                            )
                        );

                    }
                );

            }
        );

}


// =====================================================
// VER
// =====================================================

function abrirCotizacion(
    indice
) {

    const cotizacion =
        cotizaciones[
            indice
        ];


    if (!cotizacion) {

        alert(
            "No se encontró la cotización."
        );

        return;

    }


    sessionStorage.setItem(
        "francoCotizacionVer",
        String(indice)
    );


    window.location.href =
        "ver-cotizacion.html";

}


// =====================================================
// EDITAR
// =====================================================

function editarCotizacion(
    indice
) {

    const cotizacion =
        cotizaciones[
            indice
        ];


    if (!cotizacion) {

        alert(
            "No se encontró la cotización."
        );

        return;

    }


    if (
        cotizacion.estado ===
        "ANULADA"
    ) {

        alert(
            "Una cotización anulada no puede editarse. Reactívela primero."
        );

        return;

    }


    // IMPORTANTE:
    // Mandamos directamente el índice por URL

    window.location.href =
        `nueva-cotizacion.html?editar=${indice}`;

}


// =====================================================
// ANULAR
// =====================================================

function anularCotizacion(
    indice
) {

    const cotizacion =
        cotizaciones[
            indice
        ];


    if (!cotizacion) {

        return;

    }


    const confirmar =
        confirm(
            `¿Desea anular la cotización ${cotizacion.numero}?`
        );


    if (!confirmar) {

        return;

    }


    cotizacion.estado =
        "ANULADA";


    cotizacion.fechaAnulacion =
        new Date()
            .toISOString();


    guardarCotizaciones();


    cargarTablaCotizaciones();

}


// =====================================================
// REACTIVAR
// =====================================================

function reactivarCotizacion(
    indice
) {

    const cotizacion =
        cotizaciones[
            indice
        ];


    if (!cotizacion) {

        return;

    }


    const confirmar =
        confirm(
            `¿Desea reactivar la cotización ${cotizacion.numero}?`
        );


    if (!confirmar) {

        return;

    }


    cotizacion.estado =
        "ACTIVA";


    delete cotizacion.fechaAnulacion;


    guardarCotizaciones();


    cargarTablaCotizaciones();

}


// =====================================================
// BUSCADOR
// =====================================================

buscarCotizacion.addEventListener(
    "input",
    cargarTablaCotizaciones
);


// =====================================================
// FILTROS
// =====================================================

botonesFiltro.forEach(
    function (boton) {

        boton.addEventListener(
            "click",
            function () {

                botonesFiltro.forEach(
                    function (item) {

                        item.classList.remove(
                            "activo"
                        );

                    }
                );


                boton.classList.add(
                    "activo"
                );


                filtroActual =
                    boton.dataset.filtro;


                cargarTablaCotizaciones();

            }
        );

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

cargarTablaCotizaciones();