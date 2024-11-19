import { StrClFlag, IntClFlag, FloatClFlag, BoolClFlag, StrArrClFlag } from "f42/classes/CmdLineFlags/CLFlag.class";
import { AllowedFlagValue_Type } from "f42/classes/CmdLineFlags/CLFlagUtilities";

type FlagObject_Type = StrClFlag | IntClFlag | FloatClFlag | BoolClFlag | StrArrClFlag;
type ErrorList_Type = { [key: string]: string[] };

export default class CmdLineFlagValidator {
  #ns: NS;
  #flags: FlagObject_Type[];
  #flagIndexes: { [key: string]: number };
  #nsFlags: { [key: string]: AllowedFlagValue_Type } | undefined;
  #isValidated: boolean;
  #hasError: boolean;
  #helpRequested: boolean;
  #errorList: ErrorList_Type;

  constructor(ns: NS) {
    this.#ns = ns;
    this.#flags = [];
    this.#flagIndexes = {};
    this.#isValidated = false;
    this.#hasError = false;
    this.#errorList = {};
    this.#helpRequested = false;
  }

  get hasError(): boolean {
    return this.#hasError;
  }

  get errorList(): { [key: string]: string[] } {
    return this.#errorList;
  }

  get helpRequested(): boolean {
    //TODO:
    return this.#helpRequested;
  }

  get isValidated(): boolean {
    return this.#isValidated;
  }

  get shouldRenderHelpErrors(): boolean {
    if(this.#hasError || this.#helpRequested){
      return true;
    }
    else{
      return false;
    }
  }

  addStringFlag(
    flag: string,
    description: string,
    isRequired = false,
    defaultVal: ""
  ): void {
    this.#addFlag(new StrClFlag(flag, description, isRequired, defaultVal));
  }

  addIntFlag(
    flag: string,
    description: string,
    isRequired = false,
    defaultVal = 0
  ): void {
    this.#addFlag(new IntClFlag(flag, description, isRequired, defaultVal));
  }

  addFloatFlag(
    flag: string,
    description: string,
    isRequired = false,
    defaultVal = 0
  ): void {
    this.#addFlag(new FloatClFlag(flag, description, isRequired, defaultVal));
  }

  addBooleanFlag(
    flag: string,
    description: string
  ): void {
    this.#addFlag(new BoolClFlag(flag, description));
  }

  addStrArrFlag(
    flag: string,
    description: string,
    isRequired = false,
  ): void {
    this.#addFlag(new StrArrClFlag(flag, description, isRequired));
  }

  /**
   * 
   * @returns True if all flags valid, false if errors OR help request found
   */
  validateFlags(): boolean {
    return this.#loadNsFlags();
  }

  getFlagString(flag: string): string {
    return <string>this.#getFlagValue(flag);
  }

  getFlagNumber(flag: string): number {
    return <number>this.#getFlagValue(flag);
  }

  getFlagBoolean(flag: string): number {
    return <number>this.#getFlagValue(flag);
  }

  getFlagStringArr(flag: string): string[] {
    return <string[]>this.#getFlagValue(flag);
  }

  addError(flag: string, errMsg: string): void {
    if (!this.#errorList[flag]) {
      this.#errorList[flag] = [];
    }

    this.#errorList[flag].push(errMsg);
    this.#hasError = true;
  }

  renderHelpAndErrors(): string {
    let output = "";

    // help
    for (const flagObj of this.#flags) {
      output += `${flagObj.flagFull} ${flagObj.description}\n`;
    }

    if (this.#hasError) {
      output += "\n";

      // errors
      for (const flag in this.#errorList) {
        for (const errMsg of this.#errorList[flag]) {
          output += `ERROR: ${this.#getFlagObject(flag).flagFull} ${errMsg}\n`;
        }
      }
    }

    return output;
  }

  #addFlag(flagObj: FlagObject_Type) {
    // add flag object to list and record index
    this.#flagIndexes[flagObj.flag] = this.#flags.push(flagObj) - 1;
  }

  #getFlagObject(flag: string): FlagObject_Type {
    if (typeof this.#flags !== "undefined" && flag in this.#flagIndexes) {
      return this.#flags[this.#flagIndexes[flag]];
    }
    else {
      throw new Error("Not a valid flag! missing: " + flag);
    }
  }

  #getFlagValue(flag: string): AllowedFlagValue_Type {
    const flagObj = this.#getFlagObject(flag);

    if (!flagObj.isValid) {
      throw new Error("Not a valid flag! invalid: " + flag);
    }
    else {
      return flagObj.cleanValue;
    }
  }

  /**
   * Load flags from ns.flags()
   * 
   * @returns True if flags loaded, false if errors OR help
   *          request flag found
   */
  #loadNsFlags(): boolean {
    if (typeof this.#nsFlags === undefined) {
      // add help flags
      this.addBooleanFlag("help", "Show help text");
      this.addBooleanFlag("h", "Show help text");

      // load and validate
      this.#nsFlags = this.#ns.flags(this.#formatFlagsForNS());

      // copy #nsFlags
      for (const flagObj of this.#flags) {
        if (flagObj.flag in this.#nsFlags) {
          // only validate if not a standard help request
          if (flagObj.isHelpRequest) {
            // set flag and stop loading
            this.#helpRequested = true;
            this.#hasError = false;
            return false;
          }
          if (!flagObj.validate(this.#nsFlags[flagObj.flag])) {
            this.addError(flagObj.flag, flagObj.errorMsg);
          }
        }
        else if (flagObj.validateMissing()) {
          this.addError(flagObj.flag, flagObj.errorMsg);
        }
      }

      // overall validation flag
      this.#isValidated = true;
    }

    return !this.#hasError;
  }

  #formatFlagsForNS(): NSFlag_Type[] {
    const flagsForNs: NSFlag_Type[] = [];

    for (const flagObj of this.#flags) {
      flagsForNs.push(flagObj.nsFlagArr);
    }

    return flagsForNs;
  }
}
