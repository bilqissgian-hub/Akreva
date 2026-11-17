/* =====================================================
   AKREVA - tambahan (muat SETELAH script.js)
   ===================================================== */
const GMAIL_CLIENT_ID = ""; // opsional: isi Client ID OAuth agar email terkirim langsung lewat Gmail API

/* ---------- Penyimpanan PDF permanen (IndexedDB) ---------- */
const relink = (id, fn) => { const o = F(id), n = o.cloneNode(true); o.replaceWith(n); n.addEventListener("click", fn); return n; };

/* ---------- Kelengkapan: Y harus ada PDF, TDD dihitung lengkap ---------- */
const docDone = (d) => !!d && (d.val === "TDD" || (d.val === "Y" && !!d.file));
function calcPct(docs, layanan) {
  const l = DOCS[layanan] || [];
  return l.length ? Math.round((l.filter((n) => docDone(docs[n])).length / l.length) * 100) : 0;
}

/* ---------- Daftar berkas (sesuai gambar) ---------- */
function renderDocs() {
  const names = DOCS[F("fRuang").value || "Rawat Inap"];
  F("docList").innerHTML = names.map((n) => {
    const d = draft[n] || { val: "T" }, ok = docDone(d), nm = esc(n);
    const aksi = d.val === "Y"
      ? (d.file ? `<button type="button" class="mini" data-preview="${nm}">Preview</button><button type="button" class="mini" data-upload="${nm}">Ganti File</button>`
                : `<button type="button" class="mini warn" data-upload="${nm}">Upload File</button>`)
      : d.val === "TDD" ? `<span class="chipx info">Tidak dilakukan</span>` : `<span class="chipx bad">Belum lengkap</span>`;
    return `<div class="doc-card ${ok ? "ok" : d.val === "Y" ? "warn" : ""}">
      <div class="doc-top"><input type="checkbox" disabled ${ok ? "checked" : ""}><span class="doc-name ${ok ? "b" : ""}">${nm}</span><span class="mark ${ok ? "g" : "r"}">${ok ? "✓" : "✗"}</span></div>
      <div class="doc-bot"><div class="seg">${["Y", "T", "TDD"].map((v) => `<button type="button" data-doc="${nm}" data-val="${v}" class="${d.val === v ? "on-" + v : ""}">${v}</button>`).join("")}</div>${aksi}</div></div>`;
  }).join("");
  updateDocProgress();
}
// upload: simpan file PDF sungguhan
{ const n = F("docFile").cloneNode(true); F("docFile").replaceWith(n);
  n.addEventListener("change", async (e) => {
    const f = e.target.files[0]; e.target.value = "";
    if (!f || !pendingDoc) return;
    const m = checkPdf(f); if (m) return toast(m);
    await fput(editId + "|" + pendingDoc, f);
    draft[pendingDoc] = { val: "Y", file: { name: f.name, size: f.size } };
    renderDocs();
  }); }
F("docList").addEventListener("click", async (e) => {
  const b = e.target.closest("[data-preview]"); if (!b) return;
  const blob = await fget(editId + "|" + b.dataset.preview);
  blob ? window.open(URL.createObjectURL(blob), "_blank") : toast("File PDF tidak ditemukan");
});
// General Consent saat Tambah Pasien -> simpan file
F("formPasien").addEventListener("submit", () => {
  if (mode !== "add") return;
  const f = F("fConsent").files[0];
  const p = db.patients.find((x) => x.rm === F("fRm").value.trim());
  if (f && p && p.docs["General Consent"] && Date.now() - p.id < 3000) fput(p.id + "|General Consent", f);
});

