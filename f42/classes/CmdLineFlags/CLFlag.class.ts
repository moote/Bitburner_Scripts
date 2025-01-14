import { dir } from 'console';
import { AllowedFlagValue_Type, CLFlagObj, CLFlagValidationTypes, NSFlag_Type } from './CLFlagUtilities'

export abstract class CLFlag implements CLFlagObj {
  flag: string;
  defaultVal: AllowedFlagValue_Type;
  isRequired: boolean;
  description: string;
  readonly validationType: CLFlagValidationTypes;
  isValidated: boolean;
  isValid: boolean;
  cleanValue!: AllowedFlagValue_Type;
  errorMsg: string;
  isHelpRequest: boolean;

  static formatFlagWithDashes(flag: string): string {
    let flagStr = "-";

    if (flag.length > 2) {
      flagStr = `-${flagStr}`;
    }

    return `${flagStr}${flag}`;
  }

  constructor(
    flag: string,
    defaultVal: AllowedFlagValue_Type,
    isRequired: boolean,
    description: string,
    validationType: CLFlagValidationTypes
  ) {
    this.flag = flag;
    this.defaultVal = defaultVal;
    this.isRequired = isRequired;
    this.description = description;
    this.validationType = validationType;
    this.isValidated = false;
    this.isValid = false;
    this.errorMsg = "";
    this.isHelpRequest = false;
  }

  abstract getClean(): AllowedFlagValue_Type;

  get flagWithDashes(): string {
    return CLFlag.formatFlagWithDashes(this.flag);
  }

  get nsFlagArr(): NSFlag_Type {
    return [this.flag, this.defaultVal];
  }

  get isSet(): boolean {
    if (!this.isValid) {
      return false;
    }

    if (!this.isRequired && this.cleanValue == this.defaultVal) {
      return false;
    }
    else {
      return true;
    }
  }

  /**
   * TODO: only doing basic null value testing
   * 
   * Does extra validation float/int from number etc.
   * 
   * @param dirtyValue The value received from ns.flags()
   */
  validate(dirtyValue: AllowedFlagValue_Type | null): boolean {
    this.isValidated = true;

    if (dirtyValue === null) {
      this.isValid = false;
      this.errorMsg = `Not a valid ${this.validationType} (null)`;
    }
    else {
      this.isValid = true;
      this.cleanValue = dirtyValue;
      this.#validateRequired();
    }

    return this.isValid;
  }

  #validateRequired(): void {
    // do requirement check if not already invalid
    if(this.isValid){
      if (this.isRequired && this.cleanValue === this.defaultVal) {
        this.isValid = false;
        this.errorMsg = `This is a required flag, can't match default`;
      }
    }
  }

  /**
   * Called when this flag is missing from the resul
   * of ns.flags(); used to test required.
   */
  validateMissing(): boolean {
    this.isValidated = true;

    if (this.isRequired) {
      this.isValid = false;
      this.errorMsg = "This is a required flag";
    }
    else {
      this.isValid = false;
    }

    return this.isValid;
  }
}

export class StrClFlag extends CLFlag {
  defaultVal: string;
  cleanValue: string;

  constructor(
    flag: string,
    description: string,
    isRequired = false,
    defaultVal = "",
  ) {
    super(flag, defaultVal, isRequired, description, CLFlagValidationTypes.STRING);
    this.defaultVal = defaultVal;
    this.cleanValue = defaultVal;
  }

  getClean(): string {
    if (!this.isValidated) {
      throw new Error(`${this.flag} not validated!`);
    }
    else if (!this.isValid) {
      throw new Error(`${this.flag} not valid: ${this.errorMsg}`);
    }

    return this.cleanValue;
  }
}

export class IntClFlag extends CLFlag {
  defaultVal: number;
  cleanValue: number;

  constructor(
    flag: string,
    description: string,
    isRequired = false,
    defaultVal = 0,
  ) {
    super(flag, defaultVal, isRequired, description, CLFlagValidationTypes.INT);
    this.defaultVal = defaultVal;
    this.cleanValue = defaultVal;
  }

  getClean(): number {
    if (!this.isValidated) {
      throw new Error(`${this.flag} not validated!`);
    }
    else if (!this.isValid) {
      throw new Error(`${this.flag} not valid: ${this.errorMsg}`);
    }

    return this.cleanValue;
  }
}

export class FloatClFlag extends CLFlag {
  defaultVal: number;
  cleanValue: number;

  constructor(
    flag: string,
    description: string,
    isRequired = false,
    defaultVal = 0,
  ) {
    super(flag, defaultVal, isRequired, description, CLFlagValidationTypes.FLOAT);
    this.defaultVal = defaultVal;
    this.cleanValue = defaultVal;
  }

  getClean(): number {
    if (!this.isValidated) {
      throw new Error(`${this.flag} not validated!`);
    }
    else if (!this.isValid) {
      throw new Error(`${this.flag} not valid: ${this.errorMsg}`);
    }

    return this.cleanValue;
  }
}

export class BoolClFlag extends CLFlag {
  defaultVal: boolean;
  cleanValue: boolean;

  constructor(
    flag: string,
    description: string
  ) {
    super(flag, false, false, description, CLFlagValidationTypes.BOOLEAN);
    this.defaultVal = false;
    this.cleanValue = false;

    // check if help request flag
    if (this.flag === "h" || this.flag === "help") {
      this.isHelpRequest = true;
    }
  }

  getClean(): boolean {
    if (!this.isValidated) {
      throw new Error(`${this.flag} not validated!`);
    }
    else if (!this.isValid) {
      throw new Error(`${this.flag} not valid: ${this.errorMsg}`);
    }

    return this.cleanValue;
  }
}

export class StrArrClFlag extends CLFlag {
  defaultVal: string[];
  cleanValue: string[];

  constructor(
    flag: string,
    description: string,
    isRequired = false
  ) {
    super(flag, [], isRequired, description, CLFlagValidationTypes.STRING_ARR);
    this.defaultVal = [];
    this.cleanValue = [];
  }

  getClean(): string[] {
    if (!this.isValidated) {
      throw new Error(`${this.flag} not validated!`);
    }
    else if (!this.isValid) {
      throw new Error(`${this.flag} not valid: ${this.errorMsg}`);
    }

    return this.cleanValue;
  }
}