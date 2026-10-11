<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# 📚 Novelku — Dokumentasi Kodebase

**Novelku** adalah platform membaca web novel pribadi yang dibangun dengan **Next.js 16**, **Prisma 7**, **PostgreSQL**, dan **Tailwind CSS v4**. Aplikasi ini menyediakan pengalaman membaca yang bersih, responsif, dan nyaman.

## Stack Teknologi

| Teknologi | Versi | Kegunaan |
|---|---|---|
| Next.js | 16.3.5 | Full-stack React framework (App Router) |
| React | 19.2.8 | UI library |
| Prisma | 7.10.0 | ORM untuk PostgreSQL |
| PostgreSQL | — | Database utama |
| Tailwind CSS | 4.x | Utility-first CSS |
| Zod | 4.x | Validasi schema input |
| bcryptjs | 3.x | Hash password |
| jsonwebtoken | 9.x | JWT auth via cookie HTTP-only |
| lucide-react | 1.x | Icon library |
| pg | 8.x | PostgreSQL driver (untuk Prisma adapter) |

---

## Struktur Direktori

```
novelku/
├── prisma/
│   └── schema.prisma          # Skema database Prisma
├── src/
│   ├── app/                   # Next.js App Router (halaman & API routes)
│   │   ├── layout.tsx         # Root layout aplikasi
│   │   ├── page.tsx           # Halaman beranda (homepage)
│   │   ├── globals.css        # Global CSS (Tailwind)
│   │   ├── admin/             # Halaman panel admin
│   │   ├── api/               # API Routes (backend)
│   │   ├── bookmarks/         # Halaman bookmark user
│   │   ├── chapters/[id]/     # Halaman reader chapter
│   │   ├── history/           # Halaman riwayat baca
│   │   ├── login/             # Halaman login
│   │   ├── novels/            # Halaman katalog & detail novel
│   │   └── register/          # Halaman registrasi
│   ├── components/            # Reusable React components
│   ├── context/               # React Context (global state)
│   ├── generated/prisma/      # Prisma Client yang di-generate (jangan edit manual)
│   ├── lib/                   # Utility functions & server-side helpers
│   └── types/                 # TypeScript type definitions
```

---

## Skema Database

> **File:** [`prisma/schema.prisma`](prisma/schema.prisma)

Database PostgreSQL dengan 9 model utama:

### Model

| Model | Tabel DB | Deskripsi |
|---|---|---|
| `User` | `users` | Pengguna platform (role: USER / ADMIN) |
| `Novel` | `novels` | Data novel (judul, penulis, cover, status, rating) |
| `Genre` | `genres` | Kategori/genre novel |
| `NovelGenre` | `novel_genres` | Tabel pivot many-to-many Novel ↔ Genre |
| `Chapter` | `chapters` | Isi chapter novel |
| `Comment` | `comments` | Komentar user pada novel |
| `Like` | `likes` | Like user pada novel (unik per user-novel) |
| `Rating` | `ratings` | Rating bintang 1-5 per user per novel (unik) |
| `Bookmark` | `bookmarks` | Daftar favorit/bookmark user (unik per user-novel) |
| `ReadingHistory` | `reading_histories` | Riwayat chapter terakhir yang dibaca per user |

### Enum

- **`Role`**: `USER` | `ADMIN`
- **`NovelStatus`**: `ONGOING` | `COMPLETED` | `HIATUS`

---

## Dokumentasi File

---

### `src/lib/prisma.ts`

Singleton Prisma Client untuk koneksi database PostgreSQL.

- Menggunakan **Prisma 7** dengan **driver adapter** `PrismaPg` (package `@prisma/adapter-pg`).
- Koneksi menggunakan `pg.Pool` yang terhubung ke `DATABASE_URL` dari environment variable.
- Pola singleton mencegah pembuatan koneksi baru setiap hot-reload di development.

**Export:**
- `prisma` — instance `PrismaClient` yang siap dipakai di API routes.

---

### `src/lib/auth.ts`

Modul autentikasi server-side: hashing password, JWT, dan cookie session.

**Fungsi:**

