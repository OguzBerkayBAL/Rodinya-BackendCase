# Veritabani Semasi

## Genel Bilgi

- **Veritabani:** MongoDB Atlas
- **ODM:** Mongoose 9
- **Koleksiyonlar:** `users`, `media` (medias)

## Users Koleksiyonu

Kullanici bilgilerini ve oturum durumunu saklar.

### Alan Tanimlari

| Alan | Tip | Zorunlu | Varsayilan | Aciklama |
|------|-----|---------|------------|----------|
| `_id` | ObjectId | Otomatik | - | MongoDB tarafindan uretilir |
| `email` | String | Evet | - | Kullanici e-posta adresi (unique index) |
| `passwordHash` | String | Evet | - | bcrypt ile hashlanmis sifre |
| `role` | String | Hayir | `"user"` | Kullanici rolu: `"user"` veya `"admin"` |
| `hashedRefreshToken` | String \| null | Hayir | `null` | Aktif refresh token'in SHA-256 + bcrypt hash'i |
| `sessionVersion` | Number | Hayir | `1` | Oturum versiyonu (token invalidation icin) |
| `createdAt` | Date | Otomatik | - | Kayit olusturulma zamani |
| `updatedAt` | Date | Otomatik | - | Son guncelleme zamani |

### Indeksler

- `email`: Unique index (tekil e-posta zorunlulugu)

### Ornek Dokuman

```json
{
  "_id": "698f44d52eb8a01ab72cbb66",
  "email": "user@example.com",
  "passwordHash": "$2b$10$kX7r...",
  "role": "user",
  "hashedRefreshToken": "$2b$10$Lm9p...",
  "sessionVersion": 3,
  "createdAt": "2026-02-12T10:00:00.000Z",
  "updatedAt": "2026-02-12T14:30:00.000Z"
}
```

### Oturum Yonetimi Alanlari

**hashedRefreshToken:**
- Aktif refresh token'in SHA-256 pre-hash + bcrypt hash'i
- `null` → kullanicinin aktif oturumu yok (logout yapilmis veya oturum sonlandirilmis)
- Her refresh'te yeni hash ile guncellenir (rotation)

**sessionVersion:**
- Her login'de `$inc: { sessionVersion: 1 }` ile artar
- Her logout'ta artar + `hashedRefreshToken` null yapilir
- Access token payload'indaki deger ile karsilastirilir; eslesmiyor ise token reddedilir

## Media Koleksiyonu

Yuklenen medya dosyalarinin meta bilgilerini saklar.

### Alan Tanimlari

| Alan | Tip | Zorunlu | Varsayilan | Aciklama |
|------|-----|---------|------------|----------|
| `_id` | ObjectId | Otomatik | - | MongoDB tarafindan uretilir |
| `ownerId` | ObjectId (ref: User) | Evet | - | Dosyayi yukleyen kullanicinin ID'si |
| `fileName` | String | Evet | - | Orijinal dosya adi |
| `filePath` | String | Evet | - | Sunucudaki dosya yolu |
| `mimeType` | String | Evet | - | Dosya MIME tipi (`image/jpeg`) |
| `size` | Number | Evet | - | Dosya boyutu (byte, sanitize sonrasi) |
| `allowedUserIds` | ObjectId[] (ref: User) | Hayir | `[]` | Erisim izni verilen kullanici ID'leri |
| `createdAt` | Date | Otomatik | - | Yukleme zamani |

### Timestamps Yapilandirmasi

Media semasinda yalnizca `createdAt` aktiftir (`updatedAt` devre disi):

```typescript
@Schema({ timestamps: { createdAt: true, updatedAt: false } })
```

### Ornek Dokuman

```json
{
  "_id": "698f418be9ab949da76580f4",
  "ownerId": "698f41b1e9ab949da76580ea",
  "fileName": "foto.jpg",
  "filePath": "uploads/9f9c8b31-713f-44a0-b9ee-b2679f1df1ed.jpg",
  "mimeType": "image/jpeg",
  "size": 118781,
  "allowedUserIds": [],
  "createdAt": "2026-02-12T10:05:00.000Z"
}
```

### Erisim Kontrolu

**allowedUserIds** dizisi, dosya sahibi disinda erisim izni verilen kullanicilari tutar:

- Bos dizi → sadece sahip erisebilir
- ID eklendikce → ilgili kullanicilar da dosyaya erisebilir
- `MediaAccessGuard`: Sahip VEYA `allowedUserIds`'de olan kullanicilar erisebilir
- `MediaOwnerGuard`: Yalnizca sahip (silme, izin yonetimi)

## Aggregation Pipeline (Istatistikler)

`GET /media/stats` endpoint'i MongoDB Aggregation Pipeline kullanir:

```javascript
[
  // 1. Kullanicinin dosyalarini filtrele
  { $match: { ownerId: ObjectId("kullanici_id") } },

  // 2. Istatistikleri hesapla
  { $group: {
      _id: null,
      totalFiles: { $sum: 1 },
      totalSize: { $sum: "$size" },
      avgSize: { $avg: "$size" },
      minSize: { $min: "$size" },
      maxSize: { $max: "$size" }
  }},

  // 3. Ciktiyi duzenle
  { $project: {
      _id: 0,
      totalFiles: 1,
      totalSize: 1,
      avgSize: { $round: ["$avgSize", 0] },
      minSize: 1,
      maxSize: 1
  }}
]
```

Bu pipeline sunlari dondurur:
- `totalFiles`: Toplam dosya sayisi
- `totalSize`: Toplam dosya boyutu (byte)
- `avgSize`: Ortalama dosya boyutu (yuvarlanmis)
- `minSize`: En kucuk dosya boyutu
- `maxSize`: En buyuk dosya boyutu
