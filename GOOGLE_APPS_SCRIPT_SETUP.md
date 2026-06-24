# Panduan Setup Google Apps Script — Sistem Aktivasi SE2026

Panduan ini menjelaskan cara membuat Google Sheet + Apps Script supaya cocok
dengan alur aktivasi yang dipakai oleh `se2026-app-editable.html`. Mengikuti
panduan ini akan memenuhi 3 syarat yang JS sisi-klien harapkan:

1. Endpoint mendukung HTTP **GET** (handler `doGet(e)`)
2. Menerima query params: `action`, `kode`, `device`
3. Mengembalikan **JSON** dengan struktur yang sesuai

---

## 1. Buat Google Sheet (database kode akses)

1. Buka <https://sheets.google.com> → buat spreadsheet baru.
2. Ganti nama tab paling bawah dari "Sheet1" menjadi **`Kode`** (penting — nama
   ini dipakai di script).
3. Isi baris pertama (header) **persis** seperti ini:

| A      | B       | C        | D                  | E          | F        |
|--------|---------|----------|--------------------|------------|----------|
| Kode   | Status  | Device   | TanggalAktivasi    | Catatan    | ExpiresAt|

   • **Kode** — kode akses (huruf besar, mis. `HUTA-001`, `BPS2026A`, dll)
   • **Status** — diisi otomatis oleh script (`belum` / `aktif`)
   • **Device** — diisi otomatis (UA + resolusi layar HP enumerator)
   • **TanggalAktivasi** — diisi otomatis saat kode pertama kali dipakai
   • **Catatan** — bebas (mis. "untuk Pak Budi", "tim Pati", dll)
   • **ExpiresAt** — opsional, format `YYYY-MM-DD`. Kosongkan = tidak expire

4. Isi beberapa kode contoh di kolom A (kolom B–F biarkan kosong):

   ```
   HUTA-001
   HUTA-002
   HUTA-003
   ```

5. Salin **ID spreadsheet** dari URL (bagian setelah `/d/` dan sebelum `/edit`).
   Contoh: `1AbCdEf...XYZ`. Simpan sebentar.

---

## 2. Buat Google Apps Script

1. Di Google Sheet tadi, klik menu **Extensions → Apps Script**.
2. Hapus semua kode default. Tempel kode berikut **persis**:

