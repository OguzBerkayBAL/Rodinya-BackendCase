import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ type: String, enum: ['user', 'admin'], default: 'user' })
  role: string;

  @Prop({ type: String, default: null })
  hashedRefreshToken: string | null;

  @Prop({ type: Number, default: 1 })
  sessionVersion: number;
}

export const UserSchema = SchemaFactory.createForClass(User);
