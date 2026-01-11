import { Injectable } from '@nestjs/common';
import { CreateWDto } from './dto/create-w.dto';
import { UpdateWDto } from './dto/update-w.dto';

export interface UploadProgress {
  stage: 'parsing' | 'validating' | 'deduplicating' | 'inserting' | 'completed' | 'failed';
  percentage: number;
  message: string;
  totalRows?: number;
  processedRows?: number;
  validRows?: number;
  invalidRows?: number;
  insertedRows?: number;
  duplicateRows?: number;
  errors?: string[];
  timestamp: Date;
}

@Injectable()
export class WsService {
  create(createWDto: CreateWDto) {
    return 'This action adds a new w';
  }

  findAll() {
    return `This action returns all ws`;
  }

  findOne(id: number) {
    return `This action returns a #${id} w`;
  }

  update(id: number, updateWDto: UpdateWDto) {
    return `This action updates a #${id} w`;
  }

  remove(id: number) {
    return `This action removes a #${id} w`;
  }

  // Method to emit upload progress to specific room
  emitUploadProgress(server: any, fileId: string, progress: UploadProgress) {
    server.to(`upload-${fileId}`).emit(`upload-progress-${fileId}`, progress);
  }
}
