import ActionBase, { ACT_WEAK, ActionInterface } from "/f42/hack-man/classes/ActionBase.class";
import TargetServer from "/f42/hack-man/classes/TargetServer.class";
// import { timestampAsBase62Str } from "/scripts/utility/utility-functions.js";

/**
 * weakenDiffMax = ((base - min) * WEAKEN_DIFF_MAX_PERCs)
 * if currentDiff (hackDifficulty - minDifficulty) > weakenDiffMax
 *    >> trigger weaken
 * 
 * @param {number} WEAKEN_DIFF_MAX_PERC
 */
const WEAKEN_DIFF_MAX_PERC = 0.1;

/**
 * Constant amount one thread weakens by
 */
const WEAKEN_1T = 0.05;

export default class WeakenAction extends ActionBase implements ActionInterface {
  /**
   * @param {TargetServer} tgtSrv
   */
  constructor(tgtSrv: TargetServer, serialObj = undefined) {
    super(tgtSrv, ACT_WEAK, serialObj);

    this.allowedLogFunctions = [
      // "shouldTriggerAction",
      // "checkReceivedMsg",
    ];
  }

  // ////////////////
  // utility
  // ////////////////

  get #hackDifficultyDiff(): number {
    return this.ns.getServerSecurityLevel(this.target) - this.ns.getServerMinSecurityLevel(this.target);
  }

  /**
  * weakenDiffMax = ((base - min) * F42_WEAKEN_DIFF_MAX_PERC)
  * if currentDiff (hackDifficulty - minDifficulty) > weakenDiffMax
  *    >> trigger weaken
  */
  shouldTriggerAction(): boolean {
    const weakenDiffMax = (this.ns.getServerBaseSecurityLevel(this.target) - this.ns.getServerMinSecurityLevel(this.target)) * WEAKEN_DIFF_MAX_PERC;
    // this.ns.clearLog();
    // const lo = this.getLo("shouldTriggerAction", `
    // - getServerBaseSecurityLevel: %f
    // - getServerMinSecurityLevel: %f
    // - WEAKEN_DIFF_MAX_PERC: %f
    // - weakenDiffMax: %f
    // - getServerSecurityLevel: %f
    // - getServerMinSecurityLevel: %f
    // - this.#hackDifficultyDiff: %f
    // - this.#hackDifficultyDiff > weakenDiffMax: %t
    // - %s`,
    //   this.ns.getServerBaseSecurityLevel(this.target),
    //   this.ns.getServerMinSecurityLevel(this.target),
    //   WEAKEN_DIFF_MAX_PERC,
    //   weakenDiffMax,
    //   this.ns.getServerSecurityLevel(this.target),
    //   this.ns.getServerMinSecurityLevel(this.target),
    //   this.#hackDifficultyDiff,
    //   (this.#hackDifficultyDiff > weakenDiffMax),
    //   timestampAsBase62Str(),
    // );

    return this.#hackDifficultyDiff > weakenDiffMax;
  }

  targetAnalyse(): void {
    lthis.getLo("targetAnalyse");

    // change status and create new job
    this.setStatusActiveJob();

    // analyse
    this.currJob.estAmt = this.#hackDifficultyDiff;

    try {
      this.currJob.estTime = this.ns.formulas.hacking.weakenTime(
        this.srvObj,
        this.ns.getPlayer()
      );
    }
    catch (e) {
      // dont have formulas
      this.currJob.estTime = this.ns.getWeakenTime(this.tgtSrv.hostname);
    }

    this.currJob.threads = Math.ceil(this.#hackDifficultyDiff / WEAKEN_1T);

    if (this.currJob.threads <= 0) {
      this.currJob.threads = 1;
    }

    // create the messages for for job's batches
    this.currJob.batchJob();
  }

  get currTargetAmt(): number {
    return this.srvObj.hackDifficulty;
  }
}