| Fungsi | Deskripsi |
|---|---|
| `hashPassword(password)` | Hash password dengan bcrypt (12 salt rounds) |
| `comparePassword(password, hash)` | Bandingkan password plain dengan hash |
| `generateToken(payload)` | Buat JWT dengan payload `{userId, role}`, expired 7 hari |
| `verifyToken(token)` | Verifikasi JWT dan kembalikan payload atau `null` |
| `setAuthCookie(token)` | Simpan JWT ke cookie HTTP-only `novelku_token` |
| `removeAuthCookie()` | Hapus cookie autentikasi |
| `getAuthToken()` | Ambil token dari cookie request |
| `getCurrentUser()` | Ambil data user aktif dari cookie + DB |

**Interface:**
- `JwtPayload` — `{ userId: number; role: string }`

---

### `src/lib/auth-guard.ts`

Guard/middleware untuk proteksi API routes.

**Fungsi:**

| Fungsi | Deskripsi |
|---|---|
| `requireAuth()` | Pastikan user sudah login; kembalikan `{user, error}` |
| `requireAdmin()` | Pastikan user adalah ADMIN; kembalikan `{user, error}` |

Jika tidak memenuhi syarat, field `error` berisi `NextResponse` siap-kirim (401 atau 403).

---

### `src/lib/api-response.ts`

Helper untuk membuat respons API yang konsisten.

**Interface:**
- `ApiSuccessResponse<T>` — `{ success: true; data: T }`
- `ApiErrorResponse` — `{ success: false; message: string }`

**Fungsi:**

| Fungsi | Status | Deskripsi |
|---|---|---|
| `successResponse(data, status?)` | 200 | Respons sukses |
| `createdResponse(data)` | 201 | Respons data baru dibuat |
| `errorResponse(message, status?)` | 400 | Respons error generic |
| `unauthorizedResponse(message?)` | 401 | Tidak terautentikasi |
| `forbiddenResponse(message?)` | 403 | Tidak punya izin |
| `notFoundResponse(message?)` | 404 | Data tidak ditemukan |
| `conflictResponse(message?)` | 409 | Konflik data |
| `serverErrorResponse(message?)` | 500 | Internal server error |

---

### `src/lib/api-client.ts`

Client HTTP terpusat untuk semua fetch dari frontend ke API Routes Next.js.

- Menggunakan `credentials: 'same-origin'` agar cookie HTTP-only terkirim otomatis.
- Melempar `ApiError` (custom class dengan `.status`) jika respons tidak OK.
- Mendukung `FormData` (otomatis tidak menyetel header `Content-Type`).

**API Modules yang diekspor:**

| Module | Endpoint | Operasi |
|---|---|---|
| `authApi` | `/api/auth/*` | `register`, `login`, `logout`, `me` |
| `novelApi` | `/api/novels/*` | `list`, `updates`, `get`, `create`, `update`, `delete` |
| `genreApi` | `/api/genres/*` | `list`, `create`, `update`, `delete` |
| `chapterApi` | `/api/chapters/*` | `listByNovel`, `get`, `create`, `update`, `delete` |
| `commentApi` | `/api/novels/:id/comments` | `listByNovel`, `create`, `delete` |
| `likeApi` | `/api/novels/:id/like` | `like`, `unlike` |
| `ratingApi` | `/api/novels/:id/rating` | `rate` |
| `bookmarkApi` | `/api/bookmarks`, `/api/novels/:id/bookmark` | `list`, `add`, `remove` |
| `historyApi` | `/api/history`, `/api/chapters/:id/history` | `list`, `record` |
| `adminApi` | `/api/admin/*` | `dashboard`, `users`, `updateUserStatus`, `comments`, `deleteComment` |

**Interface:**
- `NovelQueryParams` — parameter filter/sort/paginate untuk `novelApi.list()`
- `ApiError` — class error dengan `.status` HTTP code

---

### `src/lib/utils.ts`

Kumpulan utility functions yang dipakai di frontend maupun backend.

