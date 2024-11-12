import F42Logger from "f42/classes/F42Logger";

const LOGL_PREFIX = "\x1b[38;5;213m<logl>\u001b[0m ";

/**
 * Base class for all F42 classes; provides generic
 * functionality needed by all
 * 
 */
export default class F42Base {
  #ns: NS;
  #logger: F42Logger;
  allowedLogFunctions: string[];
  onlyVerboseLogs: boolean;
  #logLinks: { [key: string]: LogL; };

  /**
   * 
   * @param logger Logging instance
   * @param serialObj Serialized version of a class instance to unserialize with
   */
  constructor(logger: F42Logger) {
    this.#ns = logger.ns;
    this.#logger = logger;
    this.log("constructor", "Init");

    // this.allowedLogFunctions = ["ALL"];
    this.allowedLogFunctions = [];
    this.onlyVerboseLogs = false;
    this.#logLinks = {};
  }

  get ns(): NS {
    return this.#ns;
  }

  get logger(): F42Logger {
    return this.#logger;
  }

  getLo(logFlag: string, msgTemplate = "", ...msgArgs: string[]): LogL {
    if (!(logFlag in this.#logLinks)) {
      this.#logLinks[logFlag] = new LogL(this, logFlag);
    }

    this.#logLinks[logFlag].g(msgTemplate, ...msgArgs);

    return this.#logLinks[logFlag];
  }

  /**
   * Logging functions
   * 
   * @returns {string} Returns the supplied function name
   */
  log(functionName: string, msgTemplate = "", ...msgArgs: string[]): void {
    return this.#doLog(false, functionName, msgTemplate, ...msgArgs);
  }

  /**
   * Only to be called from LogL class
   */
  loglLog(functionName: string, msgTemplate = "", ...msgArgs: string[]): void {
    return this.#doLog(true, functionName, msgTemplate, ...msgArgs);
  }

  #doLog(isLogl: boolean, functionName: string, msgTemplate = "", ...msgArgs: string[]): string {
    if (this.onlyVerboseLogs && (!msgTemplate || msgTemplate == "")) {
      return functionName;
    }

    if (this.allowedLogFunctions[0] != "ALL") {
      if (!this.allowedLogFunctions.includes(functionName)) {
        return functionName;
      }
    }

    if (this.#logger.writeLog) {
      let logTmp = "%s.%s -> %s";

      if (isLogl) {
        logTmp = LOGL_PREFIX + logTmp;
      }

      msgTemplate = sprintf(logTmp, this.constructor.name, functionName, msgTemplate);
      this.#logger.log(msgTemplate, ...msgArgs);
    }

    return functionName;
  }

  /**
   * Use this function to write feedback from a class
   */
  feedback(msg: string, ...msgArgs: string[]): void {
    if (this.#logger.feedback) {
      this.#logger.feedback.printf(msg, ...msgArgs);
    }
  }

  // \\\\\\\\\\\\\\\
  // serialization
  // ///////////////
  /**
   * Static helper function for consistent use of JSON.stringify
   * Can be called from any non-F42Base inheriting code
   * 
   * @returns {string}
   */
  static stringify(obj: F42BaseInterface): string {
    return JSON.stringify(obj, null, 2);
  }

  /**
  * Helper function for consistent use of JSON.stringify
  * Can be called from any F42Base inheriting class instances
  * 
  * @returns {string}
  */
  stringify(obj: F42BaseInterface): string {
    return F42Base.stringify(obj);
  }
}

export class LogL {
  #f42Base: F42Base;
  #logFlag: string;

  /**
   * 
   * @param {F42Base} f42Base Instance of F42Base class
   * @param {string} logFlag A flag to use for all logging through this link, usually the function name
   * 
   */
  constructor(f42Base: F42Base, logFlag: string) {
    this.#f42Base = f42Base;
    this.#logFlag = logFlag;
  }

  /**
   * @param {string} msgTemplate Optional message template in sprintf format
   * @param {(any|[any])} msgArgs Optional args to populate the template
   */
  g(msgTemplate = "", ...msgArgs: string[] | number[]): void {
    this.#f42Base.loglLog(this.#logFlag, msgTemplate, ...msgArgs);
  }
}