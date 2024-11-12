import F42Logger from '/f42/classes/f42-logger-class';
import F42CLFlagValidator from 'f42/classes/f42-cl-flag-validator-class';

export const F42_ANSI_COL_H1 = "\x1b[38;5;207m";
export const F42_ANSI_COL_H2 = "\x1b[38;5;219m";
export const F42_ANSI_COL_HILI = "\x1b[38;5;212m";
export const F42_ANSI_COL_TXT = "\x1b[38;5;224m";
export const F42_ANSI_COL_ERR = "\x1b[31m";

/**
 * Utility class for writing script feeback massages to user
 */
export default class F42Feedback {
  #logger: F42Logger;
  #feedbackKey: string;
  #title: string;
  #desc: string;
  #clFlagValidator: F42CLFlagValidators;
  #userDefErrors = [];

  static feedbackFactory(logger: F42Logger, feedbackKey: string, title: string, desc: string, clFlagsHelpArr: Array[string[]]): F42Feedback {
    // init feedback object
    const feedback = new F42Feedback(logger, feedbackKey, title, desc);

    // add default help flag
    clFlagsHelpArr.push(["help", false, false, "Show help text", ["any", "boolean"]]);
    clFlagsHelpArr.push(["h", false, false, "Show help text", ["any", "boolean"]]);

    // set the flags arr; also triggers parse and validation
    feedback.clFlagsHelpArr = clFlagsHelpArr;

    // return feedback object 
    return feedback;
  }

  /**
   * Constructor
   * 
   * @param {F42Logger} logger - The required logging class
   */
  constructor(logger: F42Logger, feedbackKey: string, title: string, desc: string) {
    this.#logger = logger;
    this.#feedbackKey = feedbackKey;
    this.#title = title;
    this.#desc = desc;
    this.#clFlagValidator = new F42CLFlagValidator(this.#logger.ns, this.#logger);
  }

  set clFlagsHelpArr(clFlagsHelpArr: Array[string[]]) {
    this.#clFlagValidator.parseClFlags(clFlagsHelpArr);
  }

  set title(val: string) {
    this.#title = val;
  }

  get ns(): NS {
    return this.#logger.ns;
  }

  get logger(): F42Logger {
    return this.#logger;
  }

  get parsedClFlags(): { [key: string]: string | boolean | number } {
    return this.#clFlagValidator.parsedClFlags;
  }

  getFlag(flag: string): string | boolean | number {
    return this.#clFlagValidator.parsedClFlags[flag];
  }

  /**
   * Render the title of the script
   */
  printTitle(withDesc = true): void {
    this.#doFeedback("\n");
    this.printLineSeparator(F42_ANSI_COL_H1);
    this.#doFeedback(F42_ANSI_COL_H1 + this.#title);
    this.printLineSeparator(F42_ANSI_COL_H1);
    if (withDesc && this.#desc !== "") {
      this.#doFeedback(F42_ANSI_COL_TXT + this.#desc);
      this.printLineSeparator();
    }
  }

  printSubTitle(msgTemplate: string, ...msgArgs: (string|number|boolean)[]): void {
    this.printLineSeparator(F42_ANSI_COL_H2);
    this.#doFeedback(F42_ANSI_COL_H2 + msgTemplate, msgArgs);
    this.printLineSeparator(F42_ANSI_COL_H2);
  }

  printHiLi(msgTemplate: string, ...msgArgs: (string|number|boolean)[]): void {
    this.#doFeedback(F42_ANSI_COL_HILI + msgTemplate, ...msgArgs);
  }

  /**
   * Render script feedback to command line / tail window
   * 
   * @param {any[]} msgArgs
   */
  print(...msgArgs: (string|number|boolean)[]): void {
    this.#doFeedback(F42_ANSI_COL_TXT + msgArgs.join(""));
  }

  /**
   * Render script feedback to command line / tail window
   * 
   * @param {string} format
   * @param {any[]} msgArgs
   */
  printf(format: string, ...msgArgs: (string|number|boolean)[]): void {
    this.#doFeedback(F42_ANSI_COL_TXT + format, ...msgArgs);
  }

  /**
   * Helper function to render comandline flags and associated help text
   */
  printUsageInfo(): void {
    this.printLineSeparator();

    if (this.#clFlagValidator.hasClFlagHelpMessage) {
      this.#doFeedback(F42_ANSI_COL_HILI + "Command line flags:");
      this.#doFeedback(F42_ANSI_COL_HILI + this.#clFlagValidator.clFlagHelpMessage);
    }
    else {
      this.#doFeedback(F42_ANSI_COL_HILI + "No command line flags for this script");
    }
  }

