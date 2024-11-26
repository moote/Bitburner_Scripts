import FeedbackRenderer from "./FeedbackRenderer";
import { timestampAsBase62Str } from "/f42/utility/utility-functions";

const Logger_DEBUG = false; // set true to prepend all logs/feedbacks with identifier

/**
 * Utility class to control logging
 */
export default class Logger {
  #ns: NS;
  #feedback: FeedbackRenderer | undefined;
  #feedbackKey: string | undefined;
  #firstCall = true; // flag for displaying title on first call

  #writeLog = false; // false: no log written; true: log written
  #title = ""; // the title of the tail window (if used) and the feedback title
  #toTerminal = true // true: output to terminal (ns.tprintf), else log with ns.printf
  #doTail = false // true: auto open tail, false no tail; can only be true if this.#toTerminal == false
  #tailTitle: string | false = false; // title of the tail window (if using it); false then will default to title, otherwise set a string
  #tailWidth = 0;
  #tailHeight = 0; //

  constructor(ns: NS, writeLog = false, toTerminal = true, doTail = false, tailTitle: string | false = false, disableSystemLog = false) {
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
    return Logger_DEBUG;
  }

  get ns(): NS {
    return this.#ns;
  }

  get feedback(): FeedbackRenderer | undefined {
    return this.#feedback;
  }

  get writeLog(): boolean {
    return this.#writeLog;
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

  get tailTitle(): string | false {
    return this.#tailTitle;
  }

  set tailTitle(val: string | false) {
    this.#tailTitle = val;
    if (this.#tailTitle != false) {
      this.#ns.setTitle(this.#tailTitle);
    }
  }

  toString(): string {
    return this.#ns.sprintf("Logger");
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

  setTailSize(w: number, h: number): void {
    this.#tailWidth = w;
    this.#tailHeight = h;

    // first call already happened so need to manually set here
    if (!this.#firstCall) {
      this.ns.resizeTail(this.#tailWidth, this.#tailHeight);
    }
  }

  /**
   * Init and return the feebback object
   * 
   * @return The feedback object
   */
  initFeedback(title: string, desc: string): FeedbackRenderer {
    if (this.#feedback) {
      throw new Error("!! Logger.initFeedback: feedback object already initialised!");
    }

    // generate a feedback key and create fb object
    this.#feedbackKey = timestampAsBase62Str();
    this.#feedback = FeedbackRenderer.feedbackFactory(this, this.#feedbackKey, title, desc);

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

        if (this.#tailWidth) {
          this.#ns.resizeTail(this.#tailWidth, this.#tailHeight);
        }
      }

      this.#firstCall = false;
    }
  }

  /**
   * Render script feedback to command line tail window
   * 
   * @return bool True if log written, false if suppressed (this.#writeLog ===  false)
   */
  log(msgTemplate: string, ...msgArgs: unknown[]): boolean {
    if (!this.#writeLog) return false;

    this.#doLog(msgTemplate, ...msgArgs);
    return true;
  }

  /**
   * Error render function
   * 
   * @return bool True if log written, false if suppressed (this.#writeLog ===  false)
   */
  logError(errorMsg: string, ...errorMsgArgs: unknown[]): boolean {
    if (!this.#writeLog) return false;

    this.#doLog("ERROR " + errorMsg, ...errorMsgArgs);
    return true;
  }

  /**
   * Feeback function for feedback object; should only be called
   * by feedback object!!
   */
  doFeedback(feedbackKey: string, msgTemplate: string, ...msgArgs: unknown[]): boolean {
    if (feedbackKey !== this.#feedbackKey) {
      const errMsg = "!! Illegal call of Logger.doFeedback(): can only be called from the associated feedback object !!";
      this.#ns.print(errMsg);
      throw new Error(errMsg);
    }

    if (!this.#feedback) return false;

    if (Logger_DEBUG) {
      msgTemplate = this.#ns.sprintf("FeedbackRenderer >> %s", msgTemplate);
    }

    this.#doLog(msgTemplate, ...msgArgs);

    return true;
  }

  /**
   * Core logging function
   */
  #doLog(msgTemplate: string, ...msgArgs: unknown[]): void {
    this.doFirstCall();

    if (Logger_DEBUG) {
      msgTemplate = this.#ns.sprintf("Logger >> %s", msgTemplate);
    }

    if (this.#doTail || !this.#toTerminal) {
      this.#ns.printf(msgTemplate, ...msgArgs);
    }
    else {
      this.#ns.tprintf(msgTemplate, ...msgArgs);
    }
  }
}