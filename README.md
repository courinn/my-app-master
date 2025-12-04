**Nama Produk: HoFin (Hotel Finder Yogyakarta)**

**Deskripsi Produk:**
HoFin (Hotel Finder Yogyakarta) adalah aplikasi mobile berbasis React Native (Expo) yang berfungsi sebagai platform pencarian dan ulasan hotel interaktif, yang secara khusus menargetkan wilayah Yogyakarta. Keunggulan utama aplikasi ini terletak pada integrasi penuh fitur berbasis lokasi, real-time database, dan dual-role user (Pengunjung dan Admin).
Aplikasi ini menyediakan dua fitur inti:
1. Peta Interaktif (MapScreen.tsx): Menampilkan lokasi hotel di peta Google Maps dengan filter rating dan fitur pencarian hotel terdekat berdasarkan lokasi pengguna (menggunakan perhitungan Haversine).
2. Daftar Hotel Terstruktur (LokasiScreen.tsx): Menyajikan daftar hotel yang dikelompokkan berdasarkan rating bintang (5, 4, 3) untuk memudahkan pencarian cepat.

**Latar Belakang Pengembangan**
Pengembangan aplikasi HoFin (Hotel Finder Yogyakarta) didasari oleh identifikasi dua kebutuhan utama yang saat ini belum diakomodasi secara optimal oleh platform pencarian hotel yang ada, khususnya di pasar lokal Yogyakarta. Pertama, meskipun platform besar seperti Agoda atau Traveloka menawarkan fitur transaksi dan ketersediaan yang komprehensif, wisatawan sering membutuhkan alat yang lebih ringan, cepat, dan terfokus secara regional yang menjadikan integrasi peta dan lokasi sebagai fitur utamanya. HoFin mengatasi kebutuhan ini dengan memungkinkan pengguna menemukan akomodasi terdekat secara real-time dari lokasi mereka melalui perhitungan jarak Haversine (haversineDistance di gmap.tsx), menjadikan peta interaktif sebagai pusat pengalaman pencarian. Kedua, dan yang menjadi pembeda utama HoFin, adalah model dual-role user. Aplikasi yang tersedia di pasar masih jarang yang secara eksplisit memfasilitasi interaksi dua arah antara wisatawan dan penyedia layanan secara langsung melalui antarmuka yang berbeda. Di satu sisi, Pengunjung dapat memberikan ulasan dan rating dengan mudah tanpa perlu melalui proses registrasi yang rumit (FormInputUlasan.tsx). Di sisi lain, Admin Hotel mendapatkan alat manajemen in-house yang spesifik dan efisien, memungkinkan mereka mengelola data lokasi, rating, deskripsi, dan section informasi hotel secara langsung (FormInputLocation.tsx, FormEditLocation.tsx), tanpa harus bergantung pada antarmuka pihak ketiga yang kompleks. Dengan demikian, HoFin berfokus pada penyediaan solusi terpusat dan terkelola yang memberikan nilai tambah bagi wisatawan melalui konten lokasi yang akurat dan konten yang dihasilkan pengguna, sekaligus memberdayakan administrator lokal dengan alat manajemen data yang efisien.