```javascript
/**
 * Sistem aktivasi kode SE2026 — HUTA CREATIVE STUDIO
 * Endpoint GET dengan query params:
 *   ?action=aktivasi&kode=XXX&device=YYY   → aktifkan kode (sekali pakai)
 *   ?action=cek&kode=XXX&device=YYY        → verifikasi ulang kode milik device
 *
 * Response: JSON sesuai kontrak yang dibaca aplikasi klien.
 */

// === KONFIGURASI ===
const SHEET_NAME = 'Kode';
const TZ = 'Asia/Jakarta';

// Kolom (1-based, sesuai urutan header di Sheet)
const COL = {
  KODE: 1,
  STATUS: 2,
  DEVICE: 3,
  TANGGAL: 4,
  CATATAN: 5,
  EXPIRES: 6
};

function doGet(e) {
if (!e || !e.parameter) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false, 
      message: 'Parameter tidak ditemukan. Harap akses melalui URL Web App.'
    })).setMimeType(ContentService.MimeType.JSON);
  }
  const action = (e.parameter.action || '').toLowerCase();
  const kode   = (e.parameter.kode   || '').trim().toUpperCase();
  const device = (e.parameter.device || '').trim();

  let result;
  try {
    if (action === 'aktivasi') {
      result = aktivasi(kode, device);
    } else if (action === 'cek') {
      result = cek(kode, device);
    } else {
      result = { success: false, message: 'Action tidak dikenal.' };
    }
  } catch (err) {
    result = { success: false, message: 'Error server: ' + err.message };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Aktivasi: kode hanya boleh diklaim satu kali oleh satu device.
 * - Jika kode belum dipakai → set aktif & simpan device, sukses.
 * - Jika kode sudah aktif di device ini → tetap sukses (re-install ok).
 * - Jika kode sudah aktif di device LAIN → tolak.
 * - Jika kode tidak ada / expired → tolak.
 */
function aktivasi(kode, device) {
  if (!kode)   return { success: false, message: 'Kode kosong.' };
  if (!device) return { success: false, message: 'Device tidak teridentifikasi.' };

  const lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    const sheet = getSheet();
    const row = findRowByKode(sheet, kode);
    if (!row) return { success: false, message: 'Kode tidak terdaftar.' };

    const data = sheet.getRange(row, 1, 1, 6).getValues()[0];
    const status      = (data[COL.STATUS - 1]   || '').toString().toLowerCase();
    const deviceLama  = (data[COL.DEVICE - 1]   || '').toString();
    const expiresAt   =  data[COL.EXPIRES - 1];

    if (isExpired(expiresAt)) {
      return { success: false, message: 'Kode sudah kadaluarsa.' };
    }

    if (status === 'aktif') {
      if (deviceLama === device) {
        // Device yang sama -> re-install / buka ulang, boleh.
        return { success: true, message: 'Kode sudah aktif di HP ini.' };
      }
      return { success: false, message: 'Kode sudah dipakai di perangkat lain.' };
    }

    // status 'belum' atau kosong -> klaim sekarang
    sheet.getRange(row, COL.STATUS).setValue('aktif');
    sheet.getRange(row, COL.DEVICE).setValue(device);
    sheet.getRange(row, COL.TANGGAL).setValue(new Date());
    return { success: true, message: 'Aktivasi berhasil.' };

  } finally {
    lock.releaseLock();
  }
}

/**
 * Cek: dipanggil saat app dibuka & online — verifikasi kode masih milik device ini.
 * Return:
 *   { success:true, status:'aktif' }              → device ini boleh masuk
 *   { success:true, status:'belum' }              → kode belum diaktivasi
 *   { success:true, status:'aktif_beda_device' }  → kode dipakai device lain
 *   { success:true, status:'expired' }            → kode kadaluarsa
 *   { success:false, message:'...' }              → kode tidak ada / error
 */
function cek(kode, device) {
  if (!kode) return { success: false, message: 'Kode kosong.' };

  const sheet = getSheet();
  const row = findRowByKode(sheet, kode);
  if (!row) return { success: false, message: 'Kode tidak terdaftar.' };

  const data = sheet.getRange(row, 1, 1, 6).getValues()[0];
  const status     = (data[COL.STATUS - 1] || '').toString().toLowerCase();
  const deviceLama = (data[COL.DEVICE - 1] || '').toString();
  const expiresAt  =  data[COL.EXPIRES - 1];

  if (isExpired(expiresAt)) return { success: true, status: 'expired' };

  if (status !== 'aktif') return { success: true, status: 'belum' };

  if (deviceLama === device) return { success: true, status: 'aktif' };

  return { success: true, status: 'aktif_beda_device' };
}

// ===== Helper =====
function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) throw new Error('Sheet "' + SHEET_NAME + '" tidak ditemukan.');
  return sh;
}

function findRowByKode(sheet, kode) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;
  const kodeList = sheet.getRange(2, COL.KODE, lastRow - 1, 1).getValues();
  for (let i = 0; i < kodeList.length; i++) {
    if ((kodeList[i][0] || '').toString().trim().toUpperCase() === kode) {
      return i + 2; // +2 karena mulai baris 2 (header di baris 1)
    }
  }
  return null;
}

function isExpired(value) {
  if (!value) return false;
  let d;
  if (value instanceof Date) {
    d = value;
  } else {
    d = new Date(value);
  }
  if (isNaN(d.getTime())) return false;
  // Bandingkan dengan akhir hari di TZ Indonesia
  const akhirHari = new Date(d.getTime() + 24 * 60 * 60 * 1000 - 1);
  return new Date() > akhirHari;
}
```

3. Klik ikon **💾 Save** (atau Ctrl+S). Beri nama project mis. *"SE2026
   Aktivasi"*.

---

## 3. Deploy sebagai Web App

1. Di Apps Script editor, klik tombol **Deploy → New deployment** (kanan atas).
2. Klik ikon roda gigi → pilih tipe **Web app**.
3. Isi:
   • **Description** — bebas, mis. *"Endpoint aktivasi SE2026"*
   • **Execute as** — **`Me (email-anda@gmail.com)`** ← wajib
   • **Who has access** — **`Anyone`** ← wajib (supaya tanpa login Google)
4. Klik **Deploy**.
5. Saat muncul minta authorize → klik **Authorize access** → pilih akun Google
   Anda → klik **Advanced → Go to (project name) (unsafe)** → **Allow**.
   (Status "unsafe" wajar karena project Anda sendiri, bukan terverifikasi
   Google.)
