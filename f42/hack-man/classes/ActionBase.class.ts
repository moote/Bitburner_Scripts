import TargetServer from '/f42/hack-man/classes/TargetServer.class';
import F42Base from '/f42/classes/F42Base.class';
import ActionJob from '/f42/hack-man/classes/ActionJob.class';
import { MsgErrorInvalidJob } from '/f42/hack-man/classes/MsgException.class';
import { Server } from '@ns';

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
export function validateType(testType: string): boolean {
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
export function validateStatus(testStatus: string): boolean {
  switch (testStatus) {
    case ACT_STATUS_NO_JOB:
    case ACT_STATUS_ACTIVE_JOB:
      return true;
    default:
      return false;
  }
}

export interface ActionInterface{
  currTargetAmt: () => number;
}

export default class ActionBase extends F42Base {
  #doneInit = false;
  #tgtSrv: TargetServer;
  #type: string;
  #status: string;
  #jobs: {[key: string]: ActionJob};

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
  constructor(tgtSrv: TargetServer, type: string) {
    super(tgtSrv.logger);
    this.#doInitAll(tgtSrv, type);
    
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
  #doInitAll(tgtSrv: TargetServer, type: string): void {
    this.#tgtSrv = tgtSrv;
    this.#initType = type;
    this.#status = ACT_STATUS_NO_JOB;
    this.#jobs = {};
    this.#jobCnt = 0;
    this.#currJobId = false;

    this.#doneInit = true;
  }

  toString(): string {
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
  #testInit(): void {
    if (this.#doneInit) {
      throw new Error("Init Error: can't run init functions, already initialised");
    }
  }

  // doneInit
  // <<<<<<<<<<<<<<<<

  // >>>>>>>>>>>>>>>>
  // tgtSrv

  get tgtSrv(): TargetServer {
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
  set #initType(newType: string) {
    if (!validateType(newType)) {
      throw new Error("HackAction set #initType: Invalid type: " + newType);
    }
    else {
      this.#type = newType;
    }
  }

  get type(): string {
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
  set status(newStatus: string) {
    if (!validateStatus(newStatus)) {
      throw new Error("HackAction set status: Invalid status: " + newStatus);
    }
    else {
      this.#status = newStatus;

      // TODO: trigger additional status change logic
    }
  }

  /**
   * @returns { string }
   */
  get status(): string {
    return this.#status;
  }

  get hasActiveJob(): boolean {
    return this.#status === ACT_STATUS_ACTIVE_JOB;
  }

  setStatusNoJob(): void {
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

      // clear job list
      this.#jobs = {};
    }
    else {
      // no current job, do nothing
        lo.g("No currJob");
    }
  }

  setStatusActiveJob(): ActionJob {
    this.#status = ACT_STATUS_ACTIVE_JOB;
    return this.#newJob();
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
  get metaId(): string {
    return this.#tgtSrv.metaId;
  }

  // metaId
  // <<<<<<<<<<<<<<<<

  // >>>>>>>>>>>>>>>>
  // srvObj

  get srvObj(): Server {
    return this.#tgtSrv.srvObj;
  }

  // srvObj
  // <<<<<<<<<<<<<<<<

  // >>>>>>>>>>>>>>>>
  // target

  get target(): string {
    return this.#tgtSrv.hostname;
  }

  // target
  // <<<<<<<<<<<<<<<<

  // >>>>>>>>>>>>>>>>
  // jobs

  /**
   * returns {ActionJob}
   */
  #newJob(): ActionJob {
    if (this.currJobId !== false) {
      throw new Error("Complete / Cancel current job before adding a new one: this.currJobId: " + this.currJobId);
    }

    // create new job
    const newJob = new ActionJob(this);
    this.#currJobId = newJob.id;
    this.#jobs[newJob.id] = newJob;
    this.#jobCnt++;

    return newJob;
  }

  get currJobId(): string {
    return this.#currJobId;
  }

  get currJob(): ActionJob {
    return this.#jobs[this.#currJobId];
  }

  jobWithId(jobId: number): ActionJob | boolean {
    if (!jobId in this.#jobs) {
      return false;
    }

    return this.#jobs[jobId];
  }

  /**
   * A counter of jobs run
   */
  get jobCount(): number {
    return this.#jobCnt;
  }

  /**
   * The number of jobs stored in this.#jobs
   */
  get jobListCnt(): number {
    return Object.keys(this.#jobs).length;
  }

  // jobs
  // <<<<<<<<<<<<<<<<

  // >>>>>>>>>>>>>>>>
  // utility

  /**
   * @returns {boolean}
   */
  checkTargetNeedsAction(): boolean {
    // const lo = this.getLo("checkTargetNeedsAction");

    // make sure to always trigger logic when job is active
    // to stop next action triggering before this action has
    // completed
    if (this.hasActiveJob || this.shouldTriggerAction()) {
      // run action logic
      this.actionDecisionLogic();
      // lo.g("TRUE");
      return true;
    }
    else {
      // lo.g("FALSE");
      return false;
    }
  }

  /**
   * @returns {boolean}
   */
  actionDecisionLogic(): void {
    // const lo = this.getLo("actionDecisionLogic");

    if (this.status === ACT_STATUS_NO_JOB) {
      // lo.g("ACT_STATUS_NO_JOB");
      this.targetAnalyse();
    }
    else if (this.currJob.isStatusInit) {
      // lo.g("getIsStatusInit");
      // should not encounter this; must be a crash recovery
      this.setStatusNoJob();
    }
    else if (this.currJob.isStatusSending) {
      // lo.g("getIsStatusSending: this.#currJobId: %s", this.#currJobId);
      // lo.g("getIsStatusSending: this.#currJob: %j", this.currJob);
      // send messages
      this.currJob.sendMessages();
    }
    else if (this.currJob.isStatusProcessing) {
      // lo.g("getIsStatusProcessing");
      // receiving messages, do nothing
    }
    else if (this.currJob.isStatusCompleted) {
      // lo.g("getIsStatusCompleted");
      // change to no job status
      this.setStatusNoJob();
    }
    else if (this.currJob.isStatusCancelled) {
      // lo.g("getIsStatusCancelled");
      // change to no job status
      this.setStatusNoJob();
    }
    else {
      throw new Error(
        this.ns.sprintf(
          "!! ActionBase.actionDecisionLogic: Unknown ActionJob status: %s",
          this.currJob.status
        )
      );
    }
  }

  shouldTriggerAction(): boolean {
    // override in inherited
    throw new Error("ActionBase.shouldTriggerAction needs to be overridden");
    return false;
  }

  targetAnalyse(): void {
    // override in inherited
    throw new Error("ActionBase.targetAnalyse needs to be overridden");
  }

  checkReceivedMsg(rcvdMsg: MsgSendInterface): boolean {
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
}