import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Bu e-posta adresi zaten kayıtlı');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create(dto.email, passwordHash);

    const tokens = await this.generateTokens(
      user._id.toString(),
      user.email,
      user.role,
      user.sessionVersion,
    );

    // Refresh token'i hashleyip DB'ye kaydet
    await this.storeRefreshToken(user._id.toString(), tokens.refreshToken);

    return {
      ...tokens,
      user: {
        _id: user._id,
        email: user.email,
        role: user.role,
      },
    };
  }

  //Login işlemi
  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Geçersiz e-posta adresi girildi');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Geçersiz şifre girildi');
    }

    // sessionVersion artir → eski cihazdaki access token'lar aninda gecersiz olur
    await this.usersService.incrementSessionVersion(user._id.toString());
    const updatedUser = await this.usersService.findById(user._id.toString());

    const tokens = await this.generateTokens(
      user._id.toString(),
      user.email,
      user.role,
      updatedUser!.sessionVersion,
    );

    // Refresh token'i hashleyip DB'ye kaydet (eski refresh token overwrite → gecersiz)
    await this.storeRefreshToken(user._id.toString(), tokens.refreshToken);

    return {
      ...tokens,
      user: {
        _id: user._id,
        email: user.email,
        role: user.role,
      },
    };
  }
  //Refresh token yenileme işlemi
  async refresh(refreshToken: string) {
    try {
      //Refresh token'i verify et
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      //Kullanıcıyı bul
      const user = await this.usersService.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('Kullanıcı bulunamadı');
      }

      // DB'deki hash ile karsilastir Kullanıcının aktif oturumu var mı kontrolü
      if (!user.hashedRefreshToken) {
        throw new UnauthorizedException('Oturum sonlandırılmış, lütfen tekrar giriş yapın');
      }
 
      //Refresh token'i SHA-256 + bcrypt ile DB'deki hash ile karsilastir
      // Not: bcrypt girdiyi 72 byte'ta keser. JWT tokenlar 72 byte'tan uzundur
      // ve ayni kullanici icin ilk 72 byte ayni kalir. SHA-256 pre-hash ile
      // tum token icerigi 64 char hex'e indirgenir → bcrypt karsilastirmasi dogru calisir.
      const tokenHash = this.sha256(refreshToken);
      const isTokenValid = await bcrypt.compare(tokenHash, user.hashedRefreshToken);
      if (!isTokenValid) {
        // Token uyusmuyor → olasi token calintisi, tum oturumu sonlandir
        await this.usersService.invalidateSession(user._id.toString());
        throw new UnauthorizedException('Refresh token geçersiz, tüm oturumlar sonlandırıldı');
      }

      // Yeni token cifti uret (rotation)
      const tokens = await this.generateTokens(
        user._id.toString(),
        user.email,
        user.role,
        user.sessionVersion,
      );

      // Yeni refresh token'i hashleyip DB'ye kaydet
      await this.storeRefreshToken(user._id.toString(), tokens.refreshToken);

      return tokens;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Geçersiz veya süresi dolmuş refresh token');
    }
  }

  async logout(userId: string) {
    // sessionVersion artir + hashedRefreshToken null → tum tokenlar gecersiz
    await this.usersService.invalidateSession(userId);
  }
 
  //Access ve refresh tokenleri üret
  private async generateTokens(
    userId: string,
    email: string,
    role: string,
    sessionVersion: number,
  ) {
    const accessPayload = { sub: userId, email, role, sessionVersion };
    const refreshPayload = { sub: userId };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload),
      this.jwtService.signAsync(refreshPayload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }

  //Refresh token'i SHA-256 + bcrypt ile hashleyip DB'ye kaydet
  // bcrypt 72-byte truncation sorunu: JWT tokenlar 72 byte'tan uzun,
  // SHA-256 pre-hash ile tam token icerigi korunur.
  private async storeRefreshToken(userId: string, refreshToken: string) {
    const tokenHash = this.sha256(refreshToken);
    const hash = await bcrypt.hash(tokenHash, 10);
    await this.usersService.updateRefreshToken(userId, hash);
  }

  // SHA-256 hash - bcrypt'e vermeden once token'i 64 char hex'e indirger
  private sha256(data: string): string {
    return createHash('sha256').update(data).digest('hex');
  }
}
