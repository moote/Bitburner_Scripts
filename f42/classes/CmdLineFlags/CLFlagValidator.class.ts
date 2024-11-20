import { StrClFlag, IntClFlag, FloatClFlag, BoolClFlag, StrArrClFlag, CLFlag } from "f42/classes/CmdLineFlags/CLFlag.class";
import { AllowedFlagValue_Type, NSFlag_Type } from "f42/classes/CmdLineFlags/CLFlagUtilities";
import FeedbackRenderer from "/f42/classes/FeedbackRenderer";

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
    defaultVal = ""
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
    // this.#ns.printf(">> validateFlags: ");
    return this.#loadNsFlags();
  }

  isflagSet(flag: string): boolean {
    let flagObj: FlagObject_Type;

    try{
      flagObj = this.#getFlagObject(flag);
    }
    catch(e){
      return false;
    }

    return flagObj.isSet;
  }

  getFlagString(flag: string): string {
    return <string>this.#getFlagValue(flag);
  }

  getFlagNumber(flag: string): number {
    return <number>this.#getFlagValue(flag);
  }

  getFlagBoolean(flag: string): boolean {
    return <boolean>this.#getFlagValue(flag);
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

  renderHelpAndErrors(feedback: FeedbackRenderer): void {
    feedback.printSubTitle("Command Line Flags:");

    // help
    for (const flagObj of this.#flags) {
      feedback.printf("%s %s", flagObj.flagWithDashes, flagObj.description);
    }

    if (this.#hasError) {
      feedback.printSubTitle("Errors");

      // errors
      for (const flag in this.#errorList) {
        for (const errMsg of this.#errorList[flag]) {
          try{
            const flagObj = this.#getFlagObject(flag);
            feedback.printErr("%s >> %s", flagObj.flagWithDashes, errMsg);
          }
          catch(e){
            feedback.printErr("%s >> %s", flag, errMsg);
          }
        }
      }
    }
  }

  debug(): string {
    let debug = "";

    for(const flagObj of this.#flags){
      debug += `${flagObj.flag} >> cleanValue: ${flagObj.cleanValue}\n`;
    }

    debug += `\n\nformatFlagsForNS(): ${JSON.stringify(this.#formatFlagsForNS(), null, 2)}`;

    debug += `\n\nns.flags(): ${JSON.stringify(this.#nsFlags, null, 2)}`;

    return debug;
  }

  #addFlag(flagObj: FlagObject_Type): void {
    // add flag object to list and record index
    this.#flagIndexes[flagObj.flag] = this.#flags.push(flagObj) - 1;
  }

  #getFlagObject(flag: string): FlagObject_Type {
    if (typeof this.#flags !== "undefined" && flag in this.#flagIndexes) {
      return this.#flags[this.#flagIndexes[flag]];
    }
    else {
      throw new Error(`Not a valid flag! missing: ${flag} >> flags:\n\n${JSON.stringify(this.#flagIndexes, null, 2)}`);
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
    // this.#ns.printf(">> loadNsFlags: %s", (typeof this.#nsFlags));

    if (typeof this.#nsFlags === "undefined") {
      // add help flags
      this.addBooleanFlag("help", "Show help text");
      this.addBooleanFlag("h", "Show help text");

      // this.#ns.printf(">> loadNsFlags: ");

      // load and validate
      this.#nsFlags = this.#ns.flags(this.#formatFlagsForNS());

      // copy #nsFlags
      for (const flagObj of this.#flags) {
        if (flagObj.flag in this.#nsFlags) {

          // this.#ns.printf(">> loadNsFlags: flagObj.flag: %s | this.#nsFlags[flag]: %s ", flagObj.flag, JSON.stringify(this.#nsFlags[flagObj.flag]));

          if (!flagObj.validate(this.#nsFlags[flagObj.flag])) {
            this.addError(flagObj.flag, flagObj.errorMsg);
          }

          // test if help request
          if (flagObj.isHelpRequest && flagObj.cleanValue === true) {
            // set flag and stop loading
            this.#helpRequested = true;
            this.#hasError = false;
            return false;
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
