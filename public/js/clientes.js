// =====================================================
// FRANCO SYSTEMS
// CLIENTES
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
    usuario.charAt(0).toUpperCase();


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
// ELEMENTOS
// =====================================================

const documentoCliente =
    document.getElementById(
        "documentoCliente"
    );

const tipoCliente =
    document.getElementById(
        "tipoCliente"
    );

const nombreCliente =
    document.getElementById(
        "nombreCliente"
    );

const direccionCliente =
    document.getElementById(
        "direccionCliente"
    );

const telefonoCliente =
    document.getElementById(
        "telefonoCliente"
    );

const correoCliente =
    document.getElementById(
        "correoCliente"
    );

const btnGuardarCliente =
    document.getElementById(
        "btnGuardarCliente"
    );

const btnCancelarCliente =
    document.getElementById(
        "btnCancelarCliente"
    );

const buscarCliente =
    document.getElementById(
        "buscarCliente"
    );

const tablaClientes =
    document.getElementById(
        "tablaClientes"
    );

const tituloFormularioCliente =
    document.getElementById(
        "tituloFormularioCliente"
    );

const btnCerrarSesion =
    document.getElementById(
        "btnCerrarSesion"
    );


// =====================================================
// DATOS
// =====================================================

let clientes =
    JSON.parse(
        localStorage.getItem(
            "francoClientes"
        )
    ) || [];


let indiceEditando =
    null;


// =====================================================
// TIPO DE CLIENTE
// =====================================================

function detectarTipoCliente() {

    const documento =
        documentoCliente.value
            .trim()
            .replace(/\D/g, "");


    documentoCliente.value =
        documento;


    if (
        documento.length === 8
    ) {

        tipoCliente.value =
            "PERSONA";

        return;

    }


    if (
        documento.length === 11
    ) {

        tipoCliente.value =
            "EMPRESA";

        return;

    }


    tipoCliente.value =
        "";

}


documentoCliente.addEventListener(
    "input",
    detectarTipoCliente
);

// ============================================
// CONSULTAR RUC AUTOMÁTICO
// ============================================

documentoCliente.addEventListener(
    "blur",
    async function () {

        const documento =
            documentoCliente.value
                .trim();

        if (
            documento.length !== 11
        ) {
            return;
        }

        try {

            const respuesta =
                await fetch(
                    `http://localhost:3000/api/ruc/${documento}`
                );

            const data =
                await respuesta.json();

            if (
                data.razon_social
            ) {

                tipoCliente.value =
                    "EMPRESA";

                nombreCliente.value =
                    data.razon_social;

                direccionCliente.value =
                    data.direccion || "";

            }

        } catch (error) {

            console.error(error);

            alert(
                "No se pudo consultar el RUC."
            );

        }

    }
);
documentoCliente.addEventListener(
    "blur",
    async function () {

        const documento =
            documentoCliente.value
                .trim()
                .replace(/\D/g, "");

        documentoCliente.value =
            documento;

        if (
            documento.length !== 8 &&
            documento.length !== 11
        ) {
            return;
        }

        try {

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
                    "No se pudo consultar el documento."
                );

            }

            // RUC

            if (
                documento.length === 11
            ) {

                tipoCliente.value =
                    "EMPRESA";

                nombreCliente.value =
                    data.razon_social ||
                    "";

                direccionCliente.value =
                    data.direccion ||
                    "";

            }

            // DNI

            else {

                tipoCliente.value =
                    "PERSONA";

                nombreCliente.value =
                    data.full_name ||
                    "";

                direccionCliente.value =
                    "";

            }

        } catch (error) {

            console.error(
                "Error consultando documento:",
                error
            );

            alert(
                "No se pudo consultar el documento."
            );

        }

    }
);
// =====================================================
// GUARDAR EN LOCALSTORAGE
// =====================================================

function guardarClientesStorage() {

    localStorage.setItem(
        "francoClientes",
        JSON.stringify(
            clientes
        )
    );

}


// =====================================================
// LIMPIAR FORMULARIO
// =====================================================

function limpiarFormularioCliente() {

    documentoCliente.value = "";

    tipoCliente.value = "";

    nombreCliente.value = "";

    direccionCliente.value = "";

    telefonoCliente.value = "";

    correoCliente.value = "";


    indiceEditando =
        null;


    tituloFormularioCliente.textContent =
        "Nuevo Cliente";


    btnGuardarCliente.textContent =
        "Guardar Cliente";


    documentoCliente.focus();

}


// =====================================================
// VALIDAR
// =====================================================

function validarCliente() {

    const documento =
        documentoCliente.value.trim();


    if (
        documento.length !== 8 &&
        documento.length !== 11
    ) {

        alert(
            "El documento debe tener 8 dígitos para DNI o 11 para RUC."
        );

        documentoCliente.focus();

        return false;

    }


    if (
        nombreCliente.value.trim() === ""
    ) {

        alert(
            "Ingrese el nombre o razón social."
        );

        nombreCliente.focus();

        return false;

    }


    if (
        correoCliente.value.trim() !== "" &&
        !correoCliente.value.includes("@")
    ) {

        alert(
            "Ingrese un correo válido."
        );

        correoCliente.focus();

        return false;

    }


    return true;

}


// =====================================================
// GUARDAR / EDITAR
// =====================================================

