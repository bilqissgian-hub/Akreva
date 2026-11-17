/* =====================================================
   AKREVA - Audit Rekam Medis
   ===================================================== */

/* ---------- Konstanta ---------- */
const KEY = "akreva_v2";
const HARI = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const LAYANAN = ["Rawat Inap", "Rawat Jalan", "IGD"];

const DOCS = {
  "Rawat Inap": [
    "General Consent", "Surat Rujukan", "Hasil Pemeriksaan Laboratorium",
    "Hasil Pemeriksaan Radiologi", "Informed Consent", "Edukasi Pasien", "Persetujuan Rawat Inap", 
    "Formulir Penetapan DPJP", "Lembar Transfer Internal", "Asesmen Medis Pasien Rawat Inap", "Catatan Anestesi",
    "Asesmen Awal Pasien Rawat Inap Khusus Obstetri-Ginekologi", "Asesmen Pra Operasi", "Evaluasi Pra Sedasi", "Asesmen Pra Induksi",
    "Asuhan Keperawatan Pra Operasi", "Asuhan Keperawatan Intra Operasi", "Asuhan Keperawatan Post Operasi", "Catatan Jalannya Operasi",
    "Persetujuan Tindakan Anestesi", "Status Post Anestesi", "Catatan Pemberian Obat", "Laporan Operasi", "Resume Medis", "Ringkasan Masuk dan Keluar Rawat Inap",
    "Ringkasan Pasien Pulang"
  ],
  "Rawat Jalan": [
    "General Consent","Surat Rujukan", "Hasil Pemeriksaan Laboratorium", "Hasil Pemeriksaan Radiologi", "Resume Medis"],
  "IGD": ["General Consent", "Surat Rujukan", "Hasil Pemeriksaan Laboratorium",
    "Hasil Pemeriksaan Radiologi", "Informed Consent", "Edukasi Pasien", "Persetujuan Rawat Inap", 
    "Formulir Penetapan DPJP", "Lembar Transfer Internal", "Asesmen Medis Pasien Rawat Inap", "Catatan Anestesi",
    "Asesmen Awal Pasien Rawat Inap Khusus Obstetri-Ginekologi", "Asesmen Pra Operasi", "Evaluasi Pra Sedasi", "Asesmen Pra Induksi",
    "Asuhan Keperawatan Pra Operasi", "Asuhan Keperawatan Intra Operasi", "Asuhan Keperawatan Post Operasi", "Catatan Jalannya Operasi",
    "Persetujuan Tindakan Anestesi", "Status Post Anestesi", "Catatan Pemberian Obat", "Laporan Operasi", "Resume Medis", "Ringkasan Masuk dan Keluar Rawat Inap",
    "Ringkasan Pasien Pulang"],
};

/* ---------- Helper ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const F = (id) => document.getElementById(id);
const pad = (n) => String(n).padStart(2, "0");
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function fmtDT(d = new Date()) {
  return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}, ${pad(d.getHours())}.${pad(d.getMinutes())}.${pad(d.getSeconds())}`;
}
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function calcAge(iso) {
  if (!iso) return "";
  const b = new Date(iso), n = new Date();
  if (isNaN(b)) return "";
  let y = n.getFullYear() - b.getFullYear();
  let m = n.getMonth() - b.getMonth();
  if (n.getDate() < b.getDate()) m--;
  if (m < 0) { y--; m += 12; }
  return y < 0 ? "" : `${y} tahun ${m} bulan`;
}
function toast(msg) {
  const t = F("toast");
  t.textContent = msg; t.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (t.hidden = true), 2600);
}

/* ---------- Kelengkapan ---------- */
// Y = ada & lengkap, T = tidak ada, TDD = tidak dapat dinilai (dikeluarkan dari perhitungan)
function calcPct(docs, layanan) {
  let num = 0, den = 0;
  (DOCS[layanan] || []).forEach((n) => {
    const v = (docs[n] || {}).val || "T";
    if (v === "TDD") return;
    den++;
    if (v === "Y") num++;
  });
  return den ? Math.round((num / den) * 100) : 0;
}
const pctOf = (p) => calcPct(p.docs || {}, p.layanan);
const isComplete = (p) => pctOf(p) === 100;
const barClass = (n) => (n >= 100 ? "" : n >= 50 ? "mid" : "low");

/* =====================================================
   DATA AWAL (SEED)
   ===================================================== */
const NAMA1 = ["Siti", "Dewi", "Fatimah", "Nur", "Sri", "Ani", "Rina", "Yuni", "Lilis", "Wati", "Ratna", "Endang", "Tutik", "Mira", "Putri", "Ayu", "Indah", "Lestari", "Wulan", "Sari"];
const NAMA2 = ["Rahayu", "Lestari", "Zahra", "Aminah", "Kartika", "Wulandari", "Safitri", "Handayani", "Puspita", "Anggraini", "Permata", "Utami", "Maharani", "Susanti", "Fitriani", "Novitasari", "Rahmawati", "Cahyani"];
const DIAG = [["Partus Normal", "O80.0"], ["Eklampsia", "O15.0"], ["Preeklampsia Berat", "O14.1"], ["Abortus Incompletus", "O06.4"], ["Hyperemesis Gravidarum", "O21.0"], ["Plasenta Previa", "O44.1"], ["Perdarahan Postpartum", "O72.1"], ["Persalinan Prematur", "O60.1"], ["Ketuban Pecah Dini", "O42.0"], ["Letak Sungsang", "O32.1"], ["Diabetes Gestasional", "O24.4"], ["Kehamilan Ektopik", "O00.1"], ["Mioma Uteri", "D25.9"], ["Kista Ovarium", "N83.2"], ["Sepsis Neonatal", "P36.4"], ["Hiperbilirubinemia Neonatal", "P59.9"], ["BBLR", "P07.1"], ["Asfiksia Neonatorum", "P21.9"]];
const ALAMAT = ["Sentolo", "Wates", "Pengasih", "Lendah", "Galur", "Temon", "Nanggulan", "Panjatan", "Kokap", "Girimulyo"];

