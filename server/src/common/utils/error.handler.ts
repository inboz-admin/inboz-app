import { HttpException, HttpStatus } from '@nestjs/common';
import { ApiResponseMessage, ModuleNames } from '../enums/api.enum';
import { ErrorTypes } from '../enums/api.enum';

export interface AppErrorResponse {
  message: string;
  module: ModuleNames;
  errorCode: string;
  type: ErrorTypes;
  details?: any;
}

export class AppError extends HttpException {
  constructor(
    message: string,
    module: ModuleNames,
    statusCode: number = HttpStatus.BAD_REQUEST,
    errorCode: string = 'UNKNOWN_ERROR',
    type: ErrorTypes = ErrorTypes.BUSINESS,
    details?: any,
  ) {
    super(
      {
        message,
        module,
        errorCode,
        type,
        details,
      } as AppErrorResponse,
      statusCode,
    );
  }
}