**Komponen Pembangun Produk:**
1. Halaman Beranda (Home Screen)
Komponen Kunci: index.tsx
Keterangan Fungsional: Menampilkan hero section interaktif, informasi waktu real-time, tombol CTA utama (Peta & Daftar), carousel testimonial, dan tampilan disesuaikan berdasarkan peran pengguna (Admin/Publik).
2. Peta Interaktif (Map)
Komponen Kunci: index.tsx, haversineDistance
Keterangan Fungsional: Menampilkan MapView dengan marker hotel. Menggunakan fungsi Haversine untuk menghitung jarak hotel terdekat dari lokasi pengguna (userLocation) dan memfilter hasilnya.
3. Daftar Hotel Terstruktur (List)
Komponen Kunci: lokasi.tsx
Keterangan Fungsional: Mengambil semua data hotel dari Firebase. Menggunakan SectionList untuk mengelompokkan dan menyortir hotel berdasarkan rating Bintang 5, 4, dan 3.
4. Login Admin
Komponen Kunci: login.tsx, providers/AuthProvider.tsx
Keterangan Fungsional: Menyediakan antarmuka login aman. Mengelola state otentikasi dan status role pengguna, yang memicu tampilan dan akses ke fitur admin di seluruh aplikasi.
5. Tambah Hotel Baru
Komponen Kunci: FormInputLocation.tsx
Keterangan Fungsional: Formulir khusus Admin. Menggunakan expo-location untuk mendapatkan koordinat GPS perangkat. Menyimpan data hotel baru (termasuk sections kustom) ke Firebase dengan operasi push.
6. Edit Hotel
Komponen Kunci: FormEditLocation.tsx
Keterangan Fungsional: Formulir khusus Admin. Mengambil data hotel spesifik berdasarkan ID. Menyediakan rating bintang interaktif dan mekanisme pelacakan dirty state (isDirty) sebelum menyimpan perubahan dengan operasi update.
7. Input Ulasan
Komponen Kunci: FormInputUlasan.tsx
Keterangan Fungsional: Formulir untuk Pengunjung/Pengguna. Mengumpulkan rating dan komentar, lalu menyimpannya sebagai child node di bawah hotel terkait (points/{id}/reviews) di Firebase.

**Sumber Data:** 
Sumber data utama yang digunakan oleh aplikasi HoFin adalah:
1. Firebase Realtime Database (RTDB):
Peran: Bertindak sebagai backend dan sumber kebenaran tunggal (Single Source of Truth).
Data Tersimpan: Data lokasi hotel (nama, koordinat, bintang, alamat, deskripsi, website) disimpan di path /points/.
Data Ulasan: Ulasan Pengunjung disimpan di path bersarang /points/{hotelId}/reviews/.
2. Layanan Pihak Ketiga (API/Layanan):
Google Maps: Digunakan melalui react-native-maps untuk visualisasi peta.
Layanan GPS Perangkat: Digunakan melalui expo-location untuk mendapatkan koordinat pengguna saat ini dan menentukan akurasi (FormInputLocation.tsx, gmap.tsx).

**Tangkapan Layar Komponen Penting Produk:**
![index1](https://github.com/user-attachments/assets/4b829caf-b5e9-409e-b597-832c30fefe3e)
![index2](https://github.com/user-attachments/assets/29529f44-837f-4e41-bd86-927c779b4300)
![index3](https://github.com/user-attachments/assets/afac4582-cc63-41a5-a109-56138ca9afae)
![explore1](https://github.com/user-attachments/assets/6eaefbb4-1dc0-448d-a74f-a9c925233ba1)
![review](https://github.com/user-attachments/assets/0f777834-1c5f-4b0f-8f73-60d0b998bf5b)
![lokasi_user](https://github.com/user-attachments/assets/8106aef6-b13e-40e0-a9dc-d5ec4c0689b9)
![lokasi_admin](https://github.com/user-attachments/assets/694b9e2e-1c90-4b74-bf15-be4a0610d388)
![lokasi_admin2](https://github.com/user-attachments/assets/096c12b0-d715-4975-bb8f-e3f979cb1071)
![gmap1](https://github.com/user-attachments/assets/d83127f0-d071-4c44-9958-5e6afd4410b6)
![gmap2](https://github.com/user-attachments/assets/959d8b2d-043c-4b14-9636-2e4fd75e663b)
![gmap3](https://github.com/user-attachments/assets/3d298fa0-b5ad-40c4-9808-a4f29fa478b5)
![login](https://github.com/user-attachments/assets/a52f07d7-36fd-416b-8ae2-b3301bfd04b1)
![input](https://github.com/user-attachments/assets/4acc2a8f-7e7c-42df-a543-e67d99afc674)
![gmap_admin](https://github.com/user-attachments/assets/93d195bc-1246-442a-bfd7-2c3d2d010b07)
![edit](https://github.com/user-attachments/assets/61ab34e1-9503-4b6b-b66b-e753e936187b)



# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
