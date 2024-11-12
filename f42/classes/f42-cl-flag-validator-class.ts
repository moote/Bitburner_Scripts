import F42Logger from '/f42/classes/f42-logger-class';
import F42Base from '/scripts/classes/f42-base-class.js';

/**
 * Command line flag validator
 */
export default class F42CLFlagValidator extends F42Base {
  #errorList: { [key: string]: string[] };
  #hasError = false;
  #helpRequested = false;
  #clFlagHelpMessage: string[] | string;
  #clFlagsHelpArr: string[];
  #parsedClFlags: (string | number | boolean)[];
  // #orValidators = [];

  constructor(ns: NS, logger: F42Logger) {
    super(ns, logger);
    this.#reset();

    String.prototype.formatAsFlag = function () {
      let flag = "-" + this;

      if (this.length > 1) {
        flag = "-" + flag;
      }

      return flag;
    }
  }

  get clFlagHelpMessage(): string[] | string {
    return this.#clFlagHelpMessage;
  }

  get hasClFlagHelpMessage(): boolean {
    return this.#clFlagHelpMessage.length > 0;
  }

  get clFlagsHelpArr(): string[] {
    return this.#clFlagsHelpArr;
  }

  get parsedClFlags(): string[] {
    return this.#parsedClFlags;
  }

  get helpRequested(): boolean {
    return this.#helpRequested;
  }

  get errorList(): { [key: string]: string[] } {
    return this.#errorList;
  }

  get hasError(): boolean {
    return this.#hasError;
  }

  // addOrValidator(...orFlags){
  // }

