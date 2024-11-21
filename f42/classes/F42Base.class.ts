import Logger from "/f42/classes/Logger.class";

const LOGL_PREFIX = "\x1b[38;5;213m<logl>\u001b[0m ";

/**
 * Base class for all F42 classes; provides generic
 * functionality needed by all
 * 
 * 
 */
export default class F42Base {
  #ns: NS;
  #logger: Logger;
  allowedLogFunctions: string[];
  onlyVerboseLogs: boolean;
  #logLinks: { [key: string]: LogL; };

  /**
   * 
   * @param logger Logging instance
   */
  constructor(logger: Logger) {
    this.#ns = logger.ns;
    this.#logger = logger;
    this.log("constructor", "Init");

    // this.allowedLogFunctions = ["ALL"];
    this.allowedLogFunctions = [];
    this.onlyVerboseLogs = true;
    this.#logLinks = {};
  }

  get ns(): NS {
    return this.#ns;
  }

  get logger(): Logger {
    return this.#logger;
  }

  /**
   * Enforce single instance
   */
  vaildateSingleton(): void {
    for (const psInfo of this.ns.ps()) {
      if (psInfo.filename == this.ns.getScriptName() && this.ns.pid != psInfo.pid) {
        throw new Error("Not started, already running; only one instance can run at a time.\n* Running instance not affected.");
      }
    }
  }

  getLo(logFlag: string, msgTemplate = "", ...msgArgs: any[]): LogL {
    if (!(logFlag in this.#logLinks)) {
      this.#logLinks[logFlag] = new LogL(this, logFlag);
    }

    this.#logLinks[logFlag].g(msgTemplate, ...msgArgs);

    return this.#logLinks[logFlag];
  }

  /**
   * Logging functions
   * 
   * @returns Returns the supplied function name
   */
  log(functionName: string, msgTemplate = "", ...msgArgs: string[]): string {
    return this.#doLog(false, functionName, msgTemplate, ...msgArgs);
  }

  /**
   * Only to be called from LogL class
   */
  loglLog(functionName: string, msgTemplate = "", ...msgArgs: (string | number)[]): string {
    return this.#doLog(true, functionName, msgTemplate, ...msgArgs);
  }

  #doLog(isLogl: boolean, functionName: string, msgTemplate = "", ...msgArgs: (string | number)[]): string {
    if (this.onlyVerboseLogs && (!msgTemplate || msgTemplate == "")) {
      return functionName;
    }

    if (!this.allowedLogFunctions || this.allowedLogFunctions.length === 0) {
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

      msgTemplate = this.ns.sprintf(logTmp, this.constructor.name, functionName, msgTemplate);
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
}

export class LogL {
  #f42Base: F42Base;
  #logFlag: string;

  /**
   * 
   * @param f42Base Instance of F42Base class
   * @param logFlag A flag to use for all logging through this link, usually the function name
   * 
   */
  constructor(f42Base: F42Base, logFlag: string) {
    this.#f42Base = f42Base;
    this.#logFlag = logFlag;
  }

  /**
   * @param msgTemplate Optional message template in sprintf format
   * @param msgArgs Optional args to populate the template
   */
  g(msgTemplate = "", ...msgArgs: any[]): void {
    this.#f42Base.loglLog(this.#logFlag, msgTemplate, ...msgArgs);
  }

  gF(msgTemplate = "", ...msgArgs: any[]): void {
    this.#f42Base.loglLog(this.#logFlag, msgTemplate, ...msgArgs);
    
    if(typeof this.#f42Base.logger.feedback !== "undefined"){
      this.#f42Base.logger.feedback.printf(msgTemplate, ...msgArgs); 
    }
  }

  gFHiLi(msgTemplate = "", ...msgArgs: any[]): void {
    this.#f42Base.loglLog(this.#logFlag, msgTemplate, ...msgArgs);

    if(typeof this.#f42Base.logger.feedback !== "undefined"){
      this.#f42Base.logger.feedback.printHiLi(msgTemplate, ...msgArgs); 
    }
  }

  gFErr(msgTemplate = "", ...msgArgs: any[]): void {
    this.#f42Base.loglLog(this.#logFlag, msgTemplate, ...msgArgs);

    if(typeof this.#f42Base.logger.feedback !== "undefined"){
      this.#f42Base.logger.feedback.printErr(msgTemplate, ...msgArgs); 
    }
  }

  /**
   * Log then throw an error with same message
   * 
   * @param msgTemplate Optional message template in sprintf format
   * @param msgArgs Optional args to populate the template
   */
  gThrowErr(msgTemplate = "", ...msgArgs: any[]): Error {
    this.#f42Base.loglLog(this.#logFlag, "ERROR Thrown: " + msgTemplate, ...msgArgs);
    return new Error(this.#f42Base.ns.sprintf(msgTemplate, ...msgArgs));
  }
}