| Fungsi | Deskripsi |
|---|---|
| `generateSlug(text)` | Konversi teks ke URL-friendly slug (huruf kecil, tanda hubung) |
| `countWords(text)` | Hitung jumlah kata dalam teks |
| `parsePagination(searchParams)` | Parse query `page` & `limit` menjadi `{page, limit, skip}` |
| `buildPaginationMeta(total, page, limit)` | Buat metadata pagination `{total, page, limit, totalPages, hasNext, hasPrev}` |
| `formatRelativeTime(date)` | Format tanggal ke waktu relatif dalam bahasa Indonesia (misal: "10 menit", "2 hari") |
| `formatImageUrl(url)` | Konversi link Google Drive ke URL CDN langsung (`lh3.googleusercontent.com`) |

---

### `src/lib/validations/`

Schema validasi Zod untuk seluruh input API.

| File | Schema yang diekspor |
|---|---|
| `auth.ts` | `registerSchema`, `loginSchema`, `RegisterInput`, `LoginInput` |
| `novel.ts` | `createNovelSchema`, `updateNovelSchema`, `CreateNovelInput`, `UpdateNovelInput` |
| `genre.ts` | Schema untuk CRUD genre |
| `chapter.ts` | Schema untuk CRUD chapter |
| `comment.ts` | Schema untuk komentar |
| `rating.ts` | Schema untuk rating (nilai 1–5) |
| `index.ts` | Re-export semua schema dari sub-file |

**Aturan validasi utama:**
- `username`: 3–50 karakter, hanya huruf/angka/underscore
- `email`: format email valid, maks 255 karakter
- `password`: 8–100 karakter
- `title` novel: maks 255 karakter
- `coverImage`: URL valid (opsional)
- `status` novel: `ONGOING` | `COMPLETED` | `HIATUS`

---

### `src/types/index.ts`

Definisi TypeScript types/interface yang dipakai di seluruh aplikasi (frontend & shared).

**Types utama:**

| Interface | Deskripsi |
|---|---|
| `UserResponse` | Data user dari API (tanpa password) |
| `NovelResponse` | Detail lengkap novel |
| `NovelListResponse` | Versi ringkas novel untuk list/katalog |
| `UpdatedNovelResponse` | Novel update (extends `NovelListResponse` + chapter terbaru) |
| `NovelUpdateChapter` | Data chapter singkat untuk kartu update |
| `GenreResponse` | Data genre |
| `ChapterResponse` | Detail chapter (termasuk `content`) |
| `ChapterListResponse` | Ringkasan chapter untuk daftar (tanpa `content`) |
| `CommentResponse` | Komentar beserta data user penulis |
| `LikeResponse` | Data like |
| `RatingResponse` | Data rating (+ `averageRating` & `ratingCount` opsional) |
| `BookmarkResponse` | Data bookmark (+ data novel opsional) |
| `ReadingHistoryResponse` | Riwayat baca (+ data novel & chapter opsional) |
| `PaginationMeta` | Metadata paginasi |
| `PaginatedResponse<T>` | Wrapper `{ items: T[]; pagination: PaginationMeta }` |
| `DashboardStats` | Statistik ringkasan untuk admin dashboard |

---

### `src/context/auth-context.tsx`

React Context untuk manajemen state autentikasi global di sisi frontend.

- Sinkronisasi dengan session backend melalui `/api/auth/me` saat aplikasi dimuat.
- Menyediakan `useAuth()` hook untuk digunakan di seluruh komponen.

**Context value (`AuthContextType`):**

| Field/Method | Deskripsi |
|---|---|
| `user` | Data user yang sedang login (`UserResponse \| null`) |
| `isLoading` | Status loading saat cek session |
| `login(credentials)` | Login dan simpan user ke state |
| `register(credentials)` | Registrasi dan otomatis login |
| `logout()` | Logout dan clear user state |
| `refreshUser()` | Re-fetch user dari server (`/api/auth/me`) |

---

## Halaman (Pages)

---

### `src/app/layout.tsx`

Root layout aplikasi Next.js.

