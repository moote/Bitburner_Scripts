import { ThrallJob, ThrallJobAction } from "/f42/thrall/classes/interfaces";
import ThrallControl from "/f42/thrall/classes/ThrallControl.class";

/** @param {NS} ns */
export async function main(ns: NS): Promise<void> {
  const dtc = new DummyThrallControl(ns);

  ns.tail();

  while (true) {
    dtc.getPotentialJob();
    await ns.sleep(1000);
  }
}

class DummyThrallControl extends ThrallControl {
  constructor(ns: NS) {
    super(ns, "DUMMY-ThrallCtrl-V4");
  }

  /**
   * Message dq and bounce back
   */
  getPotentialJob(): void {
    const fakeJob = this.popMessage(this.newJobPort);
    let jobAction: ThrallJobAction | false;

    if (fakeJob !== false) {
      // get job action data
      jobAction = this.getJobAction(fakeJob);

      if (jobAction !== false) {
        // if (this.checkCanRun(jobAction.ram, fakeJob.threads)) {
        this.log("FAKE(%s): %s >> %s", fakeJob.msgId, fakeJob.target, fakeJob.actionType);

        // add job to running list
        fakeJob.result.actionedBy = this.hostname;
        fakeJob.result.startAmt = jobAction.startAmt;

        // fake results
        this.#fakeResults(fakeJob);

        // send back
        let msgSent = false;

        this.log("TRY_FAKE_SEND: %s", fakeJob.msgId);

        // try send
        try {
          if (this.pushMessage(this.completedJobPort, fakeJob)) {
            // set flag
            msgSent = true;
          }
          else {
            msgSent = false;
          }
        }
        catch (e) {
          msgSent = false;
        }

        if (msgSent) {
          this.log("FAKE_MSG_SENT!");
        }
        else {
          this.log("FAKE_MSG_NOT_SENT!");
        }
      }
      else {
        // job has invalid action type
        this.log("!! Job has invalid type: %s", fakeJob.actionType);
      }
    }
    else {
      // this.log("FAKE_MSG_NOT_LOADED!");
    }
  }

  #fakeResults(fakeJob: ThrallJob) {
    fakeJob.result.amt = 1;
    fakeJob.result.endTs = Date.now();
    fakeJob.result.endAmt = fakeJob.result.startAmt + 1;
  }
}