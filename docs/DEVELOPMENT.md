# Gelistirme Rehberi

## On Kosullar

| Arac | Surum | Aciklama |
|------|-------|----------|
| Node.js | 22+ | JavaScript runtime |
| npm | 10+ | Paket yoneticisi |
| MongoDB Atlas | - | Bulut veritabani (free tier yeterli) |
| Docker (opsiyonel) | - | Container ortami |

## Kurulum

```bash
# 1. Projeyi klonla
git clone https://github.com/OguzBerkayBAL/Rodinya-BackendCase.git
cd Rodinya-BackendCase

# 2. Bagimliliklari yukle
npm install

# 3. .env dosyasini olustur
cp .env.example .env

# 4. .env dosyasini duzenle
# MONGO_URI, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET degerlerini gir
```

## Calistirma Komutlari

| Komut | Aciklama |
|-------|----------|
| `npm run start:dev` | Gelistirme modu (watch - degisiklikleri otomatik algilar) |
| `npm run build` | TypeScript → JavaScript derleme |
| `npm run start:prod` | Production modu (once build gerekir) |
| `npm run start` | Standart baslatma |
| `npm run lint` | ESLint ile kod kontrolu |
| `npm run format` | Prettier ile kod formatlama |
| `npm run test` | Unit testleri calistir |

## Gelistirme Akisi

```bash
# Terminal 1: Uygulamayi baslat
npm run start:dev

# Cikti:
# Application is running on: http://localhost:3000
# Swagger docs: http://localhost:3000/api/docs
```

Uygulama basladiginda:
- API: `http://localhost:3000`
- Swagger UI: `http://localhost:3000/api/docs`
- Health check: `http://localhost:3000/health`

## Postman ile Test

Proje icinde hazir Postman collection ve environment dosyalari bulunur:

```
postman/
├── Rodinya_Collection.postman_collection.json
└── Rodinya_Environment.postman_environment.json
```

### Kurulum

1. Postman'i ac
2. **Import** butonuna tikla
3. Her iki JSON dosyasini da import et
4. Sag ust kosedeki environment dropdown'dan **Rodinya Case - Local** sec
5. Environment degiskenlerinde `base_url`'in `http://localhost:3000` oldugundan emin ol

### Test Sirasi

1. **Health Check** - Servisin ayakta oldugundan emin ol
2. **Register** - Yeni kullanici olustur (token'lar otomatik kaydedilir)
3. **Login** - Giris yap (token'lar otomatik guncellenir)
4. **Get Me** - Kullanici bilgilerini goruntule
5. **Upload** - JPEG dosya yukle (media_id otomatik kaydedilir)
6. **My Media** - Yuklenen dosyalari listele
7. **Get Media by ID** - Medya detayini goruntule
8. **Download** - Dosyayi indir
9. **Stats** - Yukleme istatistiklerini gor
10. **Add Permission** - Baska kullaniciya erisim izni ver
11. **Get Permissions** - Izin listesini goruntule
12. **Remove Permission** - Izni kaldir
13. **Delete Media** - Dosyayi sil
14. **Refresh Token** - Token yenileme (rotation testi)
15. **Logout** - Cikis yap

### Refresh Token Rotation Testi

1. Login yap
2. Environment'taki `refresh_token` degerini **kopyala** (not al)
3. Refresh Token istegini gonder (200 donmeli, yeni token'lar gelir)
4. Body'deki `{{refresh_token}}`'i sil, 2. adimda kopyaladigin **eski** token'i yapistir
5. Tekrar gonder → **401 donmeli** (rotation calisiyor)
6. Body'yi `{{refresh_token}}`'a geri dondur, Login yap

### Session Version Testi

1. Login yap → access_token alinir
2. Baska bir tarayici/Postman tab'inda ayni kullanici ile tekrar login yap
3. Ilk tab'daki access_token ile `GET /users/me` cagir → **401 donmeli**
   (cunku ikinci login'de sessionVersion artti, eski token gecersiz)

## Proje Yapisi

Detayli dizin yapisi icin [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) dokumanina bakiniz.

## Loglama

Uygulama her HTTP istegini loglar:

```
[HTTP] [POST /auth/login] userId=anonymous status=200 duration=145ms
[HTTP] [GET /media/my] userId=698f44d5... status=200 duration=23ms
[HTTP] [POST /media/upload] userId=698f44d5... status=201 duration=312ms
```

Beklenmeyen hatalar (500) ayrica stack trace ile loglanir:

```
[ExceptionFilter] Beklenmeyen hata: POST /media/upload
Error: ...
    at ...
```
