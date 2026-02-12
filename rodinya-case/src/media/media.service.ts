import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { Media, MediaDocument } from './schemas/media.schema';
import * as fs from 'fs';
import * as path from 'path';

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
    const media = new this.mediaModel({
      ownerId: new Types.ObjectId(ownerId),
      fileName: file.originalname,
      filePath: file.path,
      mimeType: file.mimetype,
      size: file.size,
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
}
