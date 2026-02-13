# API Uc Noktalari

## Genel Bilgi

- Temel URL: `http://localhost:3000`
- Swagger UI: `http://localhost:3000/api/docs`
- Tum basarili yanitlar `{ success: true, data: {...}, statusCode }` formatindadir
- Tum hata yanitlari `{ success: false, statusCode, error, message, timestamp, path }` formatindadir

## Auth Endpoint'leri

### POST /auth/register
Yeni kullanici kaydı olusturur.

**Rate Limit:** 5 istek / dakika

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "email": "user@example.com",
  "password": "Passw0rd!"
}
```

**Basarili Yanit (201):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi...",
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "email": "user@example.com",
      "role": "user"
    }
  },
  "statusCode": 201
}
```

**Hata Yanitlari:**
- `409` - E-posta adresi zaten kayitli
- `400` - Gecersiz girdi (email formati, sifre uzunlugu)
- `429` - Rate limit asildi

---

### POST /auth/login
Kullanici girisi yapar. Her login'de `sessionVersion` artar.

**Rate Limit:** 5 istek / dakika

**Body:**
```json
{
  "email": "user@example.com",
  "password": "Passw0rd!"
}
```

**Basarili Yanit (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi...",
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "email": "user@example.com",
      "role": "user"
    }
  },
  "statusCode": 200
}
```

**Hata Yanitlari:**
- `401` - Gecersiz e-posta veya sifre
- `429` - Rate limit asildi

---

### POST /auth/refresh
Refresh token ile yeni token cifti alir (rotation).

**Body:**
```json
{
  "refreshToken": "eyJhbGciOi..."
}
```

**Basarili Yanit (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "yeni_access_token",
    "refreshToken": "yeni_refresh_token"
  },
  "statusCode": 200
}
```

**Hata Yanitlari:**
- `401` - Gecersiz, suresi dolmus veya daha once kullanilmis refresh token

**Not:** Basarili refresh'ten sonra eski refresh token gecersiz olur. Eski token tekrar kullanilirsa olasi token calintisi olarak degerlendirilir ve tum oturumlar sonlandirilir.

---

### POST /auth/logout
Kullanicinin tum aktif oturumlarini sonlandirir.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Basarili Yanit (200):**
```json
{
  "success": true,
  "data": {
    "message": "Cikis basarili"
  },
  "statusCode": 200
}
```

---

## Users Endpoint'leri

### GET /users/me
Giris yapmis kullanicinin profil bilgilerini dondurur.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Basarili Yanit (200):**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "role": "user",
    "createdAt": "2026-02-12T10:00:00.000Z",
    "updatedAt": "2026-02-12T10:00:00.000Z"
  },
  "statusCode": 200
}
```

---

## Media Endpoint'leri

Tum media endpoint'leri `Authorization: Bearer <access_token>` header'i gerektirir.

### POST /media/upload
JPEG gorsel yukler. Dosya image sanitization pipeline'indan gecer.

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

**Body:** `file` alani ile JPEG dosyasi (maks 5MB)

**Basarili Yanit (201):**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "fileName": "foto.jpg",
    "mimeType": "image/jpeg",
    "size": 125430,
    "createdAt": "2026-02-12T10:05:00.000Z"
  },
  "statusCode": 201
}
```

**Hata Yanitlari:**
- `400` - Dosya yuklenemedi, gecersiz format, bozuk gorsel, mime spoofing
- `413` - Dosya boyutu 5MB'yi asiyor

---

### GET /media/my
Kullanicinin yukladigi tum medyalari listeler.

**Basarili Yanit (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "fileName": "foto.jpg",
      "mimeType": "image/jpeg",
      "size": 125430,
      "createdAt": "2026-02-12T10:05:00.000Z"
    }
  ],
  "statusCode": 200
}
```

---

### GET /media/stats
Kullanicinin yukleme istatistiklerini dondurur (MongoDB Aggregation Pipeline).

**Basarili Yanit (200):**
```json
{
  "success": true,
  "data": {
    "totalFiles": 5,
    "totalSize": 1234567,
    "avgSize": 246913,
    "minSize": 50000,
    "maxSize": 500000
  },
  "statusCode": 200
}
```

---

### GET /media/:id
Medya meta bilgisini getirir. Sahip veya yetkili kullanici erisebilir.

**Basarili Yanit (200):**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "ownerId": "507f1f77bcf86cd799439011",
    "fileName": "foto.jpg",
    "mimeType": "image/jpeg",
    "size": 125430,
    "allowedUserIds": [],
    "createdAt": "2026-02-12T10:05:00.000Z"
  },
  "statusCode": 200
}
```

**Hata Yanitlari:**
- `403` - Erisim izni yok
- `404` - Medya bulunamadi

---

### GET /media/:id/download
Medya dosyasini indirir. Path traversal korumasi aktiftir.

**Basarili Yanit (200):** Binary JPEG dosya stream'i

**Hata Yanitlari:**
- `403` - Erisim izni yok veya gecersiz dosya yolu
- `404` - Medya bulunamadi

---

### DELETE /media/:id
Medyayi siler (fiziksel dosya + DB kaydi). Sadece sahip silebilir.

**Basarili Yanit (200):**
```json
{
  "success": true,
  "data": {
    "message": "Medya basariyla silindi"
  },
  "statusCode": 200
}
```

---

### GET /media/:id/permissions
Medyanin izin listesini goruntuler. Sadece sahip erisebilir.

**Basarili Yanit (200):**
```json
{
  "success": true,
  "data": {
    "allowedUserIds": ["507f1f77bcf86cd799439013"]
  },
  "statusCode": 200
}
```

---

### POST /media/:id/permissions
Medya erisim izni ekler veya kaldirir. Sadece sahip yapabilir.

**Body (izin ekleme):**
```json
{
  "userId": "507f1f77bcf86cd799439013",
  "action": "add"
}
```

**Body (izin kaldirma):**
```json
{
  "userId": "507f1f77bcf86cd799439013",
  "action": "remove"
}
```

**Basarili Yanit (200):**
```json
{
  "success": true,
  "data": {
    "message": "Izin eklendi",
    "allowedUserIds": ["507f1f77bcf86cd799439013"]
  },
  "statusCode": 200
}
```

---

## Health Endpoint'i

### GET /health
Servisin ayakta olup olmadigini kontrol eder.

**Basarili Yanit (200):**
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": "2026-02-12T10:00:00.000Z"
  },
  "statusCode": 200
}
```
