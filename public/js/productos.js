// =====================================================
// FRANCO SYSTEMS
// PRODUCTOS Y SERVICIOS
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

const codigoProducto =
    document.getElementById(
        "codigoProducto"
    );

const tipoProducto =
    document.getElementById(
        "tipoProducto"
    );

const descripcionProducto =
    document.getElementById(
        "descripcionProducto"
    );

const unidadProducto =
    document.getElementById(
        "unidadProducto"
    );

const monedaProducto =
    document.getElementById(
        "monedaProducto"
    );

const modoPrecioProducto =
    document.getElementById(
        "modoPrecioProducto"
    );

const precioProducto =
    document.getElementById(
        "precioProducto"
    );

const valorSinIgvProducto =
    document.getElementById(
        "valorSinIgvProducto"
    );

const precioConIgvProducto =
    document.getElementById(
        "precioConIgvProducto"
    );

const observacionProducto =
    document.getElementById(
        "observacionProducto"
    );

const btnGuardarProducto =
    document.getElementById(
        "btnGuardarProducto"
    );

const btnLimpiarProducto =
    document.getElementById(
        "btnLimpiarProducto"
    );

const buscarProducto =
    document.getElementById(
        "buscarProducto"
    );

const tablaProductos =
    document.getElementById(
        "tablaProductos"
    );

const tituloFormularioProducto =
    document.getElementById(
        "tituloFormularioProducto"
    );

const btnCerrarSesion =
    document.getElementById(
        "btnCerrarSesion"
    );


// =====================================================
// DATOS
// =====================================================

let productos =
    JSON.parse(
        localStorage.getItem(
            "francoProductos"
        )
    ) || [];


let indiceEditando =
    null;


// =====================================================
// CÁLCULO DE PRECIOS
// =====================================================

function calcularPrecios() {

    const importe =
        Number(
            precioProducto.value
        ) || 0;


    if (
        modoPrecioProducto.value ===
        "SIN_IGV"
    ) {

        const valorSinIgv =
            importe;


        const precioConIgv =
            valorSinIgv * 1.18;


        valorSinIgvProducto.value =
            valorSinIgv.toFixed(2);


        precioConIgvProducto.value =
            precioConIgv.toFixed(2);

    } else {

        const precioConIgv =
            importe;


        const valorSinIgv =
            precioConIgv / 1.18;


        valorSinIgvProducto.value =
            valorSinIgv.toFixed(2);


        precioConIgvProducto.value =
            precioConIgv.toFixed(2);

    }

}


precioProducto.addEventListener(
    "input",
    calcularPrecios
);


modoPrecioProducto.addEventListener(
    "change",
    calcularPrecios
);


// =====================================================
// STORAGE
// =====================================================

function guardarProductosStorage() {

    localStorage.setItem(
        "francoProductos",
        JSON.stringify(
            productos
        )
    );

}


// =====================================================
// LIMPIAR
// =====================================================

function limpiarFormularioProducto() {

    codigoProducto.value = "";

    tipoProducto.value =
        "PRODUCTO";

    descripcionProducto.value = "";

    unidadProducto.value = "";

    monedaProducto.value =
        "SOLES";

    modoPrecioProducto.value =
        "SIN_IGV";

    precioProducto.value = "";

    valorSinIgvProducto.value = "";

    precioConIgvProducto.value = "";

    observacionProducto.value = "";


    indiceEditando =
        null;


    tituloFormularioProducto.textContent =
        "Nuevo Producto o Servicio";


    btnGuardarProducto.textContent =
        "Guardar Producto";


    codigoProducto.focus();

}


// =====================================================
// VALIDAR
// =====================================================

function validarProducto() {

    if (
        codigoProducto.value.trim() === ""
    ) {

        alert(
            "Ingrese el código."
        );

        codigoProducto.focus();

        return false;

    }


    if (
        descripcionProducto.value.trim() === ""
    ) {

        alert(
            "Ingrese la descripción."
        );

        descripcionProducto.focus();

        return false;

    }


    if (
        Number(precioProducto.value) < 0 ||
        precioProducto.value === ""
    ) {

        alert(
            "Ingrese un importe unitario válido."
        );

        precioProducto.focus();

        return false;

    }


    return true;

}


// =====================================================
// GUARDAR / EDITAR
// =====================================================

btnGuardarProducto.addEventListener(
    "click",
    function () {

        if (
            !validarProducto()
        ) {

            return;

        }


        calcularPrecios();


        const estabaEditando =
            indiceEditando !== null;


        const producto = {

            codigo:
                codigoProducto.value
                    .trim()
                    .toUpperCase(),

            tipo:
                tipoProducto.value,

            descripcion:
                descripcionProducto.value.trim(),

            unidad:
                unidadProducto.value
                    .trim()
                    .toUpperCase(),

            moneda:
                monedaProducto.value,

            modoPrecio:
                modoPrecioProducto.value,

            importeIngresado:
                Number(
                    precioProducto.value
                ) || 0,

            valorSinIgv:
                Number(
                    valorSinIgvProducto.value
                ) || 0,

            precioConIgv:
                Number(
                    precioConIgvProducto.value
                ) || 0,

            observacion:
                observacionProducto.value.trim(),

            estado:
                "ACTIVO",

            fechaRegistro:
                new Date().toISOString()

        };


        const duplicado =
            productos.findIndex(
                function (item, index) {

                    return (
                        item.codigo ===
                            producto.codigo &&
                        index !== indiceEditando
                    );

                }
            );


        if (
            duplicado !== -1
        ) {

            alert(
                "Ya existe un producto con ese código."
            );

            codigoProducto.focus();

            return;

        }


        if (
            indiceEditando === null
        ) {

            productos.push(
                producto
            );

        } else {

            productos[
                indiceEditando
            ] = {

                ...productos[
                    indiceEditando
                ],

                ...producto

            };

        }


        guardarProductosStorage();

        cargarTablaProductos();

        limpiarFormularioProducto();


        alert(
            estabaEditando
                ? "Producto actualizado correctamente."
                : "Producto guardado correctamente."
        );

    }
);


