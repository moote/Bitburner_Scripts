import F42Feedback from '/f42/classes/f42-feedback-class';
import { timestampAsBase62Str } from "f42/utility/utility-functions";

const F42Logger_DEBUG = false; // set true to prepend all logs/feedbacks with identifier

/**
 * Utility class to control logging
 */
export default class F42Logger {
  #ns: NS;
  #feedback: F42Feedback;
  #feedbackKey: string;
  #firstCall = true; // flag for displaying title on first call

  #writeLog = false; // false: no log written; true: log written
  #writeFeedback = false; // false: no feedback written; true: feedback with no title; string: feedback with title
  #title = ""; // the title of the tail window (if used) and the feedback title
  #toTerminal = true // true: output to terminal (ns.tprintf), else log with ns.printf
  #doTail = false // true: auto open tail, false no tail; can only be true if this.#toTerminal == false
  #tailTitle = false; // title of the tail window (if using it); false then will default to title, otherwise set a string

  constructor(ns: NS, writeLog = false, toTerminal = true, doTail = false, tailTitle = false, disableSystemLog = false) {
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

  get isDebug(): boolean {
    return F42Logger_DEBUG;
  }

  get ns(): NS {
    return this.#ns;
  }

  get feedback(): F42Feedback {
    return this.#feedback;
  }

  get writeLog(): boolean {
    return this.#writeLog;
  }

  get writeFeedback(): boolean {
    this.#feedback.writeFeedback;
  }

  get firstCall(): boolean {
    return this.#firstCall;
  }

  get title(): string {
    return this.#title;
  }

  get toTerminal(): boolean {
    return this.#toTerminal;
  }

  get doTail(): boolean {
    return this.#doTail;
  }

  get tailTitle(): string {
    return this.#tailTitle;
  }

  set tailTitle(val: string) {
    this.#tailTitle = val;
    if (this.#tailTitle != false) {
      this.#ns.setTitle(this.#tailTitle);
    }
  }

  toString(): string {
    return this.#ns.sprintf("F42Logger");
  }

  /**
   * Stop tailing and logging to terminal;
   * useful if running script from another process
   */
  setQuietMode(): void {
    this.#doTail = false;
    this.#toTerminal = false;
    this.#writeLog = false;
    this.ns.closeTail();
  }

  /**
   * Init and return the feebback object
   * 
   * @return {F42Feedback} - The feedback object
   */
  initFeedback(title: string, desc: string, flagHelpArr: string[]): F42Feedback {
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
  doFirstCall(): void {
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
  log(msgTemplate = string, ...msgArgs: string[]): boolean {
    if (!this.#writeLog) return false;

    this.#doLog(msgTemplate, ...msgArgs);
    return true;
  }

  /**
   * Error render function
   * 
   * @return bool True if log written, false if suppressed (this.#writeLog ===  false)
   */
  logError(errorMsg: string, ...errorMsgArgs: string[]): boolean {
    if (!this.#writeLog) return false;

    this.#doLog("ERROR " + errorMsg, errorMsgArgs);
    return true;
  }

  /**
   * Feeback function for feedback object; should only be called
   * by feedback object!!
   */
  doFeedback(feedbackKey: string, msgTemplate: string, ...msgArgs: string[]): boolean {
    if (feedbackKey !== this.#feedbackKey) {
      const errMsg = "!! Illegal call of F42Logger.doFeedback(): can only be called from the associated feedback object !!";
      this.#ns.print(errMsg);
      throw new Error(errMsg);
    }

    if (!this.#feedback) return false;

    if (F42Logger_DEBUG) {
      msgTemplate = this.#ns.sprintf("F42Feedback >> %s", msgTemplate);
    }

    this.#doLog(msgTemplate, ...msgArgs);

    return true;
  }

  /**
   * Core logging function
   */
  #doLog(msgTemplate: string, ...msgArgs: string[]): void {
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