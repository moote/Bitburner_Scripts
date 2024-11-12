import F42Feedback from '/scripts/classes/f42-feedback-class.js';
import { timestampAsBase62Str } from "/scripts/utility/utility-functions.js";

const F42Logger_DEBUG = false; // set true to prepend all logs/feedbacks with identifier

/**
 * Utility class to control logging
 */
export default class F42Logger {
  #ns;
  #feedback;
  #feedbackKey;
  #firstCall = true; // flag for displaying title on first call

  #writeLog = false; // false: no log written; true: log written
  #writeFeedback = false; // false: no feedback written; true: feedback with no title; string: feedback with title
  #title = ""; // the title of the tail window (if used) and the feedback title
  #toTerminal = true // true: output to terminal (ns.tprintf), else log with ns.printf
  #doTail = false // true: auto open tail, false no tail; can only be true if this.#toTerminal == false
  #tailTitle = false; // title of the tail window (if using it); false then will default to title, otherwise set a string

  constructor(ns, writeLog = false, toTerminal = true, doTail = false, tailTitle = false, disableSystemLog = false) {
    this.#ns = ns;
    this.#writeLog = writeLog;
    this.#toTerminal = toTerminal;

    if (this.#toTerminal) {
      this.#doTail = false;
    }
    else {
      this.#doTail = doTail;
    }

    this.tailTitle = tailTitle;

    if (disableSystemLog) {
      ns.disableLog("ALL");
    }
  }

  get isDebug() {
    return F42Logger_DEBUG;
  }

  get ns() {
    return this.#ns;
  }

  get feedback() {
    return this.#feedback;
  }

  get writeLog() {
    return this.#writeLog;
  }

  get writeFeedback() {
    this.#feedback.writeFeedback;
  }

  get firstCall() {
    return this.#firstCall;
  }

  get title() {
    return this.#title;
  }

  get toTerminal() {
    return this.#toTerminal;
  }

  get doTail() {
    return this.#doTail;
  }

  get tailTitle() {
    return this.#tailTitle;
  }

  set tailTitle(val) {
    this.#tailTitle = val;
    if (this.#tailTitle != false) {
      this.#ns.setTitle(this.#tailTitle);
    }
  }

  toString() {
    return this.#ns.sprintf("F42Logger");
  }

  /**
   * Stop tailing and logging to terminal;
   * useful if running script from another process
   */
  setQuietMode() {
    this.#doTail = false;;
    this.#toTerminal = false;
    this.#writeLog = false;
    this.ns.closeTail();
  }

  /**
   * Init and return the feebback object
   * 
   * @return {F42Feedback} - The feedback object
   */
  initFeedback(title, desc, flagHelpArr) {
    if (this.#feedback) {
      throw new Error("!! F42Logger.initFeedback: feedback object already initialised!");
    }

    // generate a feedback key and create fb object
    this.#feedbackKey = timestampAsBase62Str();
    this.#feedback = F42Feedback.feedbackFactory(this, this.#feedbackKey, title, desc, flagHelpArr);

    if (this.#feedback.printHelpAndEnd()) {
      // stop further execution
      return false;
    }
    else if (this.#feedback.printFlagErrorsAndEnd()) {
      // stop further execution
      return false;
    }

    // no help or errors, return feedback object
    return this.#feedback;
  }

  /**
   * Called wehn making first call from feedback object
   */
  doFirstCall() {
    if (this.#firstCall) {
      if (this.#doTail) {
        this.#ns.tail();
      }

      this.#firstCall = false;
    }
  }

  /**
   * Render script feedback to command line tail window
   * 
   * @return bool True if log written, false if suppressed (this.#writeLog ===  false)
   */
  log(msgTemplate, ...msgArgs) {
    if (!this.#writeLog) return false;

    this.#doLog(msgTemplate, ...msgArgs);

    return true;
  }

  /**
   * Error render function
   * 
   * @return bool True if log written, false if suppressed (this.#writeLog ===  false)
   */
  logError(errorMsg, ...errorMsgArgs) {
    if (!this.#writeLog) return false;

    this.#doLog("ERROR " + errorMsg, errorMsgArgs);
  }

  /**
   * Feeback function for feedback object; should only be called
   * by feedback object!!
   */
  doFeedback(feedbackKey, msgTemplate, ...msgArgs) {
    if (feedbackKey !== this.#feedbackKey) {
      let errMsg = "!! Illegal call of F42Logger.doFeedback(): can only be called from the associated feedback object !!";
      this.#ns.print(errMsg);
      throw new Error(errMsg);
    }

    if (!this.#feedback) return false;

    if (F42Logger_DEBUG) {
      msgTemplate = this.#ns.sprintf("F42Feedback >> %s", msgTemplate);
    }

    this.#doLog(msgTemplate, ...msgArgs);
  }

  /**
   * Core logging function
   */
  #doLog(msgTemplate, ...msgArgs) {
    this.doFirstCall();

    if (F42Logger_DEBUG) {
      msgTemplate = this.#ns.sprintf("F42Logger >> %s", msgTemplate);
    }

    if (this.#doTail || !this.#toTerminal) {
      this.#ns.printf(msgTemplate, ...msgArgs);
    }
    else {
      this.#ns.tprintf(msgTemplate, ...msgArgs);
    }
  }
}