/* =========================================================
   app.js — Logika dasbor SiDisposisi
   Alur mengikuti mantra Shneiderman:
   1) Overview first  → kartu KPI + grafik
   2) Zoom & filter   → filter bulan/unit/status/arah/cari, klik bar
   3) Details on demand → klik baris tabel membuka dialog detail
   ========================================================= */

const BULAN = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
const IKON = { Terlambat: "⚠", Diproses: "⏳", Selesai: "✓" };
const state = { bulan: "semua", unit: "semua", status: "semua", arah: "semua", cari: "" };

const $ = (s) => document.querySelector(s);
const fmt = (d) => d ? d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "—";
const badge = (st) => `<span class="badge b-${st}">${IKON[st]} ${st}</span>`;

/* ---------- Filter ---------- */
function saring(abaikanBulan = false) {
  const q = state.cari.trim().toLowerCase();
  return DATA_SURAT.filter((s) =>
    (abaikanBulan || state.bulan === "semua" || s.tanggal.getMonth() === +state.bulan) &&
    (state.unit === "semua" || s.unit === state.unit) &&
    (state.status === "semua" || s.status === state.status) &&
    (state.arah === "semua" || s.arah === state.arah) &&
    (!q || `${s.nomor} ${s.perihal} ${s.pengirim}`.toLowerCase().includes(q))
  );
}

/* ---------- 1. Overview: KPI ---------- */
function renderKPI(list) {
  const n = (st) => list.filter((s) => s.status === st).length;
  const selesai = list.filter((s) => s.status === "Selesai");
  const rata = selesai.length ? (selesai.reduce((a, s) => a + s.durasi, 0) / selesai.length).toFixed(1) : "–";
  const telat = n("Terlambat");
  $("#kpi").innerHTML = `
    <div><span>Total surat</span><strong>${list.length}</strong><small>sesuai filter</small></div>
    <div class="${telat ? "alarm" : ""}"><span>${IKON.Terlambat} Terlambat (&gt; ${BATAS_HARI} hari)</span>
      <strong>${telat}</strong><small>${telat ? "perlu tindak lanjut" : "aman"}</small></div>
    <div><span>${IKON.Diproses} Diproses</span><strong>${n("Diproses")}</strong><small>masih dalam batas waktu</small></div>
    <div><span>${IKON.Selesai} Selesai</span><strong>${selesai.length}</strong><small>rata-rata ${rata} hari</small></div>`;
}

/* ---------- Grafik batang: perbandingan antar kategori ---------- */
function renderBar(list) {
  const per = UNIT.map((u) => {
    const l = list.filter((s) => s.unit === u);
    return { u, total: l.length, telat: l.filter((s) => s.status === "Terlambat").length };
  }).sort((a, b) => b.telat - a.telat || b.total - a.total);
  const max = Math.max(1, ...per.map((p) => p.total));

  $("#bar").innerHTML = per.map((p) => `
    <button class="bar-row ${state.unit === p.u ? "aktif" : ""}" data-unit="${p.u}"
      aria-pressed="${state.unit === p.u}"
      aria-label="${p.u}: ${p.total} surat, ${p.telat} terlambat. Klik untuk memfilter.">
      <span class="bar-label">${p.u}</span>
      <span class="bar-track" aria-hidden="true">
        <span class="seg ok" style="width:${((p.total - p.telat) / max) * 100}%"></span>
        <span class="seg telat" style="width:${(p.telat / max) * 100}%"></span>
      </span>
      <span class="bar-val">${p.total}${p.telat ? ` <b class="txt-telat">(${p.telat} ${IKON.Terlambat})</b>` : ""}</span>
    </button>`).join("");
}

