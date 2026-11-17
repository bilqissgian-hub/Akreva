/* AKREVA - sinkronisasi data ke server (muat PALING PERTAMA, sebelum script.js) */
(function () {
  const KEY = "akreva_v2", RS = "akreva_rs";
  const asli = Storage.prototype.setItem;
  const tampil = (m) => (window.toast ? window.toast(m) : console.warn(m));
  let versi = 0, mode = false, awalKosong = false, timer = null, antre = Promise.resolve();

  // 1) ambil data terbaru dari server SEBELUM script.js membaca localStorage (permintaan sinkron)
  try {
    const x = new XMLHttpRequest(); x.open("GET", "/api/db", false); x.send();
    if (x.status === 200) {
      const r = JSON.parse(x.responseText); mode = true; versi = r.version || 0;
      if (r.db) { asli.call(localStorage, KEY, JSON.stringify(r.db)); r.rs ? asli.call(localStorage, RS, r.rs) : localStorage.removeItem(RS); }
      else awalKosong = true; // server masih kosong: data di browser ini akan diunggah
    }
  } catch (e) {}

  // 2) setiap data disimpan di browser, kirim juga ke server
  function simpan() {
    if (!localStorage.getItem(KEY)) return Promise.resolve();
    const body = JSON.stringify({ base: versi, db: JSON.parse(localStorage.getItem(KEY)), rs: localStorage.getItem(RS) });
    return fetch("/api/db", { method: "PUT", headers: { "Content-Type": "application/json" }, body })
      .then(async (r) => {
        if (r.status === 409) { tampil("Data sudah diubah pengguna lain. Halaman dimuat ulang."); setTimeout(() => location.reload(), 1800); return; }
        if (!r.ok) throw new Error(r.status);
        versi = (await r.json()).version;
      })
      .catch(() => tampil("Gagal menyimpan ke server. Perubahan belum tersimpan di server."));
  }
  const jadwal = () => { clearTimeout(timer); timer = setTimeout(() => { antre = antre.then(simpan); }, 400); };
  window.akrevaSimpan = () => { clearTimeout(timer); return (antre = antre.then(simpan)); };
  if (mode) {
    Storage.prototype.setItem = function (k, v) { asli.apply(this, arguments); if (this === localStorage && (k === KEY || k === RS)) jadwal(); };
    if (awalKosong && localStorage.getItem(KEY)) jadwal();
  }

  // 3) berkas PDF: ke server bila tersedia, jika tidak ke IndexedDB browser
  const idb = new Promise((ok, no) => { const r = indexedDB.open("akreva_files", 1); r.onupgradeneeded = () => r.result.createObjectStore("f"); r.onsuccess = () => ok(r.result); r.onerror = no; });
  window.fput = async (k, b) => {
    if (mode) { const r = await fetch("/api/files/" + encodeURIComponent(k), { method: "PUT", headers: { "Content-Type": "application/pdf" }, body: b }); if (!r.ok) throw new Error(r.status); return; }
    const d = await idb; return new Promise((ok) => { const t = d.transaction("f", "readwrite"); t.objectStore("f").put(b, k); t.oncomplete = ok; });
  };
  window.fget = async (k) => {
    if (mode) { const r = await fetch("/api/files/" + encodeURIComponent(k)); return r.ok ? r.blob() : undefined; }
    const d = await idb; return new Promise((ok) => { const q = d.transaction("f").objectStore("f").get(k); q.onsuccess = () => ok(q.result); });
  };
})();