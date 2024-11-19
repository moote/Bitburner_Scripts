import { AllowedFlagValue_Type, CLFlagObj, CLFlagValidationTypes, NSFlag_Type } from './CLFlagUtilities'

abstract class CLFlag implements CLFlagObj {
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

  constructor(
    flag: string,
    defaultVal: AllowedFlagValue_Type,
    isRequired: boolean,
    description: string,
    validationType: CLFlagValidationTypes
  ){
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

  get nsFlagArr(): NSFlag_Type {
    return [this.flag, this.defaultVal];
  }

  get flagFull(): string {
    let flagStr = "-";

    if(this.flag.length > 2){
      flagStr = flagStr + "-";
    }

    return flagStr + this.flag;
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
    
    if(dirtyValue === null){
      this.isValid = false;
      this.errorMsg = `Not a valid ${this.validationType} (null)`;
    }
    else{
      this.isValid = true;
    }

    return this.isValid;
  }

  /**
   * Called when this flag is missing from the resul
   * of ns.flags(); used to test required.
   */
  validateMissing(): boolean {
    this.isValidated = true;

    if(this.isRequired){
      this.isValid = false;
      this.errorMsg = "This is a required flag";
    }
    else{
      this.isValid = false;
    }

    return this.isValid;
  }
}

export class StrClFlag extends CLFlag {
  defaultVal: string;
  cleanValue!: string;

  constructor(
    flag: string,
    description: string,
    isRequired = false,
    defaultVal = "",
  ){
    super(flag, defaultVal, isRequired, description, CLFlagValidationTypes.STRING);
    this.defaultVal = defaultVal;
    
    // check if help request flag
    if(this.flag === "h" || this.flag === "help"){
      this.isHelpRequest = true;
    }
  }

  getClean(): string {
    if(!this.isValidated){
      throw new Error(`${this.flag} not validated!`);
    }
    else if(!this.isValid){
      throw new Error(`${this.flag} not valid: ${this.errorMsg}`);
    }

    return this.cleanValue;
  }
}

export class IntClFlag extends CLFlag {
  defaultVal: number;
  cleanValue!: number;

  constructor(
    flag: string,
    description: string,
    isRequired = false,
    defaultVal = 0,
  ){
    super(flag, defaultVal, isRequired, description, CLFlagValidationTypes.INT);
    this.defaultVal = defaultVal;
  }

  getClean(): number {
    if(!this.isValidated){
      throw new Error(`${this.flag} not validated!`);
    }
    else if(!this.isValid){
      throw new Error(`${this.flag} not valid: ${this.errorMsg}`);
    }

    return this.cleanValue;
  }
}

export class FloatClFlag extends CLFlag {
  defaultVal: number;
  cleanValue!: number;

  constructor(
    flag: string,
    description: string,
    isRequired = false,
    defaultVal = 0,
  ){
    super(flag, defaultVal, isRequired, description, CLFlagValidationTypes.FLOAT);
    this.defaultVal = defaultVal;
  }

  getClean(): number {
    if(!this.isValidated){
      throw new Error(`${this.flag} not validated!`);
    }
    else if(!this.isValid){
      throw new Error(`${this.flag} not valid: ${this.errorMsg}`);
    }

    return this.cleanValue;
  }
}

export class BoolClFlag extends CLFlag {
  defaultVal: boolean;
  cleanValue!: boolean;

  constructor(
    flag: string,
    description: string
  ){
    super(flag, false, false, description, CLFlagValidationTypes.BOOLEAN);
    this.defaultVal = false;
  }

  getClean(): boolean {
    if(!this.isValidated){
      throw new Error(`${this.flag} not validated!`);
    }
    else if(!this.isValid){
      throw new Error(`${this.flag} not valid: ${this.errorMsg}`);
    }

    return this.cleanValue;
  }
}

export class StrArrClFlag extends CLFlag {
  defaultVal: string[];
  cleanValue!: string[];

  constructor(
    flag: string,
    description: string,
    isRequired = false
  ){
    super(flag, [], isRequired, description, CLFlagValidationTypes.STRING_ARR);
    this.defaultVal = [];
  }

  getClean(): string[] {
    if(!this.isValidated){
      throw new Error(`${this.flag} not validated!`);
    }
    else if(!this.isValid){
      throw new Error(`${this.flag} not valid: ${this.errorMsg}`);
    }

    return this.cleanValue;
  }
}