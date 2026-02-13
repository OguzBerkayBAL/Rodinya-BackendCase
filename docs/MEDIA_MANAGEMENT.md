# Medya Yonetimi

## Genel Bakis

Medya modulu, kullanicilarin JPEG gorsel yuklemesini, indirmesini ve diger kullanicilara erisim izni vermesini saglar. Tum dosyalar yukleme sirasinda **image sanitization** isleminden gecer.

## Desteklenen Format

- **JPEG** (`.jpg`, `.jpeg`)
- Maksimum dosya boyutu: **5 MB** (yapilandiriilabilir)
- Diger formatlar reddedilir (PNG, GIF, WebP, vb.)

## Dosya Yukleme Akisi

```
Client (multipart/form-data)
    │
    ▼
[1] Multer fileFilter
    → MIME type: image/jpeg veya image/jpg
    → Uzanti: .jpg veya .jpeg
    → Basarisiz → 400 BadRequest
    │
    ▼
[2] Multer diskStorage
    → Hedef dizin: UPLOAD_DIR (varsayilan: ./uploads)
    → Dosya adi: {uuid}.jpg veya {uuid}.jpeg
    │
    ▼
[3] MediaService.create()
    │
    ├─[3a] Magic Number Kontrolu
    │   → Ilk 3 byte: FF D8 FF
    │   → Basarisiz → dosya silinir + 400
    │
    ├─[3b] sharp ile Decode
    │   → Bozuk/sahte dosya → silinir + 400
    │
    ├─[3c] Re-encode (Sanitization)
    │   → sharp.jpeg({ quality: 90, mozjpeg: true })
    │   → Temiz JPEG orijinal dosyanin uzerine yazilir
    │
    └─[3d] DB Kaydi
        → ownerId, fileName, filePath, mimeType, size (sanitize sonrasi)
        │
        ▼
    { _id, fileName, mimeType, size, createdAt }
```

## Dosya Adlandirma

Yuklenen dosyalar UUID ile yeniden adlandirilir:

```
Orijinal: foto_tatil.jpg
Sunucu:   9f9c8b31-713f-44a0-b9ee-b2679f1df1ed.jpg
```

- `crypto.randomUUID()` kullanilir (Node.js native)
- Orijinal dosya uzantisi korunur (`.jpeg` ise `.jpeg`, `.jpg` ise `.jpg`)
- Orijinal dosya adi `fileName` alaninda DB'de saklanir

## Dosya Depolama

Dosyalar yerel dosya sisteminde `uploads/` dizininde saklanir:

```
uploads/
├── .gitkeep
├── 9f9c8b31-713f-44a0-b9ee-b2679f1df1ed.jpg
├── aaf6054b-1d82-4bd7-9dc3-21a017924d59.jpg
└── 896107ad-d676-403b-85b3-241791066d2f.jpeg
```

- Docker kullanildiginda `./uploads` volume olarak mount edilir
- `.gitignore` ile `uploads/*` dizini Git'e dahil edilmez (`.gitkeep` haric)

## Erisim Kontrolu

Iki farkli guard ile kaynak-bazli yetkilendirme saglanir:

### MediaAccessGuard (Okuma Erisimi)
- `GET /media/:id` ve `GET /media/:id/download` icin kullanilir
- Sahip **VEYA** `allowedUserIds` dizisinde olan kullanicilar erisebilir
- Medya nesnesini `request.media`'ya ekler (controller'da tekrar sorgu yapilmaz)

### MediaOwnerGuard (Tam Kontrol)
- `DELETE /media/:id` ve izin yonetimi icin kullanilir
- **Yalnizca** dosya sahibi erisebilir
- Diger kullanicilar → `403 Forbidden`

## Izin Yonetimi

Dosya sahibi, diger kullanicilara goruntuleme/indirme izni verebilir:

### Izin Ekleme
```
POST /media/:id/permissions
Body: { "userId": "hedef_kullanici_id", "action": "add" }
```

### Izin Kaldirma
```
POST /media/:id/permissions
Body: { "userId": "hedef_kullanici_id", "action": "remove" }
```

### Izin Listesi
```
GET /media/:id/permissions
→ { "allowedUserIds": ["id1", "id2"] }
```

## Dosya Indirme

```
GET /media/:id/download
→ Binary JPEG stream (Content-Disposition: attachment)
```

Indirme sirasinda **path traversal korunmasi** aktiftir:

```typescript
const uploadsDir = resolve(process.env.UPLOAD_DIR || './uploads');
const absolutePath = resolve(media.filePath);

if (!absolutePath.startsWith(uploadsDir)) {
  throw new ForbiddenException('Gecersiz dosya yolu');
}
```

## Dosya Silme

```
DELETE /media/:id
```

Silme islemi iki adimdan olusur:
1. Fiziksel dosya `uploads/` dizininden silinir
2. DB kaydi silinir

Yalnizca dosya sahibi silme islemi yapabilir (`MediaOwnerGuard`).

## Istatistikler (Aggregation Pipeline)

```
GET /media/stats
```

MongoDB Aggregation Pipeline ile kullanicinin yukleme istatistikleri hesaplanir:

| Alan | Aciklama |
|------|----------|
| `totalFiles` | Toplam dosya sayisi |
| `totalSize` | Toplam dosya boyutu (byte) |
| `avgSize` | Ortalama dosya boyutu (yuvarlanmis) |
| `minSize` | En kucuk dosya |
| `maxSize` | En buyuk dosya |

Pipeline asamalari:
1. `$match` → Kullanicinin dosyalarini filtrele
2. `$group` → Istatistikleri hesapla ($sum, $avg, $min, $max)
3. `$project` → Ciktiyi duzenle, ortalama degerini yuvarla
