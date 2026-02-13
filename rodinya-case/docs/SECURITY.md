# Guvenlik Onlemleri

## Genel Bakis

Proje, katmanli guvenlik yaklasimiyla tasarlanmistir. Her katman bagimsiz bir koruma saglar ve birlikte derinlemesine savunma (defense in depth) olusturur.

## 1. Image Sanitization Pipeline

Dosya yukleme islemi 4 katmanli guvenlik kontrolunden gecer:

```
Yuklenen dosya
    │
    ▼
[Katman 1] Multer fileFilter
    → MIME type kontrolu (image/jpeg)
    → Dosya uzantisi kontrolu (.jpg, .jpeg)
    │
    ▼
[Katman 2] Magic Number Dogrulama
    → Ilk 3 byte: FF D8 FF (JPEG imzasi)
    → Basarisiz → dosya silinir + 400 BadRequest
    │
    ▼
[Katman 3] sharp ile Decode
    → Dosya gercekten decode edilebilen bir gorsel mi?
    → Bozuk / sahte dosyalar reddedilir
    │
    ▼
[Katman 4] Re-encode (Sanitization)
    → Yalnizca piksel datasindan yeni JPEG uretilir
    → EXIF metadata temizlenir
    → Trailing data (FFD9 sonrasi) temizlenir
    → Polyglot payload'lar temizlenir
    → Orijinal dosya asla saklanmaz
    │
    ▼
Temiz JPEG diske yazilir
```

### Neden Re-encode?

Bir dosya ayni anda hem gecerli bir JPEG hem de calistirilabilir kod icerebilir (polyglot file). JPEG bitis marker'indan (FFD9) sonra eklenmis script kodu, sunucuda saklandiginda veya servis edildiginde guvenlik riski olusturur. Re-encode ile yalnizca piksel verisi korunur, geri kalan her sey temizlenir.

### Kullanilan Kutuphane: sharp

```typescript
const sanitizedBuffer = await sharp(file.path)
  .jpeg({ quality: 90, mozjpeg: true })
  .toBuffer();
```

- `sharp(file.path)`: Dosyayi decode etmeye calisir (basarisiz → bozuk dosya)
- `.jpeg({ quality: 90, mozjpeg: true })`: Piksel datasından yeni JPEG uretir
- `.toBuffer()`: Sonucu Buffer olarak alir

## 2. bcrypt 72-Byte Truncation Korunmasi

### Sorun

`bcrypt` girdiyi sessizce **72 byte**'ta keser. JWT token'lar ~200+ byte uzunlugundadir. Ayni kullanici icin farkli zamanlarda uretilen iki refresh token'in ilk 72 byte'i aynidir:

```
Token A: eyJhbGciOiJIUzI1NiIs...{ayni}...iat:1739404800...{farkli}
Token B: eyJhbGciOiJIUzI1NiIs...{ayni}...iat:1739404801...{farkli}
         |_______ ilk 72 byte ayni ________|
```

Bu durumda `bcrypt.compare(eskiToken, yeniHash)` her zaman `true` donuyordu ve refresh token rotation calismiyordu.

### Cozum: SHA-256 Pre-Hash

Token once SHA-256 ile 64 karakter hex'e indirgenir (72 byte sinirinin icinde), sonra bcrypt'e verilir:

```typescript
private sha256(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

// Saklama: SHA-256 → bcrypt
const tokenHash = this.sha256(refreshToken); // 64 char hex
const hash = await bcrypt.hash(tokenHash, 10);

// Karsilastirma: SHA-256 → bcrypt.compare
const tokenHash = this.sha256(refreshToken);
const isValid = await bcrypt.compare(tokenHash, storedHash);
```

## 3. Refresh Token Rotation

Her basarili token yenileme isleminde:

1. Eski refresh token dogrulanir (JWT verify + bcrypt compare)
2. Yeni token cifti uretilir
3. Yeni hash DB'ye yazilir → eski token gecersiz

**Token calintisi tespit edildiginde** (eski token tekrar kullanildiginda):
- `invalidateSession()` cagrilir
- `hashedRefreshToken` null yapilir
- `sessionVersion` arttirilir
- Tum aktif oturumlar sonlandirilir

## 4. Session Version ile Anlik Token Invalidation

Access token'lar stateless'tir; normalde suresi dolana kadar gecerlidirler. `sessionVersion` mekanizmasi bu kisitlamayi ortadan kaldirir:

- Her login/logout'ta `sessionVersion` 1 artar
- Access token payload'inda `sessionVersion` yer alir
- Her istekte DB'deki `sessionVersion` ile karsilastirilir
- Eslesmiyor ise → aninda `401 Unauthorized`

Bu yaklasim, token blacklist tutmadan anlik oturum sonlandirma saglar.

## 5. Rate Limiting

`@nestjs/throttler` ile brute force saldirilarına karsi koruma:

| Kapsam | Sinir | Aciklama |
|--------|-------|----------|
| Global | 10 istek / 60 sn | Tum endpoint'ler icin |
| Login | 5 istek / 60 sn | Sifre deneme saldirisi korunmasi |
| Register | 5 istek / 60 sn | Toplu hesap olusturma engeli |

Rate limit IP bazlidir; farkli kullanicilarla deneme yapilsa da ayni IP'den gelen istekler sayilir.

## 6. Path Traversal Korunmasi

Dosya indirme endpointi'nde, istenen dosyanin `uploads/` dizini disina cikmadigini dogrular:

```typescript
const uploadsDir = resolve(process.env.UPLOAD_DIR || './uploads');
const absolutePath = resolve(media.filePath);

if (!absolutePath.startsWith(uploadsDir)) {
  throw new ForbiddenException('Gecersiz dosya yolu');
}
```

Bu kontrol, `../../etc/passwd` gibi path traversal saldirilarini engeller.

## 7. Girdi Dogrulama

NestJS `ValidationPipe` global olarak aktif:

```typescript
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,          // Tanimlanmamis alanlari siler
  transform: true,          // Otomatik tip donusumu
  forbidNonWhitelisted: true // Tanimlanmamis alan varsa 400 dondurur
}));
```

Tum DTO'larda `class-validator` dekoratorleri ile girdi dogrulamasi zorunludur.

## 8. Sifre Guvenligi

- `bcrypt` ile hash'leme (salt round: 10)
- Duz metin sifre veritabaninda **hicbir zaman** saklanmaz
- Minimum uzunluk: 6 karakter

## 9. Hata Mesaji Guvenligi

Global `HttpExceptionFilter`, beklenmeyen hatalarda detayli bilgi dondurmez:

- HttpException → statusCode, error, message dondurulur
- Bilinmeyen hata → `"Sunucu hatasi"` mesaji, detay **yalnizca** sunucu loglarinda gorunur

Bu yaklasim, sunucu ic yapisinin disariya sizmasini engeller.
