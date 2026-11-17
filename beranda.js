/* AKREVA - Beranda: peta sebaran diagnosis + rekomendasi prioritas (muat SETELAH laporan.js) */
const LF = window.L; // Leaflet (nama L dipakai laporan.js, jadi diambil lewat window)

// Wilayah (koordinat PERKIRAAN pusat wilayah). Tambah baris untuk wilayah lain:
// ["Nama tampil", "kata kunci regex", lintang, bujur]
const WIL = [
  ["Temon","temon",-7.89,110.06],
  ["Wates","wates",-7.86,110.16],
  ["Panjatan","panjatan",-7.915,110.175],
  ["Galur","galur",-7.95,110.23],
  ["Lendah","lendah",-7.90,110.245],
  ["Sentolo","sentolo",-7.83,110.225],
  ["Pengasih","pengasih",-7.82,110.15],
  ["Kokap","kokap",-7.83,110.09],
  ["Girimulyo","girimulyo",-7.76,110.15],
  ["Nanggulan","nanggulan",-7.75,110.22],
  ["Samigaluh","samigaluh",-7.67,110.18],
  ["Kalibawang","kalibawang",-7.695,110.235],
  ["Bantul","bantul",-7.888,110.329],
  ["Sleman","sleman",-7.716,110.355],
  ["Kota Yogyakarta","kota\\s*(yogya|jogja)",-7.795,110.369],
  ["Purworejo","purworejo",-7.714,110.009],
  ["Magelang","magelang",-7.48,110.218],
  ["Gunungkidul","gunung\\s*kidul",-7.964,110.601],
].map(([name, re, lat, lng]) => ({ name, re: new RegExp(re, "i"), ll: [lat, lng] }));

// Tingkat berdasarkan JUMLAH pasien per wilayah: hijau 0-15, kuning 16-30, merah 31-50, hitam >50
const LV = (n) => (n > 50 ? { k: 4, c: "#111111", t: "Sangat tinggi" } : n > 30 ? { k: 3, c: "#dc2626", t: "Tinggi" } : n > 15 ? { k: 2, c: "#facc15", t: "Sedang" } : { k: 1, c: "#22c55e", t: "Rendah" });
// diagnosis berisiko tinggi (bobot 2): pre/eklampsia, plasenta previa, perdarahan, prematur, KE, neonatal berat
const HIGHRISK = /^(O14|O15|O44|O45|O46|O72|O00|O60|P07|P21|P22|P36)/i;
const REC = [
  [/^O1[0-6]/, "Perkuat skrining tekanan darah dan proteinuria pada pemeriksaan kehamilan (ANC), serta kesiapan tata laksana pre-eklampsia/eklampsia dan rujukan."],
  [/^O(44|45|46|67|72)/, "Pastikan kesiapan penanganan perdarahan obstetri (obat, alat, tim) dan transportasi rujukan yang cepat."],
  [/^O(42|43|60)/, "Edukasi tanda bahaya ketuban pecah/persalinan prematur, rujukan dini, dan kesiapan layanan bayi prematur."],
  [/^O24/, "Perluas skrining gula darah ibu hamil dan edukasi gizi di fasilitas tingkat pertama."],
  [/^O(0|21)/, "Perkuat konseling kehamilan awal, deteksi dini komplikasi trimester pertama, dan akses USG."],
  [/^O3[23]/, "Tingkatkan pemeriksaan posisi janin/panggul pada ANC trimester akhir dan rencana persalinan di rumah sakit."],
  [/^P/, "Perkuat layanan neonatal: resusitasi bayi baru lahir, fototerapi/ruang perawatan bayi, dan edukasi perawatan bayi di rumah."],
  [/^[DN]/, "Perkuat deteksi dini dan rujukan layanan ginekologi (USG dan konsultasi spesialis)."],
];
const recOf = (icd) => (REC.find((r) => r[0].test(icd || "")) || [0, "Evaluasi faktor risiko setempat dan perkuat layanan yang terkait diagnosis ini."])[1];

// 1) pindahkan kartu statistik dari Beranda ke Laporan & Analitik (id tetap, renderStats() tetap jalan)
$(".rp-head", F("page-laporan")).after($("#page-beranda .stats"));

