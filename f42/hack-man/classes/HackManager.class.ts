import F42Base from '/f42/classes/F42Base.class';
import TargetServer from '/f42/hack-man/classes/TargetServer.class';
import F42Logger from "/f42/classes/f42-logger-class";
import { HMCtrlMsg, HMCtrlMsg_ADD_TS, HMCtrlMsg_RM_TS, HMCtrlMsg_CLEAR_ACTIONS } from './HMCtrlMsg.class';
import { HMTgtSrvListMsg } from '/f42/hack-man/classes/HMTgtSrvListMsg.class';
import { HMStateMsg } from '/f42/hack-man/classes/HMStateMsg.class';
import { HMCtrlMsgQReader } from '/f42/hack-man/classes/HMCtrlMsgQReader.class';
import { HMCompJobQReader } from '/f42/hack-man/classes/HMCompJobQReader.class';
import { ReceivedMessageException } from '/f42/hack-man/classes/MsgException.class';
import { timestampAsBase62Str } from '/f42/utility/utility-functions';
import { Server } from '@ns';
import HMJobMsg from '/f42/hack-man/classes/HMJobMsg.class';

// see for details HackManager.init
const HMO_META_V = 4;
const HMO_SRV_V = 4;

export default class HackManager extends F42Base {
  #meta;
  #tgtList;
  #shouldKill = false; // used for dev/testing/debug
  #mqrCtrlMsgs: HMCtrlMsgQReader;
  #mqrCompJobMsgs: HMCompJobQReader;

  /**
   * @deprecated Use HMCtrlMsg_ADD_TS.staticPush() directly
   */
  static addTargetServer(ns: NS, hostname: string): boolean {
    // post to queue
    return HMCtrlMsg_ADD_TS.staticPush(ns, hostname);
  }

  /**
   * @deprecated Use HMCtrlMsg_RM_TS.staticPush() directly
   */
  static removeTargetServer(ns: NS, hostname: string): boolean {
    // post to queue
    return HMCtrlMsg_RM_TS.staticPush(ns, hostname);
  }

  /**
   * @deprecated Use HMCtrlMsg_CLEAR_ACTIONS.staticPush() directly
   */
  static clearActions(ns: NS): boolean {
    // post to queue
    return HMCtrlMsg_CLEAR_ACTIONS.staticPush(ns);
  }

  static factory(logger: F42Logger): HackManager {
    logger.ns.printf("LOADING EMPTY");
    return new HackManager(logger);
  }

  constructor(logger: F42Logger) {
    super(logger);
    this.#vaildateSingleton();
    this.#init();

    // set logging restrictions
    // this.allowedLogFunctions = [];
    this.allowedLogFunctions = [
      // "chkCtrlMsgQueue",
      // "dqReceivedMessages",
      // "addTgtSrv",
      // "postTargetList",
      // "mainLoop",
    ];
    this.onlyVerboseLogs = true;
  }

