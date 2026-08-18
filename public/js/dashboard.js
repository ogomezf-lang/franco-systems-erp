// =====================================================
// FRANCO SYSTEMS
// DASHBOARD
// VERSION 1.0
// =====================================================


// =====================================================
// VERIFICAR SESIÓN
// =====================================================

verificarSesion();


// =====================================================
// USUARIO ACTUAL
// =====================================================

const usuario =
    obtenerUsuarioActual();


const usuarioTexto =
    document.getElementById(
        "usuarioActual"
    );


const usuarioAvatar =
    document.getElementById(
        "usuarioAvatar"
    );


usuarioTexto.textContent =
    usuario;


usuarioAvatar.textContent =
    usuario
        .charAt(0)
        .toUpperCase();


// =====================================================
// EMPRESA
// =====================================================

const configuracionEmpresa =
    JSON.parse(
        localStorage.getItem(
            "francoConfiguracion"
        )
    ) || {};


const empresaActual =
    document.getElementById(
        "empresaActual"
    );


empresaActual.textContent =
    configuracionEmpresa.razonSocial ||
    "Mi Empresa";


// =====================================================
// CERRAR SESIÓN
// =====================================================

const btnCerrarSesion =
    document.getElementById(
        "btnCerrarSesion"
    );


btnCerrarSesion.addEventListener(
    "click",
    function () {

        const confirmar =
            confirm(
                "¿Desea cerrar la sesión?"
            );


        if (!confirmar) {

            return;

        }


        cerrarSesion();

    }
);


// =====================================================
// COTIZACIONES
// =====================================================

const cotizaciones =
    JSON.parse(
        localStorage.getItem(
            "francoCotizaciones"
        )
    ) || [];


// =====================================================
// ELEMENTOS DASHBOARD
// =====================================================

const montoMesSoles =
    document.getElementById(
        "montoMesSoles"
    );


const montoMesDolares =
    document.getElementById(
        "montoMesDolares"
    );


const cantidadActivas =
    document.getElementById(
        "cantidadActivas"
    );


const cantidadAnuladas =
    document.getElementById(
        "cantidadAnuladas"
    );


const cantidadTotal =
    document.getElementById(
        "cantidadTotal"
    );


const tablaUltimas =
    document.getElementById(
        "tablaUltimasCotizaciones"
    );


// =====================================================
// CARGAR RESUMEN
// =====================================================

function cargarResumen() {

    let activas = 0;

    let anuladas = 0;

    let solesMes = 0;

    let dolaresMes = 0;


    const fechaActual =
        new Date();


    const mesActual =
        fechaActual.getMonth() + 1;


    const anioActual =
        fechaActual.getFullYear();


    cotizaciones.forEach(
        function (cotizacion) {

            const estado =
                cotizacion.estado ||
                "ACTIVA";


            if (
                estado === "ANULADA"
            ) {

                anuladas++;

            } else {

                activas++;

            }


            // Las anuladas no suman monto

            if (
                estado === "ANULADA"
            ) {

                return;

            }


            const fecha =
                cotizacion.fechaEmision ||
                "";


            if (!fecha) {

                return;

            }


            const partes =
                fecha.split("-");


            if (
                partes.length !== 3
            ) {

                return;

            }


            const anio =
                Number(
                    partes[0]
                );


            const mes =
                Number(
                    partes[1]
                );


            if (
                anio !== anioActual ||
                mes !== mesActual
            ) {

                return;

            }


            const importe =
                Number(
                    cotizacion.totalNumerico
                ) || 0;


            if (
                cotizacion.moneda ===
                "DOLARES"
            ) {

                dolaresMes +=
                    importe;

            } else {

                solesMes +=
                    importe;

            }

        }
    );


    montoMesSoles.textContent =
        "S/ " +
        solesMes.toFixed(2);


    montoMesDolares.textContent =
        "$ " +
        dolaresMes.toFixed(2);


    cantidadActivas.textContent =
        activas;


    cantidadAnuladas.textContent =
        anuladas;


    cantidadTotal.textContent =
        cotizaciones.length;

}


// =====================================================
// ÚLTIMAS COTIZACIONES
// =====================================================

function cargarUltimasCotizaciones() {

    tablaUltimas.innerHTML =
        "";


    if (
        cotizaciones.length === 0
    ) {

        tablaUltimas.innerHTML = `

            <tr>

                <td
                    colspan="5"
                    class="tabla-vacia"
                >

                    Todavía no hay cotizaciones registradas.

                </td>

            </tr>

        `;


        return;

    }


    const ultimas =
        [...cotizaciones]
            .reverse()
            .slice(
                0,
                5
            );


    ultimas.forEach(
        function (cotizacion) {

            const estado =
                cotizacion.estado ||
                "ACTIVA";


            const simbolo =
                cotizacion.moneda ===
                "DOLARES"
                    ? "$"
                    : "S/";


            const fila =
                document.createElement(
                    "tr"
                );


            fila.innerHTML = `

                <td class="texto-centro">

                    ${cotizacion.numero || "-"}

                </td>


                <td>

                    ${
                        cotizacion.cliente ||
                        '<span class="texto-vacio">Sin cliente</span>'
                    }

                </td>


                <td class="texto-centro">

                    ${cotizacion.fechaEmision || "-"}

                </td>


                <td class="texto-monto">

                    ${simbolo}
                    ${
                        Number(
                            cotizacion.totalNumerico
                        ).toFixed(2)
                    }

                </td>


                <td class="texto-centro">

                    <span
                        class="
                            estado-badge
                            ${
                                estado === "ANULADA"
                                    ? "estado-anulada"
                                    : "estado-activa"
                            }
                        "
                    >

                        ${estado}

                    </span>

                </td>

            `;


            tablaUltimas.appendChild(
                fila
            );

        }
    );

}


// =====================================================
// INICIAR DASHBOARD
// =====================================================

cargarResumen();

cargarUltimasCotizaciones();