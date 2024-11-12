const LOGL_PREFIX = "\x1b[38;5;213m<logl>\u001b[0m ";

/**
 * Base class for all F42 classes; provides generic
 * functionality needed by all. Loggings, ns
 * 
 * @param {Interface<NetScript>} ns - The NetScript interface object
 * @param {F42Logger} logger - An optional logging object
 */
export default class F42Base {
  #ns;
  #logger;
  #initFromSerial = false;
  allowedLogFunctions;
  onlyVerboseLogs;
  #logLinks;

  constructor(ns, logger = undefined, serialObj = undefined) {
    // this.allowedLogFunctions = ["ALL"];
    this.allowedLogFunctions = [];
    this.onlyVerboseLogs = false;
    this.#logLinks = {};

    this.#ns = ns;
    this.#logger = logger;
    this.log("constructor", "Init");
  }

  /**
   * @returns {string}
   */
  toString() {
    return this.stringify(this.serialObjBasic);
  }

  get ns() {
    return this.#ns;
  }

  get logger() {
    return this.#logger;
  }

  get initFromSerial(){
    return this.#initFromSerial;
  }

  getLo(logFlag, msgTemplate = "", ...msgArgs) {
    if (!(logFlag in this.#logLinks)) {
      this.#logLinks[logFlag] = new LogL(this, logFlag);
    }

    this.#logLinks[logFlag].g(msgTemplate, ...msgArgs);

    return this.#logLinks[logFlag];
  }

  /**
   * Expose a 'protected' function
   * 
   * @deprecated Use F42Base.log() instead
   */
  _log(functionName, msgTemplate = "", ...msgArgs) {
    let depErr = "ERROR!! F42Base._log() deprecated, use F42Base.log() instead: %s.%s";
    this.#ns.tprintf(depErr, this.constructor.name, functionName);
    this.#ns.printf(depErr, this.constructor.name, functionName);

    this.log(functionName, msgTemplate, msgArgs);
  }

  /**
   * Logging functions
   * 
   * @returns {string} Returns the supplied function name
   */
  log(functionName, msgTemplate = "", ...msgArgs) {
    return this.#doLog(false, functionName, msgTemplate, ...msgArgs);
  }

  /**
   * Only to be called from 
   */
  loglLog(functionName, msgTemplate = "", ...msgArgs) {
    return this.#doLog(true, functionName, msgTemplate, ...msgArgs);
  }

  #doLog(isLogl, functionName, msgTemplate = "", ...msgArgs) {
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
  feedback(msg, ...msgArgs) {
    if (this.#logger.feedback) {
      this.#logger.feedback.printf(msg, ...msgArgs);
    }
  }

  // >>>>>>>>>>>>>>>>
  // serialization

  /**
   * Static helper function for consistent use of JSON.stringify
   * Can be called from any non-F42Base inheriting code
   * 
   * @returns {string}
   */
  static stringify(obj) {
    return JSON.stringify(obj, null, 2);
  }

  /**
  * Helper function for consistent use of JSON.stringify
  * Can be called from any F42Base inheriting class instances
  * 
  * @returns {string}
  */
  stringify(obj) {
    this.log("stringify");
    return F42Base.stringify(obj);
  }

  /**
   * Returns the serialized object, optioanlly as a string
   * 
   * @returns {(object|string)}
   */
  serialize(asStr = false) {
    if (asStr) {
      return this.stringify(this.serialObj);
    }
    else {
      return this.serialObj;
    }
  }

  /**
   * Override in inheriting class to return data needed
   * to properly serialize that instance
   * 
   * @returns {object}
   */
  get serialObj() {
    return {
      error: "Override F42Base get serialObj() in inheriting class: " + this.constructor.name,
    };
  }

  /**
   * This is used to output status info; should use reduced
   * version of serialObj
   */
  get serialObjBasic() {
    return {
      error: "Override get F42Base get serialObjBasic() in inheriting class: " + this.constructor.name,
    };
  }

  /**
   * Override in inheriting class to re-constitute
   * an instance from a serial string
   * 
   * @param {string} serialStr  Data neede to reconstitute a serialized object;
   *                            In JSON string format
   */
  unserialize(serialObj) {
    throw new Error("You have passed a serialStr to an instance of F42Base, but have not overridden 'unserialize'; required to re-constitute your instance correctly");
  }

  // serialization
  // <<<<<<<<<<<<<<<<
}

class LogL {
  #f42Base;
  #logFlag;

  /**
   * 
   * @param {F42Base} f42Base Instance of F42Base class
   * @param {string} logFlag A flag to use for all logging through this link, usually the function name
   * 
   */
  constructor(f42Base, logFlag) {
    this.#f42Base = f42Base;
    this.#logFlag = logFlag;
  }

  /**
   * 
   * @param {string} msgTemplate Optional message template in sprintf format
   * @param {(any|[any])} msgArgs Optional args to populate the template
   */
  g(msgTemplate = "", ...msgArgs) {
    this.#f42Base.loglLog(this.#logFlag, msgTemplate, ...msgArgs);
  }
}