/* AKREVA - Laporan & peta dihitung berdasarkan KODE ICD-10, nama diambil dari file WHO ICD-10 2019 (muat PALING AKHIR) */

// Letak file CODES dari WHO (hasil ekstrak icd102019enMeta.zip). Sesuaikan nama/foldernya bila berbeda.
const ICD_FILE = "icd10/icd102019syst_codes.txt";

// Path XML sesuai Explorer Anda (hasil ekstrak membuat folder bernama icd102019en.xml)
const ICD_FILE_XML = "icd10/icd102019en.xml/icd102019en.xml";

// Nama yang ingin Anda paksa (menimpa WHO), misalnya terjemahan Indonesia. Contoh: "P22.1": "Takipnea sementara pada bayi baru lahir"
const ICD_UBAH = {};

// Cadangan bila file WHO belum tersedia (dipakai hanya jika kode tidak ada di file WHO)
const ICD_NAMA = {
  "D25.9": "Leiomyoma of uterus, unspecified", "N83.2": "Other and unspecified ovarian cysts",
  "O00.1": "Tubal pregnancy", "O06.4": "Unspecified abortion, incomplete, without complication",
  "O13": "Gestational [pregnancy-induced] hypertension without significant proteinuria",
  "O14.0": "Moderate pre-eclampsia", "O14.1": "Severe pre-eclampsia", "O14.9": "Pre-eclampsia, unspecified",
  "O15.0": "Eclampsia in pregnancy", "O15.9": "Eclampsia, unspecified as to time period", "O16": "Unspecified maternal hypertension",
  "O20.0": "Threatened abortion", "O21.0": "Mild hyperemesis gravidarum", "O21.1": "Hyperemesis gravidarum with metabolic disturbance",
  "O21.9": "Vomiting of pregnancy, unspecified", "O24.4": "Diabetes mellitus arising in pregnancy",
  "O32.1": "Maternal care for breech presentation", "O33.0": "Maternal care for disproportion due to deformity of maternal pelvic bones",
  "O33.9": "Maternal care for disproportion, unspecified", "O34.2": "Maternal care due to uterine scar from previous surgery",
  "O36.5": "Maternal care for poor fetal growth", "O42.0": "Premature rupture of membranes, onset of labour within 24 hours",
  "O42.9": "Premature rupture of membranes, unspecified", "O44.1": "Placenta praevia with haemorrhage",
  "O47.0": "False labour before 37 completed weeks of gestation", "O60.1": "Preterm spontaneous labour with preterm delivery",
  "O63.0": "Prolonged first stage (of labour)", "O63.1": "Prolonged second stage (of labour)",
  "O72.0": "Third-stage haemorrhage", "O72.1": "Other immediate postpartum haemorrhage", "O80.0": "Spontaneous vertex delivery",
  "O82.0": "Delivery by elective caesarean section", "O82.1": "Delivery by emergency caesarean section",
  "O99.0": "Anaemia complicating pregnancy, childbirth and the puerperium",
  "P05.1": "Small for gestational age", "P07.1": "Other low birth weight", "P12.0": "Cephalhaematoma due to birth injury",
  "P21.9": "Birth asphyxia, unspecified", "P22.0": "Respiratory distress syndrome of newborn", "P22.1": "Transient tachypnoea of newborn",
  "P36.4": "Sepsis of newborn due to Escherichia coli", "P38": "Omphalitis of newborn with or without mild haemorrhage",
  "P59.9": "Neonatal jaundice, unspecified", "P70.4": "Other neonatal hypoglycaemia",
  "Q21.0": "Ventricular septal defect", "Q21.1": "Atrial septal defect", "Q38.1": "Ankyloglossia", "Q66.0": "Talipes equinovarus", "Q90.9": "Down syndrome, unspecified",
  "Z34.0": "Supervision of normal first pregnancy", "Z34.8": "Supervision of other normal pregnancy", "Z34.9": "Supervision of normal pregnancy, unspecified",
};

const ICD_WHO = {}; // diisi dari file WHO

// "o80 .0" -> "O80.0", "O800" -> "O80.0"
const normKode = (c) => { c = String(c || "").replace(/\s+/g, "").toUpperCase(); return /^[A-Z]\d{3,4}$/.test(c) ? c.slice(0, 3) + "." + c.slice(3) : c; };
const kodeIcd = (p) => normKode(p.icd);
const namaIcd = (c) => ICD_UBAH[c] || ICD_WHO[c] || ICD_NAMA[c];

// Baca CODES.TXT WHO (dipisah titik koma). Cari kolom "kode tanpa titik" (mis. O800) -> kolom sebelumnya = kode (O80.0), kolom sesudahnya = judul.
function parseIcdTxt(txt) {
  const out = {};
  txt.split(/\r?\n/).forEach((line) => {
    const f = line.split(";");
    let j = -1;
    for (let k = 4; k < f.length - 1 && k < 11; k++) {
      if (/^[A-Z]\d{2,4}$/.test(f[k]) && f[k] === f[k - 1].replace(".", "")) j = k; // ambil yang terakhir
    }
    if (j > 0 && f[j + 1] && f[j + 1].trim()) out[f[j - 1]] = f[j + 1].trim();
  });
  return out;
}

