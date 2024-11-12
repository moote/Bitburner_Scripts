import F42Base from '/scripts/classes/f42-base-class.js';
import BaseAction, * as hckAct from "/scripts/dynamic/v3/base-action-class.js";
import WeakenAction from "/scripts/dynamic/v3/weaken-action-class.js";
import GrowAction from "/scripts/dynamic/v3/grow-action-class.js";
import HackAction from "/scripts/dynamic/v3/hack-action-class.js";
import { MsgErrorInvalidActionType } from "/scripts/dynamic/v3/msg-exceptions-class.js";

// server statuses
export const STATUS_NEW = "new";
export const STATUS_ACTIVE = "active";
export const STATUS_PAUSED = "paused";
export const STATUS_REANAL = "reananlyse";
export const STATUS_REMOVE = "remove";

/**
 * @param {string} testStatus
 */
export function validateStatus(testStatus) {
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
  #metaId;
  #hostname;
  #srvObj;
  #status;
  #actions;
  #stats;

  /**
   * @param {object} ns
   * @param {F42Logger} logger
   * @param {string} hostname
   */
  constructor(ns, logger, hostname, metaId, serialObj = undefined) {
    super(ns, logger, serialObj);
    this.#doInitAll(hostname, metaId);
    if (serialObj) {
      this.unserialize(serialObj);
    }

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
  #doInitAll(hostname, metaId) {
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
  #testInit() {
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
  set #initHostname(hostname) {
    const fnN = "initHostname";
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
    this.log(fnN, "hostname: %s", hostname);

    // get Server object & save
    this.updateSrvObj();
  }

  /**
   * @returns {string}
   */
  get hostname() {
    return this.#hostname;
  }

  // ////////////////
  // stats
  // ////////////////

  #initStats() {
    this.#testInit();
    this.#stats = {
      initTs: Date.now(),
      totalHacked: 0,
      totalGrown: 0,
      totalWeakened: 0,
      completedJobs: 0,
      activeJob: this.#newStatActiveJob(),
      raw: {
        totalHacked: 0,
        totalGrown: 0,
        totalWeakened: 0,
      }
    };
  }

  #newStatActiveJob(type = "", estAmt = "", estTime = 0, startTime = 0) {
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
  statStartJob(type, estAmt, estTime) {
    this.#stats.activeJob = this.#newStatActiveJob(
      type,
      estAmt,
      estTime,
      Date.now(),
    );
  }

  statMsgSent(){
    this.#stats.activeJob.msgSent++;
  }

  /**
   * @param {number} jobAmt
   */
  statMsgRcvd(jobAmt){
    const lo = this.getLo("statMsgRcvd", "jobAmt: %s", jobAmt);

    // update job stats
    this.#stats.activeJob.msgRcvd++;
    this.#stats.activeJob.amt = this.ns.formatNumber(jobAmt);

    // do type specific update to total
    switch(this.#stats.activeJob.type){
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
  }

  /**
   * Adds amount and clears active job stats
   */
  statCloseJob(type, amt) {
    // inc completed job count
    this.#stats.completedJobs++;

    // clear active
    this.#stats.activeJob = this.#newStatActiveJob();
  }

  // ////////////////
  // metaId
  // ////////////////

  get metaId() {
    return this.#metaId;
  }

  // ////////////////
  // srvObj
  // ////////////////

  /**
   * Loads a new Server object using stored hostname
   */
  updateSrvObj() {
    if (!this.#hostname) {
      throw new Error("HackManager.updateSrvObj(): Invalid hostname");
    }

    this.#srvObj = this.ns.getServer(this.#hostname);
  }

  /**
   * @returns { Server }
   */
  get srvObj() {
    return this.#srvObj;
  }

  // ////////////////
  // status
  // ////////////////

  /**
   * @param { string } newStatus
   * @throws { Error } Throws error if status invalid
   */
  set status(newStatus) {
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
  get status() {
    return this.#status;
  }

  // ////////////////
  // actions
  // ////////////////

  #initActions() {
    const fnN = "initActions";

    this.#testInit();
    this.#actions = {};
    this.#actions[hckAct.ACT_WEAK] = new WeakenAction(this);
    this.#actions[hckAct.ACT_GROW] = new GrowAction(this);
    this.#actions[hckAct.ACT_HACK] = new HackAction(this);
  }

  /**
   * Returns BaseAction for requested type
   * 
   * @param {string} type The action type required
   * @returns {BaseAction}
   * @throws {Error} Throws error if type invalid
   */
  getAction(type) {
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
  get weakenAction() {
    return this.#actions[hckAct.ACT_WEAK];
  }

  /**
   * Returns GrowAction for requested type
   * 
   * @returns {GrowAction}
   */
  get growAction() {
    return this.#actions[hckAct.ACT_GROW];
  }

  /**
   * Returns HackAction for requested type
   * 
   * @returns {HackAction}
   */
  get hackAction() {
    return this.#actions[hckAct.ACT_HACK];
  }

  get hasActiveAction() {
    if (
      this.weakenAction.hasActiveJob
      || this.growAction.hasActiveJob
      || this.hackAction.hasActiveJob
    ) {
      return true;
    }
  }

  // ////////////////
  // main loop functions
  // ////////////////

  checkStatusActionable() {
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

  #checkTargetActions() {
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

  checkReceivedMsg(rcvdMsg) {
    let lo = this.getLo("checkReceivedMsg", " CHK_ACTION: %s -> %s %s", this.hostname, rcvdMsg.msgId, rcvdMsg.actionType);

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

  // ////////////////
  // serialization
  // ////////////////

  get serialObj() {
    let serialObj = {
      doneInit: this.#doneInit,
      metaId: this.#metaId,
      hostname: this.#hostname,
      status: this.#status,
      actions: {},
      srvObj: this.#srvObj,
    };

    for (const actionType in this.#actions) {
      serialObj.actions[actionType] = this.#actions[actionType].serialObj;
    }

    return serialObj;
  }

  get serialObjBasic() {
    return this.#stats;
  }

  /**
   * Called automagically by F42Base
   */
  unserialize(serialObj) {
    this.#doneInit = serialObj.doneInit;
    this.#metaId = serialObj.metaId;
    this.#hostname = serialObj.hostname;
    this.#status = serialObj.status;
    this.#actions = {};
    this.#srvObj = serialObj.srvObj;

    for (const type in serialObj.actions) {
      switch (type) {
        case hckAct.ACT_WEAK:
          this.#actions[hckAct.ACT_WEAK] = new WeakenAction(this, hckAct.ACT_WEAK, serialObj.actions[type]);
          break;
        case hckAct.ACT_GROW:
          this.#actions[hckAct.ACT_GROW] = new GrowAction(this, hckAct.ACT_GROW, serialObj.actions[type]);
          break;
        case hckAct.ACT_HACK:
          this.#actions[hckAct.ACT_HACK] = new HackAction(this, hckAct.ACT_HACK, serialObj.actions[type]);
          break;
        default:
          throw new Error("Unknown action type: %s", type);
      }
    }
  }
}