import F42Base from "/f42/classes/F42Base.class";
import ActionBase, * as hckAct from "/f42/hack-man/classes/ActionBase.class";
import WeakenAction from "/f42/hack-man/classes/ActionWeaken.class";
import GrowAction from "/f42/hack-man/classes/ActionGrow.class";
import HackAction from "/f42/hack-man/classes/ActionHack.class";
import { MsgErrorInvalidActionType } from "/f42/hack-man/classes/MsgException.class";
import { Server } from "@ns";
import F42Logger from "/f42/classes/f42-logger-class";
import { JobStateInterface, TSrvStateInterface } from "/f42/hack-man/classes/HMStateMsg.class";

// server statuses
export const STATUS_NEW = "new";
export const STATUS_ACTIVE = "active";
export const STATUS_PAUSED = "paused";
export const STATUS_REANAL = "reananlyse";
export const STATUS_REMOVE = "remove";

/**
 * @param {string} testStatus
 */
export function validateStatus(testStatus: string): boolean {
  switch (testStatus) {
    case STATUS_NEW:
    case STATUS_ACTIVE:
    case STATUS_PAUSED:
    case STATUS_REANAL:
    case STATUS_REMOVE:
      return true;
    default:
      return false;
  }
}

export default class TargetServer extends F42Base {
  #doneInit = false;
  #metaId: string;
  #hostname: string;
  #srvObj: Server;
  #status: string;
  #actions: { [key: string]: ActionBase };
  #stats: StatsTSrvInterface;

  /**
   * @param {object} ns
   * @param {F42Logger} logger
   * @param {string} hostname
   */
  constructor(logger: F42Logger, hostname: string, metaId: string) {
    super(logger);
    this.#doInitAll(hostname, metaId);

    this.allowedLogFunctions = [
      // "checkReceivedMsg",
      // "checkTargetActions",
      "statStartJob",
      "statMsgRcvd",
    ];
  }

