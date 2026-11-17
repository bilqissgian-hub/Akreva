/* AKREVA - Import CSV + Laporan & Analitik (muat SETELAH extras.js) */
// migrasi nilai jaminan lama agar cocok dengan pilihan di form
db.patients.forEach((p) => { if (p.jaminan === "BPJS" || p.jaminan === "Asuransi") p.jaminan = "BPJS/Asuransi lain"; });
saveDB(); renderAudit();

/* ================= IMPORT CSV ================= */
const nk = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const AL = {
  nama: ["nama", "namapasien", "namalengkap", "pasien"], nik: ["nik", "noktp", "ktp"],
  rm: ["rm", "norm", "nomorrm", "nomorrekammedis", "norekammedis", "mr"],
  tglLahir: ["tanggallahir", "tgllahir", "lahir", "dob"], jk: ["jeniskelamin", "jk", "kelamin", "gender", "sex"],
  alamat: ["alamat"], dpjp: ["dpjp", "namadpjp", "dokter", "dokterdpjp"],
  diagnosis: ["diagnosis", "diagnosisutama", "namadiagnosis", "diagnosa"],
  icd: ["icd", "icd10", "kodeicd10", "kodediagnosis", "kodediagnosa", "kode"],
  jaminan: ["jaminan", "carabayar", "penjamin"], layanan: ["layanan", "ruang", "unit", "unitlayanan", "jenisrawat"],
  masuk: ["tanggalmasuk", "tglmasuk", "masuk"], keluar: ["tanggalkeluar", "tglkeluar", "keluar", "tanggalpulang"],
  pulang: ["statuspulang", "kondisipulang", "keadaankeluar"],
};
function dt(s) {
  s = (s || "").trim(); let m, y, mo, d;
  if ((m = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/))) { d = m[1]; mo = m[2]; y = m[3]; }
  else if ((m = s.match(/^(\d{4})[\/.-](\d{1,2})[\/.-](\d{1,2})/))) { y = m[1]; mo = m[2]; d = m[3]; }
  else return "";
  const o = new Date(+y, mo - 1, +d);
  return o.getMonth() == mo - 1 && o.getDate() == +d ? `${y}-${pad(mo)}-${pad(d)}` : "";
}
const CV = {
  nama: (v) => v, alamat: (v) => v, diagnosis: (v) => v,
  nik: (v) => { v = v.replace(/\D/g, ""); return v.length === 16 ? v : ""; },
  rm: (v) => { v = v.replace(/\D/g, ""); return v && v.length <= 6 ? v.padStart(6, "0") : ""; },
  tglLahir: (v) => { const x = dt(v); return x && new Date(x) <= new Date() ? x : ""; }, masuk: dt, keluar: dt,
  jk: (v) => { const k = nk(v); return /^(l|laki|lakilaki|pria|male|m)$/.test(k) ? "Laki-laki" : /^(p|perempuan|wanita|female|f)$/.test(k) ? "Perempuan" : ""; },
  icd: (v) => { v = v.toUpperCase(); return /^[A-Z]\d{2}(\.\d{1,2})?$/.test(v) ? v : ""; },
  jaminan: (v) => { const k = nk(v); return /bpjs|jkn|asuransi/.test(k) ? "BPJS/Asuransi lain" : /umum|mandiri|pribadi|tunai/.test(k) ? "Umum" : ""; },
  layanan: (v) => { const k = nk(v); return /^(ri|rawatinap|inap)$/.test(k) ? "Rawat Inap" : /^(rj|rawatjalan|poli|jalan)$/.test(k) ? "Rawat Jalan" : /^(igd|ugd|gawatdarurat)$/.test(k) ? "IGD" : ""; },
  dpjp: (v) => { const k = nk(v); if (!k) return ""; const d = doctors().find((x) => nk(x.nama) === k || nk(x.nama).includes(k) || k.includes(nk(x.nama))); return d ? d.nama : ""; },
  pulang: (v) => (/meninggal|mati|dead|death|dod/i.test(v) ? "1" : ""),
};
function csvRows(t) {
  const first = t.split("\n")[0], d = [",", ";", "\t"].sort((a, b) => first.split(b).length - first.split(a).length)[0];
  const R = []; let r = [], c = "", q = false;
  for (let i = 0; i < t.length; i++) {
    const h = t[i];
    if (q) { if (h == '"' && t[i + 1] == '"') { c += '"'; i++; } else if (h == '"') q = false; else c += h; }
    else if (h == '"') q = true; else if (h === d) { r.push(c); c = ""; }
    else if (h == "\n" || h == "\r") { if (h == "\r" && t[i + 1] == "\n") i++; r.push(c); c = ""; if (r.some((x) => x.trim())) R.push(r); r = []; }
    else c += h;
  }
  if (c || r.length) { r.push(c); if (r.some((x) => x.trim())) R.push(r); }
  return R;
}
{ const o = F("csvFile"), n = o.cloneNode(true); o.replaceWith(n);
  n.addEventListener("change", async (e) => {
    const file = e.target.files[0]; e.target.value = ""; if (!file) return;
    const R = csvRows((await file.text()).replace(/^\uFEFF/, ""));
    if (R.length < 2) return toast("File CSV kosong");
    const map = {}, used = [], skip = [];
    R[0].forEach((h, i) => { const k = nk(h), f = Object.keys(AL).find((x) => !(x in map) && AL[x].includes(k)); f ? ((map[f] = i), used.push(h.trim())) : skip.push(h.trim()); });
    if (map.nama === undefined || map.rm === undefined) return toast("CSV wajib punya kolom Nama dan No. RM");
    let add = 0, upd = 0, lew = 0;
    R.slice(1).forEach((r, i) => {
      const v = {};
      for (const k in map) { const x = CV[k]((r[map[k]] || "").trim()); if (x !== "") v[k] = x; }
      if (!v.nama || !v.rm) { lew++; return; }
      if (v.pulang) v.meninggal = true; delete v.pulang;
      const ex = db.patients.find((p) => p.rm === v.rm);
      if (ex) { Object.assign(ex, v); upd++; }
      else {
        db.patients.push({ id: Date.now() + i, nik: "", tglLahir: "", jk: "", alamat: "", dpjp: "", diagnosis: "", icd: "", jaminan: "", masuk: "", keluar: "", layanan: ui.tab, docs: {}, history: [], ...v });
        add++;
      }
    });
    addLog("Import CSV", `${add} baru, ${upd} diperbarui, ${lew} dilewati`); saveDB(); renderAudit();
    toast(`Import: ${add} baru, ${upd} diperbarui, ${lew} baris dilewati. Kolom dipakai: ${used.join(", ")}.${skip.length ? " Diabaikan: " + skip.join(", ") : ""}`);
    clearTimeout(toast._t); toast._t = setTimeout(() => (F("toast").hidden = true), 8000);
  }); }

