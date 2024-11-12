import { ThrallControl } from "/f42/thrall/control";

/** @param {NS} ns */
export async function main(ns: NS): void {
  const dtc = new DummyThrallControl(ns);

  while (true) {
    dtc.getPotentialJob();
    dtc.checkCompletedJobs();
    dtc.returnCompletedJobs();

    await ns.sleep(1000);
  }
}

class DummyThrallControl extends ThrallControl {
  dummyPidCnt = 0;
  dummyResultFileList = {};

  constructor(ns: NS) {
    super(ns, "DUMMY-ThrallCtrl-V3");
  }

  /**
   * Always return true so we can fake
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  checkCanRun(scriptRamUsage: number, reqThreads: number): boolean {
    return true;
  }

  /**
   * Override to fake job accept
   */
  runJob(potentialJob) {
    // inc dummy pid
    this.dummyPidCnt++;

    // create result file
    this.dummyResultFileList[this.dummyPidCnt] = {
      type: potentialJob.actionType,
      pid: this.dummyPidCnt,
      endTs: Date.now(),
      amt: potentialJob.estAmt,
    };

    // return pid
    return this.dummyPidCnt;
  }

  /**
   * Override to fake result file found
   */
  getActionResult(jobPid) {
    // return dummy data
    return this.dummyResultFileList[jobPid];
  }
}