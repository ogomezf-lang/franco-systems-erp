document.addEventListener("DOMContentLoaded", () => {
  if (FrancoAPI.isLogged()) {
    window.location.replace("dashboard.html");
    return;
  }

  const form = document.getElementById("formLogin");
  const message = document.getElementById("mensajeLogin");
  const button = document.getElementById("btnLogin");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    message.className = "mensaje-login";
    message.textContent = "";
    button.disabled = true;
    button.textContent = "Ingresando...";

    try {
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;
      const data = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email, password }),
      }).then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (!r.ok) {
          const err = new Error(body.message || "No se pudo iniciar sesión.");
          err.data = body;
          throw err;
        }
        return body;
      });

      FrancoAPI.setSession(data);
      window.location.replace("dashboard.html");
    } catch (error) {
      message.className = "mensaje-login error";
      if (error.data?.code === "SETUP_REQUIRED") {
        message.textContent = "Todavía falta conectar Supabase. Eso lo haremos en el Paso 2.";
      } else {
        message.textContent = error.message;
      }
    } finally {
      button.disabled = false;
      button.textContent = "Ingresar al sistema";
    }
  });
});
