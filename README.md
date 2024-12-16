# Tugas Besar 2 IF2123 - Aljabar Linear dan Geometri
Tugas besar yang diberikan sebagai salah satu komponen penilaian dari mata kuliah IF2123 Aljabar Linear dan Geometri. Tugas ini memuat implementasi dari Image Retrieval dan Music Information Retrieval menggunakan PCA dan Vektor dalam sebuah website yang mampu menerima dataset, mapper, dan query file.

## Kelompok 14 - Spotifind LEMBANG 🎶

| NIM | Nama           |
| :-------- | :------------------------- |
| 13523018 |  Raka Daffa Iftikhaar |
| 13523074 | Ahsan Malik Al Farisi |
| 13523118 | Farrel Athalla Putra |

### Fitur Utama 🔧
- **Unggah Dataset**: Pengguna dapat mengunggah dataset foto, musik, dan mappernya tersendiri dalam format yang telah ditentukan.
  
- **Page Pagination**: Tampilan musik dan gambar akan dipaginasi untuk menghindari infinite scrolling dan meningkatkan pengalaman pengguna

- **Search Bar**: Pengguna dapat mencari musik yang diinginkan melalui judul atau nama file musik tersebut

- **Query File**: Dapat mencari musik dan foto melalui input file

- **Image Retrieval**: Mencari foto yang sesuai dengan query file

- **Music Information Retrieval**: Mencari musik yang sesuai dengan query file

- **Mapper**: Memasangkan file foto dengan musik dan nama

## Technologies and Frameworks 💻

Tugas besar ini menggunakan technologies, languages, and frameworks:

- **Programming Language(s):** TypeScript, JavaScript
- **Framework(s):** Next.js, React
- **Database:** Prisma with NeonDB
- **Styling:** Tailwind CSS
- **Other Technologies:** Python

## Program Structure 🧩

Berikut adalah struktur program tugas besar ini :
```sh
/Algeo02-23018
├── /backend               # Folder Back End
│   ├── /app               # API Routes untuk mengambil dataset
│   ├── /uploads           # Penyimpanan dataset
│   └── requirements.txt   # Kebutuhan Python
├── /frontend              # Folder Front End
│   ├── /app               # Halaman website utama
│   ├── /components        # Resuable components
│   ├── /public            # Foto yang digunakan di website
├── /test                  # Dataset untuk testing
├── /doc                   # Laporan Tugas Besar
└── README.md              # Dokumentasi projek
```

## Getting Started 🌐
Berikut instruksi instalasi dan penggunaan program

### Prerequisites

Pastikan anda sudah memiliki:
- **Node.js**
- **npm** or **yarn**
- **Python 3.13**

### Installation
1. **Clone repository ke dalam suatu folder**

```bash
  git clone https://github.com/rakadaffa/Algeo02-23018.git
```

2. **Pergi ke directory /Algeo01-23018/backend**

```bash
  cd Algeo01-23044
  cd backend
```

3. **Buat Virtual Environment**

```bash
  python -m venv env
```

4. **Jalankan Virtual Environment**

```bash
  .\env\Scripts\activate
  # atau
  source venv/bin/activate
  # atau
  .\env\bin\activate
```

5. **Install requirements.txt**

```bash
  pip install -r requirements.txt
```

6. **Ubah Intepreter Python dengan yang ada di dalam env**

```bash
  Ctrl+Shift+P -> Python: Select Intepreter -> your-env-path/Scripts/python.exe
```

7. **Jalankan Back End**

```bash
  uvicorn app.main:app --reload
```

8. **Pergi ke directory /Algeo01-23018/frontend dan install kebutuhan website**

```bash
  cd Algeo01-23044
  cd frontend
  npm i --force
```

9. **Buat .env dan masukkan key database**

```bash
  #.env
  DATABASE_URL="your-key-here"
```

10. **Migrasi database**

```bash
  npx prisma migrate dev --name init
```

9. **Jalankan Front End**

```bash
  npm run dev
```