/* ================= LAPORAN & ANALITIK ================= */
const BLN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const UNIT = ["Rawat Inap", "Rawat Jalan", "IGD"], UCOL = ["#0284c7", "#10b981", "#f59e0b"];
const COL = ["#0284c7", "#0d9488", "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f59e0b", "#10b981", "#3b82f6", "#14b8a6"];
const L = { mon: "", dx: "Rawat Inap", tt: 108, hari: 30, view: {} }, DATA = {}, CH = {};
const VAL = { id: "val", afterDatasetsDraw(c) {
  if (c.config.type === "doughnut") return;
  const x = c.ctx, h = c.options.indexAxis === "y"; x.save(); x.font = "bold 14px sans-serif"; x.fillStyle = "#b4233b";
  c.data.datasets.forEach((d, i) => c.getDatasetMeta(i).data.forEach((b, k) => { const v = d.data[k]; if (!v) return; if (h) { x.textAlign = "left"; x.fillText(v, b.x + 6, b.y + 5); } else { x.textAlign = "center"; x.fillText(v, b.x, b.y - 6); } }));
  x.restore(); } };
const tbl = (h, r) => `<table border="1" cellspacing="0"><thead><tr>${h.map((x) => `<th>${x}</th>`).join("")}</tr></thead><tbody>${r.length ? r.map((a) => `<tr>${a.map((x) => `<td>${esc(x)}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="${h.length}">Tidak ada data</td></tr>`}</tbody></table>`;
const sec = (id, title, extra = "") => `<div class="table-card pad rp-sec" id="s-${id}"><div class="rp-top"><h3>${title}</h3><div class="rp-btns"><div class="vt"><button data-v="${id}:chart" class="on">Chart View</button><button data-v="${id}:tabel">Tabel View</button></div><button class="rp-x xl" data-x="${id}">Unduh Excel (Tabel)</button><button class="rp-x pd" data-p="${id}">Unduh PDF (Visualisasi)</button></div></div>${extra}<div class="rp-chart"><canvas id="c-${id}"></canvas></div><div class="rp-lg" id="lg-${id}"></div><div class="rp-tab" id="t-${id}" hidden></div></div>`;

F("page-laporan").innerHTML = `<div id="reportBars" hidden></div>
<div class="table-card pad rp-head"><h1>Laporan &amp; Analitik</h1><label>Periode Bulan: <select id="rpMon"><option value="">Semua Bulan</option>${BLN.map((b, i) => `<option value="${i}">${b}</option>`).join("")}</select></label><button class="btn btn-primary" id="rpRef">↻ Refresh</button></div>
${sec("kb", "Kelengkapan Berkas Rekam Medis")}${sec("kj", "Total Kunjungan Pasien")}
${sec("dx", "10 Diagnosis Terbesar", `<div class="rp-tabs">${["Semua", "Rawat Inap", "Rawat Jalan"].map((t) => `<button data-dx="${t}" class="${t === L.dx ? "on" : ""}">${t === "Semua" ? "Semua" : t}</button>`).join("")}</div>`)}
${sec("ind", "Indikator Pelayanan Rumah Sakit (BOR, LOS, TOI, BTO, GDR, NDR, Maternal Death Rate, Fetal Death Rate)", `<div class="rp-ind"><label>Jumlah Tempat Tidur (TT): <input id="tt" type="number" min="1" value="108"></label><label>Periode Hari: <input id="hari" type="number" min="1" value="30"></label><span id="ind-sum"></span></div><div id="ind-cards" class="rp-cards"></div>`)}`;

function showView(i) {
  const t = L.view[i] || "chart";
  $(`#s-${i} .rp-chart`).hidden = t !== "chart"; F("lg-" + i).hidden = t !== "chart" || !F("lg-" + i).innerHTML; F("t-" + i).hidden = t === "chart";
  $$(`#s-${i} .vt button`).forEach((b) => b.classList.toggle("on", b.dataset.v === i + ":" + t));
}
function draw(id) {
  const d = DATA[id]; CH[id] && CH[id].destroy();
  const cfg = d.cfg; cfg.options = { responsive: true, maintainAspectRatio: false, ...cfg.options, plugins: d.leg ? { legend: { display: false } } : { legend: { position: "bottom" } } };
  F("lg-" + id).innerHTML = d.leg ? d.leg[0].map((l, i) => `<span><i style="background:${d.leg[1][i]}"></i>${esc(l)}</span>`).join("") : "";
  CH[id] = new Chart(F("c-" + id), { ...cfg, plugins: [VAL] });
  F("t-" + id).innerHTML = tbl(d.head, d.rows); showView(id);
}
function renderLaporan() {
  const P = db.patients.filter((p) => L.mon === "" || (p.masuk && new Date(p.masuk).getMonth() == L.mon));
  const g = (u) => P.filter((p) => p.layanan === u), ok = (u) => g(u).filter(isComplete).length;
  const avg = (u) => (g(u).length ? Math.round(g(u).reduce((s, p) => s + pctOf(p), 0) / g(u).length) : 0);
  DATA.kb = { title: "Kelengkapan Berkas Rekam Medis", head: ["Unit Layanan", "Total Pasien", "Lengkap", "Tidak Lengkap", "Rata-rata Kelengkapan"],
    rows: UNIT.map((u) => [u, g(u).length, ok(u), g(u).length - ok(u), avg(u) + "%"]),
    cfg: { type: "bar", data: { labels: UNIT, datasets: [{ label: "Lengkap", data: UNIT.map(ok), backgroundColor: "#10b981" }, { label: "Tidak Lengkap", data: UNIT.map((u) => g(u).length - ok(u)), backgroundColor: "#f43f5e" }] }, options: { scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } } } };
  DATA.kj = { title: "Total Kunjungan Pasien", head: ["Unit Layanan", "Jumlah Kunjungan", "Persentase"],
    rows: UNIT.map((u) => [u, g(u).length, (P.length ? Math.round((g(u).length / P.length) * 1000) / 10 : 0) + "%"]),
    cfg: { type: "doughnut", data: { labels: ["Rawat Inap (RI)", "Rawat Jalan (RJ)", "IGD"], datasets: [{ data: UNIT.map((u) => g(u).length), backgroundColor: UCOL }] }, options: { cutout: "58%" } } };
  // diagnosis
  const cnt = {}; P.filter((p) => (L.dx === "Semua" ? p.layanan !== "IGD" : p.layanan === L.dx) && p.diagnosis).forEach((p) => { const k = p.diagnosis + "|" + p.icd; cnt[k] = (cnt[k] || 0) + 1; });
  const top = Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, n]) => { const [d, i] = k.split("|"); return { l: `${d} (${i})`, d, i, n }; });
  DATA.dx = { title: "10 Diagnosis Terbesar - " + L.dx, head: ["No", "Diagnosis", "Kode ICD-10", "Jumlah Kasus"], rows: top.map((t, i) => [i + 1, t.d, t.i, t.n]),
    leg: [top.map((t) => t.l), COL], cfg: { type: "bar", data: { labels: top.map((t) => t.l), datasets: [{ label: "Jumlah Kasus Diagnosis", data: top.map((t) => t.n), backgroundColor: COL }] }, options: { indexAxis: "y", scales: { x: { beginAtZero: true, ticks: { precision: 0 } } } } } };
  // indikator RS (pasien Rawat Inap + IGD)
  const I = P.filter((p) => p.layanan !== "Rawat Jalan"), n = I.length;
  const days = (p) => { const b = p.keluar ? new Date(p.keluar) : new Date(); return Math.max(1, Math.round((b - new Date(p.masuk)) / 864e5)); };
  const hp = I.reduce((s, p) => s + (p.masuk ? days(p) : 0), 0), dead = I.filter((p) => p.meninggal), nd = dead.filter((p) => p.masuk && days(p) >= 2);
  const ob = I.filter((p) => /^O/i.test(p.icd)), neo = I.filter((p) => /^P/i.test(p.icd)), bed = L.tt * L.hari;
  const r2 = (x) => Math.round(x * 100) / 100, dv = (a, b) => (b ? r2(a / b) : 0);
  const IND = [
    ["BOR", "Bed Occupancy Rate (BOR)", dv(hp * 100, bed), "%", "Standar: 60% – 85%", `${hp} HP / (${L.tt} TT × ${L.hari} hr)`, "#0284c7", "#e0f2fe"],
    ["LOS", "Average Length of Stay (LOS)", dv(hp, n), " Hari", "Standar: 3 – 6 Hari", `${hp} hari / ${n} pasien`, "#10b981", "#dcfce7"],
    ["TOI", "Turn Over Interval (TOI)", dv(bed - hp, n), " Hari", "Standar: 1 – 3 Hari", `(${bed} - ${hp}) / ${n}`, "#d97706", "#fef3c7"],
    ["BTO", "Bed Turn Over (BTO)", dv(n, L.tt), " Kali", "Standar: 40 – 50 Kali/Thn", `${n} pasien / ${L.tt} TT`, "#7c3aed", "#ede9fe"],
    ["GDR", "Gross Death Rate (GDR)", dv(dead.length * 1000, n), "‰", "Standar: ≤ 45‰", `${dead.length} kasus / ${n} pasien`, "#e11d48", "#ffe4e6"],
    ["NDR", "Net Death Rate (NDR)", dv(nd.length * 1000, n), "‰", "Standar: ≤ 25‰", `${nd.length} kasus / ${n} pasien`, "#ea580c", "#ffedd5"],
    ["MDR", "Maternal Death Rate", dv(ob.filter((p) => p.meninggal).length * 100, ob.length), "%", "Standar: < 1%", `${ob.filter((p) => p.meninggal).length} / ${ob.length} pasien`, "#db2777", "#fce7f3"],
    ["FDR", "Fetal Death Rate", dv(neo.filter((p) => p.meninggal).length * 100, neo.length), "%", "Standar: < 1.5%", `${neo.filter((p) => p.meninggal).length} / ${neo.length} pasien`, "#4f46e5", "#e0e7ff"],
  ];
  F("ind-cards").innerHTML = IND.map((x) => `<div class="rp-card" style="border-color:${x[6]};background:${x[7]}"><h4>${x[1]}</h4><strong style="color:${x[6]}">${x[2]}${x[3]}</strong><small>${x[4]}</small><small>${x[5]}</small></div>`).join("");
  F("ind-sum").innerHTML = `Pasien RI &amp; IGD: <b>${n}</b> pasien · Total Hari Perawatan: <b>${hp}</b> hari`;
  DATA.ind = { title: "Indikator Pelayanan Rumah Sakit", head: ["Indikator", "Nilai", "Standar", "Perhitungan"], rows: IND.map((x) => [x[0], x[2] + x[3], x[4].replace("Standar: ", ""), x[5]]),
    leg: [IND.map((x) => `${x[0]} (${x[1]})`), IND.map((x) => x[6])], cfg: { type: "bar", data: { labels: IND.map((x) => x[0]), datasets: [{ label: "Capaian Indikator Pelayanan RS", data: IND.map((x) => x[2]), backgroundColor: IND.map((x) => x[6]) }] }, options: { scales: { y: { beginAtZero: true } } } } };
  Object.keys(DATA).forEach(draw);
}
function xls(id) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["\ufeff" + `<html><meta charset="utf-8"><body><h3>${DATA[id].title}</h3>${tbl(DATA[id].head, DATA[id].rows)}</body></html>`], { type: "application/vnd.ms-excel" }));
  a.download = `laporan-${id}.xls`; a.click();
}
function pdf(id) {
  const d = DATA[id], w = window.open("", "_blank");
  w.document.write(`<title>${d.title}</title><style>body{font-family:sans-serif;padding:24px}table{border-collapse:collapse;width:100%;margin-top:16px}td,th{border:1px solid #999;padding:6px;text-align:left}img{max-width:100%}</style><h2>${d.title}</h2><p>${RS.nama} · Periode: ${L.mon === "" ? "Semua Bulan" : BLN[L.mon]}</p><img src="${F("c-" + id).toDataURL("image/png")}">${tbl(d.head, d.rows)}`);
  w.document.close(); setTimeout(() => w.print(), 400);
}
F("page-laporan").addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.id === "rpRef") return renderLaporan();
  if (b.dataset.v) { const [i, v] = b.dataset.v.split(":"); L.view[i] = v; return showView(i); }
  if (b.dataset.x) return xls(b.dataset.x);
  if (b.dataset.p) return pdf(b.dataset.p);
  if (b.dataset.dx) { L.dx = b.dataset.dx; $$("[data-dx]").forEach((x) => x.classList.toggle("on", x === b)); renderLaporan(); }
});
F("page-laporan").addEventListener("input", (e) => { if (e.target.id === "tt") L.tt = +e.target.value || 0; if (e.target.id === "hari") L.hari = +e.target.value || 0; if (e.target.id === "tt" || e.target.id === "hari") renderLaporan(); });
F("rpMon").addEventListener("change", (e) => { L.mon = e.target.value; renderLaporan(); });
const _sp = showPage; showPage = function (n) { _sp(n); if (n === "laporan") renderLaporan(); };