- Font: **Geist Sans** dan **Geist Mono** (dari `next/font/google`).
- Metadata SEO: title template `%s | Novelku`, OpenGraph, Twitter card.
- Wrapping seluruh aplikasi dengan: `AuthProvider` → `Navbar` → `main` → `Footer`.
- Bahasa HTML: `id` (Indonesia).

---

### `src/app/globals.css`

Stylesheet global aplikasi.

- Import Tailwind CSS v4 (`@import "tailwindcss"`).
- Mendefinisikan CSS variables `--background` dan `--foreground` untuk light/dark mode.
- Mendukung `prefers-color-scheme: dark` secara native.
- Font fallback: `Arial, Helvetica, sans-serif`.

---

### `src/app/page.tsx` — Beranda (Homepage)

Halaman utama aplikasi (`/`).

**Fitur:**
1. **Hero section** — Judul, deskripsi, search bar, dan tag genre populer.
2. **Lanjutkan Membaca** — Ditampilkan hanya jika user login dan punya riwayat baca.
3. **Novel Terbaru** — Grid 8 novel terbaru berdasarkan `createdAt`.
4. **Novel Populer** — Grid 6 novel dengan `viewCount` tertinggi.
5. **Novel Update** — Daftar novel yang baru mendapat chapter baru.
6. **Jelajah Genre** — Daftar semua genre sebagai tag yang bisa diklik.

**State:** `latestNovels`, `updatedNovels`, `popularNovels`, `genres`, `recentHistory`, `isLoading`, `searchQuery`

---

### `src/app/novels/page.tsx` — Katalog Novel

Halaman katalog lengkap dengan filter dan paginasi (`/novels`).

**Fitur:**
- Search berdasarkan judul novel.
- Filter genre (dropdown dari API).
- Filter status rilis (`ONGOING` / `COMPLETED` / `HIATUS`).
- Sorting: Terbaru, Paling Banyak Dilihat, Rating Tertinggi, Judul A-Z.
- Filter tersimpan di URL query params (shareable & navigable).
- Skeleton loading dan empty state.
- Paginasi dengan komponen `Pagination`.

---

### `src/app/novels/[id]/page.tsx` — Detail Novel

Halaman detail novel dengan ID dinamis (`/novels/:id`).

**Fitur:**
1. Hero dengan cover, judul, penulis, genre, status, statistik (rating, chapter, views).
2. Sinopsis/deskripsi.
3. Tombol **Mulai Baca**, **Favorit** (bookmark toggle), **Suka** (like toggle).
4. `RatingWidget` — beri rating bintang 1–5.
5. Daftar chapter dengan search chapter.
6. `CommentSection` — komentar dengan paginasi.

---

### `src/app/chapters/[id]/page.tsx` — Reader Chapter

Halaman membaca chapter (`/chapters/:id`). Navbar dan Footer disembunyikan di halaman ini.

**Fitur:**
- **Reader Header** sticky — tombol kembali ke novel, judul chapter, pengaturan, daftar chapter.
- **Pengaturan tampilan** (tersimpan di `localStorage`):
  - Tema: Terang / Sepia / Gelap
  - Ukuran font: Kecil / Normal / Besar / Ekstra
  - Spasi baris: Rapat / Sedang / Renggang
  - Lebar area baca: Sempit / Sedang / Lebar
- **Drawer daftar chapter** — slide-in dari kanan.
- **Render konten chapter** — mendukung paragraf teks, `![alt](url)` Markdown image, dan link langsung Google Drive/gambar.
- Navigasi Chapter Sebelumnya / Selanjutnya.
- **Mobile floating toolbar** di bagian bawah layar.
- Otomatis catat riwayat baca (`historyApi.record`) jika user login.

---

### `src/app/bookmarks/page.tsx` — Novel Favorit

Halaman daftar bookmark user (`/bookmarks`). Memerlukan login.

**Fitur:**
- Redirect ke login jika belum autentikasi.
- Daftar novel yang di-bookmark dengan cover, judul, penulis, statistik.
- Tombol hapus bookmark.
- Paginasi via URL query `?page=`.

---

### `src/app/history/page.tsx` — Riwayat Membaca

