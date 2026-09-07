// FRANCO SYSTEMS - PANEL SUPERADMIN v1.2.0

document.addEventListener("DOMContentLoaded", async () => {
  if (!FrancoAPI.requireSession()) return;

  const $ = (id) => document.getElementById(id);

  const esc = (value) =>
    FrancoAPI.esc
      ? FrancoAPI.esc(String(value ?? ""))
      : String(value ?? "");

  let empresasActuales = [];

  // =======================================================
  // SESIÃ“N
  // =======================================================

  $("btnCerrarSesion")?.addEventListener("click", () => {
    if (confirm("Â¿Desea cerrar la sesiÃ³n?")) {
      FrancoAPI.logout();
    }
  });

  try {
    const me = await FrancoAPI.apiFetch("/api/auth/me");

    const user = me.user || {};
    const role = String(user.role || "").toUpperCase();

    if (role !== "SUPERADMIN") {
      alert("Esta secciÃ³n es exclusiva para SUPERADMIN.");
      window.location.replace("dashboard.html");
      return;
    }

    $("usuarioActual").textContent = "SUPERADMIN";
    $("usuarioRol").textContent = "Superadministrador";
    $("usuarioAvatar").textContent = "S";

    await cargarPanel();

  } catch (error) {
    mostrarError(
      error.message ||
      "No se pudo cargar el panel SUPERADMIN."
    );
  }


  // =======================================================
  // MODAL NUEVA EMPRESA
  // =======================================================

  const modal = $("modalNuevaEmpresa");

  function abrirModalEmpresa() {
    $("formNuevaEmpresa")?.reset();

    $("empresaPlan").value = "MENSUAL";
    $("empresaEstado").value = "ACTIVA";
    $("empresaMaxUsers").value = "3";

    ocultarMensajeEmpresa();
    actualizarVencimientoAutomatico();

    modal?.classList.remove("hidden");
  }

  function cerrarModalEmpresa() {
    modal?.classList.add("hidden");
    ocultarMensajeEmpresa();
  }

  $("btnNuevaEmpresa")?.addEventListener(
    "click",
    abrirModalEmpresa
  );

  $("btnCerrarModalEmpresa")?.addEventListener(
    "click",
    cerrarModalEmpresa
  );

  $("cerrarModalEmpresa")?.addEventListener(
    "click",
    cerrarModalEmpresa
  );

  $("btnCancelarEmpresa")?.addEventListener(
    "click",
    cerrarModalEmpresa
  );


  // =======================================================
  // PLAN â†’ VENCIMIENTO AUTOMÃTICO
  // =======================================================

  $("empresaPlan")?.addEventListener(
    "change",
    actualizarVencimientoAutomatico
  );

  function actualizarVencimientoAutomatico() {
    const plan = $("empresaPlan")?.value || "MENSUAL";
    const input = $("empresaVencimiento");

    if (!input) return;

    if (plan === "PERMANENTE") {
      input.value = "";
      input.disabled = true;
      return;
    }

    input.disabled = false;

    const fecha = new Date();

    if (plan === "PRUEBA") {
      fecha.setDate(fecha.getDate() + 7);
    }

    if (plan === "MENSUAL") {
      fecha.setDate(fecha.getDate() + 30);
    }

    if (plan === "ANUAL") {
      fecha.setDate(fecha.getDate() + 365);
    }

    input.value = fecha.toISOString().slice(0, 10);
  }


  // =======================================================
  // CREAR EMPRESA
  // =======================================================

  $("formNuevaEmpresa")?.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      ocultarMensajeEmpresa();

      const button = $("btnGuardarEmpresa");

      const name =
        $("empresaNombre").value.trim();

      const ruc =
        $("empresaRuc").value.trim();

      const plan =
        $("empresaPlan").value;

      const maxUsers =
        Number($("empresaMaxUsers").value);

      const status =
        $("empresaEstado").value;

      const adminName =
        $("adminNombre").value.trim();

      const adminEmail =
        $("adminEmail").value.trim().toLowerCase();

      const adminPassword =
        $("adminPassword").value;


      // ---------------------------------------------------
      // VALIDACIONES
      // ---------------------------------------------------

      if (!name) {
        mostrarMensajeEmpresa(
          "Ingresa la razÃ³n social."
        );
        return;
      }

      if (ruc && !/^\d{11}$/.test(ruc)) {
        mostrarMensajeEmpresa(
          "El RUC debe tener 11 dÃ­gitos."
        );
        return;
      }

      if (!adminName) {
        mostrarMensajeEmpresa(
          "Ingresa el nombre del administrador."
        );
        return;
      }

      if (!adminEmail.includes("@")) {
        mostrarMensajeEmpresa(
          "Ingresa un correo vÃ¡lido."
        );
        return;
      }

      if (adminPassword.length < 6) {
        mostrarMensajeEmpresa(
          "La contraseÃ±a debe tener al menos 6 caracteres."
        );
        return;
      }

      if (
        !Number.isInteger(maxUsers) ||
        maxUsers < 1
      ) {
        mostrarMensajeEmpresa(
          "El lÃ­mite de usuarios no es vÃ¡lido."
        );
        return;
      }


      const payload = {
        name,
        ruc,
        plan,
        status,
        max_users: maxUsers,

        license_expires_at:
          plan === "PERMANENTE"
            ? null
            : $("empresaVencimiento").value,

        admin_full_name: adminName,
        admin_email: adminEmail,
        admin_password: adminPassword
      };


      try {
        button.disabled = true;
        button.textContent = "Creando...";

        const response =
          await FrancoAPI.apiFetch(
            "/api/superadmin/companies",
            {
              method: "POST",
              body: JSON.stringify(payload)
            }
          );


        if (!response?.ok) {
          throw new Error(
            response?.message ||
            "No se pudo crear la empresa."
          );
        }


        cerrarModalEmpresa();

        await cargarPanel();


        alert(
          "Empresa creada correctamente.\n\n" +
          "Empresa: " + name + "\n" +
          "Administrador: " + adminEmail + "\n\n" +
          "El usuario ya puede iniciar sesiÃ³n en Franco Systems."
        );

      } catch (error) {
        mostrarMensajeEmpresa(
          error.message ||
          "No se pudo crear la empresa."
        );

      } finally {
        button.disabled = false;
        button.textContent = "Crear empresa";
      }
    }
  );


  // =======================================================
  // CARGAR PANEL
  // =======================================================

  async function cargarPanel() {
    try {
      const [summaryData, companiesData] =
        await Promise.all([
          FrancoAPI.apiFetch(
            "/api/superadmin/summary"
          ),

          FrancoAPI.apiFetch(
            "/api/superadmin/companies"
          )
        ]);

      empresasActuales =
        companiesData.companies || [];

      cargarResumen(
        summaryData.summary || {}
      );

      cargarEmpresas(empresasActuales);

    } catch (error) {
      mostrarError(
        error.message ||
        "No se pudieron cargar las empresas."
      );
    }
  }


  // =======================================================
  // RESUMEN
  // =======================================================

  function cargarResumen(summary) {
    $("kpiCompanies").textContent =
      Number(summary.total_companies || 0);

    $("kpiActiveCompanies").textContent =
      Number(summary.active_companies || 0);

    $("kpiSuspendedCompanies").textContent =
      Number(summary.suspended_companies || 0);

    $("kpiUsers").textContent =
      Number(summary.total_users || 0);
  }


  // =======================================================
  // TABLA EMPRESAS
  // =======================================================

  function cargarEmpresas(companies) {
    if (!companies.length) {
      $("tablaEmpresas").innerHTML = `
        <tr>
          <td colspan="6" class="empty">
            No hay empresas registradas todavÃ­a.
          </td>
        </tr>
      `;

      $("licenciasResumen").innerHTML =
        "No hay licencias registradas.";

      $("usuariosResumen").innerHTML =
        "No hay usuarios empresariales registrados.";

      return;
    }

    $("tablaEmpresas").innerHTML =
      companies.map((company) => {

        const estado =
          String(
            company.status || "ACTIVA"
          ).toUpperCase();

        const plan =
          String(
            company.plan || "PRUEBA"
          ).toUpperCase();

        const fecha =
          company.license_expires_at
            ? formatearFecha(
                company.license_expires_at
              )
            : "Sin vencimiento";

        const usuarios =
          `${Number(company.users_count || 0)} / ${Number(company.max_users || 0)}`;

        const statusClass =
          estado === "ACTIVA"
            ? "badge active"
            : "badge cancelled";

        return `
          <tr>

            <td data-label="Empresa">
              <div class="company-name-cell">

                <strong>
                  ${esc(company.name || "Sin nombre")}
                </strong>

                <small>
                  ${
                    company.ruc
                      ? "RUC: " + esc(company.ruc)
                      : "Sin RUC"
                  }
                </small>

              </div>
            </td>

            <td data-label="Plan">
              <strong>${esc(plan)}</strong>
            </td>

            <td data-label="Vencimiento">
              ${esc(fecha)}
            </td>

            <td data-label="Usuarios">
              <strong>${esc(usuarios)}</strong>
            </td>

            <td data-label="Estado">
              <span class="${statusClass}">
                ${esc(estado)}
              </span>
            </td>

            <td data-label="Acciones">

              <div class="superadmin-actions">

                <button
                  type="button"
                  class="btn btn-soft btn-sm"
                  onclick="verEmpresa('${company.id}')"
                >
                  Administrar
                </button>

              </div>

            </td>

          </tr>
        `;
      }).join("");

    cargarLicencias(companies);
    cargarUsuarios(companies);
  }


  // =======================================================
  // LICENCIAS
  // =======================================================

  function cargarLicencias(companies) {
    const rows =
      companies.map((company) => {

        const plan =
          String(
            company.plan || "PRUEBA"
          ).toUpperCase();

        const estado =
          String(
            company.status || "ACTIVA"
          ).toUpperCase();

        let vencimiento =
          "Sin vencimiento";

        let clase =
          "license-ok";


        if (company.license_expires_at) {
          vencimiento =
            formatearFecha(
              company.license_expires_at
            );

          const dias =
            diasHasta(
              company.license_expires_at
            );

          if (dias < 0) {
            clase =
              "license-danger";

            vencimiento +=
              " â€” VENCIDA";

          } else if (dias <= 7) {
            clase =
              "license-warning";

            vencimiento +=
              ` â€” ${dias} dÃ­a(s)`;
          }
        }


        return `
          <div
            style="
              display:flex;
              justify-content:space-between;
              align-items:center;
              gap:16px;
              padding:14px 0;
              border-bottom:1px solid #e8edf4;
            "
          >

            <div>
              <strong>
                ${esc(company.name)}
              </strong>

              <div
                style="
                  font-size:12px;
                  color:#718096;
                  margin-top:3px;
                "
              >
                ${esc(plan)} Â· ${esc(estado)}
              </div>
            </div>

            <div class="${clase}">
              ${esc(vencimiento)}
            </div>

          </div>
        `;
      }).join("");


    $("licenciasResumen").innerHTML = `
      <div style="text-align:left;">
        ${rows}
      </div>
    `;
  }


  // =======================================================
  // USUARIOS PRINCIPALES
  // =======================================================

  function cargarUsuarios(companies) {
    const rows =
      companies.map((company) => {

        const administrator =
          company.admin;

        return `
          <div
            style="
              display:flex;
              justify-content:space-between;
              align-items:center;
              gap:16px;
              padding:14px 0;
              border-bottom:1px solid #e8edf4;
            "
          >

            <div>

              <strong>
                ${esc(company.name)}
              </strong>

              <div
                style="
                  font-size:12px;
                  color:#718096;
                  margin-top:3px;
                "
              >
                ${
                  administrator
                    ? esc(
                        administrator.full_name ||
                        "Administrador"
                      )
                    : "Sin administrador"
                }
              </div>

            </div>


            <div style="text-align:right;">

              <strong>
                ${
                  administrator
                    ? esc(
                        administrator.email || ""
                      )
                    : "-"
                }
              </strong>

              <div
                style="
                  font-size:12px;
                  color:#718096;
                  margin-top:3px;
                "
              >
                ${Number(company.users_count || 0)}
                usuario(s) de
                ${Number(company.max_users || 0)}
              </div>

            </div>

          </div>
        `;
      }).join("");


    $("usuariosResumen").innerHTML = `
      <div style="text-align:left;">
        ${rows}
      </div>
    `;
  }


  // =======================================================
  // MENSAJES DEL FORMULARIO
  // =======================================================

  function mostrarMensajeEmpresa(message) {
    const box =
      $("mensajeNuevaEmpresa");

    if (!box) return;

    box.textContent = message;
    box.classList.remove("hidden");
  }

  function ocultarMensajeEmpresa() {
    const box =
      $("mensajeNuevaEmpresa");

    if (!box) return;

    box.textContent = "";
    box.classList.add("hidden");
  }


  // =======================================================
  // UTILIDADES
  // =======================================================

  function formatearFecha(value) {
    if (!value) return "-";

    const parts =
      String(value)
        .slice(0, 10)
        .split("-");

    if (parts.length !== 3) {
      return value;
    }

    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }


  function diasHasta(value) {
    const target =
      new Date(
        `${String(value).slice(0, 10)}T00:00:00`
      );

    const today =
      new Date();

    today.setHours(
      0,
      0,
      0,
      0
    );

    return Math.ceil(
      (target - today) /
      86400000
    );
  }


  function mostrarError(message) {
    const alertBox =
      $("setupAlert");

    if (!alertBox) return;

    alertBox.classList.remove("hidden");
    alertBox.textContent = message;
  }


 // =======================================================
