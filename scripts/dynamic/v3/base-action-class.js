import F42Base from '/scripts/classes/f42-base-class.js';
import ActionJob from "/scripts/dynamic/v3/action-job-class.js";
import { MsgErrorInvalidJob } from "/scripts/dynamic/v3/msg-exceptions-class.js";

// action types
export const ACT_WEAK = "weak";
export const ACT_GROW = "grow";
export const ACT_HACK = "hack";

// action statuses
export const ACT_STATUS_NO_JOB = "no-job";
export const ACT_STATUS_ACTIVE_JOB = "active";

/**
 * @param {string} testType
 */
export function validateType(testType) {
  switch (testType) {
    case ACT_WEAK:
    case ACT_GROW:
    case ACT_HACK:
      return true;
    default:
      return false;
  }
}

/**
 * @param {string} testStatus
 */
export function validateStatus(testStatus) {
  switch (testStatus) {
    case ACT_STATUS_NO_JOB:
    case ACT_STATUS_ACTIVE_JOB:
      return true;
    default:
      return false;
  }
}

export default class BaseAction extends F42Base {
  #doneInit = false;
  #tgtSrv;
  #type;
  #status;
  #jobs;

  /**
   * If false then no current jobs (init or active)
   * @type (boolean|string)
   * @private
   */
  #currJobId;
  #jobCnt;

  /**
   * @param {TargetServer} tgtSrv
   * @param {string} type
   */
  constructor(tgtSrv, type, serialObj = undefined) {
    super(tgtSrv.ns, tgtSrv.logger, serialObj);
    this.#doInitAll(tgtSrv, type);
    if(serialObj){
      this.unserialize(serialObj);
    }
    
    this.allowedLogFunctions = [
      // "setStatusNoJob",
      // "shouldTriggerAction",
      // "checkReceivedMsg",
      // "checkTargetNeedsAction",
    ];
  }

  /**
   * @param {TargetServer} tgtSrv
   */
  #doInitAll(tgtSrv, type) {
    this.#tgtSrv = tgtSrv;
    this.#initType = type;
    this.#status = ACT_STATUS_NO_JOB;
    this.#jobs = {};
    this.#jobCnt = 0;
    this.#currJobId = false;

