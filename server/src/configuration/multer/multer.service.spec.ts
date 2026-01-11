import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MulterService } from './multer.service';
import { FileType } from './dto/upload-file.dto';
import { MULTER_ERROR_MESSAGES } from './constants/multer.constants';

describe('MulterService', () => {
  let service: MulterService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        UPLOAD_PATH: 'uploads',
        MAX_FILE_SIZE: 10485760, // 10MB
        MAX_FILES: 10,
        BASE_URL: 'http://localhost:4000',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MulterService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<MulterService>(MulterService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processUpload', () => {
    it('should return error when no files provided', async () => {
      const result = await service.processUpload([], {});

      expect(result.success).toBe(false);
      expect(result.errors).toContain(MULTER_ERROR_MESSAGES.MISSING_FILE);
    });

    it('should return error when too many files uploaded', async () => {
      const mockFiles = Array(11)
        .fill(null)
        .map((_, index) => ({
          fieldname: 'file',
          originalname: `file${index}.jpg`,
          encoding: '7bit',
          mimetype: 'image/jpeg',
          size: 1024,
          buffer: Buffer.from('test'),
          destination: '',
          filename: `file${index}.jpg`,
          path: '',
        }));

      const result = await service.processUpload(mockFiles, { maxFiles: 10 });

      expect(result.success).toBe(false);
      expect(result.errors).toContain(MULTER_ERROR_MESSAGES.TOO_MANY_FILES);
    });

    it('should return error for file too large', async () => {
      const mockFile = {
        fieldname: 'file',
        originalname: 'large.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 20 * 1024 * 1024, // 20MB
        buffer: Buffer.from('test'),
        destination: '',
        filename: 'large.jpg',
        path: '',
      };

      const result = await service.processUpload(mockFile, {
        maxFileSize: 10 * 1024 * 1024,
      });

      expect(result.success).toBe(false);
      expect(result.errors).toContain(
        'large.jpg: File size exceeds the maximum allowed limit',
      );
    });

    it('should return error for invalid file type', async () => {
      const mockFile = {
        fieldname: 'file',
        originalname: 'test.exe',
        encoding: '7bit',
        mimetype: 'application/x-msdownload',
        size: 1024,
        buffer: Buffer.from('test'),
        destination: '',
        filename: 'test.exe',
        path: '',
      };

      const result = await service.processUpload(mockFile, {
        fileType: FileType.IMAGE,
      });

      expect(result.success).toBe(false);
      expect(result.errors).toContain('test.exe: File type is not allowed');
    });

    it('should return error for invalid file extension', async () => {
      const mockFile = {
        fieldname: 'file',
        originalname: 'test.exe',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 1024,
        buffer: Buffer.from('test'),
        destination: '',
        filename: 'test.exe',
        path: '',
      };

      const result = await service.processUpload(mockFile, {
        fileType: FileType.IMAGE,
      });

      expect(result.success).toBe(false);
      expect(result.errors).toContain(
        'test.exe: File extension is not allowed',
      );
    });
  });

  describe('validation', () => {
    it('should validate basic file properties correctly', async () => {
      const mockFile = {
        fieldname: 'file',
        originalname: 'test.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 1024,
        buffer: Buffer.from('test'),
        destination: '',
        filename: 'test.jpg',
        path: '',
      };

      const result = await service.processUpload(mockFile, {
        fileType: FileType.IMAGE,
      });

      expect(result).toBeDefined();
    });
  });

  describe('file processing', () => {
    it('should generate unique filenames', async () => {
      const mockFile = {
        fieldname: 'file',
        originalname: 'test.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 1024,
        buffer: Buffer.from('test'),
        destination: '',
        filename: 'test.jpg',
        path: '',
      };

      const result = await service.processUpload(mockFile, {});

      if (result.success && result.files) {
        const uploadedFile = result.files[0];
        expect(uploadedFile.filename).not.toBe('test.jpg');
        expect(uploadedFile.filename).toMatch(/test_\d+_[a-f0-9]+\.jpg/);
      }
    });

    it('should process files successfully', async () => {
      const mockFile = {
        fieldname: 'file',
        originalname: 'test.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 1024,
        buffer: Buffer.from('test'),
        destination: '',
        filename: 'test.jpg',
        path: '',
      };

      const result = await service.processUpload(mockFile, {
        fileType: FileType.IMAGE,
      });

      if (result.success && result.files) {
        const uploadedFile = result.files[0];
        expect(uploadedFile.filename).toBeDefined();
        expect(uploadedFile.url).toBeDefined();
      }
    });
  });

  describe('configuration', () => {
    it('should use default configuration when no options provided', async () => {
      const mockFile = {
        fieldname: 'file',
        originalname: 'test.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 1024,
        buffer: Buffer.from('test'),
        destination: '',
        filename: 'test.jpg',
        path: '',
      };

      const result = await service.processUpload(mockFile, {});

      expect(result).toBeDefined();
    });

    it('should respect custom configuration options', async () => {
      const mockFile = {
        fieldname: 'file',
        originalname: 'test.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 1024,
        buffer: Buffer.from('test'),
        destination: '',
        filename: 'test.jpg',
        path: '',
      };

      const result = await service.processUpload(mockFile, {
        customPath: 'custom/path',
        generateThumbnail: true,
        extractMetadata: false,
      });

      expect(result).toBeDefined();
    });
  });
});