function genBase(i) {
  const d = 1 + (i % 27);
  return {
    nik: "3401074" + String(1000000000 + i * 7654321).slice(-9),
    tglLahir: `${1980 + ((i * 3) % 25)}-${pad(1 + (i % 9))}-${pad(10 + (i % 9))}`,
    alamat: ALAMAT[i % ALAMAT.length],
    masuk: `2026-10-${pad(d)}`,
    keluar: `2026-10-${pad(d + 2)}`,
  };
}

function makeSeed() {
  const T = DPJP_BASE[0].nama, A = DPJP_BASE[1].nama;
  const list = [
    { nama: "Siti Rahayu", rm: "123456", nik: "3401074505960001", tglLahir: "1996-05-05", alamat: "Sentolo", dpjp: T, diagnosis: "Partus Normal", icd: "O80.0", jaminan: "BPJS", masuk: "2026-09-02", keluar: "2026-09-04",
      history: [{ lama: { icd: "O80", diag: "Partus Normal", t: "12 Nov 2026, 12.23.24" }, baru: { icd: "O80.0", diag: "Partus Normal", t: "12 Nov 2026, 12.23.24" } }] },
    { nama: "Dewi Lestari", rm: "445671", dpjp: T, diagnosis: "Eklampsia", icd: "O15.0", jaminan: "BPJS" },
    { nama: "Fatimah Zahra", rm: "202688", dpjp: T, diagnosis: "Abortus Incompletus", icd: "O06.4", jaminan: "Umum" },
    { nama: "Nur Indah", rm: "212699", dpjp: A, diagnosis: "Sepsis Neonatal", icd: "P36.4", jaminan: "BPJS" },
    { nama: "Siti Aminah", rm: "943992", dpjp: T, diagnosis: "Hyperemesis Gravidarum", icd: "O21.0", jaminan: "BPJS" },
    { nama: "Dewi Kartika", rm: "331208", dpjp: T, diagnosis: "CPD", icd: "O33.9", jaminan: "BPJS" },
  ];
  for (let i = 6; i < 52; i++) {
    const [dg, ic] = DIAG[i % DIAG.length];
    list.push({
      nama: `${NAMA1[i % 20]} ${NAMA2[(i * 7) % 18]}`,
      rm: String(100000 + ((i * 7919) % 900000)),
      dpjp: i % 3 === 0 ? A : T, diagnosis: dg, icd: ic,
      jaminan: i % 11 === 5 ? "Asuransi" : i % 4 === 3 ? "Umum" : "BPJS",
    });
  }
  // contoh Rawat Jalan & IGD
  ["Rawat Jalan", "IGD"].forEach((lay, k) => {
    for (let j = 0; j < 3; j++) {
      const i = 60 + k * 10 + j;
      const [dg, ic] = DIAG[(i + 3) % DIAG.length];
      list.push({
        nama: `${NAMA1[(i + 4) % 20]} ${NAMA2[(i * 5) % 18]}`, rm: String(500000 + i * 37),
        dpjp: j % 2 ? A : T, diagnosis: dg, icd: ic, jaminan: "BPJS", layanan: lay,
      });
    }
  });

  const used = new Set();
  const patients = list.map((o, i) => {
    let rm = o.rm;
    while (used.has(rm)) rm = String(+rm + 1);
    used.add(rm);
    return Object.assign(
      { id: Date.now() * 100 + i, jk: "Perempuan", layanan: "Rawat Inap", docs: {}, history: [] },
      genBase(i), o, { rm }
    );
  });

  const users = [
    ["USR-001", "dr. Sari Dewi", "sari.admin", "Manajemen", "Admin", "Aktif", "12 Sep 2026, 08:12", "sari.dewi@akreva.id"],
    ["USR-002", "dr. Anisa Putri, SpOG", "anisa.spog", "Kebidanan", "Dokter", "Aktif", "12 Sep 2026, 07:45", "anisa.spog@gmail.com"],
    ["USR-003", "dr. Rina Susanti, SpOG", "rina.spog", "Kebidanan", "Dokter", "Aktif", "11 Sep 2026, 18:20", "rina.spog@gmail.com"],
    ["USR-004", "dr. Budi Santoso, SpA", "budi.spa", "Perinatologi", "Dokter", "Aktif", "10 Sep 2026, 12:00", "budi.spa@gmail.com"],
    ["USR-005", "Ria Pratiwi, AMd.RMIK", "ria.coder", "Rekam Medis", "Coder", "Aktif", "12 Sep 2026, 09:30", "ria.coder@akreva.id"],
    ["USR-006", "Budi Setiawan, AMd.RMIK", "budi.coder", "Rekam Medis", "Coder", "Aktif", "12 Sep 2026, 08:55", "budi.coder@akreva.id"],
    ["USR-007", "Siti Nurhaliza, S.Kep, Ns", "siti.perawat", "Rawat Inap", "Perawat", "Aktif", "11 Sep 2026, 14:05", "siti.perawat@akreva.id"],
    ["USR-008", "Agus Prasetyo, S.KM", "agus.verif", "Verifikasi", "Verifikator", "Nonaktif", "01 Sep 2026, 10:15", "agus.verif@akreva.id"],
  ].map((u) => ({ id: u[0], nama: u[1], username: u[2], dept: u[3], peran: u[4], status: u[5], login: u[6], email: u[7] }));

  const logs = [
    ["12 Nov 2026, 20.58.11", "dr. Admin", "Login", "Masuk ke sistem Akreva"],
    ["12 Nov 2026, 12.23.24", "dr. Admin", "Edit Pasien", "Kode diagnosis Siti Rahayu (123456): O80 → O80.0"],
    ["12 Nov 2026, 09.10.02", "Ria Pratiwi, AMd.RMIK", "Import CSV", "Import data pasien Rawat Inap"],
    ["11 Nov 2026, 16.42.37", "dr. Sari Dewi", "Tambah Pengguna", "Menambahkan Siti Nurhaliza, S.Kep, Ns"],
    ["11 Nov 2026, 08.01.55", "dr. Admin", "Login", "Masuk ke sistem Akreva"],
  ].map((l) => ({ t: l[0], user: l[1], aksi: l[2], detail: l[3] }));

  return { patients, users, logs };
}

