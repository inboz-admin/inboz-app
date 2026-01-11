import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    req.id = uuidv4(); // Assign a unique ID to the request
    res.setHeader('X-Request-Id', req.id); // Optionally set it in the response headers
    next();
  }
}
