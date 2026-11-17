/* AKREVA - Beranda: tabel agregasi kasus per wilayah (muat SETELAH beranda.js) */
F("geoRec").insertAdjacentHTML("beforebegin", `<div class="table-card pad" id="geoTab" style="margin-top:20px">
<style>#geoTabBody th,#geoTabBody td{white-space:nowrap}#geoTabBody th:last-child,#geoTabBody td:last-child{white-space:normal;min-width:300px}#geoTabBody tr.sum td{font-weight:800;background:var(--soft)}</style>
<div class="rp-top"><h3>Tabel Agregasi Kasus per Wilayah</h3><div class="rp-btns"><button class="rp-x xl" id="geoXls">Unduh Excel (Tabel)</button></div></div>
<div class="rp-tab" id="geoTabBody" style="overflow-x:auto"></div></div>`);

let GEO = { title: "Agregasi Kasus per Wilayah", head: [], rows: [] };
function renderGeoTab() {
  const dx = F("geoDx").value, lay = F("geoLay").value, A = {}, U = { n: 0, lay: {} }, T = {}; let tot = 0;
  db.patients.forEach((p) => {
    if (!p.diagnosis || (dx && p.diagnosis !== dx) || (lay && p.layanan !== lay)) return;
    tot++; T[p.layanan] = (T[p.layanan] || 0) + 1;
    const w = WIL.find((x) => x.re.test(p.alamat || ""));
    if (!w) { U.n++; U.lay[p.layanan] = (U.lay[p.layanan] || 0) + 1; return; }
    const o = A[w.name] || (A[w.name] = { name: w.name, n: 0, lay: {}, d: {} });
    o.n++; o.lay[p.layanan] = (o.lay[p.layanan] || 0) + 1; o.d[p.diagnosis] = (o.d[p.diagnosis] || 0) + 1;
  });
  const head = ["Wilayah", "Jumlah Pasien", "Persentase (%)", "Tingkat", "Rawat Inap", "Rawat Jalan", "IGD", "Diagnosis Terbesar"];
  const pc = (n) => (tot ? Math.round((n / tot) * 1000) / 10 : 0) + "%";
  const top = (o) => Object.entries(o.d).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k} (${v})`).join(", ");
  const list = Object.values(A).sort((a, b) => b.n - a.n);
  const rows = list.map((o) => [o.name, o.n, pc(o.n), LV(o.n).t, o.lay["Rawat Inap"] || 0, o.lay["Rawat Jalan"] || 0, o.lay["IGD"] || 0, top(o)]);
  if (U.n) rows.push(["Belum terpetakan", U.n, pc(U.n), "-", U.lay["Rawat Inap"] || 0, U.lay["Rawat Jalan"] || 0, U.lay["IGD"] || 0, "Alamat tidak dikenali"]);
  const sum = ["Total", tot, tot ? "100%" : "0%", "-", T["Rawat Inap"] || 0, T["Rawat Jalan"] || 0, T["IGD"] || 0, ""];
  GEO = { title: "Agregasi Kasus per Wilayah", head, rows: rows.concat([sum]) };
  const badge = (n) => { const v = LV(n); return `<span style="background:${v.c};color:${v.k === 2 ? "#1c1417" : "#fff"};padding:3px 12px;border-radius:99px;font-weight:700;font-size:14px">${v.t}</span>`; };
  const tr = (r, cls, b) => `<tr class="${cls || ""}">${r.map((x, i) => `<td>${i === 3 && b ? b : esc(x)}</td>`).join("")}</tr>`;
  F("geoTabBody").innerHTML = `<table><thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>` +
    (list.length ? list.map((o, i) => tr(rows[i], "", badge(o.n))).join("") + rows.slice(list.length).map((r) => tr(r)).join("") + tr(sum, "sum")
      : `<tr><td colspan="${head.length}">Belum ada data yang cocok dengan filter.</td></tr>`) + `</tbody></table>`;
}
F("geoXls").addEventListener("click", () => { DATA.geo = GEO; xls("geo"); delete DATA.geo; }); // pakai fungsi unduh dari laporan.js
F("geoDx").addEventListener("change", renderGeoTab);
F("geoLay").addEventListener("change", renderGeoTab);
const _rmGeo = renderMap; renderMap = function () { _rmGeo(); renderGeoTab(); };
renderGeoTab();