Halaman riwayat membaca user (`/history`). Memerlukan login.

**Fitur:**
- Redirect ke login jika belum autentikasi.
- Daftar chapter terakhir yang dibaca beserta novel-nya.
- Timestamp terakhir dibaca.
- Tombol "Lanjutkan Membaca" langsung ke chapter tersebut.
- Paginasi via URL query `?page=`.

---

### `src/app/login/page.tsx` — Halaman Login

Halaman masuk akun (`/login`).

**Fitur:**
- Form email + password dengan validasi client-side.
- Toggle tampilkan/sembunyikan password.
- Pesan error inline.
- Support `?redirect=` query param — setelah login user diarahkan ke URL asal.
- Admin di-redirect ke `/admin`, user biasa ke beranda.

---

### `src/app/register/page.tsx` — Halaman Registrasi

Halaman daftar akun baru (`/register`).

**Fitur:**
- Form: username, email, password, konfirmasi password.
- Validasi client-side lengkap (format, panjang karakter, konfirmasi password cocok).
- Toggle tampilkan/sembunyikan password.
- Setelah berhasil, user langsung login dan di-redirect ke beranda.

---

## Panel Admin

---

### `src/app/admin/layout.tsx` — Layout Admin

Layout khusus untuk seluruh halaman di `/admin`.

**Fitur:**
- Proteksi akses: hanya user dengan `role === 'ADMIN'` yang bisa masuk.
- Menampilkan 403 Forbidden page jika bukan admin.
- Sidebar navigasi (Desktop) dengan item: Dashboard, Kelola Novel, Kelola Genre, Kelola Pengguna, Moderasi Komentar.
- Drawer sidebar mobile (slide-in dari kiri).
- Mobile header bar dengan tombol buka sidebar.

---

### `src/app/admin/page.tsx` — Dashboard Admin

Halaman utama panel admin (`/admin`).

**Fitur:**
- Grid 6 kartu statistik: Total Pengguna, Novel, Chapter, Suka, Komentar, Rating.
- Quick actions: Kelola Novel, Kelola Genre, Kelola Pengguna, Moderasi Komentar.
- Data diambil dari `/api/admin/dashboard`.

---

### `src/app/admin/novels/page.tsx` — Kelola Novel

Halaman manajemen novel untuk admin (`/admin/novels`).

**Fitur:**
- Tabel novel dengan: cover, judul, penulis, genre, status, jumlah chapter, views, rating.
- Search novel berdasarkan judul.
- Modal **Tambah Novel** dan **Edit Novel** dalam satu komponen.
- Soft-delete novel (dengan konfirmasi).
- Navigasi ke halaman kelola chapter per novel.
- Live preview cover image (mendukung Google Drive URL).

---

### `src/app/admin/novels/[id]/chapters/page.tsx`

Halaman kelola chapter untuk satu novel (`/admin/novels/:id/chapters`).
- CRUD chapter: tambah, edit, hapus.
- Upload chapter via file `.txt`.

---

### `src/app/admin/genres/page.tsx`

Halaman kelola genre (`/admin/genres`).
- CRUD genre: tambah, edit, hapus.

---

### `src/app/admin/users/page.tsx`

Halaman kelola pengguna (`/admin/users`).
- Daftar user dengan search.
- Toggle status aktif/nonaktif akun user.

---

### `src/app/admin/comments/page.tsx`

Halaman moderasi komentar (`/admin/comments`).
- Daftar semua komentar dari seluruh novel.
- Hapus komentar yang melanggar.

---

## Komponen (Components)

---

### `src/components/navbar.tsx`

Navigasi utama aplikasi (sticky top). **Disembunyikan** di halaman `/admin/*` dan `/chapters/*`.

**Fitur:**
- Logo dengan link ke beranda.
- Search bar (desktop & mobile).
- Link navigasi: Katalog, Favorit, Riwayat, Admin Panel (jika ADMIN).
- Dropdown menu user dengan username, role badge, dan tombol logout.
- Menu hamburger untuk mobile.
- Highlight link aktif berdasarkan `pathname`.

---

