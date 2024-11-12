import ActionBase, { ACT_HACK, ActionInterface } from "/f42/hack-man/classes/ActionBase.class";
import TargetServer from "/f42/hack-man/classes/TargetServer.class";

const HACK_MONEY_PERC = 0.9;

export default class HackAction extends ActionBase implements ActionInterface {
  /**
   * @param {TargetServer} tgtSrv
   */
  constructor(tgtSrv: TargetServer) {
    super(tgtSrv, ACT_HACK);
  }

  toString(): string {
    return this.ns.sprintf(
      "HackAction: type: %s | status: %s | srvUid: %s",
      this.type,
      this.status,
      this.srvUid
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
    this.setStatusActiveJob();

    // analyse
    this.currJob.estAmt = (this.srvObj.moneyMax * HACK_MONEY_PERC);

    try {
      this.currJob.estTime = this.ns.formulas.hacking.hackTime(
        this.srvObj,
        this.ns.getPlayer()
      );
    }
    catch (e) {
      // don't have formulas
      this.ns.getHackTime(this.tgtSrv.hostname);
    }

    this.currJob.threads = Math.ceil(this.ns.hackAnalyzeThreads(
      this.tgtSrv.hostname,
      this.currJob.estAmt
    ));

    if (this.currJob.threads <= 0) {
      this.currJob.threads = 1;
    }

    // post grow job msg
    this.currJob.batchJob();
  }

  get currTargetAmt(): number {
    return this.srvObj.moneyAvailable;
  }
}