  /**
   * 
   * meta.ver:            - manually increment whenever new fields are add to meta
   * meta.sVer:           - manually increment whenever new fields added to tgtSrvs (no checks implemented yet)
   * meta.id:             - updated by server to record running version, applied to all
   *                        outgoing messages; a reset will reset this and make server
   *                        drop any incoming messages with a mismatched version
   */
  #init(): void {
    this.#meta = {
      ver: HMO_META_V,  // see desc
      sVer: HMO_SRV_V,  // see desc
      id: "pending",        // see desc
      initTs: Date.now(),
    };

    // add metadata
    this.#updateMetaId();

    // init incoming msg queues
    this.#mqrCtrlMsgs = new HMCtrlMsgQReader(this.ns);
    this.#mqrCompJobMsgs = new HMCompJobQReader(this.ns);

    // init empty target list
    this.#tgtList = {};

    // update target list port
    this.#postTargetList();
  }

  #updateMetaId(): void {
    this.#meta.id = timestampAsBase62Str();
  }

  /**
   * Enforce single instance
   */
  #vaildateSingleton(): void {
    for (const psInfo of this.ns.ps()) {
      if (psInfo.filename == this.ns.getScriptName() && this.ns.pid != psInfo.pid) {
        throw new Error("Not started, already running; only one instance of HackManager can run at a time.\n* Running instance not affected.");
      }
    }
  }

  ////////////////////////
  // debug functions
  ///////////////////////

  get shouldKill(): boolean {
    return this.#shouldKill;
  }

  ////////////////////////
  // loop functions
  ///////////////////////

  mainLoop(): void {
    const lo = this.getLo("mainLoop", "START %s ----------------", timestampAsBase62Str());

    // check target server message queue
    this.#chkCtrlMsgQueue();

    // // parse target servers
    // // generate new actions / process running ones
    this.#parseServers();

    // // dequeue and test received messages
    this.#dqReceivedMessages();

    // update state view
    this.#updateStateView();

    lo.g("END   %s ----------------", timestampAsBase62Str());
  }

  /**
   * Dequeue messages
   */
  #chkCtrlMsgQueue(): void {
    const lo = this.getLo("chkCtrlMsgQueue");
    let tsMsg;

    while (tsMsg !== false) {
      tsMsg = this.#mqrCtrlMsgs.popMessage();

      if (tsMsg instanceof HMCtrlMsg) {
        // this.ns.tprintf("chkCtrlMsgQueue: %s", JSON.stringify(tsMsg.serialize(), null, 2));
        // throw new Error("STOP");

        if (tsMsg instanceof HMCtrlMsg_ADD_TS) {
          lo.g("Add target server: %s", tsMsg.payload.hostname);
          // add ts
          this.#addTgtSrv(tsMsg.payload);
        }
        else if (tsMsg instanceof HMCtrlMsg_RM_TS) {
          lo.g("Delete target server: %s", tsMsg.payload);

          if (!(tsMsg.payload in this.#tgtList)) {
            lo.g("Server not a target: %s", tsMsg.payload);
          }
          else {
            // delete
            delete this.#deleteTgtSrv(tsMsg.payload);
          }
        }
        else if (tsMsg instanceof HMCtrlMsg_CLEAR_ACTIONS) {
          lo.g("Clear actions - DISABLED");
          // this.#clearActions();
        }
        else if (tsMsg instanceof HMCtrlMsg_ORDER_66) {
          lo.g("Order 66 - NOT IMPLEMENTED");
          // todo: NOT IMPLEMENTED
        }
        else {
          throw new Error("!! HackManager.chkCtrlMsgQueue: Unknown message type: " + JSON.stringify(tsMsg, null, 2));
        }
      }
    }
  }

  #parseServers(): void {
    this.getLo("parseServers");

    for (const tgtSrvHostname in this.#tgtList) {
      // get target from list
      const tgtSrv = this.#getTgtSrv(tgtSrvHostname);

      // refresh server obj
      tgtSrv.updateSrvObj();

      // see if target can be actioned
      tgtSrv.checkStatusActionable();
    }
  }

  /**
   * Dequeue messages and pass down the chain, validating along the way:
   * 
   * HackManager >> TargetServer >> BaseAction >> ActionJob
   * 
   * 
   */
  #dqReceivedMessages(): void {
    const lo = this.getLo("dqReceivedMessages");

    // limit the max nuber of messages to dequeue per loop
    const maxMsgDq = 30;
    let dqCnt = 0;
    let messageMatchCnt = 0;

    for (let i = 0; i < maxMsgDq; i++) {
      const rcvdMsg = this.#mqrCompJobMsgs.popMessage();

      // lo.g("rcvdMsg: %s", JSON.stringify(rcvdMsg, null, 2));
      // return;

      // queue empty
      if (!(rcvdMsg instanceof HMJobMsg)) {
      // if (rcvdMsg == false) {
        lo.g("EMPTY_MSG_QUEUE: BREAK");
        break;
      }

      dqCnt++;

      // this.ns.tprintf(">>>>>> %s", JSON.stringify(rcvdMsg, null, 2));
      // throw new Error('STOP');

      // see if message is valid
      if (!rcvdMsg.metaId) {
        // not valid or not matching; drop message and continue
        lo.g("Dropping invalid message: %s", rcvdMsg.msgId);
        continue;
      }

      // see if message is valid for this HackManager run
      if (rcvdMsg.metaId != this.#meta.id) {
        // not valid or not matching; drop message and continue
        lo.g("Dropping message mismatching meta.id: %s <> rcvdMsg.metaId: %s", this.#meta.id, rcvdMsg.metaId);
        continue;
      }

      // check target hostmane match
      lo.g("CHK_TARGET: %s", rcvdMsg.target);

      if (rcvdMsg.target in this.#tgtList) {
        lo.g("MATCH_TARGET: %s", rcvdMsg.target);

        try {
          if (this.#tgtList[rcvdMsg.target].checkReceivedMsg(rcvdMsg)) {
            // message matched, next message
            lo.g("MATCH_ALL");
            messageMatchCnt++;
            continue;
          }
        }
        catch (e) {
          if (e instanceof ReceivedMessageException) {
            // a validation error was found with the message, drop and try next
            lo.g("Dropping message due to error: %s", e.message);
            continue;
          }
          else {
            // error is system generated, re-trigger
            throw e;
          }
        }
      }
      else {
        // no matches or errors, log and drop
        lo.g("Dropping message no target match: rcvdMsg:\n%s", this.stringify(rcvdMsg));
      }
    }

    lo.g("%d messages dequeued", dqCnt);
    lo.g("%d messages matched", messageMatchCnt);
  }

  ////////////////////////
  // TargetServer functions
  ///////////////////////

  /**
   * Add TargetServer to list
   * 
   * @param {Server} srvObj 
   * @returns {(TargetServer|boolean)} New instance of TargetServer, false if not added, error will be logged
   */
  #addTgtSrv(srvObj: Server): void {
    const lo = this.getLo("addTgtSrv", "hostname: " + srvObj.hostname);

    // see if already in list
    if (this.#tgtSrvExists(srvObj.hostname)) {
      lo.g("Target already in list: %s", srvObj.hostname);
      return false;
    }

    // try to init TargetServer
    let tgtSrv = false;

    try {
      tgtSrv = new TargetServer(this.logger, srvObj.hostname, this.#meta.id);
    }
    catch (e) {
      // either invalid hostname, or no root; see error
      lo.g("Target not added: %s", e.message);
      return false;
    }

    // add to list
    this.#tgtList[tgtSrv.hostname] = tgtSrv;

    // update target list port
    this.#postTargetList();

    // return
    return tgtSrv;
  }

  /**
   * Test if target server exists
   * 
   * @param {string} hostname Server hostname to test
   * @returns {boolean} True if exists, false if not
   */
  #tgtSrvExists(hostname: string): boolean {
    // const lo = this.getLo("tgtSrvExists", "hostname: " + hostname);
    return (hostname in this.#tgtList);
  }

  /**
   * Get TargetServer from list
   * 
   * @param {string} hostname Server hostname
   * @returns {TargetServer} Instance of TargetServer
   */
  #getTgtSrv(hostname: string): TargetServer {
    this.getLo("getTgtSrv", "hostname: " + hostname);

    return this.#tgtList[hostname];
  }

  /**
   * Delete TargetServer from list
   * 
   * @param {string} hostname Server hostname
   */
  #deleteTgtSrv(hostname: string): void {
    this.getLo("deleteTgtSrv", "hostname: " + hostname);
    delete this.#tgtList[hostname];
  }

  ////////////////////////
  // port view / cfg stuffs
  ///////////////////////

  #updateStateView(): void {
    this.getLo("updateStateView");

    const state = {
      meta: this.#meta,
      targets: {},
      gen: timestampAsBase62Str()
    };

    for (const hostname in this.#tgtList) {
      state.targets[hostname] = this.#tgtList[hostname].stats;
    }

    // send state
    HMStateMsg.staticPush(this.ns, state);
  }

  #postTargetList(): void {
    // const lo = this.getLo("postTargetList");
    HMTgtSrvListMsg.staticPush(this.ns, Object.keys(this.#tgtList));
  }

  ////////////////////////
  // misc
  ///////////////////////

  /**
   * @deprecated Needs review
   */
  #clearActions(): void {
    this.getLo("clearActions");
    throw new Error("HackManager.clearActions(): THIS ACTION NEEDS REVIEW!!");

    for (const tgtSrvHost in this.#tgtList) {
      const tgtSrv = this.#getTgtSrv(tgtSrvHost);

      // set all to completed to force reset of actions
      tgtSrv.actions[F42_HACK_ACTION_WEAK].status = F42_ACTION_STATUS_COMPLETED;
      tgtSrv.actions[F42_HACK_ACTION_GROW].status = F42_ACTION_STATUS_COMPLETED;
      tgtSrv.actions[F42_HACK_ACTION_HACK].status = F42_ACTION_STATUS_COMPLETED;
    }

    // update op ts to invalidate all outstanding jobs
    this.#meta.id = timestampAsBase62Str();
  }
}
