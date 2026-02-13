# Yapilandirma

## Ortam Degiskenleri

Proje, `@nestjs/config` (ConfigModule) ile ortam degiskenlerini yonetir. Degerler `.env` dosyasindan okunur.

### Degisken Listesi

| Degisken | Zorunlu | Varsayilan | Aciklama |
|----------|---------|------------|----------|
| `MONGO_URI` | Evet | - | MongoDB Atlas baglanti URI'si |
| `JWT_ACCESS_SECRET` | Evet | - | Access token imzalama anahtari |
| `JWT_REFRESH_SECRET` | Evet | - | Refresh token imzalama anahtari |
| `UPLOAD_DIR` | Hayir | `./uploads` | Dosya yukleme dizini |
| `MAX_FILE_SIZE` | Hayir | `5242880` | Maks dosya boyutu (byte, 5MB) |
| `PORT` | Hayir | `3000` | Uygulama portu |

### .env Dosyasi Olusturma

```bash
cp .env.example .env
```

`.env.example` icerik:
```
MONGO_URI=mongodb+srv://<user>:<pass>@<cluster>/<db>
JWT_ACCESS_SECRET=your-access-secret-key-here
JWT_REFRESH_SECRET=your-refresh-secret-key-here
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880
PORT=3000
```

### Onemli Notlar

- `.env` dosyasi `.gitignore` ile Git'e dahil **edilmez**
- `JWT_ACCESS_SECRET` ve `JWT_REFRESH_SECRET` **farkli** degerler olmalidir
- Production ortaminda guclu, rastgele uretilmis anahtarlar kullanilmalidir
- `MONGO_URI` icin MongoDB Atlas baglanti bilgilerinizi kullanin

## Token Yapilandirmasi

| Token | Sure | Secret |
|-------|------|--------|
| Access Token | 15 dakika | `JWT_ACCESS_SECRET` |
| Refresh Token | 7 gun | `JWT_REFRESH_SECRET` |

Bu degerler `auth.module.ts` ve `auth.service.ts` icinde tanimlidir:

```typescript
// Access token (auth.module.ts)
JwtModule.registerAsync({
  useFactory: (configService) => ({
    secret: configService.get('JWT_ACCESS_SECRET'),
    signOptions: { expiresIn: '15m' },
  }),
});

// Refresh token (auth.service.ts)
this.jwtService.signAsync(refreshPayload, {
  secret: this.configService.get('JWT_REFRESH_SECRET'),
  expiresIn: '7d',
});
```

## Rate Limiting Yapilandirmasi

`app.module.ts` icinde global rate limit:
```typescript
ThrottlerModule.forRoot({
  throttlers: [{ ttl: 60000, limit: 10 }], // 10 istek / 60 saniye
});
```

Endpoint-bazli ozel limitler:
```typescript
@Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 istek / 60 saniye
```

## Validation Yapilandirmasi

Global `ValidationPipe` ayarlari (`main.ts`):

```typescript
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,            // Tanimlanmamis alanlari siler
  transform: true,            // Otomatik tip donusumu
  forbidNonWhitelisted: true  // Tanimlanmamis alan → 400
}));
```

## Swagger Yapilandirmasi

Swagger UI erisim adresi: `http://localhost:3000/api/docs`

```typescript
const config = new DocumentBuilder()
  .setTitle('Rodinya Media Library API')
  .setDescription('Kimlik dogrulama, kaynak-bazli yetkilendirme ve medya yonetimi REST API')
  .setVersion('1.0')
  .addBearerAuth()
  .build();
```

## CORS

`main.ts` icinde CORS aktif:
```typescript
app.enableCors();
```

Tum origin'lerden gelen isteklere izin verir. Production ortaminda kisitlanmasi onerilir.
