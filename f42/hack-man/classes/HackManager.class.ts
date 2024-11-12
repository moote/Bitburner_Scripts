import F42Base from '/f42/classes/F42Base.class';
import MessageStack from '/f42/classes/MessageStack.class';
import F42PortHandler, {F42PortHandle} from "/f42/classes/F42PortHandler.class";
import { timestampAsBase62Str } from '/f42/utility/utility-functions';
import * as f42PDef from "/f42/hack-man/cfg/port-defs";
import TargetServer from '/f42/hack-man/classes/TargetServer.class';
import { ReceivedMessageException } from '/f42/hack-man/classes/MsgException.class';
import F42Logger from "/f42/classes/f42-logger-class";
import { Server } from '@ns';
import { MsgObjInterface } from '/f42/cfg/port-defs';
import { HMCtrlMsg_ADD_TS } from '/f42/hack-man/cfg/hack-man-msgs';

// see for details HackManager.init
const F42_HMO_META_V = 4;
const F42_HMO_SRV_V = 4;

const F42_SRV_COMP_FILE_PATH = "/f42/utility/compromise-server.ts";

export default class HackManager extends F42Base {
  #tgtSrvsCpyPortKey = f42PDef.F42_RES_PORTS[f42PDef.F42_PORT_HMO_COPY].accessKey;
  #meta;
  #tgtList;
  #shouldKill = false; // used for dev/testing/debug
  #portHandler;
  #stateViewHandle;
  #targetListHandle;

  /**
   * Push target server to message stack to trigger HackManager
   */
  static addTargetServer(ns: NS, hostname: string): boolean {
    // validate host
    if (!ns.serverExists(hostname)) {
      throw new Error(ns.sprintf("!! Invalid target server hostname: %s", hostname));
    }

    if (!ns.hasRootAccess(hostname)) {
      // no root access, send to compromiser script, which will post back if it is successful
      ns.run(F42_SRV_COMP_FILE_PATH, 1, hostname, true);
      return false;
    }

    // get server object and push to port
    const srvObj = ns.getServer(hostname);

    // post to stack
    return MessageStack.pushMessage(ns, new HMCtrlMsg_ADD_TS(srvObj), msgObj);
  }

  /**
   * Push target server to message stack to trigger HackManager
   */
  static removeTargetServer(ns: NS, hostname: string): boolean {
    // validate host
    if (!ns.serverExists(hostname)) {
      throw new Error(ns.sprintf("!! Invalid target server hostname: %s", hostname));
    }

    // post to stack
    return MessageStack.pushMessage(ns, f42PDef.F42_MSG_STACK_HM_CTRL, {
      action: F42_MSG_ACT_RM_TS,
      payload: hostname,
      timestamp: timestampAsBase62Str()
    });
  }

  static clearActions(ns: NS): boolean {
    // post to stack
    return MessageStack.pushMessage(ns, f42PDef.F42_MSG_STACK_HM_CTRL, {
      action: F42_MSG_ACT_CLEAR_ACTIONS,
      payload: true,
      timestamp: timestampAsBase62Str()
    });
  }

  static factory(logger: F42Logger): HackManager {
    ns.printf("LOADING EMPTY");
    return new F42HackManager(logger);
  }

  constructor(logger: F42Logger) {
    super(logger);
    this.#vaildateSingleton();
    this.#init();

    // set logging restrictions
    // this.allowedLogFunctions = [];
    this.allowedLogFunctions = [
      // "chkCtrlMsgStack",
      // "dqReceivedMessages",
      "addTgtSrv",
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
      ver: F42_HMO_META_V,  // see desc
      sVer: F42_HMO_SRV_V,  // see desc
      id: "pending",        // see desc
      initTs: Date.now(),
    };

    // add metadata
    this.#updateMetaId();

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
    const lo = this.getLo("mainLoop", "START %s >>>>>>>>>>>>>>>>", timestampAsBase62Str());

    // check target server message stack
    this.#chkCtrlMsgStack();

    // parse target servers
    // generate new actions / process running ones
    this.#parseServers();

    // dequeue and test received messages
    this.#dqReceivedMessages();

    // update state view
    this.#updateStateView();

    lo.g("END %s <<<<<<<<<<<<<<", timestampAsBase62Str());
  }