  /**
   * Parse flags array and build string for use in printUsageInfo()
   * Also sets helpRequested flag
   *    [
   *        [<string>flagName, <any>flagDefaultValue, <boolean>flagIsRequired, <string>flagHelpText, <array>validationArray]
   *        ...
   *    ]
   * 
   */
  parseClFlags(clFlagsHelpArr: string[]): void {
    const fnN = "parseClFlags";

    this.#reset();
    this.#clFlagsHelpArr = clFlagsHelpArr;

    // parse the flags
    this.#parsedClFlags = super.ns.flags(this.#clFlagsHelpArr);
    this.#helpRequested = this.#parsedClFlags.help || this.#parsedClFlags.h;

    for (const flagArr of this.#clFlagsHelpArr) {
      // build usage message
      this.#clFlagHelpMessage.push(
        super.ns.sprintf(
          "%s %s %s",
          flagArr[0].formatAsFlag(),
          (flagArr[2] === true ? "(req)" : "(opt)"),
          flagArr[3]
        )
      );

      // validate if not requesting help
      if (!this.#helpRequested) {
        try {
          const cleanVal = this.#test(
            flagArr[0],
            this.#parsedClFlags[flagArr[0]],
            flagArr[2],
            flagArr[4],
          );

          this.#parsedClFlags[flagArr[0]] = cleanVal;
        }
        catch (e) {
          this.log(fnN, "caught error: %s", e.message);

          if (e instanceof F42UnknownTypeError || e instanceof F42ValidatorError) {
            // the type was unknown, trow new error
            throw e;
          }
        }
      }
    }

    // join array into string
    this.#clFlagHelpMessage = this.#clFlagHelpMessage.join("\n");
  }

  #reset(): void {
    this.#errorList = {};
    this.#hasError = false;
    this.#clFlagHelpMessage = [];
    this.#helpRequested = false;
    // this.#orValidators = [];
  }

  #test(flag: string, value: string | boolean | number, isRequired: boolean, validationArr: string[]): string | number | boolean {
    const fnN = "test";
    // this.log(fnN, "");
    this.log(fnN, "flag: %s | value: %s | isRequired: %s | validationArr: %s", flag, value, isRequired, JSON.stringify(validationArr, null, 4));

    // check and clean value; returned value will correct type
    // ie strings converted to int/float where required
    let cleanValue = this.#checkType(isRequired, validationArr[1], value, flag);

    switch (validationArr[0]) {
      case "any":
        cleanValue = this.#validateAny(flag, cleanValue, validationArr);
        break;
      case "range":
        cleanValue = this.#validateRange(flag, cleanValue, validationArr);
        break;
      case "match":
        cleanValue = this.#validateMatch(flag, cleanValue, validationArr);
        break;
      default:
        throw this.#getValidatorError("test", "Invalid validation type", validationArr[0]);
    }

    return cleanValue;
  }

  #validateAny(flag: string, value: string | number | boolean, validationArr: string[]): string | number | boolean {
    // let fnN = "validateAny";
    // this.log(fnN, "");
    // this.log(fnN, "flag: %s | value: %s | validationArr: %s", flag, value, JSON.stringify(validationArr, null, 4));

    // check correct validator
    if ("any" !== validationArr[0]) {
      throw this.#getValidatorError("validateAny", "Validation type should be", validationArr[0]);
    }

    return value;
  }

  #validateRange(flag: string, value: number, validationArr: string[]): number {
    const fnN = "validateRange";
    // this.log(fnN, "");
    this.log(fnN, "flag: %s | value: %s | validationArr: %s", flag, value, JSON.stringify(validationArr, null, 4));

    // check correct validator
    if ("range" !== validationArr[0]) {
      throw this.#getValidatorError("validateRange", "Wrong validator", validationArr[0]);
    }

    if ("int" !== validationArr[1] && "float" !== validationArr[1]) {
      throw this.#getValidatorError("validateRange", "Range validator only works with int or float", validationArr[1]);
    }

    const min = validationArr[2];
    const max = validationArr[3];

    if ("number" !== typeof min) {
      throw this.#getValidatorError("validateRange", "Min must be number", min);
    }

    if ("number" !== typeof max) {
      throw this.#getValidatorError("validateRange", "Max must be number", max);
    }

    if (value < min || value > max) {
      this.log(fnN, "%s must be between %s and %s got %s", flag, min, max, value);
      this.#addError(flag, super.ns.sprintf("Must be between %s and %s got %s", min, max, value));
      throw new Error();
    }

    return value;
  }

  #validateMatch(flag: string, value: string | number | boolean, validationArr: string[]): string | number | boolean {
    // const fnN = "validateMatch";
    // this.log(fnN, "");
    // this.log(fnN, "flag: %s | value: %s | validationArr: %s", flag, value, JSON.stringify(validationArr, null, 4));

    // check correct validator
    if ("match" !== validationArr[0]) {
      throw this.#getValidatorError("validateMatch", "Wrong validator", validationArr[0]);
    }

    let cmpArr;

    if (validationArr.length == 5) {
      const min = validationArr[2];
      const max = validationArr[3];
      cmpArr = validationArr[4];

      if ("number" !== typeof min) {
        throw this.#getValidatorError("validateMatch", "Min must be number", min);
      }

      if ("number" !== typeof max) {
        throw this.#getValidatorError("validateMatch", "Max must be number", max);
      }

      if (Array.isArray(value)) {
        if (value.length < min) {
          this.#addError(flag, super.ns.sprintf("Too few values, select between %s and %s values; you selected %s", min, max, value.length));
          throw new Error();
        }
        else if (value.length > max) {
          this.#addError(flag, super.ns.sprintf("Too many values, select between %s and %s values; you selected %s", min, max, value.length));
          throw new Error();
        }
        else {
          for (const arrVal of value) {
            if (!cmpArr.includes(arrVal)) {
              this.#addError(flag, super.ns.sprintf("Invalid value: %s", arrVal));
              throw new Error();
            }
          }
        }
      }
    }
    else {
      cmpArr = validationArr[2];

      if (Array.isArray(value)) {
        if (value.length > 1) {
          this.#addError(flag, super.ns.sprintf("Select just one from [%s]", cmpArr));
          throw new Error();
        }
        else {
          value = value[0];
        }
      }

      if (!cmpArr.includes(value)) {
        this.#addError(flag, super.ns.sprintf("Invalid value: %s", value));
        throw new Error();
      }
    }

    return value;
  }

  #checkType(isRequired: boolean, reqType: string, value: string | number | boolean, flag: string): string | number | boolean {
    // let fnN = "checkType";
    // this.log(fnN, "");
    // this.log(fnN, "isRequired: %s | reqType: %s | value: %s | flag: %s", isRequired, reqType, value, flag);

    switch (reqType) {
      case "string":
        return this.#checkString(value, isRequired, flag);
      case "boolean":
        return this.#checkBoolean(value, isRequired, flag);
      case "int":
        return this.#checkInt(value, isRequired, flag);
      case "float":
        return this.#checkFloat(value, isRequired, flag);
      default:
        // throw special error for unsupported type
        throw new F42UnknownTypeError(super.ns.sprintf("!! Invalid type for %s got %s", flag, reqType));
    }
  }

  #checkString(value: string | number | boolean, isRequired: boolean, flag: string): string {
    // let fnN = "checkString";
    // this.log(fnN, "");
    // this.log(fnN, "value: %s | isRequired: %s | flag: %s", value, isRequired, flag);

    const gotType = typeof value;

    if (gotType === "string") {
      if (isRequired && value === "") {
        this.#addError(flag, super.ns.sprintf("Must be non-empty string, found empty string"));
        throw new Error();
      }
      else {
        return value;
      }
    }
    else if (Array.isArray(value)) {
      // all arrays will be string arrays, so just check not empty
      // if required
      if (isRequired && value.length == 0) {
        this.#addError(flag, super.ns.sprintf("Must be non-empty string, found empty array"));
        throw new Error();
      }
      else {
        return value;
      }
    }
    else {
      this.#addError(flag, super.ns.sprintf("Must be string, found %", gotType));
      throw new Error();
    }
  }

  #checkBoolean(value: string | number | boolean, isRequired: boolean, flag: string): boolean {
    const gotType = typeof value;

    if (gotType === "boolean") {
      if (isRequired && value === false) {
        this.#addError(flag, super.ns.sprintf("You must select this flag"));
        throw new Error();
      }
      else {
        return value;
      }
    }
    else {
      this.#addError(flag, super.ns.sprintf("Must be boolean, found %", gotType));
      throw new Error();
    }
  }

  #checkInt(value: string | number | boolean, isRequired: boolean, flag: string): number | number[] {
    const fnN = "checkInt";
    // this.log(fnN, "");
    this.log(fnN, "value: %s | isRequired: %s | flag: %s", value, isRequired, flag);

    if (Array.isArray(value)) {
      if (isRequired && value.length == 0) {
        this.#addError(flag, "Must be non-empty int, found empty array");
        throw new Error();
      }
      else {
        const cleanArr = [];

        for (const dirtyVal of value) {
          cleanArr.push(this.#cleanInt(dirtyVal, flag));
        }

        this.log(fnN, "cleanArr[0]: %s (%s)", cleanArr[0], (typeof cleanArr[0]));

        return cleanArr;
      }
    }
    else if (value === "" && isRequired) {
      this.#addError(flag, "Must be non-empty int, found empty string");
      throw new Error();
    }
    else {
      return this.#cleanInt(value, flag);
    }
  }

  #cleanInt(value: string | number | boolean, flag: string): number {
    const fnN = "cleanInt";
    this.log(fnN, "");
    // this.log(fnN, "value: %s - %s", value, value.indexOf('.'));

    if (value.indexOf('.') != -1) {
      this.#addError(flag, "Must be int, got possible float");
      throw new Error();
    }

    const intVal = parseInt(value);

    if (Number.isNaN(intVal)) {
      this.#addError(flag, "Must be int, got NaN");
      throw new Error();
    }
    else {
      // valid int
      return intVal;
    }
  }

  #checkFloat(value: string | number | boolean, isRequired: boolean, flag: string): number | number[] {
    if (Array.isArray(value)) {
      if (value.length == 0) {
        this.#addError(flag, "Must be non-empty float, found empty array");
        throw new Error();
      }
      else {
        const cleanArr = [];

        for (const dirtyVal of value) {
          cleanArr.push(this.#cleanFloat(dirtyVal, flag));
        }

        return cleanArr;
      }
    }
    else if (value === "" && isRequired) {
      this.#addError(flag, "Must be non-empty float, found empty string");
      throw new Error();
    }
    else {
      return this.#cleanFloat(value, flag);
    }
  }

  #cleanFloat(value: string | boolean | number, flag: string): number {
    const floatVal = parseFloat(value);

    if (Number.isNaN(floatVal)) {
      this.#addError(flag, "Must be float, got NaN");
      throw new Error();
    }
    else {
      // valid float
      return floatVal;
    }
  }

  #addError(flag: string, errorMsg: string): void {
    const fnN = "addError";
    // this.log(fnN, "");
    this.log(fnN, "flag: %s | errorMsg: %s", flag, errorMsg);

    flag = flag.formatAsFlag();

    if (!(flag in this.#errorList)) {
      this.#errorList[flag] = [];
    }

    this.#errorList[flag].push(errorMsg);
    this.#hasError = true;

    this.log(fnN, "errorList: %s", JSON.stringify(this.#errorList, null, 4));
  }

  #getValidatorError(validatorName: string, errStr: string, wrong: string): F42ValidatorError {
    const fnN = "getValidatorError";
    this.log(fnN, "");
    // this.log(fnN, "validatorName: %s | errStr: %s | wrong: %s", validatorName, errStr, wrong);

    return new F42ValidatorError(super.ns.sprintf("!! F42CLFlagValidator.%s: %s: %s !!", validatorName, errStr, wrong));
  }
}

class F42UnknownTypeError extends Error {
  constructor(message) {
    super(message);
  }
}

class F42ValidatorError extends Error {
  constructor(message) {
    super(message);
  }
}

// [
//   ["target", "", true, "Target hostname", ["any", "string"]],
//   ["threads", 1, false, "Thread count, defaults to 1", ["range", "number", 1, 999999]],
//   ["smile", false, false, "Should smile, defaults to false", ["any", "boolean"]],
//   ["o", 16, false, "Number of onions to buy, defaults to 16", ["range", "number", 15, 17]],
//   ["ram", 16, false, "Number of onions to buy, defaults to 16", ["match", "number", 1, 1, [8, 16, 32, 64, 128]]],
//   ["a", "", true, "Animal to ride", ["match", "string", 1, 1, ["cat", "dog", "mouse"]]],
//   ["b", "", false, "Second animal to ride", ["match", "string", 1, 1, ["cat", "dog", "mouse"]]],
//   ["pet", [], true, "Pet, min 3 max 5 from: ", ["match", "string", 3, 5, ["fish", "elephant", "tiger", "horse", "donkey", "lion", "shark", "eagle", "sparrow"]]],
// ]