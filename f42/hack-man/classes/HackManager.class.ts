import F42Base from '/f42/classes/F42Base.class';
import TargetServer from '/f42/hack-man/classes/TargetServer.class';
import Logger from '/f42/classes/Logger.class';
import { HMCtrlMsg, HMCtrlMsg_ADD_TS, HMCtrlMsg_RM_TS, HMCtrlMsg_CLEAR_ACTIONS, HMCtrlMsg_CHANGE_OP_MODE, HMCtrlMsg_CHANGE_TT_MODE, HMCtrlMsg_TT_PAUSE } from './HMCtrlMsg.class';
import HMTgtSrvListMsg from '/f42/hack-man/classes/HMTgtSrvListMsg.class';
import HMStateMsg from '/f42/hack-man/classes/HMStateMsg.class';
import { HMCtrlMsgQReader } from '/f42/hack-man/classes/HMCtrlMsgQReader.class';
import { HMCompJobQReader } from '/f42/hack-man/classes/HMCompJobQReader.class';
import { ReceivedMessageException } from '/f42/hack-man/classes/MsgException.class';
import { timestampAsBase62Str } from '/f42/utility/utility-functions';
import { Server } from '@ns';
import HMJobMsg from '/f42/hack-man/classes/HMJobMsg.class';
import { HMOpMode, HMTradeTargetState, TgtSrvOpMode, TgtSrvOpModeStatus, TgtSrvStatus } from '/f42/hack-man/classes/enums';
import { HMMeta_Interface, HMState_Interface } from '/f42/classes/helpers/interfaces';

// see for details HackManager.init
const HMO_META_V = 4;
const HMO_SRV_V = 4;

export default class HackManager extends F42Base {
  #meta!: HMMeta_Interface;
  #tgtList!: { [key: string]: TargetServer };
  #mqrCtrlMsgs!: HMCtrlMsgQReader;
  #mqrCompJobMsgs!: HMCompJobQReader;

  #opMode: HMOpMode;
  #tradeTgtSrv: TargetServer | undefined;
  #tradeTgtState: HMTradeTargetState;

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

  static factory(logger: Logger): HackManager {
    logger.ns.printf("LOADING EMPTY");
    return new HackManager(logger);
  }

