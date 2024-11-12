import F42Logger from 'f42/classes/f42-logger-class';
import F42Feedback from '/f42/classes/f42-feedback-class';
import { GangMemberInfo } from '@ns';
// import F42ClFlagDef from 'scripts/classes/f42-cl-flag-def-class.js';
import { timestampAsBase62Str } from "/scripts/utility/utility-functions.js";

const ETHICAL_HACK = "Ethical Hacking";
const MONEY_LAUND = "Money Laundering";

/** @param {NS} ns */
export async function main(ns: NS): void {
  const scriptTitle = "Gang Test";
  const logger = new F42Logger(ns, true, false, true, scriptTitle, true);
  const scriptDescription = "";
  const scriptFlags = [];
  const feedback = logger.initFeedback(scriptTitle, scriptDescription, scriptFlags);
  if (!feedback) return;

  feedback.printTitle(false);

  const gwCtr = new GangWantedCtrlBasic(feedback);
  let topHacker: GangMemberInfo;
  let ethicalHacker: GangMemberInfo;

  while (true) {
    await ns.gang.nextUpdate();

    // ns.ui.clearTerminal();
    ns.clearLog();
    feedback.printTitle();

    const gangInfo = ns.gang.getGangInformation();

    if(gangInfo.wantedLevel > 250){
      topHacker = gwCtr.topHackMemInfo;
      ns.gang.setMemberTask(topHacker.name, ETHICAL_HACK);
      ethicalHacker = topHacker;
    }
    else if(gangInfo.wantedLevel == 1 && ethicalHacker){
      ns.gang.setMemberTask(ethicalHacker.name, MONEY_LAUND);
      ethicalHacker = undefined;
    }

    feedback.print("Wanted level: ", ns.formatNumber(gangInfo.wantedLevel, 2));
    feedback.print("Wanted level gain: ", ns.formatNumber(gangInfo.wantedLevelGainRate, 2));
    feedback.print("Wanted penalty: ", ns.formatNumber(gangInfo.wantedPenalty, 2));

    if(ethicalHacker){
      feedback.print("Ethical Hacker: ", ethicalHacker.name);
    }

    feedback.printEnd();
    feedback.print(timestampAsBase62Str());
  }
}

class GangWantedCtrlBasic {
  #ns: NS;
  #feedback: F42Feedback;

  /**
   * @param {F42Feedback} feedback
   */
  constructor(feedback: F42Feedback) {
    this.#ns = feedback.ns;
    this.#feedback = feedback;
  }

  get ns() {
    return this.#ns;
  }

  get feedback() {
    return this.#feedback;
  }

  get topHackMemInfo(): GangMemberInfo {
    let topMemInfo;

    for (const mName of this.ns.gang.getMemberNames()) {
      if (!topMemInfo || this.ns.gang.getMemberInformation(mName).hack > topMemInfo.hack) {
        topMemInfo = this.ns.gang.getMemberInformation(mName);
      }
    }
    // this.feedback.printf("Top member (hacking): %s", JSON.stringify(topMemInfo, null, 2));
    return topMemInfo;
  }
}