# Rodinya Case - Media Library Backend

NestJS + MongoDB Atlas + JWT (Access/Refresh) + Swagger ile kimlik doğrulama, kaynak-bazlı yetkilendirme ve medya yönetimi içeren REST API.

## Teknolojiler

- **NestJS** - Backend framework
- **MongoDB Atlas** - Veritabanı (Mongoose ODM)
- **JWT** - Kimlik doğrulama (Access + Refresh Token)
- **Swagger** - API dokümantasyonu (OpenAPI)
- **Multer** - Dosya yükleme
- **sharp** - Image sanitization (decode + re-encode)
- **Docker** - Containerization

## Güvenlik Özellikleri

- **Image Sanitization Pipeline** - 4 katmanlı dosya doğrulama: MIME/uzantı kontrolü → magic number (FF D8 FF) → sharp ile decode → re-encode (metadata, trailing data, polyglot payload temizlenir)
- **bcrypt 72-Byte Truncation Fix** - JWT tokenlar SHA-256 ile pre-hash edilerek bcrypt'in 72-byte kesme sorununa karşı korunur
- **Path Traversal Koruması** - Dosya indirme isteklerinde uploads dizini dışına çıkma engeli
- **Rate Limiting** - Brute force koruması (login/register: 5 istek/dk, genel: 10 istek/dk)
- **Refresh Token Rotation** - Her refresh'te yeni token, eski token DB'de invalidate; eski token tekrar kullanılırsa tüm oturumlar sonlandırılır
- **Session Version** - Login/logout'ta tüm eski access token'lar anında geçersiz
- **Request Logging** - Her istek için userId, endpoint, status code ve süre loglanır

## Docker ile Çalıştırma (Önerilen)

```bash
# .env dosyasını oluştur ve MongoDB Atlas URI'sini gir
cp .env.example .env

# Tek komutla çalıştır
docker compose up --build

# Arka planda çalıştır
docker compose up --build -d

# Durdur
docker compose down
```

> **Not:** `.env` dosyasındaki `MONGO_URI` değerini kendi MongoDB Atlas bağlantı bilgilerinizle güncellemeniz gerekmektedir.

## Kurulum (Docker'sız)

```bash
# Bağımlılıkları yükle
npm install

# .env dosyasını oluştur
cp .env.example .env
# .env dosyasını kendi değerlerinle düzenle
```

## Ortam Değişkenleri (.env)

| Değişken | Açıklama | Varsayılan |
|---|---|---|
| `MONGO_URI` | MongoDB Atlas bağlantı URI'si | - |
| `JWT_ACCESS_SECRET` | Access token gizli anahtarı | - |
| `JWT_REFRESH_SECRET` | Refresh token gizli anahtarı | - |
| `UPLOAD_DIR` | Dosya yükleme dizini | `./uploads` |
| `MAX_FILE_SIZE` | Maksimum dosya boyutu (byte) | `5242880` (5MB) |
| `PORT` | Uygulama portu | `3000` |

## Çalıştırma

```bash
# Geliştirme (watch mode)
npm run start:dev

# Üretim derlemesi
npm run build
npm run start:prod
```

## API Dokümantasyonu

Uygulama çalışırken Swagger UI'ya erişin:

```
http://localhost:3000/api/docs
```

## REST Uç Noktaları

### Auth
| Metod | Yol | Açıklama |
|---|---|---|
| POST | `/auth/register` | Yeni kullanıcı kaydı |
| POST | `/auth/login` | Kullanıcı girişi |
| POST | `/auth/refresh` | Token yenileme (rotation) |
| POST | `/auth/logout` | Çıkış (tüm token'ları geçersiz kıl) |

### Users
| Metod | Yol | Açıklama |
|---|---|---|
| GET | `/users/me` | Mevcut kullanıcı bilgileri |

### Media (tamamı auth gerektirir)
| Metod | Yol | Açıklama |
|---|---|---|
| POST | `/media/upload` | Görsel yükle (sadece JPEG, maks 5MB) |
| GET | `/media/stats` | Yükleme istatistikleri (Aggregation Pipeline) |
| GET | `/media/my` | Kendi medyalarımı listele |
| GET | `/media/:id` | Medya meta bilgisi |
| GET | `/media/:id/download` | Medya dosyasını indir |
| DELETE | `/media/:id` | Medya sil (sadece sahip) |
| GET | `/media/:id/permissions` | İzin listesi (sadece sahip) |
| POST | `/media/:id/permissions` | İzin ekle/kaldır (sadece sahip) |

### Health
| Metod | Yol | Açıklama |
|---|---|---|
| GET | `/health` | Sağlık kontrolü |

## Örnek cURL Komutları

### Kayıt
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"Passw0rd!"}'
```

### Giriş
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"Passw0rd!"}'
```

### Çıkış
```bash
curl -X POST http://localhost:3000/auth/logout \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

### Dosya Yükle
```bash
curl -X POST http://localhost:3000/media/upload \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -F "file=@/path/to/image.jpg"
```

### Yükleme İstatistikleri
```bash
curl -X GET http://localhost:3000/media/stats \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

### Dosya İndir
```bash
curl -X GET http://localhost:3000/media/<MEDIA_ID>/download \
  -H "Authorization: Bearer <ACCESS_TOKEN>" -OJ
```

### İzin Yönetimi
```bash
curl -X POST http://localhost:3000/media/<MEDIA_ID>/permissions \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"userId":"<USER_ID>","action":"add"}'
```

## Veri Modeli

### Users
- `_id`: ObjectId
- `email`: string (unique)
- `passwordHash`: string
- `role`: 'user' | 'admin'
- `hashedRefreshToken`: string | null
- `sessionVersion`: number (default: 1)
- `createdAt`, `updatedAt`

### Media
- `_id`: ObjectId
- `ownerId`: ObjectId (ref users)
- `fileName`: string
- `filePath`: string
- `mimeType`: string
- `size`: number (sanitize sonrası boyut)
- `allowedUserIds`: ObjectId[] (default: [])
- `createdAt`

## Detaylı Dokümantasyon

Proje mimarisi, güvenlik önlemleri, API detayları ve daha fazlası için [docs/](docs/README.md) klasörüne bakınız.
