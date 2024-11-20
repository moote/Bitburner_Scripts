import { NS } from '@ns'
import { RESULT_FLAG, JOB_RESULT_PATH } from "/f42/thrall/hack_";
import { ThrallJob, ThrallJobAction, ThrallActionResult } from "./interfaces";

export const JOB_FLAG = "-THRALL-job";
export const COMP_FLAG = "-THRALL-comp";
export const RUNNING_JOB_PATH = "f42/thrall/tmp/%d" + JOB_FLAG + ".txt";
export const COMPLETED_JOB_PATH = "f42/thrall/tmp/%d" + COMP_FLAG + ".txt";

export default class ThrallControl {
  ns: NS;
  logName: string;
  newJobPort = 10;
  completedJobPort = 11;
  hostname: string;
  ramHeadroom = 0;

  weakenScriptPath = "f42/thrall/weaken_.js";
  growScriptPath = "f42/thrall/grow_.js";
  hackScriptPath = "f42/thrall/hack_.js";

  /**
   * 
   */
  static getRandomNumberInRange(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }

  constructor(ns: NS, logName = "ThrallControlV3") {
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
  getPotentialJob(): void {
    let potentialJob: ThrallJob | false;
    let jobAction: ThrallJobAction | false;
    let acceptedJob = false;

    // get job
    try {
      potentialJob = this.popMessage(this.newJobPort);
    }
    catch (e) {
      potentialJob = false;
    }

    acceptedJob = false;

    if (potentialJob !== false) {
      // get job action data
      jobAction = this.getJobAction(potentialJob);

      if (jobAction != false) {
        if (this.checkCanRun(jobAction.ram, potentialJob.threads)) {
          this.log("RUN(%s): %s >> %s", potentialJob.msgId, potentialJob.target, potentialJob.actionType);

          // add job to running list
          potentialJob.result.actionedBy = this.hostname;
          potentialJob.result.startTs = Date.now();
          potentialJob.result.startAmt = jobAction.startAmt;

          // start job
          try {
            const jobPid = this.runJob(potentialJob, jobAction);

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

  getJobAction(potentialJob: ThrallJob): ThrallJobAction | false {
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

  runJob(potentialJob: ThrallJob, jobAction: ThrallJobAction): number {
    // start job
    const jobPid = this.ns.run(
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
  checkCompletedFileJobs(): void {
    // this.log("checkCompletedFileJobs");

    for (const resultFilePath of this.resultFileList) {
      const jobPid = this.getPidFromFPath(resultFilePath);

      this.log("TEST_RESULT_FILE: %s", resultFilePath);

      if (this.ns.fileExists(this.getRunningJobFPath(jobPid))) {
        // read job file
        const completeJob = this.getRunningJobFromFile(jobPid);

        // read result file
        const actionResult = this.getActionResultFromFile(jobPid);

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
  getActionResultFromFile(jobPid: number): ThrallActionResult {
    return <ThrallActionResult>this.#readDataFromFile(this.getJobResultFPath(jobPid));
  }

  /**
   * @param {number} jobPid
   */
  getRunningJobFromFile(jobPid: number): ThrallJob {
    return <ThrallJob>this.#readDataFromFile(this.getRunningJobFPath(jobPid));
  }

  getCompJobFromFile(fpath: string) {
    return <ThrallJob>this.#readDataFromFile(fpath);
  }

  /**
   * @param {string} fPath
   */
  #readDataFromFile(fPath: string): ThrallJob | ThrallActionResult {
    // check for file
    if (this.ns.fileExists(fPath)) {
      // get data
      const data = JSON.parse(this.ns.read(fPath));

      // return data
      return data;
    }
    else {
      throw new Error("Can't read data from: " + fPath);
    }
  }

  /**
   * @param {object} completedJob
   * @param {number} jobPid
   */
  writeRunningJobFile(potentialJob: ThrallJob, jobPid: number): void {
    this.#writeDataToFile(
      this.getRunningJobFPath(jobPid),
      this.strfy(potentialJob)
    );
  }

  /**
   * @param {object} completedJob
   * @param {number} jobPid
   */
  writeCompJobFile(completedJob: ThrallJob, jobPid: number): void {
    this.#writeDataToFile(
      this.getCompJobFPath(jobPid),
      this.strfy(completedJob)
    );
  }

  /**
   * @param {string} fPath
   * @param {string} dataStr
   */
  #writeDataToFile(fPath: string, dataStr: string): void {
    this.ns.write(
      fPath,
      dataStr,
      "w"
    );
  }

  get resultFileList(): string[] {
    return this.#getFileList(RESULT_FLAG);
  }

  get jobFileList(): string[] {
    return this.#getFileList(JOB_FLAG);
  }

  get compFileList(): string[] {
    return this.#getFileList(COMP_FLAG);
  }

  #getFileList(flag: string): string[] {
    return this.ns.ls(this.hostname, flag);
  }

  getJobResultFPath(jobPid: number): string {
    return this.ns.sprintf(JOB_RESULT_PATH, jobPid);
  }

  getRunningJobFPath(jobPid: number): string {
    return this.ns.sprintf(RUNNING_JOB_PATH, jobPid);
  }

  getCompJobFPath(jobPid: number): string {
    return this.ns.sprintf(COMPLETED_JOB_PATH, jobPid);
  }

  getPidFromFPath(fPath: string): number {
    const pid = fPath.split("-")[0].split("/").pop();

    if(typeof pid === "undefined"){
      throw new Error("Could not read pid");
    }

    return parseInt(pid);
  }

  strfy(data: ThrallJob | ThrallJobAction | ThrallActionResult): string {
    return JSON.stringify(data, null, 2);
  }

  returnCompletedJobs(): void {
    // this.log("returnCompletedJobs");

    // iterate completed job files, if failed to post (stack full), delete
    // files on successful send
    for (const compFilePath of this.compFileList) {
      this.log("READ_COMP: %s", compFilePath);

      // pop message
      const msg = this.getCompJobFromFile(compFilePath);

      // set message sent
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
  unacceptJob(potentialJob: ThrallJob): void {
    // push message back for another thrall
    this.pushMessage(this.newJobPort, potentialJob);
  }

  /**
   * 
   */
  checkCanRun(scriptRamUsage: number, reqThreads: number): boolean {
    const availableRam = this.ns.getServerMaxRam(this.hostname) - this.ns.getServerUsedRam(this.hostname) - this.ramHeadroom;
    const availThreads = Math.ceil(availableRam / scriptRamUsage);
    return (availThreads >= reqThreads);
  }

  /**
   * 
   */
  popMessage(portId: number): ThrallJob | false {
    const mqPortHandle = this.ns.getPortHandle(portId);

    if (!mqPortHandle) {
      throw new Error(this.ns.sprintf("!! Error getting port handle: %d", portId));
    }

    const popResult = mqPortHandle.read();

    if (!popResult || popResult === "NULL PORT DATA") {
      // this.log("popMessage: empty");
      return false;
    }

    return popResult;
  }

  /**
   * 
   */
  pushMessage(portId: number, messageObj: ThrallJob): boolean {
    const mqPortHandle = this.ns.getPortHandle(portId);

    if (!mqPortHandle) {
      throw new Error(this.ns.sprintf("!! Error getting port handle: %d", portId));
    }

    return mqPortHandle.tryWrite(messageObj);
  }

  /**
   * 
   */
  log(msgTmp: string, ...msgArgs: (string | number | boolean)[]): void {
    this.ns.printf(this.logName + ": " + msgTmp, ...msgArgs);
  }
}
