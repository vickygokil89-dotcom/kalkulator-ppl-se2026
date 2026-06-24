# Panduan Edit — Kalkulator Usaha SE2026

File: **`se2026-app-editable.html`** (1 file, 100% offline, PWA-ready)

Semua hal yang sering diedit terpusat di **satu objek** bernama `APP_CONFIG`
yang ada di blok `<script>` pertama. Ubah nilai di sana, lalu refresh —
tidak perlu menyentuh logika kalkulasi.

---

## 1. Ubah judul / branding
```js
APP_CONFIG.APP_NAME       // judul di header
APP_CONFIG.APP_TAGLINE    // subtitle di header
APP_CONFIG.AUTHOR         // "✦ by HUTA CREATIVE STUDIO"
APP_CONFIG.LOGO_BADGE     // badge "MITRA BPS"
APP_CONFIG.LOCK_TITLE     // judul di lock screen
APP_CONFIG.PAGE_TITLE     // <title> tab browser
```

## 2. Tambah / hapus Jenis Usaha (+ KBLI)
Edit array `APP_CONFIG.JENIS_USAHA`. Setiap item:
```js
{ id: 'kode_unik', icon: '🛒', label: 'Nama Tampil', badge: 'Singkat',
  kbli: 'G — Perdagangan Besar & Eceran (46-47)',  // ditampilkan saat dipilih
  musiman: true,                                    // opsional
  labelMusim: 'Bulan Panen per Tahun',              // jika musiman
  hintMusim:  'Penjelasan musim panen...'           // jika musiman
}
```
**Saat ini sudah ada 13 jenis:** Dagang, Kuliner, Jasa, Produksi, Pertanian,
Peternakan, Konstruksi, Transportasi, Penginapan, Pendidikan, Kesehatan,
Kerajinan, Lainnya.

## 3. Pekerjaan Utama Responden
Edit array `APP_CONFIG.PEKERJAAN_RESPONDEN`:
```js
PEKERJAAN_RESPONDEN: [
  'Pemilik Usaha', 'Karyawan Swasta', 'PNS / ASN', ...
]
```

## 4. Tambah / hapus Tab
Edit `APP_CONFIG.TABS`. Untuk tab baru, juga tambahkan section HTML:
```html
<div id="tab-IDBARU" class="section"> ...isi tab... </div>
```
di dalam `<main>`.

## 5. Ubah Rincian 26 (FASIH)
Edit array `APP_CONFIG.RINCIAN_26`:
```js
{ kode: 'a', label: '26.a Label lengkap', short: 'Label pendek (utk copy)' }
```

## 6. Ganti URL Sistem Aktivasi
```js
APP_CONFIG.ACTIVATION_URL      // URL Google Apps Script
APP_CONFIG.LOCK_STORAGE_KEY    // key localStorage utk kode aktif
```

## 7. Ubah warna brand (skema saat ini: HIJAU pertanian)
Edit variabel CSS di blok `<style>` → cari komentar **"EDIT WARNA"**:
```css
:root {
  --bps-blue:  #1d6b2e;   /* primary (hijau tua) */
  --bps-light: #3a9442;   /* hijau segar */
  --accent:    #c97138;   /* aksen oranye terakota */
}
```

## 8. Dark Mode otomatis
Sudah aktif via `@media (prefers-color-scheme: dark)` — mengikuti pengaturan
HP/laptop pengguna. Tweak warnanya di blok `DARK MODE` di `<style>`.

## 9. Konstanta kalkulasi
```js
APP_CONFIG.CALC.DEFAULT_HARI_KERJA    // hari kerja/minggu default
APP_CONFIG.CALC.HARI_PER_BULAN_RT     // 30, dipakai konversi Belanja RT
APP_CONFIG.CALC.DEFAULT_BULAN_PANEN   // 4, default pertanian/peternakan
APP_CONFIG.CALC.MAX_RIWAYAT           // 20, batas data tersimpan
```

## 10. Teks toast & konfirmasi
```js
APP_CONFIG.TEKS.copied             // "📋 Disalin ke clipboard!"
APP_CONFIG.TEKS.saved              // "💾 Tersimpan ke riwayat!"
APP_CONFIG.TEKS.rugiWarning        // pesan peringatan kalau hasil rugi
APP_CONFIG.TEKS.konfirmHapusSemua  // pertanyaan konfirmasi hapus
```

## 11. Banner Pasang PWA
```js
APP_CONFIG.INSTALL_BANNER.title    // "Pasang di HP kamu"
APP_CONFIG.INSTALL_BANNER.delay_ms // 3000 ms (kapan banner muncul)
```

---

## Fitur Baru (di luar APP_CONFIG)

| Fitur | Di mana | Cara kerja |
|---|---|---|
| **KBLI Tag** | Muncul di bawah grid Jenis Usaha saat dipilih | Otomatis dari `kbli` field di config |
| **Warning Rugi** | Muncul di bagian Hasil Kalkulasi | Otomatis kalau Laba/Tahun < 0 |
| **Pekerjaan Responden** | Dropdown di card "Identitas & Periode" | Diisi dari `PEKERJAAN_RESPONDEN` |
| **Dark Mode** | Otomatis dari OS | `prefers-color-scheme: dark` |
| **Export JSON / CSV** | Tombol di tab Riwayat | `exportRiwayat('json' \| 'csv')` |

---

## Bagian yang JARANG Diubah

Setelah `APP_CONFIG` ada `// ===== STATE =====` dan seterusnya — ini logika
perhitungan. **Tidak perlu diubah** kecuali ingin mengganti cara perhitungan.

## Tetap Offline & PWA
- Tidak ada CDN / font eksternal — pakai font sistem.
- `manifest.json`, `icon-192.png`, `sw.js` tetap di folder yang sama (tidak
  diubah dari versi asli Anda).
- Aktivasi pertama butuh internet (Google Apps Script); setelah aktif,
  app jalan 100% offline.
