// =============================================
// FRANCO SYSTEMS
// CONTROL DE AUTENTICACIÓN
// VERSIÓN 1.0
// =============================================


// =============================================
// CONFIGURACIÓN TEMPORAL DE LOGIN
// =============================================

const USUARIO_DEMO =
    "ADMIN";

const CLAVE_DEMO =
    "1234";


// =============================================
// ELEMENTOS DEL LOGIN
// =============================================

const formularioLogin =
    document.getElementById(
        "formLogin"
    );


// =============================================
// SI ESTAMOS EN EL LOGIN
// =============================================

if (formularioLogin) {

    const usuarioInput =
        document.getElementById(
            "usuario"
        );

    const passwordInput =
        document.getElementById(
            "password"
        );

    const mensajeLogin =
        document.getElementById(
            "mensajeLogin"
        );


    // Si ya hay sesión activa
    if (
        localStorage.getItem(
            "francoSesion"
        ) === "ACTIVA"
    ) {

        window.location.replace(
            "dashboard.html"
        );

    }


    formularioLogin.addEventListener(
        "submit",
        function (evento) {

            evento.preventDefault();


            const usuario =
                usuarioInput
                    .value
                    .trim()
                    .toUpperCase();


            const password =
                passwordInput
                    .value
                    .trim();


            if (
                usuario === "" ||
                password === ""
            ) {

                mostrarErrorLogin(
                    "Complete el usuario y la contraseña."
                );

                return;

            }


            if (
                usuario === USUARIO_DEMO &&
                password === CLAVE_DEMO
            ) {

                iniciarSesion(
                    usuario
                );


                window.location.replace(
                    "dashboard.html"
                );


                return;

            }


            mostrarErrorLogin(
                "Usuario o contraseña incorrectos."
            );

        }
    );


    function mostrarErrorLogin(
        texto
    ) {

        mensajeLogin.textContent =
            texto;


        mensajeLogin.className =
            "mensaje-login error";

    }

}


// =============================================
// INICIAR SESIÓN
// =============================================

function iniciarSesion(
    usuario
) {

    localStorage.setItem(
        "francoSesion",
        "ACTIVA"
    );


    localStorage.setItem(
        "francoUsuario",
        usuario
    );

}


// =============================================
// VERIFICAR SESIÓN
// =============================================

function verificarSesion() {

    const sesion =
        localStorage.getItem(
            "francoSesion"
        );


    if (
        sesion !== "ACTIVA"
    ) {

        window.location.replace(
            "/"
        );


        return false;

    }


    return true;

}


// =============================================
// USUARIO ACTUAL
// =============================================

function obtenerUsuarioActual() {

    return (
        localStorage.getItem(
            "francoUsuario"
        ) ||
        "ADMIN"
    );

}


// =============================================
// CERRAR SESIÓN
// =============================================

function cerrarSesion() {

    localStorage.removeItem(
        "francoSesion"
    );


    localStorage.removeItem(
        "francoUsuario"
    );


    window.location.replace(
        "/"
    );

}