6. Setelah selesai, akan muncul **Web app URL**. Bentuknya:
   ```
   https://script.google.com/macros/s/AKfycbz........./exec
   ```
7. **Salin URL ini** → tempelkan ke `APP_CONFIG.ACTIVATION_URL` di file
   `se2026-app-editable.html`.

> **Penting:** Setiap kali Anda mengubah kode Apps Script, deploy ulang dengan
> **Deploy → Manage deployments → ✏️ Edit → New version → Deploy**. URL akan
> **tetap sama** kalau pakai "Edit", tapi akan berubah kalau pakai "New
> deployment".

---

## 4. Test endpoint langsung (sebelum dipakai app)

Buka URL berikut di browser (ganti `URL_ANDA` & ganti `HUTA-001` ke kode di sheet Anda):

**Test aktivasi (sukses pertama kali):**
```
URL_ANDA?action=aktivasi&kode=HUTA-001&device=test-laptop
```
Response harus: `{"success":true,"message":"Aktivasi berhasil."}`

**Test aktivasi lagi (sudah dipakai device lain):**
```
URL_ANDA?action=aktivasi&kode=HUTA-001&device=test-hp-lain
```
Response: `{"success":false,"message":"Kode sudah dipakai di perangkat lain."}`

**Test cek (device yang benar):**
```
?action=cek&kode=HUTA-001&device=test-laptop
```URL_ANDA
Response: `{"success":true,"status":"aktif"}`

**Test cek (device beda):**
```
URL_ANDA?action=cek&kode=HUTA-001&device=test-hp-lain
```
Response: `{"success":true,"status":"aktif_beda_device"}`

**Test kode salah:**
```
URL_ANDA?action=aktivasi&kode=KODE-NGAWUR&device=apapun
```
Response: `{"success":false,"message":"Kode tidak terdaftar."}`

Kalau keempat skenario sudah benar, sistem aktivasi siap dipakai aplikasi.

---

## 5. Cara menambah kode akses baru

Tinggal **tambah baris baru di Sheet** → ketik kode di kolom A → simpan.
Kolom Status/Device/Tanggal akan terisi otomatis saat enumerator mengaktivasi.

Contoh batch awal:

| Kode      | Status | Device | TanggalAktivasi | Catatan          | ExpiresAt  |
|-----------|--------|--------|-----------------|------------------|------------|
| HUTA-001  |        |        |                 | Tim Pati         | 2026-12-31 |
| HUTA-002  |        |        |                 | Tim Rembang      |            |
| HUTA-003  |        |        |                 | Cadangan         |            |

Format `ExpiresAt`: `YYYY-MM-DD` (mis. `2026-12-31`). Kosongkan = berlaku
selamanya.

---

## 6. Cara me-reset kode (kalau enumerator ganti HP)

Di Sheet, di baris kode yang bersangkutan:
1. Hapus isi kolom **Status** (jadi kosong)
2. Hapus isi kolom **Device**
3. Hapus isi kolom **TanggalAktivasi**

Lalu enumerator masuk lagi dengan kode yang sama di HP baru — sistem akan
menerima karena status `belum`.

---

## 7. Pemecahan masalah umum

| Masalah | Penyebab biasanya | Solusi |
|---|---|---|
| Aplikasi tidak bisa aktivasi, error "Gagal menghubungi server" | URL belum di-deploy ulang setelah edit kode, atau access bukan "Anyone" | Deploy ulang dengan Manage deployments → New version. Pastikan Who has access = Anyone. |
| Response 404 / login Google muncul | Deployment "Execute as" tidak diset ke "Me" | Edit deployment, set Execute as = Me, deploy ulang |
| `{"success":false,"message":"Kode tidak terdaftar."}` padahal kode ada | Ada spasi di kode di Sheet, atau kode lowercase di Sheet | Script otomatis trim & uppercase saat compare — pastikan kode di Sheet juga uppercase |
| Kode jadi double-claim | Race condition (sangat jarang) | Script sudah pakai `LockService` 5 detik untuk antri |
| Mau ubah jumlah kolom | Tambah kolom di Sheet | Update objek `COL` di script + getRange(row,1,1,N) sesuai N kolom |

---

## 8. Pasangkan URL ke aplikasi

Setelah Web App URL diperoleh, edit `se2026-app-editable.html`:

```js
const APP_CONFIG = {
  // ...
  ACTIVATION_URL: 'TEMPEL_URL_WEB_APP_DI_SINI',
  // ...
};
```

Lalu refresh aplikasi. Selesai.
