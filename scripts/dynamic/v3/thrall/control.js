import { RESULT_FLAG, JOB_RESULT_PATH } from "/scripts/dynamic/v3/thrall/hack_.js";
const JOB_FLAG = "-THRALL-job";
const COMP_FLAG = "-THRALL-comp";
export const RUNNING_JOB_PATH = "scripts/dynamic/v3/thrall/tmp/%d" + JOB_FLAG + ".txt";
export const COMPLETED_JOB_PATH = "scripts/dynamic/v3/thrall/tmp/%d" + COMP_FLAG + ".txt";

const RUN_AS_LAUNCHER = "launch";
const RUN_AS_ALL = "a";
const RUN_AS_REC = "r";
const RUN_AS_PRO = "p";
const RUN_AS_SEN = "s";

const RUN_AS_DESC = {
  [RUN_AS_LAUNCHER]: "Control launcher",
  [RUN_AS_ALL]: "Singleton - Running all processes (Receiver / Processor / Sender)",
  [RUN_AS_REC]: "Receiver - Receiving / executing job requests",
  [RUN_AS_PRO]: "Processor - Processing completed jobs",
  [RUN_AS_SEN]: "Sender - Sending completed job messages",
};

/** @param {NS} ns */
export async function main(ns) {
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

/** @param {ThrallControl} tc */
function runAll(tc) {
  tc.getPotentialJob();
  tc.checkCompletedFileJobs();
  tc.returnCompletedJobs();
}

/** @param {ThrallControl} tc */
function runReceiver(tc) {
  tc.getPotentialJob();
}

/** @param {ThrallControl} tc */
function runProcessor(tc) {
  tc.checkCompletedFileJobs();
}

/** @param {ThrallControl} tc */
function runSender(tc) {
  tc.returnCompletedJobs();
}

export class ThrallControl {
  ns;
  logName;
  jobList = {};
  newJobPort = 10;
  completedJobPort = 11;
  hostname;
  ramHeadroom = 0;

  weakenScriptPath = "/scripts/dynamic/v3/thrall/weaken_.js";
  growScriptPath = "/scripts/dynamic/v3/thrall/grow_.js";
  hackScriptPath = "/scripts/dynamic/v3/thrall/hack_.js";

  /**
   * 
   */
  static getRandomNumberInRange(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }

  constructor(ns, logName = "ThrallControlV3") {
    this.ns = ns;
    this.logName = logName;
    this.hostname = this.ns.getHostname();

    if (this.hostname == "home") {
      // this.ns.tail();
      this.ns.setTitle(this.logName);
      this.ramHeadroom = 128;
    }

    this.ns.disableLog("ALL");
    // ns.enableLog("sleep");
  }

  /**
   * Message dq and parse
   */
  getPotentialJob() {
    let potentialJob;
    let jobAction = false;
    let acceptedJob = false;

    // get job
    try {
      potentialJob = this.popMessage(this.newJobPort);
    }
    catch (e) {
      potentialJob == false;
    }

    acceptedJob = false;

    if (potentialJob !== false) {
      // get job action data
      jobAction = this.getJobAction(potentialJob);

      if (jobAction != false) {
        if (this.checkCanRun(jobAction.ram, potentialJob.threads)) {
          this.log("RUN(%s): %s >> %s", potentialJob.msgId, potentialJob.target, potentialJob.actionType);

          // add job to running list
          potentialJob.msgAcceptedTs = Date.now();
          potentialJob.isAccepted = true;
          potentialJob.result.actionedBy = this.hostname;
          potentialJob.result.startTs = potentialJob.msgAcceptedTs;
          potentialJob.result.startAmt = jobAction.startAmt;

          // this.jobList[jobPid] = potentialJob;

          // start job
          try {
            let jobPid = this.runJob(potentialJob, jobAction);

            // write to file
            this.writeRunningJobFile(potentialJob, jobPid);

            // set flag
            acceptedJob = true;
          }
          catch (e) {
            this.unacceptJob(potentialJob);
          }
        }
      }
      else {
        // job has invalid action type
        this.unacceptJob(potentialJob);
        throw new Error("!! Job has invalid type: " + potentialJob.actionType);
      }

      if (!acceptedJob) {
        // push message back for another thrall
        this.unacceptJob(potentialJob);
      }
    }
  }

  getJobAction(potentialJob) {
    switch (potentialJob.actionType) {
      case "weak":
        return {
          path: this.weakenScriptPath,
          ram: this.ns.getScriptRam(this.weakenScriptPath),
          startAmt: this.ns.getServerSecurityLevel(potentialJob.target),
        };
      case "grow":
        return {
          path: this.growScriptPath,
          ram: this.ns.getScriptRam(this.growScriptPath),
          startAmt: this.ns.getServerMoneyAvailable(potentialJob.target),
        };
      case "hack":
        return {
          path: this.hackScriptPath,
          ram: this.ns.getScriptRam(this.hackScriptPath),
          startAmt: this.ns.getServerMoneyAvailable(potentialJob.target),
        };
      default:
        return false;
    }
  }

  runJob(potentialJob, jobAction) {
    // start job
    let jobPid = this.ns.run(
      jobAction.path,
      potentialJob.threads,
      potentialJob.target
    );

    if (!jobPid) {
      this.unacceptJob(potentialJob);
      throw new Error("!! Could not start job: pid == 0");
    }

    // save pid to result
    potentialJob.result.pid = jobPid;

    return jobPid;
  }

  /**
   * 
   */
  checkCompletedFileJobs() {
    // this.log("checkCompletedFileJobs");

    for (const resultFilePath of this.resultFileList) {
      let jobPid = this.getPidFromFPath(resultFilePath);

      this.log("TEST_RESULT_FILE: %s", resultFilePath);

      if (this.ns.fileExists(this.getRunningJobFPath(jobPid))) {
        // read job file
        let completeJob = this.getRunningJobFromFile(jobPid);

        // read result file
        let actionResult = this.getActionResultFromFile(jobPid);

        this.log("FOUND_FILE_JOB_RESULT: %s", this.strfy(actionResult));

        // save results
        completeJob.result.amt = actionResult.amt;
        completeJob.result.endTs = actionResult.endTs;

        if (actionResult.type == "grow") {
          completeJob.result.endAmt = (completeJob.result.startAmt * actionResult.amt);
          // this.log("END_AMT GROW: %s * %s -> %s", completeJob.result.startAmt, actionResult.amt, completeJob.result.endAmt);
        }
        else {
          completeJob.result.endAmt = (completeJob.result.startAmt + actionResult.amt);
          // this.log("END_AMT NOT GROW: %s + %s -> %s", completeJob.result.startAmt, actionResult.amt, completeJob.result.endAmt);
        }

        this.log("MSG_PENDING: %s", completeJob.msgId);
        this.log("PENDING_MSG_CNT: %d", this.compFileList.length);

        // save completed job to file
        this.writeCompJobFile(completeJob, jobPid);

        // delete original files
        this.ns.rm(this.getRunningJobFPath(jobPid), this.hostname);
        this.ns.rm(this.getJobResultFPath(jobPid), this.hostname);
      }
      else {
        // result file but no job file, delete result file
        this.ns.rm(resultFilePath, this.hostname);
        this.log("RM_ORPHAN_RESULT_FILE: %s", jobPid);
      }
    }
  }

  /**
   * @param {number} jobPid
   */
  getActionResultFromFile(jobPid) {
    return this.#readDataFromFile(this.getJobResultFPath(jobPid));
  }

  /**
   * @param {number} jobPid
   */
  getRunningJobFromFile(jobPid) {
    return this.#readDataFromFile(this.getRunningJobFPath(jobPid));
  }

  /**
   * @param {string} fPath
   */
  #readDataFromFile(fPath) {
    // check for file
    if (this.ns.fileExists(fPath)) {
      // get data
      let data = JSON.parse(this.ns.read(fPath));

      // return data
      return data;
    }
    else {
      return false;
    }
  }

  /**
   * @param {object} completedJob
   * @param {number} jobPid
   */
  writeRunningJobFile(potentialJob, jobPid) {
    this.#writeDataToFile(
      this.getRunningJobFPath(jobPid),
      this.strfy(potentialJob)
    );
  }

  /**
   * @param {object} completedJob
   * @param {number} jobPid
   */
  writeCompJobFile(completedJob, jobPid) {
    this.#writeDataToFile(
      this.getCompJobFPath(jobPid),
      this.strfy(completedJob)
    );
  }

  /**
   * @param {string} fPath
   * @param {string} dataStr
   */
  #writeDataToFile(fPath, dataStr) {
    this.ns.write(
      fPath,
      dataStr,
      "w"
    );
  }

  get resultFileList() {
    return this.#getFileList(RESULT_FLAG);
  }

  get jobFileList() {
    return this.#getFileList(JOB_FLAG);
  }

  get compFileList() {
    return this.#getFileList(COMP_FLAG);
  }

  #getFileList(flag) {
    return this.ns.ls(this.hostname, flag);
  }

  getJobResultFPath(jobPid) {
    return this.ns.sprintf(JOB_RESULT_PATH, jobPid);
  }

  getRunningJobFPath(jobPid) {
    return this.ns.sprintf(RUNNING_JOB_PATH, jobPid);
  }

  getCompJobFPath(jobPid) {
    return this.ns.sprintf(COMPLETED_JOB_PATH, jobPid);
  }

  getPidFromFPath(fPath) {
    return parseInt(fPath.split("-")[0].split("/").pop());
  }

  strfy(data) {
    return JSON.stringify(data, null, 2);
  }

  returnCompletedJobs() {
    // this.log("returnCompletedJobs");

    // iterate completed job files, if failed to post (stack full), delete
    // files on successful send
    for (const compFilePath of this.compFileList) {
      this.log("READ_COMP: %s", compFilePath);

      // pop message
      let msg = this.#readDataFromFile(compFilePath);

      // set message sent props
      msg.msgReturnedTs = Date.now();
      msg.isReturned = true;
      let msgSent = false;

      this.log("TRY_SEND: %s", msg.msgId);

      // try send
      try {
        if (this.pushMessage(this.completedJobPort, msg)) {
          // set flag
          msgSent = true;

          // delete file
          this.ns.rm(compFilePath, this.hostname);
        }
        else {
          msgSent = false;
        }
      }
      catch (e) {
        msgSent = false;
      }

      if (!msgSent) {
        // send failed, do nothing, file remains
        this.log("MSG_NOT_SENT: %s", msg.msgId);
        break;
      }
      else {
        this.log("MSG_SENT: %s", msg.msgId);
      }

      this.log("PENDING_MSG_CNT: %d", this.compFileList.length);
    }
  }

  /**
   * 
   */
  unacceptJob(potentialJob) {
    // push message back for another thrall
    this.pushMessage(this.newJobPort, potentialJob);
  }

  /**
   * 
   */
  checkCanRun(scriptRamUsage, reqThreads) {
    let availableRam = this.ns.getServerMaxRam(this.hostname) - this.ns.getServerUsedRam(this.hostname) - this.ramHeadroom;
    let availThreads = Math.ceil(availableRam / scriptRamUsage);
    return (availThreads >= reqThreads);
  }

  /**
   * 
   */
  popMessage(portId) {
    let mqPortHandle = this.ns.getPortHandle(portId);

    if (!mqPortHandle) {
      throw new Error(this.ns.sprintf("!! Error getting port handle: %d", portId));
    }

    let popResult = mqPortHandle.read();

    if (!popResult || popResult === "NULL PORT DATA") {
      // this.log("popMessage: empty");
      return false;
    }

    return popResult;
  }

  /**
   * 
   */
  pushMessage(portId, messageObj) {
    let mqPortHandle = this.ns.getPortHandle(portId);

    if (!mqPortHandle) {
      throw new Error(this.ns.sprintf("!! Error getting port handle: %d", portId));
    }

    return mqPortHandle.tryWrite(messageObj);
  }

  /**
   * 
   */
  log(msgTmp, ...msgArgs) {
    this.ns.printf(this.logName + ": " + msgTmp, ...msgArgs);
  }
}
