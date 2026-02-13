import {
  Controller,
  Get,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UsersService } from './users.service';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mevcut kullanıcı bilgilerini getir' })
  @ApiResponse({ status: 200, description: 'Kullanıcı bilgileri' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMe(@CurrentUser() user: { userId: string; email: string; role: string }) {
    const found = await this.usersService.findById(user.userId);
    if (!found) {
      throw new NotFoundException('Kullanıcı bulunamadı');
    }
    return {
      _id: found._id,
      email: found.email,
      role: found.role,
      createdAt: found.get('createdAt'),
      updatedAt: found.get('updatedAt'),
    };
  }
}
