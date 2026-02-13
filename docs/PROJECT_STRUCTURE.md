# Proje Dizin Yapisi

## Genel Yapi

```
rodinya-case/
├── src/                          # Kaynak kodlar
│   ├── main.ts                   # Uygulama giris noktasi
│   ├── app.module.ts             # Kok modul
│   │
│   ├── auth/                     # Kimlik dogrulama modulu
│   │   ├── auth.module.ts        # Modul tanimlamasi
│   │   ├── auth.service.ts       # Is mantigi (register, login, refresh, logout)
│   │   ├── auth.controller.ts    # HTTP endpoint'leri
│   │   ├── dto/                  # Veri transfer nesneleri
│   │   │   ├── register.dto.ts   # Kayit istegi dogrulamasi
│   │   │   ├── login.dto.ts      # Giris istegi dogrulamasi
│   │   │   └── refresh.dto.ts    # Token yenileme istegi dogrulamasi
│   │   ├── strategies/
│   │   │   └── jwt-access.strategy.ts  # Passport JWT stratejisi
│   │   └── guards/
│   │       └── jwt-auth.guard.ts       # JWT koruma guard'i
│   │
│   ├── users/                    # Kullanici modulu
│   │   ├── users.module.ts       # Modul tanimlamasi
│   │   ├── users.service.ts      # Veritabani islemleri
│   │   ├── users.controller.ts   # HTTP endpoint'leri
│   │   └── schemas/
│   │       └── user.schema.ts    # Mongoose kullanici semasi
│   │
│   ├── media/                    # Medya modulu
│   │   ├── media.module.ts       # Modul + Multer yapilandirmasi
│   │   ├── media.service.ts      # Is mantigi (CRUD, sanitization, stats)
│   │   ├── media.controller.ts   # HTTP endpoint'leri
│   │   ├── schemas/
│   │   │   └── media.schema.ts   # Mongoose medya semasi
│   │   ├── dto/
│   │   │   └── permission.dto.ts # Izin istegi dogrulamasi
│   │   └── guards/
│   │       ├── media-access.guard.ts  # Okuma erisim kontrolu
│   │       └── media-owner.guard.ts   # Sahiplik kontrolu
│   │
│   ├── health/                   # Saglik kontrolu modulu
│   │   ├── health.module.ts
│   │   └── health.controller.ts
│   │
│   └── common/                   # Paylasilan bilesenleri
│       ├── decorators/
│       │   └── current-user.decorator.ts  # @CurrentUser() dekoratoru
│       ├── filters/
│       │   └── http-exception.filter.ts   # Global hata filtresi
│       └── interceptors/
│           ├── transform.interceptor.ts   # Yanit sarmalama
│           └── logging.interceptor.ts     # Istek loglama
│
├── uploads/                      # Yuklenen dosyalar (gitignore)
│   └── .gitkeep
│
├── postman/                      # Postman test dosyalari
│   ├── Rodinya_Collection.postman_collection.json
│   └── Rodinya_Environment.postman_environment.json
│
├── docs/                         # Proje dokumantasyonu
│   ├── README.md
│   ├── ARCHITECTURE.md
│   ├── AUTHENTICATION.md
│   ├── SECURITY.md
│   ├── API_ENDPOINTS.md
│   ├── DATABASE_SCHEMA.md
│   ├── MEDIA_MANAGEMENT.md
│   ├── CONFIGURATION.md
│   ├── DEPLOYMENT.md
│   ├── DEVELOPMENT.md
│   └── PROJECT_STRUCTURE.md
│
├── dist/                         # Derlenmis JavaScript (gitignore)
├── node_modules/                 # Bagimliliklar (gitignore)
│
├── .env                          # Ortam degiskenleri (gitignore)
├── .env.example                  # Ornek ortam degiskenleri
├── .gitignore                    # Git haric tutma kurallari
├── .dockerignore                 # Docker haric tutma kurallari
├── Dockerfile                    # Multi-stage Docker build
├── docker-compose.yml            # Docker Compose yapilandirmasi
├── package.json                  # Bagimliliklar ve scriptler
├── tsconfig.json                 # TypeScript yapilandirmasi
├── README.md                     # Ana proje aciklamasi
└── nest-cli.json                 # NestJS CLI yapilandirmasi
```

## Modul Aciklamalari

### auth/ - Kimlik Dogrulama

JWT tabanli authentication sistemi. Register, login, token refresh (rotation) ve logout islemlerini yonetir. Passport.js ile JWT stratejisi uygulanir. bcrypt ile sifre hashleme, SHA-256 + bcrypt ile refresh token saklama.

### users/ - Kullanici Yonetimi

Kullanici CRUD islemleri ve oturum yonetimi. `UsersService`, `AuthModule` tarafindan import edilir. SessionVersion ve refresh token guncelleme islemleri burada yapilir.

### media/ - Medya Yonetimi

Dosya yukleme, indirme, silme ve izin yonetimi. Image sanitization pipeline (magic number + sharp decode/re-encode). MongoDB Aggregation Pipeline ile istatistik endpoint'i.

### health/ - Saglik Kontrolu

Basit `GET /health` endpoint'i. Servisin ayakta olup olmadigini kontrol eder.

### common/ - Paylasilan Bilesenleri

Tum moduller tarafindan kullanilan cross-cutting concern'ler:

| Bilesen | Gorev |
|---------|-------|
| `CurrentUser` decorator | Request'ten kullanici bilgisini cikarir |
| `HttpExceptionFilter` | Hata yanitlarini standart formata donusturur |
| `TransformInterceptor` | Basarili yanitlari `{ success, data, statusCode }` ile sarar |
| `LoggingInterceptor` | Her istegi loglar (method, url, userId, status, sure) |

## Yapilandirma Dosyalari

| Dosya | Aciklama |
|-------|----------|
| `package.json` | Bagimliliklar, npm scriptler, Jest yapilandirmasi |
| `tsconfig.json` | TypeScript derleyici ayarlari (ES2022, NodeNext module) |
| `nest-cli.json` | NestJS CLI yapilandirmasi |
| `.env.example` | Ornek ortam degiskenleri sablonu |
| `Dockerfile` | Multi-stage Docker build tanimlari |
| `docker-compose.yml` | Docker Compose servis tanimlari |
| `.gitignore` | Git haric tutma kurallari |
| `.dockerignore` | Docker build haric tutma kurallari |