// ADMINISTRAR EMPRESA
// =======================================================

const modalAdministrar =
  $("modalAdministrarEmpresa");

let empresaEditando = null;


function cerrarAdministrarEmpresa() {
  modalAdministrar?.classList.add("hidden");

  empresaEditando = null;

  const box =
    $("mensajeAdministrarEmpresa");

  if (box) {
    box.textContent = "";
    box.classList.add("hidden");
  }
}


$("btnCerrarAdministrar")?.addEventListener(
  "click",
  cerrarAdministrarEmpresa
);

$("cerrarModalAdministrar")?.addEventListener(
  "click",
  cerrarAdministrarEmpresa
);

$("btnCancelarAdministrar")?.addEventListener(
  "click",
  cerrarAdministrarEmpresa
);


// -------------------------------------------------------
// ABRIR EMPRESA
// -------------------------------------------------------

window.verEmpresa = function (id) {

  const company =
    empresasActuales.find(
      item => item.id === id
    );

  if (!company) {
    alert("Empresa no encontrada.");
    return;
  }

  empresaEditando = company;

  $("editEmpresaId").value =
    company.id;

  $("editEmpresaNombre").value =
    company.name || "";

  $("editEmpresaRuc").value =
    company.ruc || "";

  $("editEmpresaPlan").value =
    company.plan || "PRUEBA";

  $("editEmpresaVencimiento").value =
    company.license_expires_at
      ? String(
          company.license_expires_at
        ).slice(0, 10)
      : "";

  $("editEmpresaMaxUsers").value =
    Number(
      company.max_users || 1
    );

  $("editEmpresaEstado").value =
    company.status || "ACTIVA";


  $("editAdminNombre").value =
    company.admin?.full_name || "";

  $("editAdminEmail").value =
    company.admin?.email || "";


  $("tituloAdministrarEmpresa").textContent =
    company.name || "Administrar empresa";


  actualizarEstadoModal();
  actualizarPlanEdicion();


  modalAdministrar?.classList.remove(
    "hidden"
  );
};


