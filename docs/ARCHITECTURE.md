# Mimari Yapi

## Genel Bakis

Proje, NestJS'in modüler mimarisine uygun sekilde **katmanli tasarim** (layered architecture) prensibiyle insa edilmistir. Her ozellik kendi modulu icinde izole edilmis, bagimliliklar acik ve tek yonludur.

## Modul Yapisi

```
AppModule
├── AuthModule        → Kimlik dogrulama (JWT uretimi, dogrulama, oturum yonetimi)
├── UsersModule       → Kullanici islemleri (CRUD, oturum versiyonu)
├── MediaModule       → Medya yonetimi (yukleme, indirme, izinler, istatistik)
├── HealthModule      → Saglik kontrolu
├── ThrottlerModule   → Rate limiting (global)
├── ConfigModule      → Ortam degiskenleri (global)
└── MongooseModule    → Veritabani baglantisi (global)
```

## Katmanli Tasarim

Her modul uc temel katmandan olusur:

### 1. Controller Katmani
- HTTP isteklerini karsilar
- DTO validasyonu yapar (`class-validator`)
- Swagger dekoratörleri ile API'yi dokumante eder
- Yaniti dondurmeden once Guard'lar ve Interceptor'lar devreye girer

### 2. Service Katmani
- Is mantigi burada yasar
- Veritabani islemlerini gerceklestirir
- Dosya sistemi islemlerini yonetir (upload, delete)
- Diger servislerle iletisim kurar

### 3. Schema/Model Katmani
- Mongoose semalari tanimlar
- Veritabani yapisini belirler
- TypeScript tipleri ile tip guvenligi saglar

## Istek Yasam Dongusu

Bir HTTP isteginin projede izledigi yol:

```
Client istegi
    │
    ▼
ThrottlerGuard (rate limit kontrolu)
    │
    ▼
JwtAuthGuard (token dogrulama + sessionVersion kontrolu)
    │
    ▼
Ozel Guard'lar (MediaAccessGuard / MediaOwnerGuard)
    │
    ▼
ValidationPipe (DTO dogrulama)
    │
    ▼
LoggingInterceptor (istek loglama - baslangic)
    │
    ▼
Controller → Service → MongoDB
    │
    ▼
TransformInterceptor (basarili yanit sarmalama)
    │
    ▼
LoggingInterceptor (istek loglama - bitis, sure hesabi)
    │
    ▼
Client yaniti: { success: true, data: {...}, statusCode: 200 }
```

Hata durumunda:

```
Herhangi bir katmanda hata firlatilir
    │
    ▼
HttpExceptionFilter (hata yakalama)
    │
    ▼
Client yaniti: { success: false, statusCode: 4xx/5xx, error: "...", message: "..." }
```

## Modul Bagimliliklari

```
AuthModule ──imports──▶ UsersModule
MediaModule            (bagimsiz, kendi guard'lari var)
HealthModule           (bagimsiz)
UsersModule            (bagimsiz, AuthModule tarafindan import edilir)
```

- **AuthModule** → `UsersModule`'u import eder (kullanici bulma, oturum yonetimi)
- **MediaModule** → Kendi icinde `MediaAccessGuard` ve `MediaOwnerGuard` ile erisim kontrolu yapar
- **UsersModule** → `UsersService`'i export eder, diger moduller tarafindan kullanilir
- **HealthModule** → Hicbir bagimliligi yok

## Global Yapilandirmalar

`main.ts` dosyasinda tanimli global bilesenleri:

| Bilesen | Gorev |
|---------|-------|
| `HttpExceptionFilter` | Tum hatalari standart formata donusturur |
| `LoggingInterceptor` | Her istegi loglar (method, url, userId, status, sure) |
| `TransformInterceptor` | Basarili yanitlari `{ success, data, statusCode }` formatina sarar |
| `ValidationPipe` | DTO dogrulamasi, whitelist + transform + forbidNonWhitelisted |
| `ThrottlerGuard` | Global rate limiting (APP_GUARD olarak tanimli) |
| `CORS` | Cross-origin isteklere izin verir |