/* ---------- Penyimpanan ---------- */
function loadDB() {
  try { const r = localStorage.getItem(KEY); if (r) return JSON.parse(r); } catch (e) {}
  return makeSeed();
}
function saveDB() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {} }
let db = loadDB();

function addLog(aksi, detail) {
  db.logs.unshift({ t: fmtDT(), user: "dr. Admin", aksi, detail });
  db.logs = db.logs.slice(0, 200);
}
function doctors() {
  const fromUsers = db.users
    .filter((u) => u.peran === "Dokter" && u.status === "Aktif")
    .map((u) => ({ nama: u.nama, dept: u.dept, email: u.email }));
  return [...fromUsers];
}
const emailOf = (nama) => (doctors().find((d) => d.nama === nama) || {}).email || "";

/* =====================================================
   NAVIGASI
   ===================================================== */
function showPage(n) {
  ["beranda", "audit", "laporan", "pengguna"].forEach((p) => (F("page-" + p).hidden = p !== n));
  $$(".nav-link").forEach((a) => a.classList.toggle("active", a.dataset.page === n));
  F("userBtn").classList.toggle("active", n === "pengguna");
  if (n === "beranda" || n === "laporan") renderStats();
  if (n === "pengguna") { renderUsers(); renderLogs(); }
}
$$(".nav-link").forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); showPage(a.dataset.page); }));
F("userBtn").addEventListener("click", () => showPage("pengguna"));
F("settingBtn").addEventListener("click", () => toast("Pengaturan belum tersedia"));

/* =====================================================
   HALAMAN AUDIT
   ===================================================== */
const ui = { filter: "semua", tab: "Rawat Inap", q: "" };

function renderAudit() {
  const inTab = db.patients.filter((p) => p.layanan === ui.tab);
  F("cntAll").textContent = inTab.length;
  F("cntOk").textContent = inTab.filter(isComplete).length;
  F("cntBad").textContent = inTab.filter((p) => !isComplete(p)).length;

  const q = ui.q.toLowerCase();
  const rows = inTab.filter((p) => {
    if (ui.filter === "lengkap" && !isComplete(p)) return false;
    if (ui.filter === "tidak" && isComplete(p)) return false;
    return !q || p.nama.toLowerCase().includes(q) || p.rm.includes(q);
  });

  F("tbody").innerHTML = rows.map((p) => {
    const pc = pctOf(p);
    return `<tr>
      <td>${esc(p.nama)}<span class="sub-code">${esc(p.rm)}</span></td>
      <td>${esc(p.dpjp)}</td>
      <td>${esc(p.diagnosis)}<span class="sub-code">${esc(p.icd)}</span></td>
      <td><span class="pill ${esc(p.jaminan)}">${esc(p.jaminan)}</span></td>
      <td><div class="progress-wrap"><div class="progress"><i class="${barClass(pc)}" style="width:${pc}%"></i></div><span class="pct">${pc}%</span></div></td>
      <td><button class="kebab" data-id="${p.id}" title="Aksi">⋮</button></td>
    </tr>`;
  }).join("");
  F("emptyMsg").hidden = rows.length > 0;
  renderStats();
}

$$(".chip").forEach((b) => b.addEventListener("click", () => {
  $$(".chip").forEach((c) => c.classList.remove("active"));
  b.classList.add("active"); ui.filter = b.dataset.filter; renderAudit();
}));
function setTab(t) {
  ui.tab = t;
  $$(".tab").forEach((x) => x.classList.toggle("active", x.dataset.tab === t));
  renderAudit();
}
$$(".tab").forEach((b) => b.addEventListener("click", () => setTab(b.dataset.tab)));
F("searchInput").addEventListener("input", (e) => { ui.q = e.target.value.trim(); renderAudit(); });