/* ---------- Gmail ---------- */
let _gt = null, _gc = null;
function gmailToken() {
  return new Promise((ok, no) => {
    if (_gt && _gt.exp > Date.now()) return ok(_gt.v);
    _gc = _gc || google.accounts.oauth2.initTokenClient({
      client_id: GMAIL_CLIENT_ID, scope: "https://www.googleapis.com/auth/gmail.send",
      callback: (r) => r.error ? no(r) : ((_gt = { v: r.access_token, exp: Date.now() + r.expires_in * 1000 - 60000 }), ok(_gt.v)),
    });
    _gc.requestAccessToken();
  });
}
const b64 = (s) => btoa(unescape(encodeURIComponent(s)));
async function gmailSend(to, subject, body) {
  const t = await gmailToken();
  const raw = [`To: ${to}`, `Subject: =?UTF-8?B?${b64(subject)}?=`, "MIME-Version: 1.0", "Content-Type: text/plain; charset=UTF-8", "Content-Transfer-Encoding: base64", "", b64(body)].join("\r\n");
  const r = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST", headers: { Authorization: "Bearer " + t, "Content-Type": "application/json" },
    body: JSON.stringify({ raw: b64(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "") }),
  });
  if (!r.ok) throw new Error((await r.json()).error?.message || r.status);
}
const gmailCompose = (to, su, body) => window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(su)}&body=${encodeURIComponent(body)}`, "_blank");

relink("btnEmail", async () => {
  const p = db.patients.find((x) => x.id === editId); if (!p) return;
  const to = F("fEmail").value, dpjp = F("fDpjp").value;
  if (!to) return toast("Pilih DPJP terlebih dahulu");
  const miss = (DOCS[F("fRuang").value] || []).filter((n) => !docDone(draft[n]));
  if (!miss.length) return toast("Semua berkas sudah lengkap");
  const subject = `Kelengkapan Rekam Medis - ${p.nama} (${p.rm})`;
  const body = `Yth. ${dpjp},\n\nMohon melengkapi berkas rekam medis pasien berikut:\nNama      : ${p.nama}\nNo. RM    : ${p.rm}\nDiagnosis : ${F("fDiag").value} (${F("fIcd").value})\n\nBerkas yang belum lengkap:\n${miss.map((m, i) => `${i + 1}. ${m}`).join("\n")}\n\nTerima kasih.\nAkreva - Audit Rekam Medis`;
  addLog("Kirim Email", `Kelengkapan berkas ${p.nama} (${p.rm}) ke ${dpjp}`); saveDB();
  if (GMAIL_CLIENT_ID && window.google) {
    try { await gmailSend(to, subject, body); toast("Email terkirim lewat Gmail"); }
    catch (e) { toast("Gagal kirim Gmail: " + (e.error || e.message || e)); }
  } else gmailCompose(to, subject, body);
});

/* ---------- Tambah Dokter ---------- */
const SPES = ["Obstetri & Ginekologi (SpOG)", "Anak (SpA)", "Anestesiologi (SpAn)", "Penyakit Dalam (SpPD)", "Bedah (SpB)", "Radiologi (SpRad)", "Patologi Klinik (SpPK)", "Dokter Umum"];
document.body.insertAdjacentHTML("beforeend", `
<div class="overlay" id="modalDokter" hidden><div class="modal small"><h2>Tambah Dokter</h2><form id="formDokter" novalidate>
<label>Nama Dokter *<input id="dNama" placeholder="Contoh: dr. Siti Rahma, SpOG"><small class="err" id="err-dNama"></small></label>
<label>Email *<input id="dEmail" placeholder="Contoh: siti.rahma@rsu.id"><small class="err" id="err-dEmail"></small></label>
<label>Spesialis *<select id="dSpes"><option value="" disabled selected>Pilih spesialis</option>${SPES.map((s) => `<option>${s}</option>`).join("")}</select><small class="err" id="err-dSpes"></small></label>
<div class="modal-actions noline"><button type="button" class="btn btn-light big" id="dBatal">Batal</button><button class="btn btn-primary big">Simpan</button></div></form></div></div>`);
relink("addDokterBtn", () => { F("formDokter").reset(); $$("#formDokter .err").forEach((x) => (x.textContent = "")); F("modalDokter").hidden = false; F("dNama").focus(); });
F("dBatal").onclick = () => (F("modalDokter").hidden = true);
F("formDokter").addEventListener("submit", (e) => {
  e.preventDefault(); let ok = true;
  $$("#formDokter .err").forEach((x) => (x.textContent = ""));
  const bad = (id, m) => { F("err-" + id).textContent = m; ok = false; };
  const nama = F("dNama").value.trim(), email = F("dEmail").value.trim(), spes = F("dSpes").value;
  if (!nama) bad("dNama", "Nama dokter wajib diisi");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) bad("dEmail", "Format email tidak valid");
  if (!spes) bad("dSpes", "Pilih spesialis");
  if (!ok) return;
  const u0 = nama.toLowerCase().replace(/^dr\.?\s*/, "").replace(/,.*$/, "").trim().replace(/[^a-z0-9]+/g, "."); let un = u0, i = 1;
  while (db.users.some((u) => u.username === un)) un = u0 + i++;
  const max = db.users.reduce((m, u) => Math.max(m, parseInt(u.id.replace(/\D/g, ""), 10) || 0), 0);
  db.users.push({ id: "USR-" + String(max + 1).padStart(3, "0"), nama, username: un, dept: spes, peran: "Dokter", status: "Aktif", login: "-", email });
  addLog("Tambah Dokter", `${nama} (${spes})`); saveDB(); renderUsers(); renderLogs();
  F("modalDokter").hidden = true; toast("Dokter ditambahkan");
});

/* ---------- Pengaturan & Profil RS ---------- */
const RS_F = [["nama", "Nama Rumah Sakit"], ["kelas", "Kelas Rumah Sakit"], ["jenis", "Jenis Rumah Sakit"], ["direktur", "Direktur"], ["alamat", "Alamat"], ["telp", "No. Telp"]];
let RS = { nama: "RSUD Nyi Ageng Serang", kelas: "C", jenis: "Rumah Sakit Umum", direktur: "Dr. drg. Theodola Baning Rahayujati, M.Kes.", alamat: "Jalan Sentolo-Muntilan KM 0,3, Bantar Kulon, Banguncipto, Kecamatan Sentolo, Kabupaten Kulon Progo, Daerah Istimewa Yogyakarta 55664", telp: "(0274) 2890651" };
try { Object.assign(RS, JSON.parse(localStorage.getItem("akreva_rs") || "{}")); } catch (e) {}

document.body.insertAdjacentHTML("beforeend", `
<main class="container" id="page-pengaturan" hidden><h1>Pengaturan</h1>
<div class="table-card pad"><h3>Profil Rumah Sakit</h3><p class="sub">Lihat atau ubah informasi fasilitas kesehatan.</p><button class="btn btn-light" id="openRS">Lihat Profil Rumah Sakit</button></div>
<div class="table-card pad"><h3>Tampilan</h3><label style="margin-top:12px"><input type="checkbox" id="stDark" style="display:inline;width:auto;margin-right:10px"> Mode gelap</label></div>
<div class="table-card pad"><h3>Bantuan &amp; Dukungan</h3>
<div class="help" data-h="panduan"><div><b>Panduan Pengguna AKREVA</b><small>Cara penggunaan tiap modul sistem Akreva</small></div></div>
<div class="help" data-h="icd"><div><b>Pedoman Koding ICD-10</b><small>Referensi kode diagnosis (WHO ICD-10)</small></div></div>
<div class="help" data-h="bpjs"><div><b>Aturan Klaim BPJS 2026</b><small>Alur pengajuan, batas waktu, dan prosedur</small></div></div>
<div class="help" data-h="admin"><div><b>Hubungi Administrator</b><small>Kirim laporan masalah lewat Gmail</small></div></div></div>
<button class="btn btn-primary big" id="saveAll" style="width:100%">Simpan Semua Pengaturan</button></main>
<div class="overlay" id="modalRS" hidden><div class="modal rs">
<div class="rs-head"><div class="lg"><img src="gambar/logo-icon.png" alt=""></div><div><h2 id="rsTitle"></h2><small>Profil &amp; Informasi Fasilitas Kesehatan</small></div><button class="rs-x" id="rsX">✕</button></div>
<div class="rs-body" id="rsBody"></div><div class="rs-foot" id="rsFoot"></div></div></div>`);

function showPage(n) {
  ["beranda", "audit", "laporan", "pengguna", "pengaturan"].forEach((p) => (F("page-" + p).hidden = p !== n));
  $$(".nav-link").forEach((a) => a.classList.toggle("active", a.dataset.page === n));
  F("userBtn").classList.toggle("active", n === "pengguna");
  if (n === "beranda" || n === "laporan") renderStats();
  if (n === "pengguna") { renderUsers(); renderLogs(); }
  if (n === "pengaturan") F("stDark").checked = document.body.classList.contains("dark");
}
relink("settingBtn", () => showPage("pengaturan"));

function renderRS(edit) {
  F("rsTitle").textContent = RS.nama;
  F("rsBody").innerHTML = `<div class="rs-h"><h3>Informasi Fasilitas Kesehatan</h3>${edit ? "" : '<button class="rs-edit" id="rsEdit">✎ Edit</button>'}</div>
  <div class="rs-tbl">${RS_F.map(([k, l]) => `<div class="rs-row"><b>${l}</b>${edit ? (k === "alamat" ? `<textarea id="rs_${k}" rows="3">${esc(RS[k])}</textarea>` : `<input id="rs_${k}" value="${esc(RS[k])}">`) : `<span>${esc(RS[k])}</span>`}</div>`).join("")}</div>`;
  F("rsFoot").innerHTML = edit ? `<button class="rs-btn light" id="rsCancel">Batal</button><button class="rs-btn" id="rsSave">Simpan Perubahan</button>` : `<button class="rs-btn" id="rsClose">Tutup</button>`;
}
const openRS = () => { renderRS(false); F("modalRS").hidden = false; };
$(".brand").addEventListener("click", openRS);
F("openRS").addEventListener("click", openRS);
F("modalRS").addEventListener("click", (e) => {
  const id = (e.target.closest("button") || {}).id;
  if (e.target.id === "modalRS" || id === "rsX" || id === "rsClose") F("modalRS").hidden = true;
  if (id === "rsEdit") renderRS(true);
  if (id === "rsCancel") renderRS(false);
  if (id === "rsSave") {
    const n = {}; RS_F.forEach(([k]) => (n[k] = F("rs_" + k).value.trim()));
    if (!n.nama) return toast("Nama rumah sakit wajib diisi");
    RS = n; try { localStorage.setItem("akreva_rs", JSON.stringify(RS)); } catch (x) {}
    addLog("Edit Profil RS", RS.nama); saveDB(); renderRS(false); toast("Profil rumah sakit disimpan");
  }
});
F("stDark").addEventListener("change", (e) => { if (e.target.checked !== document.body.classList.contains("dark")) F("themeBtn").click(); });
F("saveAll").addEventListener("click", () => toast("Pengaturan disimpan"));
$$(".help").forEach((h) => h.addEventListener("click", () => {
  const k = h.dataset.h;
  if (k === "icd") window.open("https://icd.who.int/browse10/2019/en", "_blank");
  else if (k === "admin") gmailCompose((db.users.find((u) => u.peran === "Admin") || {}).email || "", "Laporan masalah Akreva", "Halo Administrator,\n\nSaya ingin melaporkan:\n");
  else toast("Dokumen belum diunggah");
}));