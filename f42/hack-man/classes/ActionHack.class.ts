import ActionBase, { ActionInterface } from "/f42/hack-man/classes/ActionBase.class";
import { ActionType, TgtSrvOpMode } from "/f42/hack-man/classes/enums";
import TargetServer from "/f42/hack-man/classes/TargetServer.class";

const HACK_MONEY_PERC = 0.9;

export default class HackAction extends ActionBase implements ActionInterface {
  /**
   * @param {TargetServer} tgtSrv
   */
  constructor(tgtSrv: TargetServer) {
    super(tgtSrv, ActionType.HACK);
  }

  toString(): string {
    return this.ns.sprintf(
      "HackAction: type: %s | status: %s | srvUid: %s",
      this.type,
      this.status,
    );
  }

  // >>>>>>>>>>>>>>>>
  // utility

  /**
   * Always called last in chain, if otheres have passed
   * then there must be enough to hack
   * 
   */
  shouldTriggerAction(): boolean {
    return true;
  }

  targetAnalyse(): void {
    const fnN = "targetAnalyse";
    this.log(fnN, "");

    // change status and create new job
    const currJob = this.setStatusActiveJob();

    // analyse
    if(this.tgtSrv.opMode === TgtSrvOpMode.FREE){
      currJob.estAmt = (this.tgtSrv.moneyMax * HACK_MONEY_PERC);
    }
    else{
      // hack max when in trade target mode
      currJob.estAmt = this.tgtSrv.moneyMax;
    }

    try {
      currJob.estTime = this.ns.formulas.hacking.hackTime(
        this.srvObj,
        this.ns.getPlayer()
      );
    }
    catch (e) {
      // don't have formulas
      currJob.estTime = this.ns.getHackTime(this.tgtSrv.hostname);
    }

    currJob.threads = Math.ceil(this.ns.hackAnalyzeThreads(
      this.tgtSrv.hostname,
      currJob.estAmt
    ));

    if (currJob.threads <= 0) {
      currJob.threads = 1;
    }

    // post grow job msg
    currJob.batchJob();
  }

  get currTargetAmt(): number {
    return this.tgtSrv.moneyAvailable;
  }
}