import F42Logger from 'scripts/classes/f42-logger-class.js';
import F42ClFlagDef from 'scripts/classes/f42-cl-flag-def-class.js';
import { getRandomNumberInRange, timestampAsBase62Str } from "/scripts/utility/utility-functions.js";


/** @param {NS} ns */
export async function main(ns) {
  let scriptTitle = "Gang Test";
  let logger = new F42Logger(ns, true, true, false, scriptTitle, false);
  let scriptDescription = "";
  let scriptFlags = [];
  let feedback = logger.initFeedback(scriptTitle, scriptDescription, scriptFlags);
  if (!feedback) {
    return;
  }

  
}

class GangWantedCtrlBasic {
  /** @type {NS} */
  #ns;
  /** @type {F42Feedback} */
  #feedback;

  /**
   * @param {F42Feedback} feedback
   */
  constructor(feedback) {
    this.#ns = feedback.ns;
    this.#feedback = feedback;
  }

  get topHackMemInfo() {

    let topMemInfo;

    for (const mName of ns.gang.getMemberNames()) {
      if (!topMemInfo || ns.gang.getMemberInformation(mName).hack > topMemInfo.hack) {
        topMemInfo = ns.gang.getMemberInformation(mName);
      }
    }

    feedback.printf("Top member (hacking): %s", topMemInfo.toString());
  }
}