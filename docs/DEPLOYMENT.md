# Deployment

## Docker ile Calistirma (Onerilen)

### On Kosullar

- [Docker](https://www.docker.com/) ve Docker Compose yuklu olmalidir
- MongoDB Atlas hesabi ve baglanti URI'si gereklidir

### Adimlar

```bash
# 1. Projeyi klonla
git clone https://github.com/OguzBerkayBAL/Rodinya-BackendCase.git
cd Rodinya-BackendCase

# 2. .env dosyasini olustur
cp .env.example .env
# .env dosyasini kendi degerlerinle duzenle (MONGO_URI, JWT secretlar)

# 3. Tek komutla calistir
docker compose up --build

# 4. Arka planda calistir
docker compose up --build -d

# 5. Durdur
docker compose down
```

### Dogrulama

```bash
# Saglik kontrolu
curl http://localhost:3000/health

# Swagger UI
# Tarayicida ac: http://localhost:3000/api/docs
```

## Docker Mimarisi

### Multi-Stage Build (Dockerfile)

```dockerfile
# Stage 1: Build - Derleme ortami
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production - Calisma ortami
FROM node:22-alpine AS production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev          # Sadece production bagimliliklari
COPY --from=build /app/dist ./dist
RUN mkdir -p uploads
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

**Neden Multi-Stage?**
- Build stage: TypeScript derleme, tum devDependencies
- Production stage: Sadece derlenmiş JS + production dependencies
- Sonuc: Cok daha kucuk Docker image (~250MB yerine ~150MB)

### Docker Compose (docker-compose.yml)

```yaml
services:
  app:
    build: .
    ports:
      - "${PORT:-3000}:3000"
    env_file:
      - .env
    volumes:
      - ./uploads:/app/uploads
    restart: unless-stopped
```

- **ports**: Host'un 3000 portunu container'in 3000 portuna baglar
- **env_file**: `.env` dosyasindan ortam degiskenlerini okur
- **volumes**: `./uploads` dizinini container ile paylasir (dosyalar container silinse de korunur)
- **restart**: Container cokerse otomatik yeniden baslar

### .dockerignore

```
node_modules
dist
.git
.env
uploads/*
!uploads/.gitkeep
*.md
postman
test
coverage
```

Build context'ine gereksiz dosyalarin dahil olmasini engeller, build suresini kisaltir.

## Docker'siz Calistirma

### On Kosullar

- Node.js 22+ yuklu olmalidir
- npm 10+ yuklu olmalidir

### Adimlar

```bash
# 1. Bagimliliklari yukle
npm install

# 2. .env dosyasini olustur ve duzenle
cp .env.example .env

# 3a. Gelistirme modu (watch)
npm run start:dev

# 3b. Production modu
npm run build
npm run start:prod
```

## Veritabani

Proje **MongoDB Atlas** (bulut) kullanir. Yerel MongoDB gerektirmez.

### Atlas Kurulumu

1. [MongoDB Atlas](https://www.mongodb.com/atlas) hesabi olustur
2. Yeni cluster olustur (free tier yeterli)
3. Database user olustur
4. Network Access'e IP adresini ekle (veya 0.0.0.0/0)
5. Connect > Drivers > Connection string'i kopyala
6. `.env` dosyasina `MONGO_URI` olarak yapistir

```
MONGO_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/rodinya?retryWrites=true&w=majority
```