  constructor(logger: Logger) {
    super(logger);
    this.vaildateSingleton();
    this.#opMode = HMOpMode.HACK;
    this.#tradeTgtState = HMTradeTargetState.NO_TARGET
    this.#init();

    // set logging restrictions
    // this.allowedLogFunctions = [];
    this.allowedLogFunctions = [
      // "chkCtrlMsgQueue",
      // "dqReceivedMessages",
      "addTgtSrv",
      // "deleteTgtSrv",
      // "postTargetList",
      // "mainLoop",
      // "changeOpMode",
      // "changeTgtSrvOpMode",
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
    // add metadata
    this.#meta = {
      ver: HMO_META_V,  // see desc
      sVer: HMO_SRV_V,  // see desc
      id: timestampAsBase62Str(),        // see desc
      initTs: Date.now(),
    };

    // init incoming msg queues
    if (!this.#mqrCtrlMsgs) this.#mqrCtrlMsgs = new HMCtrlMsgQReader(this.ns);
    if (!this.#mqrCompJobMsgs) this.#mqrCompJobMsgs = new HMCompJobQReader(this.ns);

    // init empty target list
    this.#tgtList = {};

    // update target list port
    this.#postTargetList();
  }

  ////////////////////////
  // loop functions
  ///////////////////////

  mainLoop(): void {
    const lo = this.getLo("mainLoop", "START %s ----------------", timestampAsBase62Str());

    // check target server message queue
    this.#chkCtrlMsgQueue();

    if (this.#opMode === HMOpMode.HACK) {
      // // parse target servers
      // // generate new actions / process running ones
      this.#parseServers();
    }
    else { // trade target
      this.#tradeTargetCtrl();
    }

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

    while (this.#mqrCtrlMsgs.peekMessage() !== false) {
      const tsMsg = this.#mqrCtrlMsgs.popMessage();

      // lo.g("--->>> tsMsg: %s", JSON.stringify(tsMsg.payload, null, 2));

      /**
       * A message from the cotrol q should always be typ HMCtrl,
       * but in case the q is polluted... (damn haxxors)
       */
      if (tsMsg instanceof HMCtrlMsg) {
        // this.ns.tprintf("chkCtrlMsgQueue: %s", JSON.stringify(tsMsg.serialize(), null, 2));
        // throw new Error("STOP");

        if (tsMsg instanceof HMCtrlMsg_ADD_TS) {
          lo.g("Add target server: %s", JSON.stringify(tsMsg.payload, null, 2));
          // add ts
          this.#addTgtSrv(tsMsg.payload);
        }
        else if (tsMsg instanceof HMCtrlMsg_RM_TS) {
          lo.g("Delete target server: %s", tsMsg.payload);
          this.#deleteTgtSrv(tsMsg.payload);
        }
        else if (tsMsg instanceof HMCtrlMsg_CLEAR_ACTIONS) {
          lo.g("Clear actions - DISABLED");
          // this.#clearActions();
        }
        // else if (tsMsg instanceof HMCtrlMsg_ORDER_66) {
        //   lo.g("Order 66 - NOT IMPLEMENTED");
        //   // todo: NOT IMPLEMENTED
        // }
        else if (tsMsg instanceof HMCtrlMsg_CHANGE_OP_MODE) {
          lo.g("Change opMode: %s", HMOpMode[tsMsg.payload]);
          this.#changeOpMode(tsMsg.payload);
        }
        else if (tsMsg instanceof HMCtrlMsg_CHANGE_TT_MODE) {
          lo.g("Change tgtSrv opMode: %s", TgtSrvOpMode[tsMsg.payload]);
          this.#changeTgtSrvOpMode(tsMsg.payload);
        }
        else if (tsMsg instanceof HMCtrlMsg_TT_PAUSE) {
          lo.g("%s TT server", tsMsg.payload === true ? "PAUSE" : "UNPAUSE");
          // TODO:
        }
        else {
          throw new Error("!! HackManager.chkCtrlMsgQueue: Unknown message type: " + JSON.stringify(tsMsg, null, 2));
        }
      }
      else {
        // the q is polluted, not good
        throw new Error("!! Non HMCtrlMsg found on queue, bad 👎 : " + JSON.stringify(tsMsg, null, 2));
      }
    }
  }

  #parseServers(): void {
    this.getLo("parseServers");

    if (this.#opMode !== HMOpMode.HACK) {
      throw new Error("HackManager.#parseServers: Can't call when not in 'hack' op mode: this.#opMode: " + this.#opMode);
    }

    for (const tgtSrvHostname in this.#tgtList) {
      // get target from list
      const tgtSrv = this.#getTgtSrv(tgtSrvHostname);

      // refresh server obj
      tgtSrv.updateSrvObj();

      // see if target can be actioned
      tgtSrv.checkStatusActionable();
    }
  }

  #tradeTargetCtrl(): void {
    // const lo = this.getLo("tradeTargetCtrl");
    this.getLo("tradeTargetCtrl");

    if (this.#opMode !== HMOpMode.TRADE_TGT) {
      throw new Error("HackManager.#tradeTargetCtrl: Can't call when not in 'trade target' op mode: this.#opMode: " + this.#opMode);
    }

    // update state
    this.#updateTradeTargetState();

    if (this.#tradeTgtSrv) {
      // refresh server obj
      this.#tradeTgtSrv.updateSrvObj();

      // see if target can be actioned
      this.#tradeTgtSrv.checkStatusActionable();
    }
  }

  /**
   * Dequeue messages and pass down the chain, validating along the way:
   * 
   * HackManager >> TargetServer >> BaseAction >> ActionJob
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
        lo.g("Dropping message no target match: rcvdMsg:\n%s", JSON.stringify(rcvdMsg, null, 2));
      }
    }

    lo.g("%d messages dequeued", dqCnt);
    lo.g("%d messages matched", messageMatchCnt);
  }

  ///////////////////////
  // Op Mode
  ///////////////////////

  #changeOpMode(newMode: HMOpMode): void {
    const lo = this.getLo("changeOpMode");

    if (this.#opMode === newMode) {
      lo.g("Already in requested mode: %s === %s", this.#opMode, newMode);
    }
    else if (newMode === HMOpMode.HACK) {
      // reset
      this.#init();

      // change mode
      this.#opMode = newMode;
    }
    else if (newMode === HMOpMode.TRADE_TGT) {
      // reset
      this.#init();

      // change mode
      this.#opMode = newMode;
    }
    else {
      throw lo.gThrowErr("HackManager.#switchOpMode: Invalid OpMode requested! %s", newMode);
    }
  }

  ////////////////////////
  // Trade target functions
  ///////////////////////

  #changeTgtSrvOpMode(newMode: TgtSrvOpMode): void {
    const lo = this.getLo("changeTgtSrvOpMode", "newMode: %s", newMode);
    if (this.#tradeTgtSrv) {
      switch (newMode) {
        case TgtSrvOpMode.FREE:
          // can't change to this while a trade target
          lo.g("ERROR Can't change a trade target to TgtSrvOpMode.FREE");
          break;
        case TgtSrvOpMode.MONEY_MAX:
          lo.g("Changing to MONEY_MAX");
          this.#tradeTgtSrv.changeOpMode(newMode);
          break;
        case TgtSrvOpMode.MONEY_MIN:
          lo.g("Changing to MONEY_MIN");
          this.#tradeTgtSrv.changeOpMode(newMode);
          break;
        default:
          throw new Error("changeTgtSrvOpMode: Invalid TgtSrvOpMode: %s" + newMode);
      }
    }
    else {
      // do nothing  
      lo.g("No target server: %s", this.#tradeTgtState);
    }
  }

  #updateTradeTargetState(): void {
    if (!this.#tradeTgtSrv) {
      this.#tradeTgtState = HMTradeTargetState.NO_TARGET;
      return;
    }

    switch (this.#tradeTgtSrv.opModeStatus) {
      case TgtSrvOpModeStatus.PAUSED:
        this.#tradeTgtState = HMTradeTargetState.TARGET_AWAITING_ORDER;
        break;
      case TgtSrvOpModeStatus.FREE:
        this.#tradeTgtState = HMTradeTargetState.TARGET_AWAITING_ORDER;
        break;
      case TgtSrvOpModeStatus.IN_PROGRESS:
        if (this.#tradeTgtSrv.opMode === TgtSrvOpMode.MONEY_MAX) {
          this.#tradeTgtState = HMTradeTargetState.TARGET_GROW_TO_MAX;
        }
        else {
          this.#tradeTgtState = HMTradeTargetState.TARGET_HACK_TO_MIN;
        }
        break;
      default: // TgtSrvOpModeStatus.DONE
        if (this.#tradeTgtSrv.opMode === TgtSrvOpMode.MONEY_MAX) {
          this.#tradeTgtState = HMTradeTargetState.TARGET_AT_MAX;
        }
        else {
          this.#tradeTgtState = HMTradeTargetState.TARGET_AT_MIN;
        }
        break;
    }
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
  #addTgtSrv(srvObj: Server): TargetServer | false {
    const lo = this.getLo("addTgtSrv", "hostname: " + srvObj.hostname);

    // see if already in list
    if (this.#tgtSrvExists(srvObj.hostname)) {
      lo.g("Target already in list: %s", srvObj.hostname);
      return false;
    }

    // try to init TargetServer
    let tgtSrv: TargetServer | false = false;

    try {
      if (this.#opMode === HMOpMode.TRADE_TGT) {
        tgtSrv = new TargetServer(
          this.logger,
          srvObj.hostname,
          this.#meta.id,
          TgtSrvStatus.PAUSED,
          TgtSrvOpMode.MONEY_MAX
        );
      }
      else {
        tgtSrv = new TargetServer(this.logger, srvObj.hostname, this.#meta.id);
      }

    }
    catch (e) {
      // either invalid hostname, or no root; see error
      lo.g("Target not added: %s", (e as Error).message);
      return false;
    }

    // add to list
    this.#tgtList[tgtSrv.hostname] = tgtSrv;

    // update target list port
    this.#postTargetList();

    // if in trade target mode, then link
    if (this.#opMode === HMOpMode.TRADE_TGT) {
      this.#tradeTgtSrv = tgtSrv;
      this.#updateTradeTargetState();
    }

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
    const lo = this.getLo("deleteTgtSrv", "hostname: %s", hostname);

    if (hostname in this.#tgtList) {
      // if in trade target mode, then unlink
      if (this.#opMode === HMOpMode.TRADE_TGT) {
        this.#tradeTgtSrv = undefined;
        this.#updateTradeTargetState();
      }

      delete this.#tgtList[hostname];

      // update target list port
      this.#postTargetList();
    }
    else {
      // delete
      lo.g("Server not a target: %s", hostname);
    }
  }

  ////////////////////////
  // port view / cfg stuffs
  ///////////////////////

  #updateStateView(): void {
    this.getLo("updateStateView");

    const state: HMState_Interface = {
      meta: this.#meta,
      opMode: HMOpMode[this.#opMode],
      tradeTgtState: HMTradeTargetState[this.#tradeTgtState],
      targets: {},
      gen: timestampAsBase62Str()
    };

    for (const hostname in this.#tgtList) {
      state.targets[hostname] = this.#tgtList[hostname].state;
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

      // cancel active job
      tgtSrv.cancelActiveJob();
    }

    // update op ts to invalidate all outstanding jobs
    this.#meta.id = timestampAsBase62Str();
  }
}
