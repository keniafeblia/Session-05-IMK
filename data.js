/* =========================================================
   data.js — Data DUMMY (fiktif) untuk studi kasus.
   Tidak mewakili instansi, orang, atau surat yang nyata.
   Data dibangkitkan dengan "seeded random" supaya hasilnya
   selalu sama setiap kali halaman dibuka (reproducible).
   ========================================================= */

const UNIT = ["Keuangan", "Kepegawaian", "Umum & Rumah Tangga", "Perencanaan", "Hukum"];
const PENGIRIM = [
  "Sekretariat Daerah", "BKPSDM", "Bappeda", "Inspektorat",
  "Kecamatan Timur", "Kecamatan Barat", "Dinas Kominfo", "Mitra Swasta"
];
const PERIHAL = [
  "Undangan rapat koordinasi", "Permohonan data pegawai", "Laporan realisasi anggaran",
  "Nota dinas pengadaan ATK", "Surat edaran jam kerja", "Permohonan izin cuti",
  "Undangan sosialisasi aplikasi", "Laporan kegiatan triwulan", "Permohonan peminjaman aula",
  "Penyampaian draf peraturan"
];
const BATAS_HARI = 3;                       // SLA: disposisi wajib selesai ≤ 3 hari
const HARI_INI = new Date(2026, 9, 19);     // tanggal acuan data: 19 Okt 2026
const ROMAWI = ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"];

function acak(seed) {                       // generator angka acak sederhana (LCG)
  return () => (seed = (seed * 16807) % 2147483647) / 2147483647;
}
const pilih = (r, arr) => arr[Math.floor(r() * arr.length)];
const selisihHari = (a, b) => Math.round((b - a) / 86400000);

const DATA_SURAT = (() => {
  const r = acak(2026);
  const out = [];
  for (let i = 1; i <= 120; i++) {
    const bulan = 4 + Math.floor(r() * 6);                    // Mei (4) s.d. Okt (9)
    const maxHari = bulan === 9 ? 19 : 28;
    const tanggal = new Date(2026, bulan, 1 + Math.floor(r() * maxHari));
    const umur = selisihHari(tanggal, HARI_INI);
    const arah = r() < 0.6 ? "Masuk" : "Keluar";
    const unit = pilih(r, UNIT);

    const sudahSelesai = r() < (umur > 10 ? 0.92 : 0.45);
    let tanggalSelesai = null, durasi = null;
    if (sudahSelesai) {
      durasi = Math.min(umur, 1 + Math.floor(r() * 5));
      tanggalSelesai = new Date(tanggal.getTime() + durasi * 86400000);
    }
    const status = sudahSelesai ? "Selesai" : umur > BATAS_HARI ? "Terlambat" : "Diproses";

    out.push({
      id: i,
      nomor: `${String(i).padStart(3, "0")}/${arah === "Masuk" ? "SM" : "SK"}/${ROMAWI[bulan]}/2026`,
      tanggal, arah, unit, status, durasi, tanggalSelesai, umur,
      pengirim: arah === "Masuk" ? pilih(r, PENGIRIM) : "Bagian Umum (internal)",
      perihal: pilih(r, PERIHAL),
      prioritas: r() < 0.25 ? "Penting" : "Biasa"
    });
  }
  return out;
})();
