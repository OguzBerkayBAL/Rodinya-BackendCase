import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { Media, MediaDocument } from './schemas/media.schema';
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';

@Injectable()
export class MediaService {
  constructor(
    @InjectModel(Media.name) private mediaModel: Model<MediaDocument>,
    private readonly configService: ConfigService,
  ) {}

  async create(
    file: Express.Multer.File,
    ownerId: string,
  ): Promise<MediaDocument> {
    // 1. Magic number kontrolu: Gercek JPEG dosyasi mi? (FF D8 FF)
    const buffer = Buffer.alloc(3);
    const fd = fs.openSync(file.path, 'r');
    fs.readSync(fd, buffer, 0, 3, 0);
    fs.closeSync(fd);

    const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    if (!isJpeg) {
      fs.unlinkSync(file.path);
      throw new BadRequestException(
        'Geçersiz dosya: JPEG dosya imzası bulunamadı (mime spoofing tespit edildi)',
      );
    }

    // 2. Image sanitization: sharp ile decode + re-encode
    // - Dosya gercekten decode edilebilen gecerli bir gorsel mi kontrol edilir
    // - Yalnizca piksel datasindan yeni bir JPEG uretilir
    // - EXIF metadata, trailing data (FFD9 sonrasi), polyglot payload temizlenir
    // - Orijinal dosya asla saklanmaz, sanitize edilmis versiyon uzerine yazilir
    let sanitizedBuffer: Buffer;
    try {
      sanitizedBuffer = await sharp(file.path)
        .jpeg({ quality: 90, mozjpeg: true })
        .toBuffer();
    } catch {
      fs.unlinkSync(file.path);
      throw new BadRequestException(
        'Geçersiz JPEG: dosya decode edilemedi (bozuk veya sahte görsel)',
      );
    }

    // 3. Orijinal dosyayi sanitize edilmis versiyonla degistir
    fs.writeFileSync(file.path, sanitizedBuffer);
    const sanitizedSize = sanitizedBuffer.length;

    const media = new this.mediaModel({
      ownerId: new Types.ObjectId(ownerId),
      fileName: file.originalname,
      filePath: file.path,
      mimeType: file.mimetype,
      size: sanitizedSize,
      allowedUserIds: [],
    });
    return media.save();
  }

  async findByOwner(ownerId: string): Promise<MediaDocument[]> {
    return this.mediaModel.find({ ownerId: new Types.ObjectId(ownerId) }).exec();
  }

  async findById(id: string): Promise<MediaDocument | null> {
    return this.mediaModel.findById(id).exec();
  }

  async deleteMedia(id: string, userId: string): Promise<void> {
    const media = await this.mediaModel.findById(id).exec();
    if (!media) {
      throw new NotFoundException('Medya bulunamadı');
    }

    if (media.ownerId.toString() !== userId) {
      throw new ForbiddenException('Bu işlem yalnızca medya sahibi tarafından yapılabilir');
    }

    // Fiziksel dosyayı sil
    const absolutePath = path.resolve(media.filePath);
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }

    // Veritabanı kaydını sil
    await this.mediaModel.findByIdAndDelete(id).exec();
  }

  async addPermission(mediaId: string, targetUserId: string): Promise<MediaDocument> {
    const media = await this.mediaModel.findById(mediaId).exec();
    if (!media) {
      throw new NotFoundException('Medya bulunamadı');
    }

    const targetObjectId = new Types.ObjectId(targetUserId);
    const alreadyAllowed = media.allowedUserIds.some(
      (id) => id.toString() === targetUserId,
    );

    if (!alreadyAllowed) {
      media.allowedUserIds.push(targetObjectId);
      await media.save();
    }

    return media;
  }

  async removePermission(mediaId: string, targetUserId: string): Promise<MediaDocument> {
    const media = await this.mediaModel.findById(mediaId).exec();
    if (!media) {
      throw new NotFoundException('Medya bulunamadı');
    }

    media.allowedUserIds = media.allowedUserIds.filter(
      (id) => id.toString() !== targetUserId,
    );
    await media.save();

    return media;
  }

  async getPermissions(mediaId: string): Promise<Types.ObjectId[]> {
    const media = await this.mediaModel.findById(mediaId).exec();
    if (!media) {
      throw new NotFoundException('Medya bulunamadı');
    }
    return media.allowedUserIds;
  }

  async getStats(userId: string) {
    const result = await this.mediaModel.aggregate([
      { $match: { ownerId: new Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          totalFiles: { $sum: 1 },
          totalSize: { $sum: '$size' },
          avgSize: { $avg: '$size' },
          minSize: { $min: '$size' },
          maxSize: { $max: '$size' },
        },
      },
      {
        $project: {
          _id: 0,
          totalFiles: 1,
          totalSize: 1,
          avgSize: { $round: ['$avgSize', 0] },
          minSize: 1,
          maxSize: 1,
        },
      },
    ]);

    return result[0] || {
      totalFiles: 0,
      totalSize: 0,
      avgSize: 0,
      minSize: 0,
      maxSize: 0,
    };
  }
}