  /**
   * @param {string} hostname
   */
  #doInitAll(hostname: string, metaId: string): void {
    this.#metaId = metaId;
    this.#initHostname = hostname;
    this.updateSrvObj();
    this.#status = STATUS_NEW;
    this.#initActions();
    this.#initStats();
    this.#doneInit = true;
  }

  // ////////////////
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

  // ////////////////
  // hostname
  // ////////////////

  /**
   * @param {string} hostname
   * @throws {Error} Throws error on invalid hostname, or no root access on server
   */
  set #initHostname(hostname: string) {
    // const fnN = "initHostname";
    this.#testInit();

    // validate hostname
    if (!this.ns.serverExists(hostname)) {
      throw new Error("TargetServer set #initHostname: Invalid hostname, server does not exist: " + hostname);
    }

    // validate root access
    if (!this.ns.hasRootAccess(hostname)) {
      throw new Error("TargetServer set #initHostname: No root access on target server: " + hostname);
    }

    // set hostname
    this.#hostname = hostname;
    // this.log(fnN, "hostname: %s", hostname);

    // get Server object & save
    this.updateSrvObj();
  }

  /**
   * @returns {string}
   */
  get hostname(): string {
    return this.#hostname;
  }

  // ////////////////
  // stats
  // ////////////////

  get stats(): TSrvStateInterface {
    return this.#stats;
  }

  #initStats(): void {
    this.#testInit();
    this.#stats = {
      initTs: Date.now(),
      totalHacked: 0,
      totalGrown: 0,
      totalWeakened: 0,
      completedJobs: 0,
      activeJob: this.#newStatActiveJob(),
      jobsStoredCnt: 0,
      raw: {
        totalHacked: 0,
        totalGrown: 0,
        totalWeakened: 0,
      },
    };
  }

  /**
   * 
   * @param type 
   * @param estAmt 
   * @param estTime 
   * @param startTime 
   * @returns A new JobStateInterface
   */
  #newStatActiveJob(type = "", estAmt = "", estTime = 0, startTime = 0): JobStateInterface {
    return {
      type,
      estAmt,
      estTime,
      startTime,
      msgSent: 0,
      msgRcvd: 0,
      amt: 0
    };
  }

  /**
   * @param {string} type
   * @param {number} estAmt
   * @param {number} estTime
   */
  statStartJob(type: string, estAmt: number, estTime: number): void {
    this.#stats.activeJob = this.#newStatActiveJob(
      type,
      estAmt,
      estTime,
      Date.now(),
    );
  }

  statMsgSent(): void {
    this.#stats.activeJob.msgSent++;
  }

  /**
   * @param {number} jobAmt
   */
  statMsgRcvd(jobAmt: number): void {
    this.getLo("statMsgRcvd", "jobAmt: %s", jobAmt);

    // update job stats
    this.#stats.activeJob.msgRcvd++;
    this.#stats.activeJob.amt = this.ns.formatNumber(jobAmt);

    // do type specific update to total
    switch (this.#stats.activeJob.type) {
      case hckAct.ACT_WEAK:
        this.#stats.raw.totalWeakened += jobAmt;
        this.#stats.totalWeakened = this.ns.formatNumber(this.#stats.raw.totalWeakened);
        break;
      case hckAct.ACT_GROW:
        this.#stats.raw.totalGrown += jobAmt;
        this.#stats.totalGrown = this.ns.formatNumber(this.#stats.raw.totalGrown);
        break;
      case hckAct.ACT_HACK:
        this.#stats.raw.totalHacked += jobAmt;
        this.#stats.totalHacked = this.ns.formatNumber(this.#stats.raw.totalHacked);
        break;
    }

    let jobsStoredCnt = 0;

    for(const key in this.#actions){
      jobsStoredCnt += this.#actions[key].jobListCnt;
    }

    this.#stats.jobsStoredCnt = jobsStoredCnt;
  }

  /**
   * Adds amount and clears active job stats
   */
  statCloseJob(): void {
    // inc completed job count
    this.#stats.completedJobs++;

    // clear active
    this.#stats.activeJob = this.#newStatActiveJob();
  }

  // ////////////////
  // metaId
  // ////////////////

  get metaId(): string {
    return this.#metaId;
  }

  // ////////////////
  // srvObj
  // ////////////////

  /**
   * Loads a new Server object using stored hostname
   */
  updateSrvObj(): void {
    if (!this.#hostname) {
      throw new Error("HackManager.updateSrvObj(): Invalid hostname");
    }

    this.#srvObj = this.ns.getServer(this.#hostname);
  }

  /**
   * @returns { Server }
   */
  get srvObj(): Server {
    return this.#srvObj;
  }

  // ////////////////
  // status
  // ////////////////

  /**
   * @param { string } newStatus
   * @throws { Error } Throws error if status invalid
   */
  set status(newStatus: string) {
    if (!validateStatus(newStatus)) {
      throw new Error("TargetServer set status: Invalid status: " + newStatus);
    }
    else {
      this.#status = newStatus;

      // TODO: trigger additional status change logic
    }
  }

  /**
   * @returns {string}
   */
  get status(): string {
    return this.#status;
  }

  // ////////////////
  // actions
  // ////////////////

  #initActions(): void {
    this.#testInit();
    this.#actions = {};
    this.#actions[hckAct.ACT_WEAK] = new WeakenAction(this);
    this.#actions[hckAct.ACT_GROW] = new GrowAction(this);
    this.#actions[hckAct.ACT_HACK] = new HackAction(this);
  }

  /**
   * Returns ActionBase for requested type
   * 
   * @param {string} type The action type required
   * @returns {ActionBase}
   * @throws {Error} Throws error if type invalid
   */
  getAction(type: string): ActionBase {
    if (!hckAct.validateType(type)) {
      throw new Error("TargetServer.getAction(): Invalid action type: " + type);
    }
    else {
      return this.#actions[type];
    }
  }

  /**
   * Returns WeakenAction for requested type
   * 
   * @returns {WeakenAction}
   */
  get weakenAction(): WeakenAction {
    return this.#actions[hckAct.ACT_WEAK];
  }

  /**
   * Returns GrowAction for requested type
   * 
   * @returns {GrowAction}
   */
  get growAction(): GrowAction {
    return this.#actions[hckAct.ACT_GROW];
  }

  /**
   * Returns HackAction for requested type
   * 
   * @returns {HackAction}
   */
  get hackAction(): HackAction {
    return this.#actions[hckAct.ACT_HACK];
  }

  get hasActiveAction(): boolean {
    if (
      this.weakenAction.hasActiveJob
      || this.growAction.hasActiveJob
      || this.hackAction.hasActiveJob
    ) {
      return true;
    }
    else{
      return false;
    }
  }

  // ////////////////
  // main loop functions
  // ////////////////

  checkStatusActionable():void {
    switch (this.status) {
      case STATUS_NEW:
        // this.log(fnN, "tgtSrv: %s > STATUS_NEW", tgtSrvHostname);
        // set active
        this.status = STATUS_ACTIVE;

        // check actions
        this.#checkTargetActions();
        break;
      case STATUS_ACTIVE:
        // this.log(fnN, "tgtSrv: %s > STATUS_ACTIVE", tgtSrvHostname);
        // check actions
        this.#checkTargetActions();
        break;
      case STATUS_PAUSED:
        // this.log(fnN, "tgtSrv: %s > STATUS_PAUSED", tgtSrvHostname);
        // do nothing
        break;
      case STATUS_REANAL:
        // this.log(fnN, "tgtSrv: %s > STATUS_REANAL", tgtSrvHostname);
        // TODO
        break;
      case STATUS_REMOVE:
        // this.log(fnN, "tgtSrv: %s > STATUS_REMOVE", tgtSrvHostname);
        // TODO
        break;
      default:
        throw new Error(
          super.ns.sprintf(
            "!! TargetServer.checkStatusActionable: Unknown target server status: %s",
            this.status
          )
        );
        break;
    }
  }

  #checkTargetActions(): boolean {
    const lo = this.getLo("checkTargetActions");
    if (this.hasActiveAction) {
      // do nothing as one of the actions has an active job
      if (this.weakenAction.hasActiveJob) {
        lo.g("Weaken active");
        this.weakenAction.checkTargetNeedsAction();
      }
      else if (this.growAction.hasActiveJob) {
        lo.g("Grow active");
        this.growAction.checkTargetNeedsAction();
      }
      else if (this.hackAction.hasActiveJob) {
        lo.g("Hack active");
        this.hackAction.checkTargetNeedsAction();
      }
      else {
        lo.g("!!!! hasActive action, but no active action found !!!!");
      }
    }
    else { // test each action to see if needed
      if (!this.weakenAction.checkTargetNeedsAction()) {
        lo.g("Weaken not needed");
        if (!this.growAction.checkTargetNeedsAction()) {
          lo.g("Grow not needed");
          lo.g("Hack needed");
          this.hackAction.checkTargetNeedsAction();
        }
      }
    }
  }

  checkReceivedMsg(rcvdMsg: MsgSendInterface): boolean {
    const lo = this.getLo("checkReceivedMsg", " CHK_ACTION: %s -> %s %s", this.hostname, rcvdMsg.msgId, rcvdMsg.actionType);

    if (rcvdMsg.actionType in this.#actions) {
      lo.g("MATCH_ACTION: %s", rcvdMsg.target);
      return this.#actions[rcvdMsg.actionType].checkReceivedMsg(rcvdMsg);
    }
    else {
      throw new MsgErrorInvalidActionType(
        this.ns.sprintf("Invalid action type: %s", this.stringify(rcvdMsg))
      );
    }
  }
}