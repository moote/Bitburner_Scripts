import FeedbackRenderer from '/f42/classes/FeedbackRenderer';
import Logger from '/f42/classes/Logger.class';
import { timestampAsBase62Str } from '/f42/utility/utility-functions';
import { GangMemberInfo } from '@ns';

const ETHICAL_HACK = "Ethical Hacking";
const MONEY_LAUND = "Money Laundering";
const MIN_WANTED_LEV = 1;
const MAX_WANTED_LEV = 250;

/** @param {NS} ns */
export async function main(ns: NS): Promise<void> {
  const scriptTitle = "Gang Wanted Level Manager";
  const logger = new Logger(ns, true, false, true, scriptTitle, true);
  const scriptDescription = "Keeps wanted level below " + MAX_WANTED_LEV;
  const feedback = logger.initFeedback(scriptTitle, scriptDescription);
  const flags = feedback.flagValidator;

  flags.addBooleanFlag("f", "Test boolean flag");

  // ns.tail();
  
  // validate and check for help request / flag errors
  if (feedback.printHelpAndEnd()) {
    // stop further execution
    return;
  }

  // feedback.printUsageInfo();
  // ns.print("flag debug:\n\n", flags.debug());
  // ns.print("STOP STOP STOP");
  // return;

  feedback.printTitle(false);

  const gwCtr = new GangWantedCtrlBasic(feedback);
  let topHacker: GangMemberInfo;
  let ethicalHacker: GangMemberInfo | false = gwCtr.currEthicalHacker;

  while (true) {
    await ns.gang.nextUpdate();

    // ns.ui.clearTerminal();
    ns.clearLog();
    feedback.printTitle();

    const gangInfo = ns.gang.getGangInformation();

    if(gangInfo.wantedLevel > MAX_WANTED_LEV){
      // disable existing exthical hacker thats not working
      if(ethicalHacker !== false){
        ns.gang.setMemberTask(ethicalHacker.name, MONEY_LAUND);
        ethicalHacker = false;
      }

      // make top hacker an ethical hacker
      topHacker = gwCtr.topHackMemInfo;
      ns.gang.setMemberTask(topHacker.name, ETHICAL_HACK);
      ethicalHacker = topHacker;
    }
    else if(gangInfo.wantedLevel == MIN_WANTED_LEV && ethicalHacker !== false){
      // switch ethical hacker back to money laundering
      ns.gang.setMemberTask(ethicalHacker.name, MONEY_LAUND);
      ethicalHacker = false;
    }

    feedback.print("Wanted level: ", ns.formatNumber(gangInfo.wantedLevel, 2));
    feedback.print("Wanted level gain: ", ns.formatNumber(gangInfo.wantedLevelGainRate, 2));
    feedback.print("Wanted penalty: ", ns.formatNumber(gangInfo.wantedPenalty, 2));

    if(ethicalHacker){
      feedback.print("Ethical Hacker: ", ethicalHacker.name);
    }

    feedback.printHiLi("-f >>> %s", flags.getFlagBoolean('f'));

    feedback.printEnd();
    feedback.print(timestampAsBase62Str());
  }
}

class GangWantedCtrlBasic {
  #ns: NS;
  #feedback: FeedbackRenderer;

  /**
   * @param {FeedbackRenderer} feedback
   */
  constructor(feedback: FeedbackRenderer) {
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
    let topMemInfo!: GangMemberInfo;

    for (const mName of this.ns.gang.getMemberNames()) {
      if (typeof topMemInfo === "undefined" || this.ns.gang.getMemberInformation(mName).hack > topMemInfo.hack) {
        topMemInfo = this.ns.gang.getMemberInformation(mName);
      }
    }
    // this.feedback.printf("Top member (hacking): %s", JSON.stringify(topMemInfo, null, 2));
    return topMemInfo;
  }

  get currEthicalHacker(): GangMemberInfo | false {
    for (const mName of this.ns.gang.getMemberNames()) {
      if(this.ns.gang.getMemberInformation(mName).task === ETHICAL_HACK){
        return this.ns.gang.getMemberInformation(mName);
      }
    }

    return false;
  }
}