// -------------------------------------------------------
// PLAN
// -------------------------------------------------------

$("editEmpresaPlan")?.addEventListener(
  "change",
  actualizarPlanEdicion
);

function actualizarPlanEdicion() {

  const plan =
    $("editEmpresaPlan")?.value;

  const vencimiento =
    $("editEmpresaVencimiento");

  if (!vencimiento) return;


  if (plan === "PERMANENTE") {

    vencimiento.value = "";
    vencimiento.disabled = true;

  } else {

    vencimiento.disabled = false;

  }
}


// -------------------------------------------------------
// + 30 DÃAS
// -------------------------------------------------------

$("btnRenovar30")?.addEventListener(
  "click",
  () => renovarDias(30)
);


// -------------------------------------------------------
// + 1 AÃ‘O
// -------------------------------------------------------

$("btnRenovar365")?.addEventListener(
  "click",
  () => renovarDias(365)
);


function renovarDias(dias) {

  const plan =
    $("editEmpresaPlan").value;

  if (plan === "PERMANENTE") {

    alert(
      "El plan PERMANENTE no necesita fecha de vencimiento."
    );

    return;
  }


  const input =
    $("editEmpresaVencimiento");


  const hoy =
    new Date();

  hoy.setHours(0, 0, 0, 0);


  let base =
    input.value
      ? new Date(
          `${input.value}T00:00:00`
        )
      : new Date(hoy);


  // Si la licencia ya venciÃ³,
  // renovamos desde hoy.
  if (base < hoy) {
    base = new Date(hoy);
  }


  base.setDate(
    base.getDate() + dias
  );


  input.value =
    base
      .toISOString()
      .slice(0, 10);
}


