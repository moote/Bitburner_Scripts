import ActionBase, { ACT_GROW, ActionInterface } from "/f42/hack-man/classes/ActionBase.class";
import TargetServer from "/f42/hack-man/classes/TargetServer.class";

/**
 * (max * GROW_LEVEL_MIN_PERC)
 * percentage of max money above which grow won't trigger
 */
const GROW_LEVEL_MIN_PERC = 0.9;

export default class GrowAction extends ActionBase implements ActionInterface {
  /**
   * @param {TargetServer} tgtSrv
   */
  constructor(tgtSrv: TargetServer) {
    super(tgtSrv, ACT_GROW);
  }

  toString(): string {
    return this.ns.sprintf(
      "GrowAction: type: %s | status: %s | srvUid: %s",
      this.type,
      this.status,
      this.srvUid
    );
  }

  // >>>>>>>>>>>>>>>>
  // utility

  /**
   * (max * GROW_LEVEL_MIN_PERC)
   * percentage of max money above which grow won't trigger
   * 
   */
  shouldTriggerAction(): boolean {
    return this.srvObj.moneyAvailable < (this.srvObj.moneyMax * GROW_LEVEL_MIN_PERC);
  }

  targetAnalyse(): void {
    const fnN = "targetAnalyse";
    this.log(fnN, "");

    // change status and create new job
    this.setStatusActiveJob();

    // analyse
    this.currJob.estAmt = (this.srvObj.moneyMax - this.srvObj.moneyAvailable);

    try {
      this.currJob.estTime = this.ns.formulas.hacking.growTime(
        this.srvObj,
        this.ns.getPlayer()
      );

      this.currJob.threads = Math.ceil(this.ns.formulas.hacking.growThreads(
        this.srvObj,
        this.ns.getPlayer(),
        this.srvObj.moneyMax
      ));
    }
    catch (e) {
      // don't have formulas
      const growMultiplier = this.srvObj.moneyMax / this.srvObj.moneyAvailable;

      this.currJob.threads = Math.ceil(this.ns.growthAnalyze(
        this.tgtSrv.hostname,
        growMultiplier
      ));
    }

    if (this.currJob.threads <= 0) {
      this.currJob.threads = 1;
    }

    // post grow job msg
    this.currJob.batchJob();
  }

  get currTargetAmt(): number {
    return this.srvObj.moneyAvailable;
  }

  // utility
  // <<<<<<<<<<<<<<<<
}