// 2) isi Beranda
F("page-beranda").innerHTML = `<h1>Pemetaan Kasus Berdasarkan Daerah Tempat Tinggal</h1>
<div class="geo-bar"><label>Diagnosis <select id="geoDx"></select></label>
<label>Layanan <select id="geoLay"><option value="">Semua</option><option>Rawat Inap</option><option>Rawat Jalan</option><option>IGD</option></select></label>
<span class="geo-leg"><b style="background:#22c55e"></b>0–15 <b style="background:#facc15"></b>16–30 <b style="background:#dc2626"></b>31–50 <b style="background:#111"></b>&gt;50 pasien</span><span id="geoSum"></span></div>
<div class="geo-wrap"><div id="geoMap"></div>
<aside class="geo-side"><h3>Sebaran per Wilayah</h3><div id="geoList"></div><details id="geoUnk"></details></aside></div>
<div class="table-card pad" id="geoRec"></div>
<p class="geo-note">Titik menunjukkan perkiraan pusat wilayah (kecamatan/kabupaten) berdasarkan kata pada kolom Alamat, bukan lokasi rumah pasien. Warna menunjukkan jumlah pasien per wilayah. Klik titik atau nama wilayah untuk melihat rincian diagnosis.</p>`;

let MAP = null, GROUP = null, MK = {}, SUM = "";