btnGuardarCliente.addEventListener(
    "click",
    function () {

        if (
            !validarCliente()
        ) {

            return;

        }


        const cliente = {

            documento:
                documentoCliente.value.trim(),

            tipo:
                tipoCliente.value,

            nombre:
                nombreCliente.value.trim(),

            direccion:
                direccionCliente.value.trim(),

            telefono:
                telefonoCliente.value.trim(),

            correo:
                correoCliente.value.trim(),

            fechaRegistro:
                new Date().toISOString()

        };


        const duplicado =
            clientes.findIndex(
                function (item, index) {

                    return (
                        item.documento ===
                            cliente.documento &&
                        index !== indiceEditando
                    );

                }
            );


        if (
            duplicado !== -1
        ) {

            alert(
                "Ya existe un cliente con ese RUC o DNI."
            );

            return;

        }


        if (
            indiceEditando === null
        ) {

            clientes.push(
                cliente
            );

        } else {

            clientes[
                indiceEditando
            ] = {

                ...clientes[
                    indiceEditando
                ],

                ...cliente

            };

        }


        guardarClientesStorage();

        cargarTablaClientes();

        limpiarFormularioCliente();


        alert(
            indiceEditando === null
                ? "Cliente guardado correctamente."
                : "Cliente actualizado correctamente."
        );

    }
);


// =====================================================
// CARGAR TABLA
// =====================================================

function cargarTablaClientes(
    filtro = ""
) {

    tablaClientes.innerHTML =
        "";


    const texto =
        filtro
            .trim()
            .toLowerCase();


    const filtrados =
        clientes.filter(
            function (cliente) {

                return (

                    cliente.documento
                        .toLowerCase()
                        .includes(texto) ||

                    cliente.nombre
                        .toLowerCase()
                        .includes(texto) ||

                    (
                        cliente.telefono ||
                        ""
                    )
                        .toLowerCase()
                        .includes(texto)

                );

            }
        );


    if (
        filtrados.length === 0
    ) {

        tablaClientes.innerHTML = `

            <tr>

                <td
                    colspan="7"
                    class="tabla-vacia"
                >
                    No hay clientes registrados.
                </td>

            </tr>

        `;


        return;

    }


    filtrados.forEach(
        function (cliente) {

            const indiceReal =
                clientes.findIndex(
                    function (item) {

                        return (
                            item.documento ===
                            cliente.documento
                        );

                    }
                );


            const fila =
                document.createElement(
                    "tr"
                );


            fila.innerHTML = `

                <td class="texto-centro">
                    ${cliente.documento}
                </td>

                <td class="texto-centro">
                    ${cliente.tipo}
                </td>

                <td>
                    <strong>
                        ${cliente.nombre}
                    </strong>
                </td>

                <td>
                    ${
                        cliente.direccion ||
                        '<span class="texto-vacio">Sin dirección</span>'
                    }
                </td>

                <td class="texto-centro">
                    ${
                        cliente.telefono ||
                        "-"
                    }
                </td>

                <td>
                    ${
                        cliente.correo ||
                        "-"
                    }
                </td>

                <td class="cliente-acciones">

                    <button
                        type="button"
                        class="btn-cliente-editar"
                        data-indice="${indiceReal}"
                    >
                        Editar
                    </button>

                    <button
                        type="button"
                        class="btn-cliente-eliminar"
                        data-indice="${indiceReal}"
                    >
                        Eliminar
                    </button>

                </td>

            `;


            tablaClientes.appendChild(
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

    document
        .querySelectorAll(
            ".btn-cliente-editar"
        )
        .forEach(
            function (boton) {

                boton.addEventListener(
                    "click",
                    function () {

                        editarCliente(
                            Number(
                                boton.dataset.indice
                            )
                        );

                    }
                );

            }
        );


    document
        .querySelectorAll(
            ".btn-cliente-eliminar"
        )
        .forEach(
            function (boton) {

                boton.addEventListener(
                    "click",
                    function () {

                        eliminarCliente(
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
// EDITAR
// =====================================================

function editarCliente(
    indice
) {

    const cliente =
        clientes[indice];


    if (!cliente) {

        return;

    }


    indiceEditando =
        indice;


    documentoCliente.value =
        cliente.documento;

    tipoCliente.value =
        cliente.tipo;

    nombreCliente.value =
        cliente.nombre;

    direccionCliente.value =
        cliente.direccion || "";

    telefonoCliente.value =
        cliente.telefono || "";

    correoCliente.value =
        cliente.correo || "";


    tituloFormularioCliente.textContent =
        "Editar Cliente";


    btnGuardarCliente.textContent =
        "Guardar Cambios";


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


// =====================================================
// ELIMINAR
// =====================================================

function eliminarCliente(
    indice
) {

    const cliente =
        clientes[indice];


    if (!cliente) {

        return;

    }


    const confirmar =
        confirm(
            `¿Desea eliminar a ${cliente.nombre}?`
        );


    if (!confirmar) {

        return;

    }


    clientes.splice(
        indice,
        1
    );


    guardarClientesStorage();

    cargarTablaClientes(
        buscarCliente.value
    );


    if (
        indiceEditando === indice
    ) {

        limpiarFormularioCliente();

    }

}


// =====================================================
// BUSCADOR
// =====================================================

buscarCliente.addEventListener(
    "input",
    function () {

        cargarTablaClientes(
            buscarCliente.value
        );

    }
);


// =====================================================
// LIMPIAR
// =====================================================

btnCancelarCliente.addEventListener(
    "click",
    limpiarFormularioCliente
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

cargarTablaClientes();