import { Injectable } from '@nestjs/common';
import moment from 'moment-timezone';

/**
 * Date Normalization Service
 * 
 * Provides centralized date field normalization to eliminate code duplication.
 * Converts date strings to Date objects for Sequelize compatibility.
 */
@Injectable()
export class DateNormalizationService {
  /**
   * Normalize date fields in an object from strings to Date objects
   * @param data - The data object containing date fields
   * @param fields - Array of field names to normalize
   * @returns New object with normalized date fields
   */
  normalizeDateFields<T extends Record<string, any>>(
    data: T,
    fields: string[],
  ): T {
    const normalized = { ...data } as any;
    for (const field of fields) {
      if (normalized[field]) {
        normalized[field] = moment(normalized[field]).toDate();
      }
    }
    return normalized as T;
  }
}

