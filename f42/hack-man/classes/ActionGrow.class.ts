import ActionBase, { ActionInterface } from "/f42/hack-man/classes/ActionBase.class";
import { ActionType, TgtSrvOpMode } from "/f42/hack-man/classes/enums";
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
    super(tgtSrv, ActionType.GROW);
  }

  toString(): string {
    return this.ns.sprintf(
      "GrowAction: type: %s | status: %s | srvUid: %s",
      this.type,
      this.status,
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
    if(this.tgtSrv.opMode === TgtSrvOpMode.FREE){
      return this.tgtSrv.moneyAvailable < (this.tgtSrv.moneyMax * GROW_LEVEL_MIN_PERC);
    }
    else{
      return this.tgtSrv.moneyAvailable < this.tgtSrv.moneyMax * GROW_LEVEL_MIN_PERC;
    }
  }

  targetAnalyse(): void {
    const fnN = "targetAnalyse";
    this.log(fnN, "");

    // change status and create new job
    const currJob = this.setStatusActiveJob();

    // analyse
    currJob.estAmt = (this.tgtSrv.moneyMax - this.tgtSrv.moneyAvailable);

    try {
      currJob.estTime = this.ns.formulas.hacking.growTime(
        this.srvObj,
        this.ns.getPlayer()
      );

      currJob.threads = Math.ceil(this.ns.formulas.hacking.growThreads(
        this.srvObj,
        this.ns.getPlayer(),
        this.tgtSrv.moneyMax
      ));
    }
    catch (e) {
      // don't have formulas
      const growMultiplier = this.tgtSrv.moneyMax / this.tgtSrv.moneyAvailable;

      currJob.threads = Math.ceil(this.ns.growthAnalyze(
        this.tgtSrv.hostname,
        growMultiplier
      ));
    }

    if (currJob.threads <= 0) {
      currJob.threads = 1;
    }

    // post grow job msg
    currJob.batchJob();
  }

  get currTargetAmt(): number {
    return this.tgtSrv.moneyAvailable;
  }

  // utility
  // <<<<<<<<<<<<<<<<
}