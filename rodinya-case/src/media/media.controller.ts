import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { createReadStream } from 'fs';
import { resolve } from 'path';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MediaAccessGuard } from './guards/media-access.guard';
import { MediaOwnerGuard } from './guards/media-owner.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MediaService } from './media.service';
import { PermissionDto } from './dto/permission.dto';

@ApiTags('Media')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Görsel yükle (sadece JPEG, maks 5MB)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Dosya başarıyla yüklendi' })
  @ApiResponse({ status: 400, description: 'Geçersiz dosya formatı' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 413, description: 'Dosya boyutu çok büyük' })
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: { userId: string },
  ) {
    if (!file) {
      throw new BadRequestException('Dosya yüklenmedi');
    }
    const media = await this.mediaService.create(file, user.userId);
    return {
      _id: media._id,
      fileName: media.fileName,
      mimeType: media.mimeType,
      size: media.size,
      createdAt: media.get('createdAt'),
    };
  }

  @Get('my')
  @ApiOperation({ summary: 'Kendi yüklediğim medyaları listele' })
  @ApiResponse({ status: 200, description: 'Medya listesi' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyMedia(@CurrentUser() user: { userId: string }) {
    const mediaList = await this.mediaService.findByOwner(user.userId);
    return mediaList.map((m) => ({
      _id: m._id,
      fileName: m.fileName,
      mimeType: m.mimeType,
      size: m.size,
      createdAt: m.get('createdAt'),
    }));
  }

  @Get(':id')
  @UseGuards(MediaAccessGuard)
  @ApiOperation({ summary: 'Medya meta bilgisini getir' })
  @ApiParam({ name: 'id', description: 'Medya ID', example: '507f1f77bcf86cd799439011' })
  @ApiResponse({ status: 200, description: 'Medya meta bilgisi' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Medya bulunamadı' })
  async getMedia(@Param('id') _id: string, @Req() req: any) {
    const media = req.media;
    return {
      _id: media._id,
      ownerId: media.ownerId,
      fileName: media.fileName,
      mimeType: media.mimeType,
      size: media.size,
      allowedUserIds: media.allowedUserIds,
      createdAt: media.get('createdAt'),
    };
  }

  @Get(':id/download')
  @UseGuards(MediaAccessGuard)
  @ApiOperation({ summary: 'Medya dosyasını indir' })
  @ApiParam({ name: 'id', description: 'Medya ID', example: '507f1f77bcf86cd799439011' })
  @ApiResponse({ status: 200, description: 'Dosya stream' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Medya bulunamadı' })
  async download(@Param('id') _id: string, @Req() req: any): Promise<StreamableFile> {
    const media = req.media;
    const absolutePath = resolve(media.filePath);
    const file = createReadStream(absolutePath);
    return new StreamableFile(file, {
      type: media.mimeType,
      disposition: `attachment; filename="${media.fileName}"`,
    });
  }

  @Delete(':id')
  @UseGuards(MediaOwnerGuard)
  @ApiOperation({ summary: 'Medya sil (sadece sahip)' })
  @ApiResponse({ status: 200, description: 'Medya başarıyla silindi' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Medya bulunamadı' })
  async deleteMedia(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
  ) {
    await this.mediaService.deleteMedia(id, user.userId);
    return { message: 'Medya başarıyla silindi' };
  }

  @Get(':id/permissions')
  @UseGuards(MediaOwnerGuard)
  @ApiOperation({ summary: 'Medya izin listesini görüntüle (sadece sahip)' })
  @ApiResponse({ status: 200, description: 'İzin listesi' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Medya bulunamadı' })
  async getPermissions(@Param('id') id: string) {
    const allowedUserIds = await this.mediaService.getPermissions(id);
    return { allowedUserIds };
  }

  @Post(':id/permissions')
  @UseGuards(MediaOwnerGuard)
  @ApiOperation({ summary: 'Medya izni ekle/kaldır (sadece sahip)' })
  @ApiResponse({ status: 200, description: 'İzin başarıyla güncellendi' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Medya bulunamadı' })
  async updatePermissions(
    @Param('id') id: string,
    @Body() dto: PermissionDto,
  ) {
    let media;
    if (dto.action === 'add') {
      media = await this.mediaService.addPermission(id, dto.userId);
    } else {
      media = await this.mediaService.removePermission(id, dto.userId);
    }
    return {
      message: dto.action === 'add' ? 'İzin eklendi' : 'İzin kaldırıldı',
      allowedUserIds: media.allowedUserIds,
    };
  }
}