// =====================================================
// CARGAR TABLA
// =====================================================

function cargarTablaProductos(
    filtro = ""
) {

    tablaProductos.innerHTML =
        "";


    const texto =
        filtro
            .trim()
            .toLowerCase();


    const filtrados =
        productos.filter(
            function (producto) {

                return (

                    producto.codigo
                        .toLowerCase()
                        .includes(texto) ||

                    producto.descripcion
                        .toLowerCase()
                        .includes(texto) ||

                    producto.tipo
                        .toLowerCase()
                        .includes(texto)

                );

            }
        );


    if (
        filtrados.length === 0
    ) {

        tablaProductos.innerHTML = `

            <tr>

                <td
                    colspan="9"
                    class="tabla-vacia"
                >
                    No hay productos registrados.
                </td>

            </tr>

        `;


        return;

    }


    filtrados.forEach(
        function (producto) {

            const indiceReal =
                productos.findIndex(
                    function (item) {

                        return (
                            item.codigo ===
                            producto.codigo
                        );

                    }
                );


            const simbolo =
                producto.moneda ===
                "DOLARES"
                    ? "$"
                    : "S/";


            const modoTexto =
                producto.modoPrecio ===
                "CON_IGV"
                    ? "CON IGV"
                    : "SIN IGV";


            const fila =
                document.createElement(
                    "tr"
                );


            fila.innerHTML = `

                <td class="texto-centro">
                    ${producto.codigo}
                </td>

                <td class="texto-centro">
                    ${producto.tipo}
                </td>

                <td>
                    <strong>
                        ${producto.descripcion}
                    </strong>
                </td>

                <td class="texto-centro">
                    ${producto.unidad || "-"}
                </td>

                <td class="texto-centro">
                    ${producto.moneda}
                </td>

                <td class="texto-centro">
                    ${modoTexto}
                </td>

                <td class="texto-monto">
                    ${simbolo}
                    ${Number(producto.valorSinIgv).toFixed(2)}
                </td>

                <td class="texto-monto">
                    ${simbolo}
                    ${Number(producto.precioConIgv).toFixed(2)}
                </td>

                <td class="producto-acciones">

                    <button
                        type="button"
                        class="btn-producto-editar"
                        data-indice="${indiceReal}"
                    >
                        Editar
                    </button>

                    <button
                        type="button"
                        class="btn-producto-eliminar"
                        data-indice="${indiceReal}"
                    >
                        Eliminar
                    </button>

                </td>

            `;


            tablaProductos.appendChild(
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
            ".btn-producto-editar"
        )
        .forEach(
            function (boton) {

                boton.addEventListener(
                    "click",
                    function () {

                        editarProducto(
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
            ".btn-producto-eliminar"
        )
        .forEach(
            function (boton) {

                boton.addEventListener(
                    "click",
                    function () {

                        eliminarProducto(
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

function editarProducto(
    indice
) {

    const producto =
        productos[indice];


    if (!producto) {

        return;

    }


    indiceEditando =
        indice;


    codigoProducto.value =
        producto.codigo;

    tipoProducto.value =
        producto.tipo;

    descripcionProducto.value =
        producto.descripcion;

    unidadProducto.value =
        producto.unidad || "";

    monedaProducto.value =
        producto.moneda;

    modoPrecioProducto.value =
        producto.modoPrecio;

    precioProducto.value =
        producto.importeIngresado;

    valorSinIgvProducto.value =
        Number(
            producto.valorSinIgv
        ).toFixed(2);

    precioConIgvProducto.value =
        Number(
            producto.precioConIgv
        ).toFixed(2);

    observacionProducto.value =
        producto.observacion || "";


    tituloFormularioProducto.textContent =
        "Editar Producto o Servicio";


    btnGuardarProducto.textContent =
        "Guardar Cambios";


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


// =====================================================
// ELIMINAR
// =====================================================

function eliminarProducto(
    indice
) {

    const producto =
        productos[indice];


    if (!producto) {

        return;

    }


    const confirmar =
        confirm(
            `¿Desea eliminar ${producto.descripcion}?`
        );


    if (!confirmar) {

        return;

    }


    productos.splice(
        indice,
        1
    );


    guardarProductosStorage();

    cargarTablaProductos(
        buscarProducto.value
    );


    if (
        indiceEditando === indice
    ) {

        limpiarFormularioProducto();

    }

}


// =====================================================
// BUSCADOR
// =====================================================

buscarProducto.addEventListener(
    "input",
    function () {

        cargarTablaProductos(
            buscarProducto.value
        );

    }
);


// =====================================================
// LIMPIAR
// =====================================================

btnLimpiarProducto.addEventListener(
    "click",
    limpiarFormularioProducto
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

cargarTablaProductos();