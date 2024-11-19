import Logger from '/f42/classes/Logger.class';
import CmdLineFlagValidator from './CmdLineFlags/CLFlagValidator.class';

export const F42_ANSI_COL_H1 = "\x1b[38;5;207m";
export const F42_ANSI_COL_H2 = "\x1b[38;5;219m";
export const F42_ANSI_COL_HILI = "\x1b[38;5;212m";
export const F42_ANSI_COL_TXT = "\x1b[38;5;224m";
export const F42_ANSI_COL_ERR = "\x1b[31m";

/**
 * Utility class for writing script feeback massages to user
 */
export default class FeedbackRenderer {
  #logger: Logger;
  #feedbackKey: string;
  #title: string;
  #desc: string;
  #flagValidator: CmdLineFlagValidator;

  static feedbackFactory(logger: Logger, feedbackKey: string, title: string, desc: string): FeedbackRenderer {
    // init feedback object
    const feedback = new FeedbackRenderer(logger, feedbackKey, title, desc);

    // return feedback object 
    return feedback;
  }

  /**
   * Constructor
   * 
   * @param logger - The required logging class
   */
  constructor(logger: Logger, feedbackKey: string, title: string, desc: string) {
    this.#logger = logger;
    this.#feedbackKey = feedbackKey;
    this.#title = title;
    this.#desc = desc;
    this.#flagValidator = new CmdLineFlagValidator(this.#logger.ns);
  }

  set title(title: string) {
    this.#title = title;
  }

  get ns(): NS {
    return this.#logger.ns;
  }

  get logger(): Logger {
    return this.#logger;
  }

  get flagValidator(): CmdLineFlagValidator {
    return this.#flagValidator;
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

  printSubTitle(msgTemplate: string, ...msgArgs: (string | number | boolean)[]): void {
    this.printLineSeparator(F42_ANSI_COL_H2);
    this.#doFeedback(F42_ANSI_COL_H2 + msgTemplate, ...msgArgs);
    this.printLineSeparator(F42_ANSI_COL_H2);
  }

  printHiLi(msgTemplate: string, ...msgArgs: (string | number | boolean)[]): void {
    this.#doFeedback(F42_ANSI_COL_HILI + msgTemplate, ...msgArgs);
  }

  /**
   * Render script feedback to command line / tail window
   * 
   * @param msgArgs
   */
  print(...msgArgs: (string | number | boolean)[]): void {
    this.#doFeedback(F42_ANSI_COL_TXT + msgArgs.join(""));
  }

  /**
   * Render script feedback to command line / tail window
   * 
   * @param format
   * @param msgArgs
   */
  printf(format: string, ...msgArgs: (string | number | boolean)[]): void {
    this.#doFeedback(F42_ANSI_COL_TXT + format, ...msgArgs);
  }

  /**
   * Helper function to render comandline flags and associated help text
   */
  printUsageInfo(): void {
    this.printLineSeparator();
    this.#doFeedback(F42_ANSI_COL_HILI + "Command line flags:");
    this.#doFeedback(this.#flagValidator.renderHelpAndErrors());
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
  printErr(errorMsg: string, ...errorMsgArgs: (string | number | boolean)[]): void {
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
  printHelpAndEnd(): boolean {
    // run validation if not done yet
    if(!this.#flagValidator.isValidated){
      this.#flagValidator.validateFlags();
    }

    // check if need to exit now
    if (this.#flagValidator.shouldRenderHelpErrors) {
      this.printTitle();
      this.printUsageInfo();
      this.printEnd();
      return true;
    }
    else {
      return false;
    }
  }

  addUserDefError(flag: string, errorMsg: string, ...errArgs: (string | number | boolean)[]): void {
    this.#flagValidator.addError(flag, this.ns.sprintf(errorMsg, ...errArgs));
  }

  addUserDefErrorAndEnd(flag: string, errorMsg: string, ...errArgs: (string | number | boolean)[]): void {
    this.addUserDefError(flag, errorMsg, ...errArgs);
    this.printHelpAndEnd();
  }

  #doFeedback(msgTemplate: string, ...msgArgs: any[]): void {
    // this.#logger.doFeedback(this.#feedbackKey, "%s %s %d", "forty", "two", 42);
    this.#logger.doFeedback(this.#feedbackKey, msgTemplate, ...msgArgs);
  }
}