import ThrallControl from "/f42/thrall/classes/ThrallControl.class";

const JOB_FLAG = "-THRALL-job";
const COMP_FLAG = "-THRALL-comp";
export const RUNNING_JOB_PATH = "scripts/dynamic/v3/thrall/tmp/%d" + JOB_FLAG + ".txt";
export const COMPLETED_JOB_PATH = "scripts/dynamic/v3/thrall/tmp/%d" + COMP_FLAG + ".txt";

const RUN_AS_LAUNCHER = "launch";
const RUN_AS_ALL = "a";
const RUN_AS_REC = "r";
const RUN_AS_PRO = "p";
const RUN_AS_SEN = "s";

// const RUN_AS_DESC = {
//   [RUN_AS_LAUNCHER]: "Control launcher",
//   [RUN_AS_ALL]: "Singleton - Running all processes (Receiver / Processor / Sender)",
//   [RUN_AS_REC]: "Receiver - Receiving / executing job requests",
//   [RUN_AS_PRO]: "Processor - Processing completed jobs",
//   [RUN_AS_SEN]: "Sender - Sending completed job messages",
// };

/** @param {NS} ns */
export async function main(ns: NS): void {
  const flagData = ns.flags([
    [RUN_AS_ALL, false], // isAll
    [RUN_AS_REC, false], // isReceiver
    [RUN_AS_PRO, false], // isProcessor
    [RUN_AS_SEN, false], // isSender
    ['v', ""]
  ]);
  // ns.tprint(data);

  let tc;
  let runAs = RUN_AS_LAUNCHER;

  if (flagData[RUN_AS_ALL]) {
    tc = new ThrallControl(ns, "TCV3:Singleton");
    runAs = RUN_AS_ALL;
  }
  else if (flagData[RUN_AS_REC]) {
    tc = new ThrallControl(ns, "TCV3:Receiver");
    runAs = RUN_AS_REC;
  }
  else if (flagData[RUN_AS_PRO]) {
    tc = new ThrallControl(ns, "TCV3:Processor");
    runAs = RUN_AS_PRO;
  }
  else if (flagData[RUN_AS_SEN]) {
    tc = new ThrallControl(ns, "TCV3:Sender");
    runAs = RUN_AS_SEN;
  }

  // ns.tprintf(">>>>>>>>>> Thrall controller launched as: %s", RUN_AS_DESC[runAs]);

  if (runAs === RUN_AS_LAUNCHER) {
    // kill any existing
    ns.kill(ns.getScriptName(), ns.getHostname(), "-a");
    ns.kill(ns.getScriptName(), ns.getHostname(), "-r");
    ns.kill(ns.getScriptName(), ns.getHostname(), "-p");
    ns.kill(ns.getScriptName(), ns.getHostname(), "-s");

    // launch new
    ns.run(ns.getScriptName(), 1, "-r", "-v", flagData["v"]);
    ns.run(ns.getScriptName(), 1, "-p", "-v", flagData["v"]);
    ns.run(ns.getScriptName(), 1, "-s", "-v", flagData["v"]);
  }
  else {
    while (true) {
      switch (runAs) {
        case RUN_AS_ALL:
          runAll(tc);
          break;
        case RUN_AS_REC:
          runReceiver(tc);
          break;
        case RUN_AS_PRO:
          runProcessor(tc);
          break;
        case RUN_AS_SEN:
          runSender(tc);
          break;
        default:
          throw new Error("Invalid run type: " + runAs);
      }

      await ns.sleep(ThrallControl.getRandomNumberInRange(100, 250));
    }
  }
}

function runAll(tc: ThrallControl) {
  tc.getPotentialJob();
  tc.checkCompletedFileJobs();
  tc.returnCompletedJobs();
}

function runReceiver(tc: ThrallControl) {
  tc.getPotentialJob();
}

function runProcessor(tc: ThrallControl) {
  tc.checkCompletedFileJobs();
}

function runSender(tc: ThrallControl) {
  tc.returnCompletedJobs();
}
