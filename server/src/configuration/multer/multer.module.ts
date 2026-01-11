import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MulterController } from './multer.controller';
import { MulterService } from './multer.service';

@Module({
  imports: [ConfigModule],
  controllers: [MulterController],
  providers: [MulterService],
  exports: [MulterService],
})
export class MulterModule {}
