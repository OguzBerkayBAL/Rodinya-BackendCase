import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { BadRequestException } from '@nestjs/common';
import { Media, MediaSchema } from './schemas/media.schema';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';
import { MediaAccessGuard } from './guards/media-access.guard';
import { MediaOwnerGuard } from './guards/media-owner.guard';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Media.name, schema: MediaSchema }]),
    MulterModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        storage: diskStorage({
          destination: configService.get<string>('UPLOAD_DIR', './uploads'),
          filename: (_req, file, cb) => {
            const ext = file.originalname.toLowerCase().endsWith('.jpeg') ? '.jpeg' : '.jpg';
            cb(null, `${randomUUID()}${ext}`);
          },
        }),
        fileFilter: (_req: any, file: any, cb: any) => {
          // .jpg ve .jpeg dosyalari kabul edilir, diger formatlar reddedilir
          const isJpegMime = file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg';
          const originalName = file.originalname.toLowerCase();
          const isJpegExt = originalName.endsWith('.jpg') || originalName.endsWith('.jpeg');

          if (!isJpegMime || !isJpegExt) {
            return cb(
              new BadRequestException('Sadece JPEG dosyaları kabul edilir (.jpg, .jpeg)'),
              false,
            );
          }
          cb(null, true);
        },
        limits: {
          fileSize: configService.get<number>('MAX_FILE_SIZE', 5242880),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [MediaController],
  providers: [MediaService, MediaAccessGuard, MediaOwnerGuard],
  exports: [MediaService],
})
export class MediaModule {}
