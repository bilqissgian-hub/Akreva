/* AKREVA - server data bersama (Node.js + Express). Jalankan: npm install, lalu npm start */
const express = require("express"), fs = require("fs"), path = require("path"), crypto = require("crypto");
const PORT = process.env.PORT || 3000;
const DATA = path.resolve(process.env.DATA_DIR || path.join(__dirname, "data")); // letakkan di disk permanen saat hosting
const FILES = path.join(DATA, "files"), DBF = path.join(DATA, "akreva.json");
fs.mkdirSync(FILES, { recursive: true });

let state = { version: 0, db: null, rs: null };
try { state = JSON.parse(fs.readFileSync(DBF, "utf8")); } catch (e) {}
function simpan() { // tulis ke file sementara dulu, simpan salinan sebelumnya (.bak), baru timpa
  const tmp = DBF + ".tmp"; fs.writeFileSync(tmp, JSON.stringify(state));
  if (fs.existsSync(DBF)) fs.copyFileSync(DBF, DBF + ".bak");
  fs.renameSync(tmp, DBF);
}

const app = express();

// Kata sandi (login bawaan browser). Isi variabel AKREVA_PASSWORD (dan AKREVA_USER) agar aktif.
const PASS = process.env.AKREVA_PASSWORD, USER = process.env.AKREVA_USER || "admin";
const sama = (a, b) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && crypto.timingSafeEqual(x, y); };
app.use((q, s, n) => {
  if (!PASS) return n();
  const [u, ...p] = Buffer.from((q.headers.authorization || "").split(" ")[1] || "", "base64").toString().split(":");
  if (sama(u || "", USER) && sama(p.join(":"), PASS)) return n();
  s.set("WWW-Authenticate", 'Basic realm="Akreva"').status(401).send("Perlu login");
});

// data utama (pasien, pengguna, log, profil RS)
app.get("/api/db", (q, s) => s.json(state));
app.put("/api/db", express.json({ limit: "50mb" }), (q, s) => {
  if (q.body.base !== state.version) return s.status(409).json({ version: state.version }); // ada perubahan dari pengguna lain
  if (!q.body.db || !Array.isArray(q.body.db.patients)) return s.status(400).json({ error: "data tidak valid" });
  state = { version: state.version + 1, db: q.body.db, rs: q.body.rs || null };
  simpan(); s.json({ version: state.version });
});

// berkas PDF
const fpath = (k) => path.join(FILES, crypto.createHash("sha256").update(String(k)).digest("hex") + ".pdf");
app.put("/api/files/:k", express.raw({ type: "*/*", limit: "12mb" }), (q, s) => {
  if (!Buffer.isBuffer(q.body) || q.body.slice(0, 4).toString() !== "%PDF") return s.status(400).json({ error: "hanya PDF" });
  fs.writeFileSync(fpath(q.params.k), q.body); s.json({ ok: 1 });
});
app.get("/api/files/:k", (q, s) => { const f = fpath(q.params.k); fs.existsSync(f) ? s.type("application/pdf").sendFile(f) : s.sendStatus(404); });

// halaman web (isi folder public)
app.use(express.static(path.join(__dirname, "public")));
app.listen(PORT, "0.0.0.0", () => console.log(`Akreva berjalan di http://localhost:${PORT}${PASS ? " (dengan kata sandi)" : " (TANPA kata sandi)"}`));