/* ---------- Menu titik tiga ---------- */
const rowMenu = F("rowMenu");
document.addEventListener("click", (e) => {
  const k = e.target.closest(".kebab");
  if (k) {
    e.stopPropagation();
    rowMenu.dataset.id = k.dataset.id;
    rowMenu.hidden = false;
    const r = k.getBoundingClientRect(), w = rowMenu.offsetWidth, h = rowMenu.offsetHeight;
    let top = r.bottom + 6;
    if (top + h > innerHeight - 10) top = r.top - h - 6;
    rowMenu.style.top = top + "px";
    rowMenu.style.left = Math.max(8, r.right - w) + "px";
    return;
  }
  rowMenu.hidden = true;
  if (!e.target.closest(".notif-wrap")) F("notifMenu").hidden = true;
});
window.addEventListener("scroll", () => (rowMenu.hidden = true), true);
rowMenu.addEventListener("click", (e) => {
  const act = e.target.closest("[data-act]");
  if (!act) return;
  const id = Number(rowMenu.dataset.id);
  if (act.dataset.act === "edit") openEdit(id);
  if (act.dataset.act === "hapus") askDeletePatient(id);
});

function askDeletePatient(id) {
  const p = db.patients.find((x) => x.id === id);
  if (!p) return;
  confirmBox("Hapus Data Pasien",
    `Anda akan menghapus data pasien <b>${esc(p.nama)}</b> (${esc(p.rm)}). Tindakan ini akan dicatat di log aktivitas dan tidak dapat dibatalkan.`,
    "Ya, Hapus",
    () => {
      db.patients = db.patients.filter((x) => x.id !== id);
      addLog("Hapus Pasien", `${p.nama} (${p.rm})`);
      saveDB(); renderAudit(); toast("Data pasien dihapus");
    });
}

/* =====================================================
   MODAL KONFIRMASI
   ===================================================== */
let confirmFn = null;
function confirmBox(title, html, okText, fn) {
  F("cTitle").textContent = title;
  F("cMsg").innerHTML = html;
  F("cOk").textContent = okText;
  confirmFn = fn;
  F("modalConfirm").hidden = false;
}
F("cOk").addEventListener("click", () => { F("modalConfirm").hidden = true; if (confirmFn) confirmFn(); confirmFn = null; });
F("cCancel").addEventListener("click", () => { F("modalConfirm").hidden = true; confirmFn = null; });

/* =====================================================
   MODAL TAMBAH / EDIT PASIEN
   ===================================================== */
let mode = "add", editId = null, draft = {}, pendingDoc = null;

function fillDpjp(selected) {
  const list = doctors();
  if (selected && !list.some((d) => d.nama === selected)) list.push({ nama: selected, dept: "" });
  F("fDpjp").innerHTML = `<option value="" disabled selected>Pilih nama DPJP</option>` +
    list.map((d) => `<option value="${esc(d.nama)}">${esc(d.nama)}</option>`).join("");
  if (selected) F("fDpjp").value = selected;
}
function clearErr() {
  $$("#formPasien .err").forEach((e) => (e.textContent = ""));
  $$("#formPasien .invalid").forEach((i) => i.classList.remove("invalid"));
}
function setErr(id, msg) {
  F(id).classList.add("invalid");
  const e = F("err-" + id); if (e) e.textContent = msg;
}
F("formPasien").addEventListener("input", (e) => {
  e.target.classList.remove("invalid");
  const er = F("err-" + e.target.id); if (er) er.textContent = "";
});

["fNik", "fRm"].forEach((id) =>
  F(id).addEventListener("input", (e) => (e.target.value = e.target.value.replace(/\D/g, "")))
);
F("fTgl").addEventListener("change", (e) => (F("fUmur").value = calcAge(e.target.value)));
F("fDpjp").addEventListener("change", (e) => (F("fEmail").value = emailOf(e.target.value)));
F("fRuang").addEventListener("change", () => { if (mode === "edit") renderDocs(); });

function openAdd() {
  mode = "add"; editId = null; draft = {};
  F("formPasien").reset(); clearErr();
  fillDpjp("");
  F("fEmail").value = ""; F("fUmur").value = "";
  F("pasienTitle").textContent = "Tambah Pasien";
  F("pasienSub").textContent = "Isi form di bawah untuk menambahkan data pasien";
  F("pasienBox").classList.remove("wide");
  F("grpTanggal").hidden = true; F("grpUpload").hidden = false; F("colDocs").hidden = true;
  F("fRuang").value = ui.tab;
  F("modalPasien").hidden = false;
  F("fNama").focus();
}

function openEdit(id) {
  const p = db.patients.find((x) => x.id === id);
  if (!p) return;
  mode = "edit"; editId = id;
  draft = JSON.parse(JSON.stringify(p.docs || {}));
  F("formPasien").reset(); clearErr();
  fillDpjp(p.dpjp);
  F("fNama").value = p.nama; F("fNik").value = p.nik; F("fRm").value = p.rm;
  F("fTgl").value = p.tglLahir; F("fUmur").value = calcAge(p.tglLahir);
  F("fJk").value = p.jk; F("fAlamat").value = p.alamat;
  F("fEmail").value = emailOf(p.dpjp);
  F("fDiag").value = p.diagnosis; F("fIcd").value = p.icd;
  F("fMasuk").value = p.masuk || ""; F("fKeluar").value = p.keluar || "";
  F("fRuang").value = p.layanan; F("fJaminan").value = p.jaminan;

  F("pasienTitle").textContent = "Edit Pasien";
  F("pasienSub").textContent = "Isi form di bawah untuk memperbarui data pasien";
  F("pasienBox").classList.add("wide");
  F("grpTanggal").hidden = false; F("grpUpload").hidden = true; F("colDocs").hidden = false;
  renderDocs(); renderHistory(p);
  F("modalPasien").hidden = false;
}

