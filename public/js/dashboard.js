function dashMoney(value, currency="SOLES") {
  const symbol = currency === "DOLARES" ? "$" : "S/";
  return `${symbol} ${Number(value || 0).toFixed(2)}`;
}

document.addEventListener("DOMContentLoaded", async () => {
  const me = await FrancoShell.init();
  if (!me) return;
  try {
    const data = await FrancoAPI.apiFetch("/api/dashboard");
    const s = data.summary || {};
    document.getElementById("kpiQuotes").textContent = s.quotes || 0;
    document.getElementById("kpiActive").textContent = s.active_quotes || 0;
    document.getElementById("kpiCancelled").textContent = s.cancelled_quotes || 0;
    document.getElementById("kpiMonth").textContent = dashMoney(s.month_total_pen ?? s.month_total ?? 0, "SOLES");
    document.getElementById("kpiMonthUsd").textContent = dashMoney(s.month_total_usd || 0, "DOLARES");
    const tbody = document.getElementById("latestQuotes");
    if (!(data.latest || []).length) {
      tbody.innerHTML = `<tr><td colspan="6" class="empty">TodavÃ­a no hay cotizaciones registradas.</td></tr>`;
      return;
    }
    tbody.innerHTML = data.latest.map(q => `
      <tr>
        <td data-label="NÂ°"><a class="strong" href="ver-cotizacion.html?id=${q.id}">${FrancoAPI.esc(q.quote_number)}</a></td>
        <td data-label="Cliente">${FrancoAPI.esc(q.client_name)}</td>
        <td data-label="Fecha">${FrancoAPI.date(q.quote_date)}</td>
        <td data-label="Total" class="text-right">${dashMoney(q.total_amount, q.currency || "SOLES")}</td>
        <td data-label="Estado"><span class="badge ${q.status === "ACTIVA" ? "active" : "cancelled"}">${q.status}</span></td>
        <td class="actions"><a class="btn btn-soft btn-sm" href="ver-cotizacion.html?id=${q.id}">Ver</a></td>
      </tr>`).join("");
  } catch (error) {
    const a = document.getElementById("setupAlert");
    a.classList.remove("hidden"); a.textContent = error.message;
  }
});

