import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { diskStorage } from 'multer';
import { v4 as uuidv4 } from 'uuid';
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
          filename: (_req, _file, cb) => {
            cb(null, `${uuidv4()}.jpg`);
          },
        }),
        fileFilter: (_req: any, file: any, cb: any) => {
          if (file.mimetype !== 'image/jpeg') {
            return cb(
              new BadRequestException('Sadece JPEG dosyaları kabul edilir'),
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