// -------------------------------------------------------
// SUSPENDER / REACTIVAR
// -------------------------------------------------------

$("btnSuspenderEmpresa")?.addEventListener(
  "click",
  () => {

    const estado =
      $("editEmpresaEstado").value;


    if (estado === "ACTIVA") {

      $("editEmpresaEstado").value =
        "SUSPENDIDA";

    } else {

      $("editEmpresaEstado").value =
        "ACTIVA";
    }


    actualizarEstadoModal();
  }
);


$("editEmpresaEstado")?.addEventListener(
  "change",
  actualizarEstadoModal
);


function actualizarEstadoModal() {

  const button =
    $("btnSuspenderEmpresa");

  if (!button) return;


  const estado =
    $("editEmpresaEstado")?.value;


  if (estado === "SUSPENDIDA") {

    button.textContent =
      "Reactivar empresa";

    button.classList.remove(
      "btn-danger"
    );

    button.classList.add(
      "btn-soft"
    );

  } else {

    button.textContent =
      "Suspender empresa";

    button.classList.remove(
      "btn-soft"
    );

    button.classList.add(
      "btn-danger"
    );
  }
}


// -------------------------------------------------------
// GUARDAR CAMBIOS
// -------------------------------------------------------

$("formAdministrarEmpresa")?.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();


    if (!empresaEditando) {
      return;
    }


    const id =
      $("editEmpresaId").value;

    const name =
      $("editEmpresaNombre")
        .value
        .trim();

    const ruc =
      $("editEmpresaRuc")
        .value
        .trim();

    const plan =
      $("editEmpresaPlan").value;

    const status =
      $("editEmpresaEstado").value;

    const maxUsers =
      Number(
        $("editEmpresaMaxUsers").value
      );


    if (!name) {
      mostrarMensajeAdministrar(
        "Ingresa la razÃ³n social."
      );

      return;
    }


    if (
      ruc &&
      !/^\d{11}$/.test(ruc)
    ) {

      mostrarMensajeAdministrar(
        "El RUC debe tener 11 dÃ­gitos."
      );

      return;
    }


    if (
      !Number.isInteger(maxUsers) ||
      maxUsers < 1
    ) {

      mostrarMensajeAdministrar(
        "El lÃ­mite de usuarios no es vÃ¡lido."
      );

      return;
    }


    const payload = {

      name,

      ruc,

      plan,

      status,

      max_users:
        maxUsers,

      license_expires_at:
        plan === "PERMANENTE"
          ? null
          : $("editEmpresaVencimiento")
              .value
    };


    const button =
      $("btnGuardarCambiosEmpresa");


    try {

      button.disabled = true;

      button.textContent =
        "Guardando...";


      await FrancoAPI.apiFetch(
        `/api/superadmin/companies/${id}`,
        {
          method: "PATCH",

          body:
            JSON.stringify(payload)
        }
      );


      cerrarAdministrarEmpresa();


      await cargarPanel();


      alert(
        "Cambios guardados correctamente."
      );


    } catch (error) {

      mostrarMensajeAdministrar(
        error.message ||
        "No se pudieron guardar los cambios."
      );


    } finally {

      button.disabled = false;

      button.textContent =
        "Guardar cambios";
    }
  }
);


// -------------------------------------------------------
// MENSAJE MODAL
// -------------------------------------------------------

function mostrarMensajeAdministrar(
  message
) {

  const box =
    $("mensajeAdministrarEmpresa");

  if (!box) return;

  box.textContent =
    message;

  box.classList.remove(
    "hidden"
  );
}
});
