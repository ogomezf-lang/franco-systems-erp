// =====================================================
// FRANCO SYSTEMS
// CONFIGURACIÓN
// =====================================================


verificarSesion();


// =====================================================
// USUARIO
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


// =====================================================
// ELEMENTOS
// =====================================================

const razonSocial =
    document.getElementById("razonSocial");

const rucEmpresa =
    document.getElementById("rucEmpresa");

const telefonoEmpresa =
    document.getElementById("telefonoEmpresa");

const direccionEmpresa =
    document.getElementById("direccionEmpresa");

const ubicacionEmpresa =
    document.getElementById("ubicacionEmpresa");

const correoEmpresa =
    document.getElementById("correoEmpresa");

const responsableEmpresa =
    document.getElementById("responsableEmpresa");

const cargoResponsable =
    document.getElementById("cargoResponsable");

const mensajeFinal =
    document.getElementById("mensajeFinal");

const logoEmpresa =
    document.getElementById("logoEmpresa");

const previewLogoEmpresa =
    document.getElementById("previewLogoEmpresa");

const textoSinLogo =
    document.getElementById("textoSinLogo");

const btnQuitarLogo =
    document.getElementById("btnQuitarLogo");

const empresaActual =
    document.getElementById("empresaActual");

const btnGuardar =
    document.getElementById("btnGuardarConfiguracion");

const btnCerrarSesion =
    document.getElementById("btnCerrarSesion");


let logoBase64 = "";


// =====================================================
// CONFIGURACIÓN PREDETERMINADA
// =====================================================

const configuracionInicial = {

    razonSocial: "",

    ruc: "",

    telefono: "",

    direccion: "",

    ubicacion: "",

    correo: "",

    responsable: "",

    cargo: "",

    mensajeFinal:
        "Gracias por elegirnos. Su confianza nos inspira a seguir mejorando.",

    logoEmpresa: ""

};


// =====================================================
// OBTENER CONFIGURACIÓN
// =====================================================

function obtenerConfiguracion() {

    const guardada =
        localStorage.getItem(
            "francoConfiguracion"
        );


    if (!guardada) {

        return {
            ...configuracionInicial
        };

    }


    try {

        return {

            ...configuracionInicial,

            ...JSON.parse(guardada)

        };

    } catch (error) {

        return {
            ...configuracionInicial
        };

    }

}


// =====================================================
// CARGAR
// =====================================================

function cargarConfiguracion() {

    const config =
        obtenerConfiguracion();


    razonSocial.value =
        config.razonSocial || "";

    rucEmpresa.value =
        config.ruc || "";

    telefonoEmpresa.value =
        config.telefono || "";

    direccionEmpresa.value =
        config.direccion || "";

    ubicacionEmpresa.value =
        config.ubicacion || "";

    correoEmpresa.value =
        config.correo || "";

    responsableEmpresa.value =
        config.responsable || "";

    cargoResponsable.value =
        config.cargo || "";

    mensajeFinal.value =
        config.mensajeFinal || "";


    logoBase64 =
        config.logoEmpresa || "";


    mostrarLogo();


    empresaActual.textContent =
        config.razonSocial ||
        "Mi Empresa";

}


// =====================================================
// LOGO
// =====================================================

function mostrarLogo() {

    if (logoBase64) {

        previewLogoEmpresa.src =
            logoBase64;

        previewLogoEmpresa.style.display =
            "block";

        textoSinLogo.style.display =
            "none";

    } else {

        previewLogoEmpresa.removeAttribute(
            "src"
        );

        previewLogoEmpresa.style.display =
            "none";

        textoSinLogo.style.display =
            "block";

    }

}


logoEmpresa.addEventListener(
    "change",
    function () {

        const archivo =
            logoEmpresa.files[0];


        if (!archivo) {

            return;

        }


        const lector =
            new FileReader();


        lector.onload =
            function (evento) {

                logoBase64 =
                    evento.target.result;

                mostrarLogo();

            };


        lector.readAsDataURL(
            archivo
        );

    }
);


btnQuitarLogo.addEventListener(
    "click",
    function () {

        logoBase64 = "";

        logoEmpresa.value = "";

        mostrarLogo();

    }
);


// =====================================================
// GUARDAR
// =====================================================

btnGuardar.addEventListener(
    "click",
    function () {

        const nuevaConfiguracion = {

            razonSocial:
                razonSocial.value.trim(),

            ruc:
                rucEmpresa.value.trim(),

            telefono:
                telefonoEmpresa.value.trim(),

            direccion:
                direccionEmpresa.value.trim(),

            ubicacion:
                ubicacionEmpresa.value.trim(),

            correo:
                correoEmpresa.value.trim(),

            responsable:
                responsableEmpresa.value.trim(),

            cargo:
                cargoResponsable.value.trim(),

            mensajeFinal:
                mensajeFinal.value.trim(),

            logoEmpresa:
                logoBase64

        };


        if (
            nuevaConfiguracion.razonSocial === ""
        ) {

            alert(
                "Ingrese la razón social de la empresa."
            );

            razonSocial.focus();

            return;

        }


        if (
            nuevaConfiguracion.ruc !== "" &&
            nuevaConfiguracion.ruc.length !== 11
        ) {

            alert(
                "El RUC debe tener 11 dígitos."
            );

            rucEmpresa.focus();

            return;

        }


        localStorage.setItem(
            "francoConfiguracion",
            JSON.stringify(
                nuevaConfiguracion
            )
        );


        empresaActual.textContent =
            nuevaConfiguracion.razonSocial;


        alert(
            "Configuración guardada correctamente."
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


        if (confirmar) {

            cerrarSesion();

        }

    }
);


// =====================================================
// INICIAR
// =====================================================

cargarConfiguracion();