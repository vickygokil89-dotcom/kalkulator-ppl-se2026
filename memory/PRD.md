# Kalkulator Usaha SE2026 — PRD

## Original Problem Statement
Aplikasi offline single-file HTML untuk petugas BPS (enumerator Sensus Ekonomi 2026) yang membantu menghitung omzet, biaya operasional (Rincian 26.a-e), nilai aset (Rincian 28), dan belanja rumah tangga responden. Aplikasi harus mudah didistribusikan via WhatsApp/WebView ke HP enumerator dan dapat diedit pemilik dengan mudah.

## User Persona
- **Primary**: Petugas BPS / Enumerator SE2026 (offline-first, HP Android).
- **Secondary**: Admin/Pemilik (HUTA CREATIVE STUDIO) — distribusi via Google Apps Script activation.

## Architecture (Single File App)
- **Source of truth**: `/app/se2026-app-editable.html` (Vanilla JS, ~3600 lines)
- **Live preview mirror**: `/app/frontend/public/se2026-app.html` (WAJIB sync setelah edit)
- **Frontend scaffold**: `/app/frontend/src/App.js` redirect ke `/se2026-app.html`
- **Storage**: LocalStorage (`se2026_respondenDB`, `se2026_riwayat`)
- **Backend**: Google Apps Script (aktivasi kode)

## Core Data Schema (LocalStorage)
```
respondenDB[key] = {
  _key, nama, waktuPertama, waktuUpdate,
  pekerjaan, jenis, kbli,
  kalkulator: {..., items26B/C/D/E, r26a..r26f, r26total},
  rincian26: { a,b,c,d,e,total, itemsA,B,C,D,E, b_bulan..e_bulan, nKaryawan, gajiPerOrang, jamsosPerOrang, thrPerOrang },
  rincian28: {...},
  belanjaRT: { makanan, nonmakanan, tahunan }
}
```

## Implemented Features (✓ Completed)
- [2026-02] Refactor static HTML dengan `APP_CONFIG` terpusat
- [2026-02] 6 jenis usaha baru + KBLI auto-tags
- [2026-02] Green UI theme
- [2026-02] React preview redirect ke static HTML
- [2026-02] Activation "by HUTA CREATIVE STUDIO" + Apps Script URL
- [2026-02] Merge custom code: Aset Tab + Structured Belanja RT
- [2026-02] Edit Riwayat → reload data ke form asal
- [2026-02] Respondent-based schema (Nama = Primary Key, auto-merge)
- [2026-02] Rincian 26.a-e dipindah ke Tab Kalkulator
- [2026-02] Salin Nominal (strip titik untuk paste ke FASIH)
- [2026-02] Yearly scaling ×12 untuk 26.b-e
- [2026-02] Wide-format CSV export (37+ kolom)
- [2026-02] **Bug fix: `mulaiRespondenBaru()` reset bersih semua list & state 26.b-e** ✓ TESTED
- [2026-02] **Bug fix: Rincian 26.b-e ikut tersimpan ke Riwayat + auto-merge ke `rincian26` slot + restore saat Edit Riwayat** ✓ TESTED

## Backlog / Roadmap

### P1
- Import JSON antar device enumerator

### P2
- Quick Search di Tab Riwayat
- Auto-save draft ke LocalStorage
- Geo-tagging via `navigator.geolocation`
- Status flag per entry: Draft / Final

## Key Files
| File | Purpose |
|------|---------|
| `/app/se2026-app-editable.html` | Sumber kebenaran (single file) |
| `/app/frontend/public/se2026-app.html` | Mirror untuk preview (WAJIB sync) |
| `/app/EDIT_GUIDE.md` | Panduan edit konfigurasi |
| `/app/GOOGLE_APPS_SCRIPT_SETUP.md` | Setup backend aktivasi |
| `/app/frontend/src/App.js` | Redirect minimal |

## Critical Rules
1. JANGAN split file HTML ke multi-file
2. Setelah edit `/app/se2026-app-editable.html`, WAJIB sync ke `/app/frontend/public/se2026-app.html`
3. Rincian 26.b-e: input bulanan, subtotal ditampilkan tahunan (×12)
4. Laba Bersih = Omzet/Tahun − Total 26.f (tahunan)
5. `simpanRiwayat()` di Kalkulator HARUS menulis ke 2 tempat: (a) `riwayat[]` array, (b) `respondenDB[key].rincian26` slot
