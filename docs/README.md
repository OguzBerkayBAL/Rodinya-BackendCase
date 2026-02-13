# Rodinya Case - Proje Dokumantasyonu

Bu klasor, **Rodinya Media Library Backend** projesinin teknik dokumantasyonunu icerir.

## Dokuman Rehberi

| Dokuman | Aciklama |
|---------|----------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Mimari yapi, katmanli tasarim ve modul bagimlilik iliskileri |
| [AUTHENTICATION.md](AUTHENTICATION.md) | JWT tabanli kimlik dogrulama, token yasam dongusu ve oturum yonetimi |
| [SECURITY.md](SECURITY.md) | Guvenlik onlemleri: image sanitization, bcrypt truncation fix, rate limiting |
| [API_ENDPOINTS.md](API_ENDPOINTS.md) | Tum REST API uc noktalari, istek/cevap ornekleri |
| [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) | MongoDB koleksiyonlari, alan tanimlari ve indeksler |
| [MEDIA_MANAGEMENT.md](MEDIA_MANAGEMENT.md) | Dosya yukleme, sanitization pipeline, erisim kontrolu ve istatistikler |
| [CONFIGURATION.md](CONFIGURATION.md) | Ortam degiskenleri, yapilandirma dosyalari |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Docker ile deploy, multi-stage build, production ortami |
| [DEVELOPMENT.md](DEVELOPMENT.md) | Gelistirme ortami kurulumu, calistirma komutlari, test |
| [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) | Proje dizin yapisi ve dosya aciklamalari |

## Hizli Bakis

**Rodinya Media Library Backend**, NestJS uzerine kurulmus bir REST API'dir. Temel yetenekleri:

- **Kimlik Dogrulama**: JWT Access + Refresh Token, bcrypt ile sifre hashleme
- **Oturum Guvenligi**: Refresh token rotation, session version ile anlik token invalidation
- **Medya Yonetimi**: JPEG yukleme, image sanitization (sharp), kaynak-bazli yetkilendirme
- **API Dokumantasyonu**: Swagger/OpenAPI ile interaktif dokumantasyon
- **Containerization**: Docker + Docker Compose ile tek komutla calistirma

## Teknoloji Yigini

| Kategori | Teknoloji |
|----------|-----------|
| Framework | NestJS 11 |
| Dil | TypeScript 5 |
| Veritabani | MongoDB Atlas (Mongoose 9 ODM) |
| Kimlik Dogrulama | JWT (@nestjs/jwt, Passport) |
| Dosya Isleme | Multer, sharp |
| Dokumantasyon | Swagger (@nestjs/swagger) |
| Guvenlik | bcrypt, @nestjs/throttler |
| Container | Docker, Docker Compose |