// nama untuk kode yang tidak ada di mana pun: nama yang paling sering diketik (diberi akhiran kode bila bentrok)
function icdFallback() {
  const f = {}, m = {}, dipakai = new Set();
  db.patients.forEach((p) => {
    const c = kodeIcd(p);
    if (!c || namaIcd(c) || !p.diagnosis) return;
    (f[c] = f[c] || {})[p.diagnosis] = (f[c][p.diagnosis] || 0) + 1;
  });
  Object.keys(f).sort().forEach((c) => {
    let n = Object.entries(f[c]).sort((a, b) => b[1] - a[1])[0][0];
    if (dipakai.has(n.toLowerCase())) n += ` [${c}]`;
    dipakai.add(n.toLowerCase()); m[c] = n;
  });
  return m;
}

// Jalankan fungsi laporan dengan kode dirapikan dan nama diagnosis = nama menurut kode; data asli dikembalikan setelahnya
function berdasarkanKode(fn) {
  return function () {
    const fb = icdFallback(), ps = db.patients, dx = ps.map((p) => p.diagnosis), kd = ps.map((p) => p.icd);
    ps.forEach((p) => { const c = kodeIcd(p); if (c) p.icd = c; const n = c && (namaIcd(c) || fb[c]); if (n) p.diagnosis = n; });
    try { return fn.apply(this, arguments); } finally { ps.forEach((p, i) => { p.diagnosis = dx[i]; p.icd = kd[i]; }); }
  };
}
renderLaporan = berdasarkanKode(renderLaporan);
renderMap = berdasarkanKode(renderMap);

// filter di peta dipasang ulang agar memakai versi di atas
["geoDx", "geoLay"].forEach((id) => { const o = F(id), n = o.cloneNode(true); o.replaceWith(n); n.addEventListener("change", () => renderMap()); });

// Baca XML ClaML WHO: ambil kelas "category" dan judul utamanya
function parseIcdXml(xml) {
  const out = {};
  const dekode = (s) => s.replace(/<[^>]+>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
  const re = /<Class\s+([^>]*?)>([\s\S]*?)<\/Class>/g;
  let m;
  while ((m = re.exec(xml))) {
    const kode = (m[1].match(/code="([^"]+)"/) || [])[1], jenis = (m[1].match(/kind="([^"]+)"/) || [])[1];
    if (jenis !== "category" || !/^[A-Z]\d{2}(\.\d+)?$/.test(kode || "")) continue;
    const l = m[2].match(/<Rubric[^>]*kind="preferred"[^>]*>\s*<Label[^>]*>([\s\S]*?)<\/Label>/);
    if (l) out[kode] = dekode(l[1]);
  }
  return out;
}

// Muat daftar WHO: coba file teks dulu, lalu XML. Hasilnya disimpan di browser agar pemuatan berikutnya cepat.
async function muatIcd() {
  try { const c = JSON.parse(localStorage.getItem("akreva_icd_who") || "null"); if (c && Object.keys(c).length > 1000) { Object.assign(ICD_WHO, c); return; } } catch (e) {}
  let data = null;
  for (const [url, parse, enc] of [[ICD_FILE, parseIcdTxt, "windows-1252"], [ICD_FILE_XML, parseIcdXml, "utf-8"]]) {
    try {
      const r = await fetch(url); if (!r.ok) continue;
      const d = parse(new TextDecoder(enc).decode(await r.arrayBuffer()));
      if (Object.keys(d).length > 1000) { data = d; break; }
    } catch (e) {}
  }
  if (!data) throw new Error("file ICD-10 WHO tidak ditemukan");
  Object.assign(ICD_WHO, data);
  try { localStorage.setItem("akreva_icd_who", JSON.stringify(data)); } catch (e) {}
}
muatIcd().then(() => {
  console.info("ICD-10 WHO dimuat:", Object.keys(ICD_WHO).length, "kode");
  if (!F("page-beranda").hidden) renderMap();
  if (!F("page-laporan").hidden) renderLaporan();
}).catch(() => toast("File ICD-10 WHO tidak ditemukan. Memakai daftar bawaan."));

/* Halaman awal = Beranda + ingat halaman saat refresh */
const _spMem = showPage;
showPage = function (n) { _spMem(n); try { history.replaceState(null, "", "#" + n); } catch (e) {} };
const _hlmAwal = location.hash.slice(1);
showPage(F("page-" + _hlmAwal) ? _hlmAwal : "beranda");

/* Cadangkan & pulihkan data (pindah data antar profil Chrome atau komputer) */
F("saveAll").insertAdjacentHTML("beforebegin", `<div class="table-card pad"><h3>Cadangan Data</h3>
<p class="sub">Data tersimpan di browser ini saja. Unduh cadangan untuk memindahkannya ke profil Chrome atau komputer lain.</p>
<button class="btn btn-light" id="bkUnduh">Unduh Cadangan Data</button>
<button class="btn btn-light" id="bkPulih">Pulihkan dari Cadangan</button>
<input type="file" id="bkFile" accept=".json" hidden></div>`);
F("bkUnduh").onclick = () => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify({ db, rs: localStorage.getItem("akreva_rs") })], { type: "application/json" }));
  a.download = "akreva-cadangan-" + todayISO() + ".json"; a.click();
};
F("bkPulih").onclick = () => F("bkFile").click();
F("bkFile").onchange = async (e) => {
  const f = e.target.files[0]; e.target.value = ""; if (!f) return;
  try {
    const d = JSON.parse(await f.text());
    if (!d.db || !Array.isArray(d.db.patients)) throw 0;
    if (!confirm(`Ganti data dengan cadangan (${d.db.patients.length} pasien)?`)) return;
    if (d.rs) localStorage.setItem("akreva_rs", d.rs);
    localStorage.setItem(KEY, JSON.stringify(d.db));
    if (window.akrevaSimpan) await window.akrevaSimpan();
    location.reload();
  } catch (x) { toast("File cadangan tidak valid"); }
};