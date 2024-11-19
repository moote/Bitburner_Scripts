export enum CLFlagValidationTypes {
  STRING,
  INT,
  FLOAT,
  BOOLEAN,
  STRING_ARR
}

export interface CLFlagObj {
  flag: string,
  defaultVal: AllowedFlagValue_Type,
  isRequired: boolean,
  description: string,
  readonly validationType: CLFlagValidationTypes,
  isValidated: boolean,
  isValid: boolean,
  cleanValue: AllowedFlagValue_Type,
  errorMsg: string,
}

export type AllowedFlagValue_Type = string | number | boolean | string[];

export type NSFlag_Type = [string, string | number | boolean | string[]];