  /**
   * Dequeue messages on stack
   */
  #chkCtrlMsgStack(): void {
    let tsMsg;

    while (tsMsg !== false) {
      tsMsg = MessageStack.popMessage(this.ns, f42PDef.F42_MSG_STACK_HM_CTRL);

      if (tsMsg !== false) {
        const lo = this.getLo("chkCtrlMsgStack: tsMsg: %s", JSON.stringify(tsMsg));

        switch (tsMsg.action) {
          case F42_MSG_ACT_ADD_TS:
            lo.g("Add target server: %s", tsMsg.payload.hostname);
            // add
            this.#addTgtSrv(tsMsg.payload);
            break;
          case F42_MSG_ACT_RM_TS:
            lo.g("Delete target server: %s", tsMsg.payload);

            if (!(tsMsg.payload in this.#tgtList)) {
              lo.g("Server not a target: %s", tsMsg.payload);
            }
            else {
              // delete
              delete this.#deleteTgtSrv(tsMsg.payload);
            }
            break;
          case F42_MSG_ACT_CLEAR_ACTIONS:
            lo.g("Clear actions - DISABLED");
            // this.#clearActions();
            break;
          case F42_MSG_ACT_ORDER_66:
            lo.g("Order 66 - NOT IMPLEMENTED");
            // todo: NOT IMPLEMENTED
            break;
          default:
            throw new Error("!! F42HackManager.chkCtrlMsgStack: Unknown message action: " + tsMsg.action);
            break;
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
    let i = 0;
    let messageMatchCnt = 0;

    for (i = 0; i < maxMsgDq; i++) {
      const rcvdMsg = MessageStack.popMessage(this.ns, f42PDef.F42_MSG_STACK_COMPLETED_JOBS);

      // stack empty
      if (!rcvdMsg) {
        lo.g("EMPTY_MSG_QUEUE: BREAK");
        break;
      }

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

    lo.g("%d messages dequeued", i);
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
      tgtSrv = new TargetServer(this.ns, this.logger, srvObj.hostname, this.#meta.id);
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

  get portHandler(): F42PortHandler {
    this.getLo("get-portHandler");
    if (!this.#portHandler) {
      this.#portHandler = new F42PortHandler(this.ns, this.logger);
    }

    return this.#portHandler;
  }

  get stateViewHandle(): F42PortHandle {
    this.getLo("get-updateStateView");
    if (!this.#stateViewHandle) {
      this.#stateViewHandle = this.portHandler.getPortHandle(
        f42PDef.F42_HM_STATE.id,
        false,
        f42PDef.F42_HM_STATE.key
      );
    }

    return this.#stateViewHandle;
  }

  get targetListHandle(): F42PortHandle {
    this.getLo("get-targetListHandle");
    if (!this.#targetListHandle) {
      this.#targetListHandle = this.portHandler.getPortHandle(
        f42PDef.F42_HM_TARGETS.id,
        false,
        f42PDef.F42_HM_TARGETS.key
      );
    }

    return this.#targetListHandle;
  }

  #updateStateView(): void {
    this.getLo("updateStateView");
    this.stateViewHandle.clear();
    this.stateViewHandle.write(this.serialObjBasic);
  }

  #postTargetList(): void {
    this.getLo("postTargetList");
    this.targetListHandle.clear();
    this.targetListHandle.write(Object.keys(this.#tgtList));
  }

  ////////////////////////
  // misc
  ///////////////////////

  /**
   * @deprecated Needs review
   */
  #clearActions(): void {
    this.getLo("clearActions");

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