### `src/components/footer.tsx`

Footer aplikasi. **Disembunyikan** di halaman `/admin/*` dan `/chapters/*`.

**Isi:** Logo, deskripsi singkat, link Jelajah (Katalog, Favorit, Riwayat), link Akun (Masuk, Daftar), copyright.

---

### `src/components/novel-card.tsx`

Kartu novel untuk tampilan grid di katalog dan beranda.

**Props:** `novel: NovelListResponse`

**Tampilan:**
- Cover image dengan lazy load (fallback ikon BookOpen jika tidak ada).
- Badge status (Berjalan / Tamat / Hiatus) di pojok kiri atas.
- Overlay rating bintang di pojok kanan bawah.
- Genre badges (maks 2, lebih dari itu ditampilkan `+N`).
- Judul, nama penulis, total chapter, view count.
- Hover effect scale-up gambar + shadow.

---

### `src/components/novel-update-card.tsx`

Kartu novel untuk section "Novel Update" di beranda.

**Props:** `novel: UpdatedNovelResponse`

**Tampilan:**
- Cover besar (menggunakan `NovelCover`).
- Badge **UP** merah + judul novel.
- Daftar chapter terbaru (menggunakan `NovelChapterList`).

---

### `src/components/novel-cover.tsx`

Komponen cover novel dengan aspect ratio portrait 3:4 dan fallback konsisten.

**Props:** `src`, `alt`, `className?`, `imgClassName?`

- Lazy load gambar.
- Fallback: ikon `BookOpen` + teks `alt` jika tidak ada gambar.
- Mendukung `formatImageUrl` untuk konversi Google Drive.

---

### `src/components/novel-chapter-list.tsx`

Wrapper daftar chapter terbaru untuk kartu Novel Update.

**Props:** `chapters: NovelUpdateChapter[]`

- Merender daftar `NovelChapterItem`.
- Return `null` jika array kosong.

---

### `src/components/novel-chapter-item.tsx`

Satu baris chapter yang dapat diklik di daftar update.

**Props:** `chapter: NovelUpdateChapter`

- Menampilkan judul chapter (kiri) dan waktu update relatif (kanan).
- Link ke `/chapters/:id`.
- Menggunakan `formatRelativeTime()` untuk waktu relatif.

---

### `src/components/comment-section.tsx`

Seksi komentar di halaman detail novel.

**Props:** `novelId: number`

**Fitur:**
- Tampilkan daftar komentar dengan paginasi (10 per halaman).
- Form tambah komentar (hanya untuk user yang login).
- Tombol hapus komentar (untuk penulis komentar atau ADMIN).
- Skeleton loading dan empty state.
- Counter karakter (maks 2000).

---

### `src/components/rating-widget.tsx`

Widget bintang rating untuk halaman detail novel.

**Props:** `novelId`, `averageRating`, `ratingCount`, `onRatingUpdated`

**Fitur:**
- Tampilkan 5 bintang interaktif dengan hover effect.
- User yang belum login diarahkan untuk masuk terlebih dahulu.
- Rating dikirim ke `/api/novels/:id/rating`.
- Setelah submit, `onRatingUpdated` dipanggil dengan nilai rata-rata baru dari server.

---

### `src/components/pagination.tsx`

Komponen paginasi yang bisa dipakai ulang.

**Props:** `currentPage`, `totalPages`, `onPageChange`

- Tidak dirender jika `totalPages <= 1`.
- Menampilkan maks 5 nomor halaman sekaligus dengan elipsis (`...`).
- Tombol navigasi Sebelumnya / Selanjutnya dengan disable state.

---

## API Routes

Semua API routes mengikuti konvensi respons `{ success: true, data: ... }` atau `{ success: false, message: ... }`.

---

### Auth API

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| `POST` | `/api/auth/register` | — | Registrasi user baru, set cookie JWT |
| `POST` | `/api/auth/login` | — | Login, set cookie JWT |
| `POST` | `/api/auth/logout` | — | Hapus cookie JWT |
| `GET` | `/api/auth/me` | Cookie | Kembalikan data user aktif |

