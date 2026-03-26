# Tasty Yummy Absen System

## Struktur file
```
tasty-absen/
├── vercel.json          ← routing config
└── public/
    ├── index.html       ← app absen staff (/)
    └── report.html      ← dashboard Bu Caca (/report)
```

## Deploy ke Vercel

### 1. Install Vercel CLI
```bash
npm install -g vercel
```

### 2. Login
```bash
vercel login
```

### 3. Deploy
```bash
cd tasty-absen
vercel --prod
```

Vercel akan kasih URL seperti: `https://tasty-absen.vercel.app`

### 4. Setelah dapat URL
- Ganti `GANTI_DENGAN_URL_KAMU` di kedua HTML dengan URL Apps Script
- Staff akses: `https://tasty-absen.vercel.app/`
- Bu Caca akses: `https://tasty-absen.vercel.app/report`

## Konfigurasi

### Ganti nama staff
Di `index.html` dan `report.html`, cari:
```js
const STAFF = ['Staff 1', 'Staff 2', 'Staff 3', 'Staff 4', 'Staff 5'];
```
Ganti dengan nama asli staff.

### Ganti password Bu Caca
Password saat ini: `tastyummybakery`

Untuk ganti, generate SHA-256 hash dari password baru:
- Buka browser console (F12)
- Jalankan:
```js
const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('password_baru'));
console.log(Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,'0')).join(''));
```
- Copy hasilnya, paste ke `PASSWORD_HASH` di `report.html`

### Ganti koordinat lokasi
Di `index.html`:
```js
const OFFICE_LAT = -7.812555;
const OFFICE_LNG = 112.067211;
const MAX_RADIUS = 100; // meter
```

### Ganti upah per jam
Bisa langsung dari dashboard Bu Caca — klik tombol "Ubah" di bagian upah.
