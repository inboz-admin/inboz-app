export interface FilterCondition {
  field: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'greaterThan' | 'lessThan' | 'in' | 'notIn';
  value: string | number | string[] | number[];
}

export interface FilterConditions {
  operator?: 'AND' | 'OR';
  conditions: FilterCondition[];
}

