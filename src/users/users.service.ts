import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
//Veritabanı ile konuşan katman
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async create(email: string, passwordHash: string): Promise<UserDocument> {
    const user = new this.userModel({ email, passwordHash });
    return user.save();
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  //Refresh rotası için kullanılır
  async updateRefreshToken(userId: string, hashedRefreshToken: string | null): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, { hashedRefreshToken }).exec();
  }

  //Tüm access tokenleri geçersiz hale getirmek için kullanılır
  async incrementSessionVersion(userId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, { $inc: { sessionVersion: 1 } }).exec();
  }

  //Global logout için kullanılır
  async invalidateSession(userId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      hashedRefreshToken: null,
      $inc: { sessionVersion: 1 },
    }).exec();
  }
}