F("addBtn").addEventListener("click", openAdd);
F("cancelPasien").addEventListener("click", () => (F("modalPasien").hidden = true));

/* ---------- Daftar berkas (Edit) ---------- */
function renderDocs() {
  const names = DOCS[F("fRuang").value || "Rawat Inap"];
  F("docList").innerHTML = names.map((n) => {
    const d = draft[n] || { val: "T" };
    const st = d.val === "Y" ? ["ok", "Lengkap"] : d.val === "TDD" ? ["ok", "Lengkap"] : ["bad", "Belum lengkap"];
    const nm = esc(n);
    return `<div class="doc-card">
      <div class="doc-top">
        <input type="checkbox" class="doc-chk" data-doc="${nm}" ${d.val === "Y" ? "checked" : ""} />
        <span class="doc-name">${nm}</span>
        <button type="button" class="doc-x" data-doc="${nm}" title="Reset berkas">✗</button>
      </div>
      <div class="doc-bot">
        <div class="seg">${["Y", "T", "TDD"].map((v) =>
          `<button type="button" data-doc="${nm}" data-val="${v}" class="${d.val === v ? "on-" + v : ""}" title="${v === "Y" ? "Ya" : v === "T" ? "Tidak" : "Tidak Dapat Dinilai"}">${v}</button>`).join("")}</div>
        <button type="button" class="doc-badge ${st[0]}" data-upload="${nm}" title="Klik untuk unggah PDF">${st[1]}</button>
        ${d.file ? `<small class="fname" title="${esc(d.file.name)}">📎 ${esc(d.file.name)}</small>` : ""}
      </div>
    </div>`;
  }).join("");
  updateDocProgress();
}
function updateDocProgress() {
  const pc = calcPct(draft, F("fRuang").value || "Rawat Inap");
  const bar = F("docBar");
  bar.style.width = pc + "%"; bar.className = barClass(pc);
  F("docPct").textContent = pc + "%";
}

F("docList").addEventListener("click", (e) => {
  const seg = e.target.closest("[data-val]");
  if (seg) {
    const n = seg.dataset.doc, v = seg.dataset.val;
    const cur = draft[n] || {};
    draft[n] = { val: v, file: v === "Y" ? cur.file : undefined };
    renderDocs(); return;
  }
  const x = e.target.closest(".doc-x");
  if (x) { delete draft[x.dataset.doc]; renderDocs(); return; }
  const up = e.target.closest("[data-upload]");
  if (up) { pendingDoc = up.dataset.upload; F("docFile").click(); }
});
F("docList").addEventListener("change", (e) => {
  const c = e.target.closest(".doc-chk");
  if (!c) return;
  const n = c.dataset.doc, cur = draft[n] || {};
  draft[n] = c.checked ? { val: "Y", file: cur.file } : { val: "T" };
  renderDocs();
});
F("docFile").addEventListener("change", (e) => {
  const f = e.target.files[0];
  e.target.value = "";
  if (!f || !pendingDoc) return;
  const msg = checkPdf(f);
  if (msg) { toast(msg); return; }
  draft[pendingDoc] = { val: "Y", file: { name: f.name, size: f.size } };
  renderDocs();
});

function checkPdf(f) {
  const isPdf = f.type === "application/pdf" || /\.pdf$/i.test(f.name);
  if (!isPdf) return "Berkas harus berformat PDF";
  if (f.size > 10 * 1024 * 1024) return "Ukuran berkas maksimal 10 MB";
  return "";
}

/* ---------- Riwayat diagnosis ---------- */
function renderHistory(p) {
  const h = p.history || [];
  F("histList").innerHTML = h.length
    ? h.slice().reverse().map((x) => `
      <div class="hist"><span class="tag lama">lama</span><div><b class="mono">${esc(x.lama.icd)}</b> — ${esc(x.lama.diag)}<small>${esc(x.lama.t)}</small></div></div>
      <div class="hist"><span class="tag baru">baru</span><div><b class="mono">${esc(x.baru.icd)}</b> — ${esc(x.baru.diag)}<small>${esc(x.baru.t)}</small></div></div>`).join("")
    : `<p class="muted-p">Belum ada perubahan diagnosis.</p>`;
}

/* ---------- Kirim email ke DPJP ---------- */
F("btnEmail").addEventListener("click", () => {
  const p = db.patients.find((x) => x.id === editId);
  if (!p) return;
  const email = F("fEmail").value;
  if (!email) { toast("Pilih DPJP terlebih dahulu"); return; }
  const names = DOCS[F("fRuang").value] || [];
  const missing = names.filter((n) => ((draft[n] || {}).val || "T") === "T");
  if (!missing.length) { toast("Semua berkas sudah lengkap"); return; }
  const subject = `Kelengkapan Rekam Medis - ${p.nama} (${p.rm})`;
  const body =
`Yth. ${F("fDpjp").value},

Mohon melengkapi berkas rekam medis pasien berikut:
Nama      : ${p.nama}
No. RM    : ${p.rm}
Diagnosis : ${F("fDiag").value} (${F("fIcd").value})

Berkas yang belum lengkap:
${missing.map((m, i) => `${i + 1}. ${m}`).join("\n")}

Terima kasih.
Akreva - Audit Rekam Medis`;
  addLog("Kirim Email", `Email kelengkapan berkas ${p.nama} (${p.rm}) ke ${F("fDpjp").value}`);
  saveDB();
  window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  toast("Membuka aplikasi email...");
});