---

### Novels API

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| `GET` | `/api/novels` | — | List novel (filter, sort, paginate) |
| `POST` | `/api/novels` | ADMIN | Buat novel baru |
| `GET` | `/api/novels/:id` | — | Detail novel + daftar chapter |
| `PUT` | `/api/novels/:id` | ADMIN | Update novel |
| `DELETE` | `/api/novels/:id` | ADMIN | Hapus novel |
| `GET` | `/api/novels/updates` | — | Novel yang baru update chapter |
| `GET` | `/api/novels/:id/chapters` | — | Daftar chapter novel |
| `POST` | `/api/novels/:id/chapters` | ADMIN | Tambah chapter |
| `GET` | `/api/novels/:id/comments` | — | Daftar komentar novel |
| `POST` | `/api/novels/:id/comments` | User | Tambah komentar |
| `POST` | `/api/novels/:id/like` | User | Like novel |
| `DELETE` | `/api/novels/:id/like` | User | Unlike novel |
| `POST` | `/api/novels/:id/rating` | User | Beri/update rating (1-5) |
| `POST` | `/api/novels/:id/bookmark` | User | Tambah bookmark |
| `DELETE` | `/api/novels/:id/bookmark` | User | Hapus bookmark |

---

### Chapters API

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| `GET` | `/api/chapters/:id` | — | Detail chapter (+ data novel) |
| `PUT` | `/api/chapters/:id` | ADMIN | Update chapter |
| `DELETE` | `/api/chapters/:id` | ADMIN | Hapus chapter |
| `POST` | `/api/chapters/:id/history` | User | Catat riwayat baca |

---

### Genre API

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| `GET` | `/api/genres` | — | Daftar semua genre |
| `POST` | `/api/genres` | ADMIN | Buat genre baru |
| `PUT` | `/api/genres/:id` | ADMIN | Update genre |
| `DELETE` | `/api/genres/:id` | ADMIN | Hapus genre |

---

### Bookmarks & History API

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| `GET` | `/api/bookmarks` | User | Daftar bookmark user (paginasi) |
| `GET` | `/api/history` | User | Riwayat baca user (paginasi) |

---

### Admin API

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| `GET` | `/api/admin/dashboard` | ADMIN | Statistik platform |
| `GET` | `/api/admin/users` | ADMIN | Daftar semua user (search, paginate) |
| `PATCH` | `/api/admin/users/:id/status` | ADMIN | Toggle status aktif user |
| `GET` | `/api/admin/comments` | ADMIN | Semua komentar (paginate) |
| `DELETE` | `/api/admin/comments/:id` | ADMIN | Hapus komentar |

---

## Pola & Konvensi Penting

### Autentikasi
- Autentikasi menggunakan **JWT yang disimpan di cookie HTTP-only** (`novelku_token`, 7 hari).
- Di frontend: state user dikelola oleh `AuthContext`, disinkronkan saat mount via `/api/auth/me`.
- Di API routes: gunakan `requireAuth()` atau `requireAdmin()` dari `auth-guard.ts`.

### Respons API
- **Selalu** gunakan helper dari `api-response.ts` untuk konsistensi format.
- Frontend `api-client.ts` mengekstrak `data.data` dari wrapper respons secara otomatis.

### Paginasi
- Parse query string dengan `parsePagination()` (dari `utils.ts`).
- Default: `page=1`, `limit=20`, maks `limit=100`.
- Kembalikan metadata dengan `buildPaginationMeta()`.

### Cover Image
- Mendukung link Google Drive (share link maupun open link).
- `formatImageUrl()` otomatis mengkonversi ke CDN `lh3.googleusercontent.com`.

### Slug
- Novel dan genre memiliki `slug` yang di-generate dari judul/nama dengan `generateSlug()`.
- Jika slug sudah ada, suffix `-{timestamp}` ditambahkan untuk uniqueness.

### Proteksi Halaman Admin
- Dilakukan di `src/app/admin/layout.tsx` (client-side) — bukan middleware.
- User bukan ADMIN akan melihat halaman 403 Forbidden.