    this.#doneInit = true;
  }

  toString() {
    return this.ns.sprintf(
      "%s: status: %s | metaId: %s",
      this.#type,
      this.#status,
      this.metaId
    );
  }

  // >>>>>>>>>>>>>>>>
  // doneInit

  /**
   * @throws {Error}  Throws error if it's called after initialisation. Should
   *                  be included at start of all functions that are init only.
   */
  #testInit() {
    if (this.#doneInit) {
      throw new Error("Init Error: can't run init functions, already initialised");
    }
  }

  // doneInit
  // <<<<<<<<<<<<<<<<

  // >>>>>>>>>>>>>>>>
  // tgtSrv

  get tgtSrv() {
    return this.#tgtSrv;
  }

  // tgtSrv
  // <<<<<<<<<<<<<<<<

  // >>>>>>>>>>>>>>>>
  // type

  /**
   * @param { string } newType
   * @throws { Error } Throws error if type invalid
   */
  set #initType(newType) {
    if (!validateType(newType)) {
      throw new Error("HackAction set #initType: Invalid type: " + newType);
    }
    else {
      this.#type = newType;
    }
  }

  get type() {
    return this.#type;
  }

  // type
  // <<<<<<<<<<<<<<<<

  // >>>>>>>>>>>>>>>>
  // status

  /**
   * @param { string } newStatus
   * @throws { Error } Throws error if status invalid
   */
  set status(newStatus) {
    if (!validateStatus(newStatus)) {
      throw new Error("HackAction set status: Invalid status: " + newStatus);
    }
    else {
      this.#status = newStatus;

      // TODO: trigger additional status change logic
    }
  }

  setStatusNoJob() {
    const lo = this.getLo("setStatusNoJob");

    this.#status = ACT_STATUS_NO_JOB;

    if (this.#currJobId !== false) {
      // has current job, so close/cancel
      if (this.currJob.isStatusCompleted || this.currJob.getIsStatusCancelled) {
        // in a closed cancelled state, so just update ref
        lo.g("Clear currJobId: %s", this.#currJobId);
        this.#currJobId = false;
      }
      else {
        // in an active state so cancel
        lo.g("Cancel currJob: %s", this.#currJobId);
        this.currJob.setStatusCancel();
      }
    }
    else {
      // no current job, do nothing
        lo.g("No currJob");
    }
  }

  setStatusActiveJob() {
    this.#status = ACT_STATUS_ACTIVE_JOB;
    return this.#newJob();
  }

  /**
   * @returns { string }
   */
  get status() {
    return this.#status;
  }

  get hasActiveJob() {
    return this.#status === ACT_STATUS_ACTIVE_JOB;
  }

  // status
  // <<<<<<<<<<<<<<<<

  // >>>>>>>>>>>>>>>>
  // metaId

  /**
   * Use parent TargetServer.metaId
   * 
   * @returns {string}
   */
  get metaId() {
    return this.#tgtSrv.metaId;
  }

  // metaId
  // <<<<<<<<<<<<<<<<

  // >>>>>>>>>>>>>>>>
  // srvObj

  get srvObj() {
    return this.#tgtSrv.srvObj;
  }

  // srvObj
  // <<<<<<<<<<<<<<<<

  // >>>>>>>>>>>>>>>>
  // target

  get target() {
    return this.#tgtSrv.hostname;
  }

  // target
  // <<<<<<<<<<<<<<<<

  // >>>>>>>>>>>>>>>>
  // jobs

  /**
   * returns {ActionJob}
   */
  #newJob() {
    if (this.currJobId !== false) {
      throw new Error("Complete / Cancel current job before adding a new one: this.currJobId: " + this.currJobId);
    }

    // create new job
    let newJob = new ActionJob(this);
    this.#currJobId = newJob.id;
    this.#jobs[newJob.id] = newJob;
    this.#jobCnt++;

    return newJob;
  }

  get currJobId() {
    return this.#currJobId;
  }

  get currJob() {
    return this.#jobs[this.#currJobId];
  }

  jobWithId(jobId) {
    if (!jobId in this.#jobs) {
      return false;
    }

    return this.#jobs[jobId];
  }

  get jobCount() {
    return this.#jobCnt;
  }

  // jobs
  // <<<<<<<<<<<<<<<<

  // >>>>>>>>>>>>>>>>
  // utility

  /**
   * Should be overriden in type specific inheriting clases
   */
  currTargetAmt() {
    throw new Error("BaseAction.getCurrAmt(): This should be overridden");
  }

  /**
   * @returns {boolean}
   */
  checkTargetNeedsAction() {
    const lo = this.getLo("checkTargetNeedsAction");

    // make sure to always trigger logic when job is active
    // to stop next action triggering before this action has
    // completed
    if (this.hasActiveJob || this.shouldTriggerAction()) {
      // run action logic
      this.actionDecisionLogic();
      lo.g("TRUE");
      return true;
    }
    else {
      lo.g("FALSE");
      return false;
    }
  }

  /**
   * @returns {boolean}
   */
  actionDecisionLogic() {
    let lo = this.getLo("actionDecisionLogic");

    if (this.status === ACT_STATUS_NO_JOB) {
      lo.g("ACT_STATUS_NO_JOB");
      this.targetAnalyse();
    }
    else if (this.currJob.isStatusInit) {
      lo.g("getIsStatusInit");
      // should not encounter this; must be a crash recovery
      this.setStatusNoJob();
    }
    else if (this.currJob.isStatusSending) {
      lo.g("getIsStatusSending: this.#currJobId: %s", this.#currJobId);
      lo.g("getIsStatusSending: this.#currJob: %j", this.currJob);
      // send messages
      this.currJob.sendMessages();
    }
    else if (this.currJob.isStatusProcessing) {
      lo.g("getIsStatusProcessing");
      // receiving messages, do nothing
    }
    else if (this.currJob.isStatusCompleted) {
      lo.g("getIsStatusCompleted");
      // change to no job status
      this.setStatusNoJob();
    }
    else if (this.currJob.isStatusCancelled) {
      lo.g("getIsStatusCancelled");
      // change to no job status
      this.setStatusNoJob();
    }
    else {
      throw new Error(
        this.ns.sprintf(
          "!! BaseAction.actionDecisionLogic: Unknown ActionJob status: %s",
          this.currJob.status
        )
      );
    }
  }

  shouldTriggerAction() {
    // override in inherited
    throw new Error("BaseAction.shouldTriggerAction needs to be overridden");
    return false;
  }

  targetAnalyse() {
    // override in inherited
    throw new Error("BaseAction.targetAnalyse needs to be overridden");
  }

  checkReceivedMsg(rcvdMsg) {
    const lo = this.getLo("checkReceivedMsg", "CHK_JOB: %s", rcvdMsg.jobId);

    if (rcvdMsg.jobId in this.#jobs) {
      // pass to job
      lo.g("MATCH_JOB");
      return this.#jobs[rcvdMsg.jobId].checkReceivedMsg(rcvdMsg);
    }
    else {
      // bad message
      throw new MsgErrorInvalidJob(
        this.ns.sprintf("Invalid job id: %s", this.stringify(rcvdMsg))
      );
    }
  }

  // utility
  // <<<<<<<<<<<<<<<<

  // >>>>>>>>>>>>>>>>
  // serialization

  get serialObj() {
    let serialObj = {
      doneInit: this.#doneInit,
      type: this.#type,
      status: this.#status,
      jobs: {},
      currJobId: this.#currJobId,
      jobCnt: this.#jobCnt,
    };

    for (const jobId in this.#jobs) {
      serialObj.jobs[jobId] = this.#jobs[jobId].serialObj;
    }

    return serialObj;
  }

  get serialObjBasic() {
    let sob = {
      type: this.#type,
      status: this.#status,
      jobs: {},
      currJobId: this.#currJobId,
      jobCnt: this.#jobCnt,
    };

    for (const jobId in this.#jobs) {
      sob.jobs[jobId] = this.#jobs[jobId].serialObjBasic;
    }

    return sob;
  }

  /**
   * Called automagically by F42Base
   */
  unserialize(serialObj) {
    this.#doneInit = serialObj.doneInit;
    this.#type = serialObj.type;
    this.#status = serialObj.status;
    this.#jobs = {};
    this.#currJobId = serialObj.currJobId;
    this.#jobCnt = serialObj.jobCnt;

    for (const jobId in serialObj.jobs) {
      this.#jobs[jobId] = new ActionJob(this, serialObj.jobs[jobId]);
    }
  }

  // serialization
  // <<<<<<<<<<<<<<<<
}