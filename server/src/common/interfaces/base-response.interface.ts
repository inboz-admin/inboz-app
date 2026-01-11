import { ModuleNames } from 'src/common/enums/api.enum';

import { ErrorTypes } from 'src/common/enums/api.enum';

export interface BaseResponse<T = any> {
  success: boolean;
  statusCode: number;
  message: string;
  module: ModuleNames;
  error?: {
    type: ErrorTypes;
    code: string;
    details?: any;
  };
  data?: T;
  timestamp: string;
  requestId?: string;
}