/* ---------- Simpan (Tambah / Edit) ---------- */
F("formPasien").addEventListener("submit", (e) => {
  e.preventDefault();
  clearErr();
  let ok = true;
  const bad = (id, m) => { setErr(id, m); ok = false; };

  const v = {
    nama: F("fNama").value.trim(), nik: F("fNik").value.trim(), rm: F("fRm").value.trim(),
    tgl: F("fTgl").value, jk: F("fJk").value, alamat: F("fAlamat").value.trim(),
    dpjp: F("fDpjp").value, diag: F("fDiag").value.trim(), icd: F("fIcd").value.trim().toUpperCase(),
    masuk: F("fMasuk").value, keluar: F("fKeluar").value,
    ruang: F("fRuang").value, jaminan: F("fJaminan").value,
  };

  if (!v.nama) bad("fNama", "Nama pasien wajib diisi");
  if (!/^\d{16}$/.test(v.nik)) bad("fNik", "NIK harus 16 digit angka");
  if (!/^\d{6}$/.test(v.rm)) bad("fRm", "No. RM harus 6 digit angka");
  else if (db.patients.some((p) => p.rm === v.rm && p.id !== editId)) bad("fRm", "No. RM sudah terdaftar");
  if (!v.tgl) bad("fTgl", "Tanggal lahir wajib diisi");
  else if (new Date(v.tgl) > new Date()) bad("fTgl", "Tanggal lahir tidak valid");
  if (!v.jk) bad("fJk", "Pilih jenis kelamin");
  if (!v.alamat) bad("fAlamat", "Alamat wajib diisi");
  if (!v.dpjp) bad("fDpjp", "Pilih nama DPJP");
  if (!v.diag) bad("fDiag", "Diagnosis wajib diisi");
  if (!/^[A-Z]\d{2}(\.\d{1,2})?$/.test(v.icd)) bad("fIcd", "Format ICD-10 tidak valid (contoh: O80 atau O80.0)");
  if (!v.ruang) bad("fRuang", "Pilih ruang");
  if (!v.jaminan) bad("fJaminan", "Pilih jaminan");

  let consent = null;
  if (mode === "add") {
    const f = F("fConsent").files[0];
    if (!f) bad("fConsent", "General Consent wajib diunggah (PDF)");
    else { const m = checkPdf(f); if (m) bad("fConsent", m); else consent = { name: f.name, size: f.size }; }
  } else {
    if (!v.masuk) bad("fMasuk", "Tanggal masuk wajib diisi");
    if (v.masuk && v.keluar && v.keluar < v.masuk) bad("fKeluar", "Tanggal keluar tidak boleh sebelum tanggal masuk");
  }

  if (!ok) {
    const first = $("#formPasien .invalid");
    if (first) first.scrollIntoView({ block: "center", behavior: "smooth" });
    return;
  }

  if (mode === "add") {
    db.patients.unshift({
      id: Date.now(), nama: v.nama, nik: v.nik, rm: v.rm, tglLahir: v.tgl, jk: v.jk, alamat: v.alamat,
      dpjp: v.dpjp, diagnosis: v.diag, icd: v.icd, masuk: todayISO(), keluar: "",
      layanan: v.ruang, jaminan: v.jaminan,
      docs: { "General Consent": { val: "Y", file: consent } }, history: [],
    });
    addLog("Tambah Pasien", `${v.nama} (${v.rm}) - ${v.ruang}`);
    toast("Pasien berhasil ditambahkan");
  } else {
    const p = db.patients.find((x) => x.id === editId);
    if (p.icd !== v.icd || p.diagnosis !== v.diag) {
      const now = fmtDT();
      p.history = p.history || [];
      p.history.push({ lama: { icd: p.icd, diag: p.diagnosis, t: p.diagTime || now }, baru: { icd: v.icd, diag: v.diag, t: now } });
      p.diagTime = now;
      addLog("Edit Diagnosis", `${v.nama} (${v.rm}): ${p.icd} → ${v.icd}`);
    }
    Object.assign(p, {
      nama: v.nama, nik: v.nik, rm: v.rm, tglLahir: v.tgl, jk: v.jk, alamat: v.alamat,
      dpjp: v.dpjp, diagnosis: v.diag, icd: v.icd, masuk: v.masuk, keluar: v.keluar,
      layanan: v.ruang, jaminan: v.jaminan, docs: draft,
    });
    addLog("Edit Pasien", `${v.nama} (${v.rm}) - kelengkapan ${pctOf(p)}%`);
    toast("Data pasien diperbarui");
  }
  saveDB();
  F("modalPasien").hidden = true;
  setTab(v.ruang);
});

/* =====================================================
   IMPORT CSV
   Header: nama,nik,rm,tgl_lahir,jk,alamat,dpjp,diagnosis,icd,jaminan,layanan
   ===================================================== */
