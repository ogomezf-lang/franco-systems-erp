// FRANCO SYSTEMS CLASSIC CLOUD - shell visual v1.2.0
const FrancoShell = (() => {
  const page = document.body.dataset.page || "";

  const pageInfo = {
    dashboard: ["Dashboard", "Resumen general del sistema"],
    quote_new: ["Nueva Cotización", "Crear un nuevo documento"],
    quotes: ["Cotizaciones", "Historial de cotizaciones"],
    clients: ["Clientes", "Gestión de clientes"],
    products: ["Productos", "Catálogo de productos y servicios"],
    settings: ["Configuración", "Empresa y preferencias del sistema"],
    accounts: ["Cuentas", "Medios de pago"],
    users: ["Usuarios", "Accesos y permisos"],
    quote_view: ["Detalle de Cotización", "Vista del documento"]
  };

  const nav = [
    ["dashboard", "dashboard.html", "⌂", "Inicio", "PRINCIPAL"],
    ["quote_new", "nueva-cotizacion.html", "＋", "Nueva Cotización", "VENTAS"],
    ["quotes", "cotizaciones.html", "▤", "Cotizaciones", "VENTAS"],
    ["clients", "clientes.html", "♙", "Clientes", "GESTIÓN"],
    ["products", "productos.html", "□", "Productos", "GESTIÓN"],
    ["settings", "configuracion.html", "⚙", "Configuración", "SISTEMA"],
    ["accounts", "cuentas.html", "▣", "Cuentas", "SISTEMA"],
    ["users", "usuarios.html", "♜", "Usuarios", "SISTEMA", "admin"]
  ];

  function sidebarHtml() {
    let last = "";
    let out = "";

    for (const [id, href, icon, label, group, admin] of nav) {
      if (group !== last) {
        out += `${last ? "</div>" : ""}
          <div class="sidebar-grupo">
            <span class="sidebar-titulo">${group}</span>`;
        last = group;
      }

      const active =
        id === page || (page === "quote_view" && id === "quotes")
          ? " activo"
          : "";

      out += `
        <a href="${href}"
           class="sidebar-item${active}${admin ? " sidebar-admin-link" : ""}">
          <span class="sidebar-icono">${icon}</span>
          <span>${label}</span>
        </a>`;
    }

    out += "</div>";

    return `
      <aside class="erp-sidebar">
        <div class="sidebar-marca">
          <img src="img/icon-192.png"
               class="sidebar-logo"
               alt="Franco Systems">

          <div class="sidebar-marca-texto">
            <strong>FRANCO SYSTEMS</strong>
            <span>Business ERP</span>
          </div>
        </div>

        <nav class="sidebar-menu">
          ${out}
        </nav>

        <div class="sidebar-pie">
          <strong>Franco Systems</strong>
          <span>Business ERP v1.0</span>
        </div>
      </aside>

      <div class="sidebar-overlay" id="sidebarOverlay"></div>
    `;
  }

  function topbarHtml() {
    const [title, subtitle] =
      pageInfo[page] || ["Franco Systems", "Business ERP"];

    return `
      <header class="erp-topbar">

        <div style="display:flex;align-items:center">
          <button class="menu-mobile"
                  id="menuMobile"
                  type="button">☰</button>

          <div class="topbar-pagina">
            <h2>${title}</h2>
            <span>${subtitle}</span>
          </div>
        </div>

        <div class="topbar-derecha">

          <button type="button"
                  id="installAppBtn"
                  class="btn-instalar-app hidden">
            Instalar app
          </button>

          <div class="topbar-empresa">
            <span>EMPRESA</span>
            <strong id="empresaActual">Mi Empresa</strong>
          </div>

          <div class="topbar-separador"></div>

          <div class="usuario-avatar" id="usuarioAvatar">A</div>

          <div class="usuario-info">
            <strong id="usuarioActual">ADMIN</strong>
            <span id="usuarioRol">Administrador</span>
          </div>

          <button type="button"
                  class="btn-salir"
                  id="btnCerrarSesion">
            Salir
          </button>

        </div>
      </header>
    `;
  }

  function bottomHtml() {
    const a = (id) =>
      id === page || (page === "quote_view" && id === "quotes")
        ? " active"
        : "";

    return `
      <nav class="bottom-nav">

        <a href="dashboard.html" class="${a("dashboard")}">
          <span class="nav-icon">⌂</span>
          <span>Inicio</span>
        </a>

        <a href="nueva-cotizacion.html" class="${a("quote_new")}">
          <span class="nav-icon">＋</span>
          <span>Cotizar</span>
        </a>

        <a href="cotizaciones.html" class="${a("quotes")}">
          <span class="nav-icon">▤</span>
          <span>Docs</span>
        </a>

        <a href="clientes.html" class="${a("clients")}">
          <span class="nav-icon">♙</span>
          <span>Clientes</span>
        </a>

        <button type="button" id="bottomMore">
          <span class="nav-icon">☰</span>
          <span>Más</span>
        </button>

      </nav>
    `;
  }

  async function init() {
    if (!FrancoAPI.requireSession()) {
      return false;
    }

    document
      .getElementById("sidebarMount")
      ?.insertAdjacentHTML("afterbegin", sidebarHtml());

    document
      .getElementById("topbarMount")
      ?.insertAdjacentHTML("afterbegin", topbarHtml());

    document
      .getElementById("bottomMount")
      ?.insertAdjacentHTML("afterbegin", bottomHtml());

    const close = () =>
      document.body.classList.remove("sidebar-open");

    document
      .getElementById("menuMobile")
      ?.addEventListener("click", () =>
        document.body.classList.toggle("sidebar-open")
      );

    document
      .getElementById("bottomMore")
      ?.addEventListener("click", () =>
        document.body.classList.toggle("sidebar-open")
      );

    document
      .getElementById("sidebarOverlay")
      ?.addEventListener("click", close);

    document
      .querySelectorAll(".sidebar-item")
      .forEach((item) =>
        item.addEventListener("click", close)
      );

    document
      .getElementById("btnCerrarSesion")
      ?.addEventListener("click", () => {
        if (confirm("¿Desea cerrar la sesión?")) {
          FrancoAPI.logout();
        }
      });

    try {
      const me = await FrancoAPI.apiFetch("/api/auth/me");

      const u = me.user || {};
      const c = me.company || {};

      const role = String(u.role || "OPERADOR").toUpperCase();

      // Nombre que aparecerá arriba
      const nombreVisual =
        role === "SUPERADMIN"
          ? "SUPERADMIN"
          : role === "ADMIN"
          ? "ADMIN"
          : u.full_name || u.email || "Usuario";

      // Texto descriptivo del rol
      const nombreRol =
        role === "SUPERADMIN"
          ? "Superadministrador"
          : role === "ADMIN"
          ? "Administrador"
          : "Operador";

      // Empresa
      const empresaActual =
        document.getElementById("empresaActual");

      if (empresaActual) {
        empresaActual.textContent =
          c.name || "Mi Empresa";
      }

      // Usuario
      const usuarioActual =
        document.getElementById("usuarioActual");

      if (usuarioActual) {
        usuarioActual.textContent = nombreVisual;
      }

      // Rol
      const usuarioRol =
        document.getElementById("usuarioRol");

      if (usuarioRol) {
        usuarioRol.textContent = nombreRol;
      }

      // Avatar
      const avatar =
        document.getElementById("usuarioAvatar");

      if (avatar) {
        avatar.textContent =
          nombreVisual.charAt(0).toUpperCase();
      }

      // ADMIN y SUPERADMIN reciben permisos visuales de administrador
      if (role === "ADMIN" || role === "SUPERADMIN") {
        document.body.classList.add("user-admin");
      }

      // Clase exclusiva para futuras funciones SUPERADMIN
      if (role === "SUPERADMIN") {
        document.body.classList.add("user-superadmin");
      }

      localStorage.setItem(
        "franco_me",
        JSON.stringify(me)
      );

      return me;

    } catch (error) {

      if (error.status === 401) {
        FrancoAPI.logout();
      }

      const setupAlert =
        document.getElementById("setupAlert");

      if (setupAlert) {
        setupAlert.classList.remove("hidden");
        setupAlert.textContent = error.message;
      }

      return null;
    }
  }

  return {
    init
  };
})();