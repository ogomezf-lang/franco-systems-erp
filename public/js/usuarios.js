let users = [];

document.addEventListener("DOMContentLoaded", async () => {
  const me = await FrancoShell.init();
  if (!me) return;
  if (me.user?.role !== "ADMIN") {
    alert("Esta secciÃ³n es solo para administradores.");
    location.href = "dashboard.html";
    return;
  }

  document.getElementById("btnNewUser").addEventListener("click", () => document.getElementById("userModal").classList.add("open"));
  document.getElementById("userModalClose").addEventListener("click", closeUserModal);
  document.getElementById("btnCancelUser").addEventListener("click", closeUserModal);
  document.getElementById("userModal").addEventListener("click", e => { if (e.target.id === "userModal") closeUserModal(); });
  document.getElementById("userForm").addEventListener("submit", createUser);
  await loadUsers();
});

async function loadUsers() {
  try {
    const data = await FrancoAPI.apiFetch("/api/users");
    users = data.users || [];
    const tbody = document.getElementById("usersTable");
    tbody.innerHTML = users.length ? users.map(u => `
      <tr>
        <td data-label="Nombre" class="strong">${FrancoAPI.esc(u.full_name)}</td>
        <td data-label="Correo">${FrancoAPI.esc(u.email || "-")}</td>
        <td data-label="Rol"><span class="badge ${u.role === "ADMIN" ? "admin" : "operator"}">${u.role}</span></td>
        <td data-label="Estado"><span class="badge ${u.active ? "active" : "cancelled"}">${u.active ? "ACTIVO" : "INACTIVO"}</span></td>
        <td data-label="Creado">${FrancoAPI.date(u.created_at)}</td>
        <td class="actions">
          <button class="btn btn-soft btn-sm" onclick="toggleRole('${u.id}')">Cambiar rol</button>
          <button class="btn btn-secondary btn-sm" onclick="toggleActive('${u.id}')">${u.active ? "Desactivar" : "Activar"}</button>
          <button class="btn btn-danger btn-sm" onclick="deleteUser('${u.id}')">Eliminar</button>
        </td>
      </tr>
    `).join("") : `<tr><td colspan="6" class="empty">No hay usuarios.</td></tr>`;
  } catch (error) { alert(error.message); }
}

function closeUserModal() {
  document.getElementById("userModal").classList.remove("open");
  document.getElementById("userForm").reset();
}

async function createUser(event) {
  event.preventDefault();
  const payload = {
    full_name: document.getElementById("newUserName").value,
    email: document.getElementById("newUserEmail").value,
    password: document.getElementById("newUserPassword").value,
    role: document.getElementById("newUserRole").value,
  };
  try {
    await FrancoAPI.apiFetch("/api/users", { method:"POST", body:JSON.stringify(payload) });
    closeUserModal();
    await loadUsers();
  } catch (error) { alert(error.message); }
}

async function toggleRole(id) {
  const u = users.find(x => x.id === id);
  if (!u) return;
  const role = u.role === "ADMIN" ? "OPERADOR" : "ADMIN";
  if (!confirm(`Â¿Cambiar a ${u.full_name} al rol ${role}?`)) return;
  try {
    await FrancoAPI.apiFetch(`/api/users/${id}`, { method:"PATCH", body:JSON.stringify({ role }) });
    await loadUsers();
  } catch (error) { alert(error.message); }
}

async function toggleActive(id) {
  const u = users.find(x => x.id === id);
  if (!u) return;
  try {
    await FrancoAPI.apiFetch(`/api/users/${id}`, { method:"PATCH", body:JSON.stringify({ active: !u.active }) });
    await loadUsers();
  } catch (error) { alert(error.message); }
}

async function deleteUser(id) {
  const u = users.find(x => x.id === id);
  if (!u || !confirm(`Â¿Eliminar el usuario ${u.full_name}?`)) return;
  try {
    await FrancoAPI.apiFetch(`/api/users/${id}`, { method:"DELETE" });
    await loadUsers();
  } catch (error) { alert(error.message); }
}

