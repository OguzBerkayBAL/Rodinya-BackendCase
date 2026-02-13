# Kimlik Dogrulama Sistemi

## Genel Bakis

Proje, **JWT (JSON Web Token)** tabanli cift-token mimarisi kullanir:

- **Access Token**: Kisa omurlu (15 dakika), API erisimi icin kullanilir
- **Refresh Token**: Uzun omurlu (7 gun), yeni access token almak icin kullanilir

## Token Yapisi

### Access Token Payload
```json
{
  "sub": "kullanici_id",
  "email": "user@example.com",
  "role": "user",
  "sessionVersion": 1,
  "iat": 1739404800,
  "exp": 1739405700
}
```

- `sub`: Kullanici ID (MongoDB ObjectId)
- `sessionVersion`: Oturum versiyonu (token invalidation icin)
- `iat` / `exp`: Olusturulma / sona erme zamani

### Refresh Token Payload
```json
{
  "sub": "kullanici_id",
  "iat": 1739404800,
  "exp": 1740009600
}
```

Refresh token'da minimum bilgi tutulur; geri kalan dogrulama DB'deki hash ile yapilir.

## Kimlik Dogrulama Akislari

### Kayit (Register)
```
Client ──POST /auth/register──▶ AuthController
                                      │
                                      ▼
                                AuthService.register()
                                      │
                                ┌─────┴─────┐
                                │  E-posta   │
                                │ kontrolu   │──▶ 409 Conflict (varsa)
                                └─────┬─────┘
                                      │
                                bcrypt.hash(sifre, 10)
                                      │
                                UsersService.create()
                                      │
                                generateTokens()
                                      │
                                storeRefreshToken() → SHA-256 + bcrypt → DB
                                      │
                                      ▼
                        { accessToken, refreshToken, user }
```

### Giris (Login)
```
Client ──POST /auth/login──▶ AuthController
                                    │
                                    ▼
                              AuthService.login()
                                    │
                              ┌─────┴─────┐
                              │ E-posta +  │
                              │ sifre      │──▶ 401 (gecersizse)
                              │ kontrolu   │
                              └─────┬─────┘
                                    │
                              incrementSessionVersion()
                              (eski access token'lar aninda gecersiz)
                                    │
                              generateTokens(yeni sessionVersion)
                                    │
                              storeRefreshToken() → SHA-256 + bcrypt → DB
                                    │
                                    ▼
                      { accessToken, refreshToken, user }
```

### Token Yenileme (Refresh) + Rotation
```
Client ──POST /auth/refresh──▶ AuthController
                                      │
                                      ▼
                                AuthService.refresh()
                                      │
                                JWT.verify(refreshToken, REFRESH_SECRET)
                                      │ (gecersizse → 401)
                                      │
                                UsersService.findById()
                                      │
                                ┌─────┴──────────────────┐
                                │ hashedRefreshToken      │
                                │ null mi?                │──▶ 401 (oturum sonlandirilmis)
                                └─────┬──────────────────┘
                                      │
                                SHA-256(refreshToken) → bcrypt.compare(DB hash)
                                      │
                              ┌───────┴───────┐
                              │ Eslesmedi?     │──▶ invalidateSession() → 401
                              │ (token         │   (olasi calinti, tum oturumlar kapatilir)
                              │  calintisi)    │
                              └───────┬───────┘
                                      │ (eslesti)
                                      │
                                generateTokens(yeni cift)
                                      │
                                storeRefreshToken(yeni hash)
                                (eski refresh token artik gecersiz)
                                      │
                                      ▼
                          { accessToken, refreshToken }
```

### Cikis (Logout)
```
Client ──POST /auth/logout──▶ AuthController (JwtAuthGuard)
                                      │
                                      ▼
                                AuthService.logout()
                                      │
                                invalidateSession():
                                  - hashedRefreshToken = null
                                  - sessionVersion++
                                      │
                                      ▼
                          Tum access + refresh token'lar gecersiz
```

## Session Version Mekanizmasi

`sessionVersion` alani, kullanicinin tum aktif access token'larini **aninda** gecersiz kilmak icin kullanilir.

### Calisma Prensibi

1. Her login'de `sessionVersion` 1 artar
2. Access token payload'ina `sessionVersion` eklenir
3. Her istekte `JwtAccessStrategy`, token'daki `sessionVersion` ile DB'deki degeri karsilastirir
4. Eslesmiyor ise → `401 Unauthorized`

### Ne Zaman Devreye Girer?

| Olay | sessionVersion | Sonuc |
|------|----------------|-------|
| Login | +1 artar | Eski cihazdaki access token'lar gecersiz |
| Logout | +1 artar | Tum access token'lar gecersiz |
| Refresh | Degismez | Mevcut oturum devam eder |

### Avantaji

Access token'lar stateless'tir ve sunucuda saklanmaz. Normalde suresi dolana kadar gecerlidirler. `sessionVersion` sayesinde, oturumu sonlandirmak istedigimizde access token'lari da aninda gecersiz kilabiliriz -- blacklist tutmaya gerek kalmaz.

## Refresh Token Rotation

Her basarili `/auth/refresh` cagrisinda:

1. Eski refresh token dogrulanir
2. **Yeni** access + refresh token cifti uretilir
3. Yeni refresh token'in hash'i DB'ye yazilir (eski hash uzerine)
4. Eski refresh token artik gecersiz

Eger eski (kulllanilmis) bir refresh token ile istek yapilirsa:
- `bcrypt.compare` basarisiz olur
- Olasi **token calintisi** tespit edilir
- `invalidateSession()` cagrilarak tum oturumlar sonlandirilir

## bcrypt 72-Byte Truncation Cozumu

bcrypt girdiyi sessizce 72 byte'ta keser. JWT token'lar 72 byte'tan uzundur ve ayni kullanici icin ilk 72 byte ayni kalir (fark `iat` timestamp'inde baslar, bu da 72. byte'tan sonra gelir).

**Sorun:** `bcrypt.compare(eskiToken, yeniHash)` her zaman `true` donuyordu.

**Cozum:** Token once `SHA-256` ile 64 karakter hex'e indirgenir, sonra bcrypt'e verilir:

```typescript
private sha256(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

// Saklama
const tokenHash = this.sha256(refreshToken); // 64 char hex
const hash = await bcrypt.hash(tokenHash, 10);

// Karsilastirma
const tokenHash = this.sha256(refreshToken);
const isValid = await bcrypt.compare(tokenHash, storedHash);
```

## Sifre Guvenligi

- Sifreler `bcrypt` ile hash'lenir (salt round: 10)
- Duz metin sifre **hicbir zaman** veritabaninda saklanmaz
- Giris sirasinda `bcrypt.compare` ile dogrulama yapilir
- Minimum sifre uzunlugu: 6 karakter (`class-validator` ile zorunlu)