/* Kartu statistik: Umum vs BPJS/Asuransi lain */
function renderStats() {
  const P = db.patients, total = P.length;
  const umum = P.filter((p) => p.jaminan === "Umum").length;
  const bpjs = P.filter((p) => /bpjs|asuransi/i.test(p.jaminan || "")).length;
  const avg = total ? Math.round(P.reduce((a, p) => a + pctOf(p), 0) / total) : 0;
  F("stTotal").textContent = total;
  F("stOk").textContent = umum;
  F("stBad").textContent = bpjs;
  F("stAvg").textContent = avg + "%";
}
F("stOk").previousElementSibling.textContent = "Pasien Umum";
F("stBad").previousElementSibling.textContent = "Pasien BPJS/Asuransi lain";
renderStats();

/* Beri ruang agar angka di atas batang tidak terpotong */
Chart.defaults.set("layout", { padding: { top: 28, right: 40, bottom: 0, left: 0 } });
Chart.defaults.scales.linear.grace = "12%";

/* Sumbu Y grafik "10 Diagnosis Terbesar" hanya menampilkan kode ICD-10 */
const _drawKode = draw;
draw = function (id) {
  if (id === "dx" && DATA.dx && DATA.dx.cfg) {
    const o = (DATA.dx.cfg.options = DATA.dx.cfg.options || {});
    o.scales = o.scales || {};
    o.scales.y = Object.assign({}, o.scales.y, {
      ticks: {
        callback(v) {
          const t = String(this.getLabelForValue(v));
          return (t.match(/\(([^()]*)\)\s*$/) || [])[1] || t;
        },
      },
    });
  }
  _drawKode(id);
};