import { BadRequestException, ValidationPipeOptions } from '@nestjs/common';
import { Logger } from '@nestjs/common';

const logger = new Logger('ValidationPipe');

export const validationConfig: ValidationPipeOptions = {
  transform: true,
  transformOptions: {
    enableImplicitConversion: true,
  },
  skipMissingProperties: false,
  skipNullProperties: false,
  skipUndefinedProperties: false,
  validationError: {
    target: false,
    value: false,
  },
  stopAtFirstError: true,
  exceptionFactory: (errors) => {
    const messages = errors.map((error) => ({
      field: error.property,
      message: Object.values(error.constraints)[0],
      value: error.value,
    }));
    logger.error('Validation failed', null, { validationErrors: messages });
    return new BadRequestException({
      message: 'Bad Request Exception',
      details: messages,
    });
  },
};

export const validationMessages = {
  isNotEmpty: '$property cannot be empty',
  isString: '$property must be a string',
  isNumber: '$property must be a number',
  isBoolean: '$property must be a boolean',
  isEmail: '$property must be a valid email',
  minLength: '$property must be longer than $constraint1 characters',
  maxLength: '$property must be shorter than $constraint1 characters',
  min: '$property must be greater than $constraint1',
  max: '$property must be less than $constraint1',
  isEnum: '$property must be one of the following values: $constraint1',
  matches: '$property contains invalid characters',
  isDate: '$property must be a valid date',
  arrayMinSize: '$property must contain at least $constraint1 elements',
  arrayMaxSize: '$property must contain no more than $constraint1 elements',
  isArray: '$property must be an array',
  isObject: '$property must be an object',
  isJSON: '$property must be a valid JSON string',
  isUUID: '$property must be a valid UUID',
};
