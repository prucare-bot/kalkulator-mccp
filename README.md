# Kalkulator Premi MCCP + WhatsApp (Fonnte) + Netlify

Struktur project:

```
.
├── index.html                       # kalkulator (frontend)
├── netlify/functions/send-fonnte.js # backend kirim WA (Netlify Function)
├── netlify.toml
├── package.json
└── .gitignore
```

Token Fonnte **tidak** ditaruh di index.html atau di kode manapun yang ter-commit —
disimpan sebagai Environment Variable di Netlify dan hanya dibaca oleh function
`send-fonnte.js` di sisi server.

## 1. Upload ke GitHub

1. Buat repo baru di https://github.com/new (boleh Private), misal `kalkulator-mccp`.
2. Di komputer, masuk ke folder project ini lalu:
   ```
   git init
   git add .
   git commit -m "Kalkulator premi MCCP + integrasi Fonnte"
   git branch -M main
   git remote add origin https://github.com/USERNAME/kalkulator-mccp.git
   git push -u origin main
   ```
   (Ganti `USERNAME` dan nama repo sesuai punya Anda. Kalau belum pernah pakai git
   dari terminal, cara tercepat: buka repo di GitHub → "Add file" → "Upload files" →
   drag semua isi folder ini.)

## 2. Deploy ke Netlify

1. Masuk https://app.netlify.com → **Add new site** → **Import an existing project**.
2. Pilih **GitHub**, izinkan akses, pilih repo `kalkulator-mccp`.
3. Build settings biarkan default (publish directory `.`, functions directory
   otomatis terbaca dari `netlify.toml`) → **Deploy**.
4. Tunggu deploy selesai, Netlify kasih URL publik (mis. `nama-acak.netlify.app`,
   bisa diganti nama di Site settings → Domain management).

## 3. Ambil token Fonnte

1. Daftar/login di https://fonnte.com, hubungkan nomor WhatsApp yang mau dipakai
   mengirim pesan (scan QR seperti WhatsApp Web).
2. Buka menu **Device** → token API ada di situ (deretan huruf-angka).

## 4. Set Environment Variables di Netlify

Di Netlify: **Site settings → Environment variables → Add a variable**, tambahkan:

| Key | Value | Keterangan |
|---|---|---|
| `FONNTE_TOKEN` | token dari Fonnte | wajib |
| `AGENT_WA_NUMBER` | nomor WA Anda, mis. `6281234567890` | wajib untuk notifikasi lead |

Setelah menambahkan variable, klik **Trigger deploy → Deploy site** supaya
function membaca env var yang baru.

## 5. Selesai

Buka URL Netlify Anda. Alur pengujian:

1. Isi data di kalkulator, premi & syarat medical muncul otomatis.
2. Isi nama (opsional) + nomor WhatsApp calon nasabah di panel "Kirim ke WhatsApp".
3. Klik **Kirim Hasil ke WhatsApp** → nasabah menerima ringkasan simulasi,
   dan nomor `AGENT_WA_NUMBER` menerima notifikasi lead baru.

### Update konten selanjutnya

Setiap kali push perubahan ke branch `main` di GitHub, Netlify otomatis build
ulang dan deploy versi terbaru — tidak perlu upload manual lagi.

### Catatan

- Kuota pengiriman WA mengikuti paket Fonnte yang Anda pakai.
- Nomor pelanggan otomatis dinormalisasi dari `08xx...` menjadi `628xx...` oleh
  function sebelum dikirim ke Fonnte.
- Data premi tetap 100% dari tabel resmi (tanpa interpolasi) — bagian Fonnte
  hanya menambahkan channel pengiriman hasil & notifikasi lead.