F("importBtn").addEventListener("click", () => F("csvFile").click());
F("csvFile").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const lines = reader.result.split(/\r?\n/).filter((l) => l.trim());
    const head = lines.shift().split(",").map((h) => h.trim().toLowerCase());
    let added = 0, skipped = 0;
    lines.forEach((line, i) => {
      const c = line.split(",").map((x) => x.trim());
      const r = Object.fromEntries(head.map((h, k) => [h, c[k] || ""]));
      if (!r.nama || !/^\d{6}$/.test(r.rm) || db.patients.some((p) => p.rm === r.rm)) { skipped++; return; }
      db.patients.push({
        id: Date.now() + i, nama: r.nama, nik: r.nik, rm: r.rm, tglLahir: r.tgl_lahir, jk: r.jk || "Perempuan",
        alamat: r.alamat, dpjp: r.dpjp, diagnosis: r.diagnosis, icd: (r.icd || "").toUpperCase(),
        jaminan: ["BPJS", "Umum", "Asuransi"].includes(r.jaminan) ? r.jaminan : "BPJS",
        layanan: LAYANAN.includes(r.layanan) ? r.layanan : "Rawat Inap",
        masuk: todayISO(), keluar: "", docs: {}, history: [],
      });
      added++;
    });
    addLog("Import CSV", `${added} pasien ditambahkan, ${skipped} dilewati`);
    saveDB(); renderAudit();
    toast(`Import selesai: ${added} ditambahkan, ${skipped} dilewati`);
    e.target.value = "";
  };
  reader.readAsText(file);
});

/* =====================================================
   BERANDA & LAPORAN
   ===================================================== */
function renderStats() {
  const total = db.patients.length;
  const ok = db.patients.filter(isComplete).length;
  const avg = total ? Math.round(db.patients.reduce((a, p) => a + pctOf(p), 0) / total) : 0;
  F("stTotal").textContent = total; F("stOk").textContent = ok;
  F("stBad").textContent = total - ok; F("stAvg").textContent = avg + "%";
  F("reportBars").innerHTML = LAYANAN.map((l) => {
    const g = db.patients.filter((p) => p.layanan === l);
    const a = g.length ? Math.round(g.reduce((s, p) => s + pctOf(p), 0) / g.length) : 0;
    return `<div class="bar-row"><b>${l}</b> — ${g.length} pasien, rata-rata ${a}%
      <div class="progress"><i class="${barClass(a)}" style="width:${a}%"></i></div></div>`;
  }).join("");
}

/* =====================================================
   MANAJEMEN PENGGUNA
   ===================================================== */
let uRole = "Semua", uEditId = null, uMode = "user";

function renderUsers() {
  const U = db.users;
  F("uTotal").textContent = U.length;
  F("uAktif").textContent = U.filter((u) => u.status === "Aktif").length;
  F("uDokter").textContent = U.filter((u) => u.peran === "Dokter").length;
  F("uCoder").textContent = U.filter((u) => u.peran === "Coder").length;
  F("uNon").textContent = U.filter((u) => u.status === "Nonaktif").length;

  const rows = U.filter((u) => uRole === "Semua" || u.peran === uRole);
  F("utbody").innerHTML = rows.map((u) => `<tr>
    <td class="uid">${esc(u.id)}</td>
    <td>${esc(u.nama)}</td>
    <td class="umono">${esc(u.username)}</td>
    <td>${esc(u.dept)}</td>
    <td><span class="rp ${esc(u.peran)}">${esc(u.peran)}</span></td>
    <td><span class="rp ${esc(u.status)}">${esc(u.status)}</span></td>
    <td class="umono">${esc(u.login)}</td>
    <td style="white-space:nowrap">
      <button class="abtn" data-uact="edit" data-id="${esc(u.id)}">Edit</button>
      <button class="abtn ${u.status === "Aktif" ? "warn" : "ok"}" data-uact="toggle" data-id="${esc(u.id)}">${u.status === "Aktif" ? "Nonaktif" : "Aktifkan"}</button>
      <button class="abtn danger" data-uact="hapus" data-id="${esc(u.id)}">Hapus</button>
    </td></tr>`).join("");
}
function renderLogs() {
  F("logBody").innerHTML = db.logs.map((l) => `<tr>
    <td class="umono">${esc(l.t)}</td><td>${esc(l.user)}</td>
    <td><span class="rp Dokter">${esc(l.aksi)}</span></td><td>${esc(l.detail)}</td></tr>`).join("");
}

$$(".utab").forEach((b) => b.addEventListener("click", () => {
  $$(".utab").forEach((x) => x.classList.toggle("active", x === b));
  F("utab-pengguna").hidden = b.dataset.utab !== "pengguna";
  F("utab-log").hidden = b.dataset.utab !== "log";
  if (b.dataset.utab === "log") renderLogs();
}));
$$(".rchip").forEach((b) => b.addEventListener("click", () => {
  $$(".rchip").forEach((x) => x.classList.toggle("active", x === b));
  uRole = b.dataset.role; renderUsers();
}));

