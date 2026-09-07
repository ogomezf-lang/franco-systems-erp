// FRANCO SYSTEMS - LOGIN CLOUD v1.2.0

document.addEventListener("DOMContentLoaded", async () => {

  // -------------------------------------------------------
  // SI YA HAY SESIÃ“N, ENVIAR SEGÃšN EL ROL
  // -------------------------------------------------------

  if (FrancoAPI.isLogged()) {

    try {

      const me =
        await FrancoAPI.apiFetch("/api/auth/me");

      const role =
        String(
          me.user?.role || ""
        ).toUpperCase();


      if (role === "SUPERADMIN") {

        window.location.replace(
          "superadmin.html"
        );

      } else {

        window.location.replace(
          "dashboard.html"
        );
      }

      return;

    } catch (error) {

      FrancoAPI.logout();

      return;
    }
  }


  // -------------------------------------------------------
  // LOGIN
  // -------------------------------------------------------

  const form =
    document.getElementById("formLogin");

  const message =
    document.getElementById("mensajeLogin");

  const button =
    document.getElementById("btnLogin");


  form.addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();

      message.className =
        "mensaje-login";

      message.textContent = "";

      button.disabled = true;

      button.textContent =
        "Ingresando...";


      try {

        const email =
          document
            .getElementById("email")
            .value
            .trim();

        const password =
          document
            .getElementById("password")
            .value;


        const data =
          await fetch(
            "/api/auth/login",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json"
              },

              credentials:
                "same-origin",

              body:
                JSON.stringify({
                  email,
                  password
                })
            }
          ).then(
            async (response) => {

              const body =
                await response
                  .json()
                  .catch(
                    () => ({})
                  );


              if (!response.ok) {

                const error =
                  new Error(
                    body.message ||
                    "No se pudo iniciar sesiÃ³n."
                  );

                error.data = body;

                throw error;
              }


              return body;
            }
          );


        // Guardar sesiÃ³n
        FrancoAPI.setSession(data);


        // -------------------------------------------------
        // CONSULTAR ROL REAL
        // -------------------------------------------------

        const me =
          await FrancoAPI.apiFetch(
            "/api/auth/me"
          );


        const role =
          String(
            me.user?.role || ""
          ).toUpperCase();


        // -------------------------------------------------
        // REDIRECCIÃ“N SEGÃšN ROL
        // -------------------------------------------------

        if (role === "SUPERADMIN") {

          window.location.replace(
            "superadmin.html"
          );

        } else {

          window.location.replace(
            "dashboard.html"
          );
        }


      } catch (error) {

        message.className =
          "mensaje-login error";


        if (
          error.data?.code ===
          "SETUP_REQUIRED"
        ) {

          message.textContent =
            "TodavÃ­a falta conectar Supabase.";

        } else {

          message.textContent =
            error.message;
        }


      } finally {

        button.disabled = false;

        button.textContent =
          "Ingresar al sistema";
      }

    }
  );

});
