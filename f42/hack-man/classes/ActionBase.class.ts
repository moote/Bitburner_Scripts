import TargetServer from '/f42/hack-man/classes/TargetServer.class';
import F42Base from '/f42/classes/F42Base.class';
import ActionJob from '/f42/hack-man/classes/ActionJob.class';
import { MsgErrorInvalidJob } from '/f42/hack-man/classes/MsgException.class';
import { Server } from '@ns';
import { ActionStatus, ActionType } from '/f42/hack-man/classes/enums';
import { ActionJobList, HasState_Interface, HMJobMsg_Interface, JobState_Interface } from '/f42/classes/helpers/interfaces';
import { getEmpty_JobState_Interface } from '/f42/classes/helpers/empty-object-getters';

export interface ActionInterface {
  currTargetAmt: number;
}

export default class ActionBase extends F42Base implements ActionInterface, HasState_Interface {
  #doneInit = false;
  #tgtSrv: TargetServer;
  #type: ActionType;
  #status: ActionStatus;
  #jobs: ActionJobList;
  #currJobId: string | false;
  #jobCnt: number;
  #compJobCnt: number;
  #totalAmt: number; // the total amount weakened / grown / hacked

  /**
   * @param {TargetServer} tgtSrv
   * @param {ActionType} type
   */
  constructor(tgtSrv: TargetServer, type: ActionType) {
    super(tgtSrv.logger);
    this.#tgtSrv = tgtSrv;
    this.#type = type;
    this.#status = ActionStatus.NO_JOB;
    this.#jobs = {};
    this.#jobCnt = 0;
    this.#totalAmt = 0;
    this.#currJobId = false;
    this.#compJobCnt = 0;
    this.#doneInit = true;

    this.allowedLogFunctions = [
      // "setStatusNoJob",
      // "shouldTriggerAction",
      // "checkReceivedMsg",
      // "checkTargetNeedsAction",
    ];
  }

  get currTargetAmt(): number {
    return 0;
  }

  toString(): string {
    return this.ns.sprintf(
      "%s: status: %s | metaId: %s",
      this.#type,
      this.#status,
      this.metaId
    );
  }

  // \\\\\\\\\\\\\\\\
  // doneInit
  // ////////////////

  /**
   * @throws {Error}  Throws error if it's called after initialisation. Should
   *                  be included at start of all functions that are init only.
   */
  #testInit(): void {
    if (this.#doneInit) {
      throw new Error("Init Error: can't run init functions, already initialised");
    }
  }

  // \\\\\\\\\\\\\\\\
  // tgtSrv
  // ////////////////

  get tgtSrv(): TargetServer {
    return this.#tgtSrv;
  }

  // \\\\\\\\\\\\\\\\
  // type
  // ////////////////

  get type(): ActionType {
    return this.#type;
  }

  // \\\\\\\\\\\\\\\\
  // status
  // ////////////////

  /**
   * @returns { ActionStatus }
   */
  get status(): ActionStatus {
    return this.#status;
  }

  get hasActiveJob(): boolean {
    return this.#status === ActionStatus.ACTIVE_JOB;
  }

  setStatusNoJob(): void {
    const lo = this.getLo("setStatusNoJob");

    this.#status = ActionStatus.NO_JOB;

    if (this.currJob !== false) {
      // has current job, so close/cancel
      if (this.currJob.isStatusCompleted || this.currJob.isStatusCancelled) {
        // in a closed cancelled state, so just update ref
        lo.g("Clear currJobId: %s", this.#currJobId);
        this.#currJobId = false;
      }
      else {
        // in an active state so cancel
        lo.g("Cancel currJob: %s", '' + this.#currJobId);
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
    this.#status = ActionStatus.ACTIVE_JOB;
    return this.#newJob();
  }

  /**
   * An alias to this.setStatusNoJob(), but returns boolean.
   * Cancel is still run, regardless of initial state, 
   * ensuring job is truly cancelled.
   * 
   * @returns True if a job was acive before cancel
   */
    tryCancel(): boolean {
    this.getLo("cancel");
    const hadActive = this.hasActiveJob;
    this.setStatusNoJob();
    return hadActive;
  }

  // \\\\\\\\\\\\\\\\
  // metaId
  // ////////////////

  /**
   * Use parent TargetServer.metaId
   * 
   * @returns {string}
   */
  get metaId(): string {
    return this.#tgtSrv.metaId;
  }

  // \\\\\\\\\\\\\\\\
  // srvObj
  // ////////////////

  get srvObj(): Server {
    return this.#tgtSrv.srvObj;
  }

  // \\\\\\\\\\\\\\\\
  // target
  // ////////////////

  get target(): string {
    return this.#tgtSrv.hostname;
  }

  // \\\\\\\\\\\\\\\\
  // jobs
  // ////////////////

  /**
   * Creates a new job, assigns it's id to #currJobId, and
   * increments the job count.
   * 
   * @returns A new ActionJob
   */
  #newJob(): ActionJob {
    if (this.currJob !== false) {
      throw new Error("Complete / Cancel current job before adding a new one: this.currJobId: " + this.currJobId);
    }

    // create new job
    const newJob = new ActionJob(this);
    this.#currJobId = newJob.id;
    this.#jobs[newJob.id] = newJob;
    this.#jobCnt++;

    return newJob;
  }

  get currJobId(): string | false {
    return this.#currJobId;
  }

  get currJob(): ActionJob | false {
    if(this.#currJobId !== false){
      return this.#jobs[this.#currJobId];
    }
    else{
      return false;
    }
  }

  jobWithId(jobId: number): ActionJob | boolean {
    if (typeof this.#jobs[jobId] === "undefined") {
      return false;
    }

    return this.#jobs[jobId];
  }

  /**
   * A counter of jobs run
   */
  get jobCnt(): number {
    return this.#jobCnt;
  }

  /**
   * Counter of jobs *completed*, not canceled
   */
  get compJobCnt(): number {
    return this.#compJobCnt;
  }

  /**
   * The number of jobs stored in this.#jobs
   */
  get jobListCnt(): number {
    return Object.keys(this.#jobs).length;
  }

  /**
   * Actions retrun no state of their own, but
   * instead return state of current job, if none,
   * then an empty job state
   */
  get state():JobState_Interface {
    if(this.currJob){
      return this.currJob.state;
    }
    else{
      return getEmpty_JobState_Interface();
    }
  }

  // \\\\\\\\\\\\\\\\
  // misc. stat counters
  // ////////////////

  /**
   * These are needed as jobs/messages are epehmeral
   */

  get totalAmt(): number {
    return this.#totalAmt;
  }

  updateActionTotalAmt(jobAmt: number): void {
    this.#totalAmt += jobAmt;
  }

  // \\\\\\\\\\\\\\\\
  // utility
  // ////////////////

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

    if (this.status === ActionStatus.NO_JOB || !this.currJob) {
      // lo.g("ActionStatus.NO_JOB");
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

  checkReceivedMsg(rcvdMsg: HMJobMsg_Interface): boolean {
    const lo = this.getLo("checkReceivedMsg", "CHK_JOB: %s", rcvdMsg.jobId);

    if (rcvdMsg.jobId in this.#jobs) {
      // pass to job
      lo.g("MATCH_JOB");
      return this.#jobs[rcvdMsg.jobId].checkReceivedMsg(rcvdMsg);
    }
    else {
      // bad message
      throw new MsgErrorInvalidJob(
        this.ns.sprintf("Invalid job id: %s", JSON.stringify(rcvdMsg, null, 2))
      );
    }
  }
}