  /**
   * Helper function to separate lines (default green)
   */
  printLineSeparator(colour = F42_ANSI_COL_TXT): void {
    this.#doFeedback(colour + "----------------");
  }

  /**
   * Error render function
   */
  printErr(errorMsg: string, ...errorMsgArgs: (string|number|boolean)[]): void {
    this.#doFeedback(F42_ANSI_COL_ERR + errorMsg, ...errorMsgArgs);
  }

  /**
   * Helper function to end output
   */
  printEnd(): void {
    this.printLineSeparator();
    this.#doFeedback(F42_ANSI_COL_TXT + "END\n\n");
  }

  /**
   * Is automatically called by Logger if help
   * cl argument found; do not call manually
   */
  printHelpAndEnd(): void {
    if (this.#clFlagValidator.helpRequested) {
      this.printTitle();
      this.printUsageInfo();
      this.printEnd();
      return true;
    }
    else {
      return false;
    }
  }

  printFlags(): void {
    for (const flag in this.#clFlagValidator.parsedClFlags) {
      if ("_" == flag) continue;

      if (Array.isArray(this.#clFlagValidator.parsedClFlags[flag])) {
        const typeArr = [];
        const typeStr = [];
        for (const val of this.#clFlagValidator.parsedClFlags[flag]) {
          typeArr.push(typeof val);
          typeStr.push("%s");
        }

        this.#doFeedback(
          F42_ANSI_COL_HILI + ">> %s: %s [" + typeStr.join("|") + "]",
          flag.formatAsFlag(),
          this.#clFlagValidator.parsedClFlags[flag],
          ...typeArr
        );
      }
      else {
        this.#doFeedback(
          F42_ANSI_COL_HILI + ">> %s: %s (%s)",
          flag.formatAsFlag(),
          this.#clFlagValidator.parsedClFlags[flag],
          (typeof this.#clFlagValidator.parsedClFlags[flag])
        );
      }
    }
  }

  addUserDefError(flag: string, errorMsg: string, ...errArgs: (string|number|boolean)[]): void {
    if (!(flag in this.#userDefErrors)) {
      this.#userDefErrors[flag] = [];
    }

    if (this.parsedClFlags[flag.substr(1)]) {
      errorMsg = this.#logger.ns.sprintf("(%s) %s", this.parsedClFlags[flag.substr(1)], errorMsg);
    }
    else if (this.parsedClFlags[flag.substr(2)]) {
      errorMsg = this.#logger.ns.sprintf("(%s) %s", this.parsedClFlags[flag.substr(2)], errorMsg);
    }

    if (errArgs.length > 0) {
      errorMsg = this.#logger.ns.sprintf(errorMsg, ...errArgs);
    }

    this.#userDefErrors[flag].push(errorMsg);
  }

  addUserDefErrorAndEnd(flag: string, errorMsg: string, ...errArgs: (string|number|boolean)[]): void {
    this.addUserDefError(flag, errorMsg, ...errArgs);
    this.printFlagErrorsAndEnd(true);
  }

  /**
   * Is automatically called by Logger if validation 
   * errors found; do not call manually
   */
  printFlagErrorsAndEnd(force = false): void {
    if (this.#clFlagValidator.hasError || force) {
      this.printTitle();
      this.printUsageInfo();
      this.#printFlagErrors();
      this.#printFlagErrors(true);
      this.printEnd();
      return true;
    }
    else {
      return false;
    }
  }

  #printFlagErrors(userDefined = false): void {
    this.printLineSeparator();

    let errorList = this.#clFlagValidator.errorList;

    if (userDefined) {
      errorList = this.#userDefErrors;
    }

    for (const flag in errorList) {
      for (const err of errorList[flag]) {
        this.#doFeedback(F42_ANSI_COL_ERR + "%s %s", flag, err);
      }
    }
  }

  #doFeedback(msgTemplate: string, ...msgArgs: (string|number|boolean)[]): void {
    // this.#logger.doFeedback(this.#feedbackKey, "%s %s %d", "forty", "two", 42);
    this.#logger.doFeedback(this.#feedbackKey, msgTemplate, ...msgArgs);
  }
}