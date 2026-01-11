import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to capture raw body for webhook signature verification
 * Must be applied BEFORE express.json() middleware
 */
@Injectable()
export class RawBodyMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Only capture raw body for webhook endpoints
    if (req.path.includes('/webhook')) {
      let data = '';
      req.setEncoding('utf8');
      
      req.on('data', (chunk) => {
        data += chunk;
      });
      
      req.on('end', () => {
        (req as any).rawBody = Buffer.from(data, 'utf8');
        next();
      });
    } else {
      next();
    }
  }
}







