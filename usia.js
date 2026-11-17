/* AKREVA - Laporan: kunjungan pasien menurut umur dan diagnosis (muat SETELAH laporan.js) */
const AGE = [["0–14 th", 0, 14, "#0284c7"], ["15–64 th", 15, 64, "#10b981"], ["≥ 65 th", 65, 200, "#e11d48"]];

// Pecah nama panjang menjadi beberapa baris agar semua terbaca di sumbu x
const bungkus = (teks, maks = 22) => {
  const baris = []; let cur = "";
  String(teks).split(" ").forEach((w) => {
    if ((cur + " " + w).trim().length > maks) { if (cur) baris.push(cur); cur = w; }
    else cur = (cur + " " + w).trim();
  });
  if (cur) baris.push(cur);
  return baris;
};

const ageAt = (p) => {
  if (!p.tglLahir) return null;
  const b = new Date(p.tglLahir), r = p.masuk ? new Date(p.masuk) : new Date();
  if (isNaN(b) || isNaN(r) || b > r) return null;
  return Math.floor((r - b) / 31557600000);
};
// sisipkan bagian baru tepat di bawah "Total Kunjungan Pasien"
$("#s-kj").insertAdjacentHTML("afterend", sec("um", "Kunjungan Pasien Berdasarkan Umur dan Diagnosis", `<p class="geo-note" id="um-note" style="margin:0 0 14px"></p>`));

function buildUm() {
  const P = db.patients.filter((p) => L.mon === "" || (p.masuk && new Date(p.masuk).getMonth() == L.mon));
  const tab = {}; let skip = 0;
  P.forEach((p) => {
    const a = ageAt(p);
    if (a === null || !p.diagnosis) { skip++; return; }
    const g = AGE.findIndex((x) => a >= x[1] && a <= x[2]), k = p.diagnosis + "|" + (p.icd || "");
    (tab[k] = tab[k] || [0, 0, 0, 0])[g]++; tab[k][3]++;
  });
  const top = Object.entries(tab).sort((a, b) => b[1][3] - a[1][3]).slice(0, 10).map(([k, v]) => { const [d, i] = k.split("|"); return { l: i ? `${d} (${i})` : d, d, i, v }; });
  F("um-note").textContent = `10 diagnosis dengan kunjungan terbanyak. Umur dihitung saat tanggal masuk. ${skip} kunjungan tidak dihitung karena tanggal lahir atau diagnosis belum terisi/valid.`;
  DATA.um = { title: "Kunjungan Pasien Berdasarkan Umur dan Diagnosis", head: ["Diagnosis", "Kode ICD-10", ...AGE.map((x) => x[0]), "Total"],
    rows: top.map((t) => [t.d, t.i, t.v[0], t.v[1], t.v[2], t.v[3]]),
    cfg: { type: "line", data: { labels: top.map((t) => t.l), datasets: AGE.map((x, i) => ({ label: x[0], data: top.map((t) => t.v[i]), borderColor: x[3], backgroundColor: x[3], borderWidth: 3, pointRadius: 5, tension: .25 })) },
      options: { interaction: { mode: "index", intersect: false }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } }, x: { ticks: { autoSkip: false, maxRotation: 0, minRotation: 0, callback(v) { const t = this.getLabelForValue(v); return (t.match(/\(([^()]*)\)\s*$/) || [])[1] || t; } } } } } } } };

// angka di atas titik tidak ditampilkan untuk grafik garis (nilai ada di tooltip dan Tabel View)
{ const f = VAL.afterDatasetsDraw; VAL.afterDatasetsDraw = function (c) { if (c.config.type !== "line") f.call(this, c); }; }
const _rl = renderLaporan; renderLaporan = function () { buildUm(); _rl(); };