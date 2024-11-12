import BaseAction, * as baseAct from "/scripts/dynamic/v3/base-action-class.js";

const HACK_MONEY_PERC = 0.9;

export default class HackAction extends BaseAction{
  /**
   * @param {TargetServer} tgtSrv
   */
  constructor(tgtSrv){
    super(tgtSrv, baseAct.ACT_HACK);
  }

  toString() {
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
  shouldTriggerAction() {
    return true;
  }

  targetAnalyse() {
    let fnN = "targetAnalyse";
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

  get currTargetAmt(){
    return this.srvObj.moneyAvailable;
  }
}