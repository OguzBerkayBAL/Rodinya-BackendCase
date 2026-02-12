import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Media, MediaDocument } from '../schemas/media.schema';

@Injectable()
export class MediaAccessGuard implements CanActivate {
  constructor(
    @InjectModel(Media.name) private mediaModel: Model<MediaDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const mediaId = request.params.id;

    if (!mediaId) {
      return true;
    }

    const media = await this.mediaModel.findById(mediaId).exec();
    if (!media) {
      throw new NotFoundException('Medya bulunamadı');
    }

    const isOwner = media.ownerId.toString() === user.userId;
    const isAllowed = media.allowedUserIds.some(
      (id) => id.toString() === user.userId,
    );

    if (!isOwner && !isAllowed) {
      throw new ForbiddenException('Bu medyaya erişim izniniz yok');
    }

    // Medya nesnesini request'e ekle (controller'da tekrar sorgulamaya gerek kalmasın)
    request.media = media;
    return true;
  }
}