function renderMap() {
  if (!LF || !LF.map) { F("geoSum").textContent = "Peta gagal dimuat (periksa koneksi internet)"; return; }
  if (!MAP) {
    MAP = LF.map("geoMap").setView([-7.83, 110.16], 10);
    LF.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: "© OpenStreetMap" }).addTo(MAP);
    GROUP = LF.layerGroup().addTo(MAP);
  }
  MAP.invalidateSize();
  const sel = F("geoDx"), cur = sel.value, cnt = {};
  db.patients.forEach((p) => { if (p.diagnosis) cnt[p.diagnosis] = (cnt[p.diagnosis] || 0) + 1; });
  sel.innerHTML = `<option value="">Semua diagnosis</option>` + Object.entries(cnt).sort((a, b) => b[1] - a[1]).map(([d, n]) => `<option value="${esc(d)}">${esc(d)} (${n})</option>`).join("");
  sel.value = cur; if (sel.value !== cur) sel.value = "";

  const dx = sel.value, lay = F("geoLay").value, pts = {}, unk = {}, icd = {}; let mapped = 0, unmapped = 0;
  db.patients.forEach((p) => {
    if (!p.diagnosis || (dx && p.diagnosis !== dx) || (lay && p.layanan !== lay)) return;
    const w = WIL.find((x) => x.re.test(p.alamat || ""));
    if (!w) { unmapped++; const k = (p.alamat || "").trim() || "(alamat kosong)"; unk[k] = (unk[k] || 0) + 1; return; }
    const o = pts[w.name] || (pts[w.name] = { name: w.name, ll: w.ll, n: 0, w: 0, d: {} });
    o.n++; o.w += HIGHRISK.test(p.icd || "") ? 2 : 1; mapped++; o.d[p.diagnosis] = (o.d[p.diagnosis] || 0) + 1;
    icd[p.diagnosis] = icd[p.diagnosis] || p.icd;
  });
  const list = Object.values(pts).sort((a, b) => b.n - a.n), max = Math.max(1, ...list.map((p) => p.n));
  const topDx = (p) => Object.entries(p.d).sort((a, b) => b[1] - a[1]);

  GROUP.clearLayers(); MK = {};
  list.forEach((p) => {
    const lv = LV(p.n), top = topDx(p);
    MK[p.name] = LF.circleMarker(p.ll, { radius: 10 + Math.sqrt(p.n) * 5, color: "#fff", weight: 2, fillColor: lv.c, fillOpacity: .88 }).addTo(GROUP)
      .bindTooltip(`${p.name}: ${p.n} pasien (${lv.t})`)
      .bindPopup(`<b>${esc(p.name)}</b> — ${p.n} pasien<br>Tingkat: <b>${lv.t}</b><hr>${top.slice(0, 8).map(([k, v]) => `${esc(k)}: <b>${v}</b>`).join("<br>")}${top.length > 8 ? `<br>+${top.length - 8} diagnosis lain` : ""}`);
  });
  if (list.length) MAP.fitBounds(LF.latLngBounds(list.map((p) => p.ll)).pad(.35), { maxZoom: 11 });

  F("geoSum").textContent = `${mapped} pasien terpetakan · ${unmapped} belum terpetakan`;
  F("geoList").innerHTML = list.map((p) => `<div class="geo-row" data-k="${esc(p.name)}"><div><b>${esc(p.name)}</b><span>${p.n}</span></div><i style="width:${(p.n / max) * 100}%;background:${LV(p.n).c}"></i></div>`).join("") || `<p class="muted-p">Belum ada data yang cocok.</p>`;
  const u = Object.entries(unk).sort((a, b) => b[1] - a[1]);
  F("geoUnk").hidden = !u.length;
  F("geoUnk").innerHTML = `<summary>Alamat belum terpetakan (${unmapped})</summary>${u.slice(0, 30).map(([a, n]) => `<div>${esc(a)} — ${n}</div>`).join("")}<div style="margin-top:8px">Tambahkan wilayahnya di daftar <b>WIL</b> pada beranda.js.</div>`;

  // rekomendasi prioritas: urut berdasarkan kasus berbobot (diagnosis berisiko tinggi dihitung 2)
  const rank = list.slice().sort((a, b) => b.w - a.w).slice(0, 5);
  F("geoRec").innerHTML = `<div class="geo-rec-h"><h3>Rekomendasi Prioritas Wilayah${dx ? " — " + esc(dx) : ""}</h3><button class="btn btn-light" id="geoCopy">Salin ringkasan untuk AI</button></div>` +
    (rank.length ? `<ol class="geo-rec">${rank.map((p) => {
      const top = topDx(p), lv = LV(p.n), risk = top.filter(([k]) => HIGHRISK.test(icd[k] || "")).reduce((s, [, v]) => s + v, 0);
      const recs = [...new Set(top.slice(0, 3).map(([k]) => recOf(icd[k])))].slice(0, 2);
      return `<li><span class="dot" style="background:${lv.c}"></span><b>${esc(p.name)}</b> · ${p.n} pasien · tingkat ${lv.t}<br>Diagnosis dominan: ${top.slice(0, 3).map(([k, v]) => `${esc(k)} (${v})`).join(", ")}${risk ? `<br>${risk} kasus berisiko tinggi (obstetri/neonatal berat)` : ""}<ul>${recs.map((r) => `<li>${r}</li>`).join("")}</ul></li>`;
    }).join("")}</ol>` : `<p class="muted-p">Belum ada data untuk dianalisis.</p>`) +
    `<p class="geo-note">Rekomendasi dibuat otomatis dengan aturan analisis jumlah kasus. Rekomendasi ini belum memperhitungkan jumlah penduduk tiap wilayah, sehingga perlu ditinjau juga dari tenaga kesehatan sebelum digunakan untuk membuat keputusan.</p>`;
  SUM = `Ringkasan sebaran kasus per wilayah (data agregat tanpa identitas pasien)${dx ? ", diagnosis: " + dx : ""}${lay ? ", layanan: " + lay : ""}:\n` +
    list.map((p) => `- ${p.name}: ${p.n} pasien (${LV(p.n).t}); ${topDx(p).slice(0, 5).map(([k, v]) => `${k} ${v}`).join(", ")}`).join("\n") +
    "\n\nTolong tentukan wilayah prioritas yang membutuhkan penguatan layanan kesehatan, jenis layanan yang dibutuhkan, dan alasannya.";
}
F("geoDx").addEventListener("change", renderMap);
F("geoLay").addEventListener("change", renderMap);
F("geoList").addEventListener("click", (e) => {
  const r = e.target.closest(".geo-row"), m = r && MK[r.dataset.k];
  if (m) { MAP.flyTo(m.getLatLng(), 12); m.openPopup(); }
});
F("geoRec").addEventListener("click", async (e) => {
  if (!e.target.closest("#geoCopy")) return;
  try { await navigator.clipboard.writeText(SUM); toast("Ringkasan disalin. Tempel ke asisten AI pilihan Anda."); } catch (x) { toast("Gagal menyalin ringkasan"); }
});
window.addEventListener("resize", () => MAP && MAP.invalidateSize());
const _spB = showPage; showPage = function (n) { _spB(n); if (n === "beranda") setTimeout(renderMap, 60); };