/* ---------- Grafik garis: tren waktu ---------- */
function renderLine(list) {
  const W = 560, H = 230, p = { l: 34, r: 92, t: 14, b: 28 };
  const bln = [4, 5, 6, 7, 8, 9];
  const seri = ["Masuk", "Keluar"].map((a) => ({
    a, k: a === "Masuk" ? "masuk" : "keluar",
    v: bln.map((m) => list.filter((s) => s.arah === a && s.tanggal.getMonth() === m).length)
  })).filter((s) => state.arah === "semua" || s.a === state.arah);

  const max = Math.max(1, ...seri.flatMap((s) => s.v));
  const x = (i) => p.l + (i * (W - p.l - p.r)) / (bln.length - 1);
  const y = (v) => H - p.b - (v / max) * (H - p.t - p.b);
  let g = "";

  if (state.bulan !== "semua") {                      // sorot bulan yang dipilih
    const i = bln.indexOf(+state.bulan);
    g += `<rect class="sorot" x="${x(i) - 22}" y="${p.t}" width="44" height="${H - p.t - p.b}" rx="4"/>`;
  }
  [0, Math.round(max / 2), max].forEach((t) => {      // gridline minimal
    g += `<line class="grid" x1="${p.l}" x2="${W - p.r}" y1="${y(t)}" y2="${y(t)}"/>
          <text class="ax" x="${p.l - 6}" y="${y(t) + 4}" text-anchor="end">${t}</text>`;
  });
  bln.forEach((m, i) => (g += `<text class="ax" x="${x(i)}" y="${H - 8}" text-anchor="middle">${BULAN[m]}</text>`));

  const posLabel = [];
  seri.forEach((s) => {
    g += `<polyline class="l-${s.k}" points="${s.v.map((v, i) => `${x(i)},${y(v)}`).join(" ")}"/>`;
    s.v.forEach((v, i) => (g += `<circle class="d-${s.k}" cx="${x(i)}" cy="${y(v)}" r="4"><title>${s.a} ${BULAN[bln[i]]}: ${v} surat</title></circle>`));
    let ly = y(s.v.at(-1)) + 4;                        // label langsung di ujung garis (tanpa legenda terpisah)
    if (posLabel.some((q) => Math.abs(q - ly) < 14)) ly += 16;
    posLabel.push(ly);
    g += `<text class="lbl t-${s.k}" x="${x(bln.length - 1) + 10}" y="${ly}">${s.a} (${s.v.at(-1)})</text>`;
  });

  const ringkas = seri.map((s) => `${s.a}: ${s.v.join(", ")}`).join("; ");
  $("#line").innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img"
    aria-label="Tren surat per bulan Mei sampai Oktober 2026. ${ringkas}">${g}</svg>`;
}

/* ---------- Tabel ---------- */
function renderTabel(list) {
  const urut = [...list].sort((a, b) =>
    (b.status === "Terlambat") - (a.status === "Terlambat") || b.tanggal - a.tanggal);
  $("#tbody").innerHTML = urut.length ? urut.map((s) => `
    <tr tabindex="0" data-id="${s.id}" aria-label="Lihat detail surat ${s.nomor}">
      <td>${s.nomor}</td><td>${fmt(s.tanggal)}</td><td>${s.arah}</td>
      <td>${s.perihal}</td><td>${s.unit}</td><td>${badge(s.status)}</td>
    </tr>`).join("")
    : `<tr><td colspan="6" class="kosong">Tidak ada surat yang cocok. Coba ubah atau reset filter.</td></tr>`;
}

/* ---------- 3. Details on demand ---------- */
function bukaDetail(id) {
  const s = DATA_SURAT.find((d) => d.id === id);
  const waktu = s.status === "Selesai"
    ? `Selesai dalam ${s.durasi} hari (${fmt(s.tanggalSelesai)})`
    : `Sudah ${s.umur} hari sejak diterima${s.status === "Terlambat" ? ` — melewati batas ${BATAS_HARI} hari` : ""}`;
  $("#dJudul").textContent = `Surat ${s.nomor}`;
  $("#dIsi").innerHTML = `
    <dt>Perihal</dt><dd>${s.perihal}</dd>
    <dt>Arah</dt><dd>Surat ${s.arah.toLowerCase()}</dd>
    <dt>Pengirim</dt><dd>${s.pengirim}</dd>
    <dt>Unit tujuan</dt><dd>${s.unit}</dd>
    <dt>Tanggal</dt><dd>${fmt(s.tanggal)}</dd>
    <dt>Prioritas</dt><dd>${s.prioritas}</dd>
    <dt>Status</dt><dd>${badge(s.status)}</dd>
    <dt>Waktu proses</dt><dd>${waktu}</dd>`;
  $("#detail").showModal();
}

/* ---------- Render utama ---------- */
function render() {
  const list = saring();
  renderKPI(list);
  renderBar(list);
  renderLine(saring(true));            // tren tetap menampilkan semua bulan
  renderTabel(list);
  $("#info").textContent = `Menampilkan ${list.length} dari ${DATA_SURAT.length} surat.`;
}

/* ---------- Preferensi tampilan (aksesibilitas) ---------- */
function setPref(kelas, tombol, aktif) {
  document.documentElement.classList.toggle(kelas, aktif);
  tombol.setAttribute("aria-pressed", aktif);
  try { localStorage.setItem("pref-" + kelas, aktif ? "1" : "0"); } catch (e) { /* abaikan */ }
}
function bacaPref(kelas) {
  try { return localStorage.getItem("pref-" + kelas) === "1"; } catch (e) { return false; }
}

/* ---------- Event ---------- */
function init() {
  $("#fUnit").innerHTML += UNIT.map((u) => `<option>${u}</option>`).join("");
  const peta = { fBulan: "bulan", fUnit: "unit", fStatus: "status", fArah: "arah" };
  Object.entries(peta).forEach(([id, key]) =>
    $("#" + id).addEventListener("change", (e) => { state[key] = e.target.value; render(); }));
  $("#fCari").addEventListener("input", (e) => { state.cari = e.target.value; render(); });

  $("#btnReset").addEventListener("click", () => {
    Object.assign(state, { bulan: "semua", unit: "semua", status: "semua", arah: "semua", cari: "" });
    ["fBulan", "fUnit", "fStatus", "fArah"].forEach((id) => ($("#" + id).value = "semua"));
    $("#fCari").value = "";
    render();
  });

  $("#bar").addEventListener("click", (e) => {        // klik bar = filter unit (toggle)
    const b = e.target.closest(".bar-row"); if (!b) return;
    state.unit = state.unit === b.dataset.unit ? "semua" : b.dataset.unit;
    $("#fUnit").value = state.unit;
    render();
  });

  const tb = $("#tbody");
  tb.addEventListener("click", (e) => { const tr = e.target.closest("tr[data-id]"); if (tr) bukaDetail(+tr.dataset.id); });
  tb.addEventListener("keydown", (e) => {
    const tr = e.target.closest("tr[data-id]");
    if (tr && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); bukaDetail(+tr.dataset.id); }
  });
  $("#dTutup").addEventListener("click", () => $("#detail").close());

  const bt = $("#btnTeks"), bk = $("#btnKontras");
  setPref("besar", bt, bacaPref("besar"));
  setPref("kontras", bk, bacaPref("kontras"));
  bt.addEventListener("click", () => setPref("besar", bt, bt.getAttribute("aria-pressed") !== "true"));
  bk.addEventListener("click", () => setPref("kontras", bk, bk.getAttribute("aria-pressed") !== "true"));

  render();
}
init();