F("utbody").addEventListener("click", (e) => {
  const b = e.target.closest("[data-uact]");
  if (!b) return;
  const u = db.users.find((x) => x.id === b.dataset.id);
  if (!u) return;
  if (b.dataset.uact === "edit") openUser("edit", u);
  if (b.dataset.uact === "toggle") {
    u.status = u.status === "Aktif" ? "Nonaktif" : "Aktif";
    addLog(u.status === "Aktif" ? "Aktifkan Pengguna" : "Nonaktifkan Pengguna", `${u.nama} (${u.username})`);
    saveDB(); renderUsers(); toast(`${u.nama} ${u.status === "Aktif" ? "diaktifkan" : "dinonaktifkan"}`);
  }
  if (b.dataset.uact === "hapus") {
    confirmBox("Hapus Pengguna",
      `Anda akan menghapus pengguna <b>${esc(u.nama)}</b> (${esc(u.username)}). Tindakan ini akan dicatat di log aktivitas dan tidak dapat dibatalkan.`,
      "Ya, Hapus",
      () => {
        db.users = db.users.filter((x) => x.id !== u.id);
        addLog("Hapus Pengguna", `${u.nama} (${u.username})`);
        saveDB(); renderUsers(); toast("Pengguna dihapus");
      });
  }
});

function openUser(kind, u) {
  // kind: "user" | "dokter" | "edit"
  uMode = kind; uEditId = u ? u.id : null;
  F("formUser").reset();
  $$("#formUser .err").forEach((x) => (x.textContent = ""));
  $$("#formUser .invalid").forEach((x) => x.classList.remove("invalid"));
  F("uTitle").textContent = kind === "dokter" ? "Tambah Dokter" : kind === "edit" ? "Edit Pengguna" : "Tambah Pengguna";
  F("uSub").textContent = kind === "dokter" ? "Dokter baru akan muncul di pilihan DPJP" : "Isi data pengguna di bawah ini";
  F("grpPeran").hidden = kind === "dokter";
  if (kind === "dokter") F("uPeran").value = "Dokter";
  if (u) {
    F("uNama").value = u.nama; F("uUsername").value = u.username; F("uEmail").value = u.email || "";
    F("uDept").value = u.dept; F("uPeran").value = u.peran; F("uStatus").value = u.status;
  }
  F("modalUser").hidden = false;
  F("uNama").focus();
}
F("addUserBtn").addEventListener("click", () => openUser("user"));
F("addDokterBtn").addEventListener("click", () => openUser("dokter"));
F("cancelUser").addEventListener("click", () => (F("modalUser").hidden = true));

F("formUser").addEventListener("input", (e) => {
  e.target.classList.remove("invalid");
  const er = F("err-" + e.target.id); if (er) er.textContent = "";
});
F("formUser").addEventListener("submit", (e) => {
  e.preventDefault();
  let ok = true;
  const bad = (id, m) => { F(id).classList.add("invalid"); F("err-" + id).textContent = m; ok = false; };
  const v = {
    nama: F("uNama").value.trim(), username: F("uUsername").value.trim().toLowerCase(),
    email: F("uEmail").value.trim(), dept: F("uDept").value.trim(),
    peran: uMode === "dokter" ? "Dokter" : F("uPeran").value, status: F("uStatus").value,
  };
  if (!v.nama) bad("uNama", "Nama wajib diisi");
  if (!/^[a-z0-9._-]{3,}$/.test(v.username)) bad("uUsername", "Username minimal 3 karakter (huruf/angka/titik)");
  else if (db.users.some((u) => u.username === v.username && u.id !== uEditId)) bad("uUsername", "Username sudah dipakai");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) bad("uEmail", "Format email tidak valid");
  if (!v.dept) bad("uDept", "Departemen wajib diisi");
  if (!ok) return;

  if (uEditId) {
    const u = db.users.find((x) => x.id === uEditId);
    Object.assign(u, v);
    addLog("Edit Pengguna", `${v.nama} (${v.username})`);
    toast("Pengguna diperbarui");
  } else {
    const max = db.users.reduce((m, u) => Math.max(m, parseInt(u.id.replace(/\D/g, ""), 10) || 0), 0);
    db.users.push({ id: "USR-" + String(max + 1).padStart(3, "0"), ...v, login: "-" });
    addLog(uMode === "dokter" ? "Tambah Dokter" : "Tambah Pengguna", `${v.nama} (${v.username})`);
    toast(uMode === "dokter" ? "Dokter ditambahkan" : "Pengguna ditambahkan");
  }
  saveDB(); renderUsers(); renderLogs();
  F("modalUser").hidden = true;
});

/* =====================================================
   JAM, TEMA, NOTIFIKASI, UMUM
   ===================================================== */
function tick() {
  const d = new Date();
  F("clockDate").textContent = `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
  F("clockTime").textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
tick(); setInterval(tick, 1000);

if (localStorage.getItem("akreva_dark") === "1") { document.body.classList.add("dark"); F("themeBtn").textContent = "☀️"; }
F("themeBtn").addEventListener("click", () => {
  const dark = document.body.classList.toggle("dark");
  F("themeBtn").textContent = dark ? "☀️" : "🌙";
  try { localStorage.setItem("akreva_dark", dark ? "1" : "0"); } catch (e) {}
});
F("notifBtn").addEventListener("click", (e) => {
  e.stopPropagation();
  F("notifMenu").hidden = !F("notifMenu").hidden;
  F("notifBadge").hidden = true;
});

// tutup modal dengan Esc; klik latar menutup modal kecil (kecuali form pasien)
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") $$(".overlay").forEach((o) => (o.hidden = true));
});
$$(".overlay").forEach((o) => o.addEventListener("mousedown", (e) => {
  if (e.target === o && o.id !== "modalPasien") o.hidden = true;
}));

renderAudit();