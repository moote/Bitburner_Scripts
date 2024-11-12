import F42Base from '/scripts/classes/f42-base-class.js';
import F42MessageStack from '/scripts/classes/f42-message-stack-class.js';
import F42PortHandler from '/scripts/classes/f42-port-handler-class.js';
import { timestampAsBase62Str } from "/scripts/utility/utility-functions.js";
import * as f42PDef from "/scripts/cfg/port-defs.js";
import TargetServer from "/scripts/dynamic/v3/target-server-class.js";
import { F42_MSG_STACK_COMPLETED_JOBS } from "/scripts/cfg/port-defs.js";
import { ReceivedMessageException } from "/scripts/dynamic/v3/msg-exceptions-class.js";

// see for details F42HackManager.init
const F42_HMO_META_V = 4;
const F42_HMO_SRV_V = 4;

const F42_MSG_ACT_ADD_TS = "add-ts";
const F42_MSG_ACT_RM_TS = "rm-ts";
const F42_MSG_ACT_FORCE_SAVE_HMO = "force-save-hmo";
const F42_MSG_ACT_RESET_HMO = "reset-hmo";
const F42_MSG_ACT_CLEAR_ACTIONS = "clear-actions";
const F42_MSG_ACT_ORDER_66 = "ORDER-66";

const F42_HMO_FILE_PATH = "/scripts/cfg/hack-manager-bup-v3.json.txt";
const F42_SRV_COMP_FILE_PATH = "/scripts/fab42-srv-cmp.js";

const F42_HM_STAT_EARN = "EARN";

export default class F42HackManager extends F42Base {
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
  static addTargetServer(ns, hostname) {
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
    let srvObj = ns.getServer(hostname);

    // post to stack
    return F42MessageStack.pushMessage(ns, f42PDef.F42_MSG_STACK_HM_CTRL, {
      action: F42_MSG_ACT_ADD_TS,
      payload: srvObj,
      timestamp: timestampAsBase62Str()
    });
  }

  /**
   * Push target server to message stack to trigger HackManager
   */
  static removeTargetServer(ns, hostname) {
    // validate host
    if (!ns.serverExists(hostname)) {
      throw new Error(ns.sprintf("!! Invalid target server hostname: %s", hostname));
    }

    // post to stack
    return F42MessageStack.pushMessage(ns, f42PDef.F42_MSG_STACK_HM_CTRL, {
      action: F42_MSG_ACT_RM_TS,
      payload: hostname,
      timestamp: timestampAsBase62Str()
    });
  }

  static forceSaveHMO(ns) {
    // post to stack
    return F42MessageStack.pushMessage(ns, f42PDef.F42_MSG_STACK_HM_CTRL, {
      action: F42_MSG_ACT_FORCE_SAVE_HMO,
      payload: true,
      timestamp: timestampAsBase62Str()
    });
  }

  static clearActions(ns) {
    // post to stack
    return F42MessageStack.pushMessage(ns, f42PDef.F42_MSG_STACK_HM_CTRL, {
      action: F42_MSG_ACT_CLEAR_ACTIONS,
      payload: true,
      timestamp: timestampAsBase62Str()
    });
  }

  static resetHackManagerObject(ns) {
    // post to stack
    return F42MessageStack.pushMessage(ns, f42PDef.F42_MSG_STACK_HM_CTRL, {
      action: F42_MSG_ACT_RESET_HMO,
      payload: true,
      timestamp: timestampAsBase62Str()
    });
  }

  static factory(ns, logger, loadFromFile = false) {
    // try load from txt file
    let serialObj;

    if (loadFromFile && !ns.fileExists(F42_HMO_FILE_PATH)) {
      ns.printf("Load from file selected, but file does not exist: %s", F42_HMO_FILE_PATH);
      loadFromFile = false;
    }

    if (loadFromFile) {
      try {
        serialObj = JSON.parse(ns.read(F42_HMO_FILE_PATH));
      }
      catch (e) {
        ns.printf("NOT LOADED: File not valid JSON: %s", e.message);
        loadFromFile = false;
      }

      if (loadFromFile) {
        if (typeof serialObj.meta === "undefined" || !serialObj.meta) {
          ns.printf("NOT LOADED: Invalid data: no metadata");
          loadFromFile = false;
        }
        // validate object
        else if (serialObj.meta.ver !== F42_HMO_META_V) {
          ns.printf("NOT LOADED: Version mismatch: running version: %s <> file version: %s");
          loadFromFile = false;
        }
      }
    }

    if (loadFromFile) {
      ns.printf("LOADING FROM FILE: %s", F42_HMO_FILE_PATH);
      return new F42HackManager(ns, logger, serialObj);
    }
    else {
      ns.printf("LOADING EMPTY");
      return new F42HackManager(ns, logger);
    }
  }

  constructor(ns, logger, serialObj = undefined) {
    super(ns, logger, serialObj);
    this.#vaildateSingleton(ns);
    this.#init();

    if (serialObj) {
      this.unserialize(serialObj);
    }

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
  #init() {
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

  #updateMetaId() {
    this.#meta.id = timestampAsBase62Str();
  }

  /**
   * Enforce single instance
   */
  #vaildateSingleton(ns) {
    for (const psInfo of ns.ps()) {
      if (psInfo.filename == ns.getScriptName() && ns.pid != psInfo.pid) {
        throw new Error("Not started, already running; only one instance of HackManager can run at a time.\n* Running instance not affected.");
      }
    }
  }

  ////////////////////////
  // debug functions
  ///////////////////////

  get shouldKill() {
    return this.#shouldKill;
  }

  debugReset() {
    this.log("debugReset", "Reset function, used for testing/debugging only");
    this.#resetFromFile(true);
  }

  ////////////////////////
  // loop functions
  ///////////////////////

  mainLoop() {
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

    // save to file
    this.#saveToFile();

    lo.g("END %s <<<<<<<<<<<<<<", timestampAsBase62Str());
  }

  /**
   * Dequeue messages on stack
   */
  #chkCtrlMsgStack() {
    let tsMsg;

    while (tsMsg !== false) {
      tsMsg = F42MessageStack.popMessage(this.ns, f42PDef.F42_MSG_STACK_HM_CTRL);

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
          case F42_MSG_ACT_FORCE_SAVE_HMO:
            lo.g("Forcing HackManager save to file");
            // set change flag true to trigger save
            break;
          case F42_MSG_ACT_RESET_HMO:
            lo.g("HackManager full reset");
            this.#resetFromFile(true);
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

  #parseServers() {
    const lo = this.getLo("parseServers");

    for (const tgtSrvHostname in this.#tgtList) {
      // get target from list
      let tgtSrv = this.#getTgtSrv(tgtSrvHostname);

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
  #dqReceivedMessages() {
    const lo = this.getLo("dqReceivedMessages");

    // limit the max nuber of messages to dequeue per loop
    let maxMsgDq = 30;
    let i = 0;
    let messageMatchCnt = 0;

    for (i = 0; i < maxMsgDq; i++) {
      const rcvdMsg = F42MessageStack.popMessage(this.ns, F42_MSG_STACK_COMPLETED_JOBS);

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
  #addTgtSrv(srvObj) {
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
  #tgtSrvExists(hostname) {
    // const lo = this.getLo("tgtSrvExists", "hostname: " + hostname);
    return (hostname in this.#tgtList);
  }

  /**
   * Get TargetServer from list
   * 
   * @param {string} hostname Server hostname
   * @returns {TargetServer} Instance of TargetServer
   */
  #getTgtSrv(hostname) {
    const lo = this.getLo("getTgtSrv", "hostname: " + hostname);

    return this.#tgtList[hostname];
  }

  /**
   * Delete TargetServer from list
   * 
   * @param {string} hostname Server hostname
   */
  #deleteTgtSrv(hostname) {
    const lo = this.getLo("deleteTgtSrv", "hostname: " + hostname);
    delete this.#tgtList[hostname];
  }

  ////////////////////////
  // port view / cfg stuffs
  ///////////////////////

  get portHandler() {
    const lo = this.getLo("get-portHandler");
    if (!this.#portHandler) {
      this.#portHandler = new F42PortHandler(this.ns, this.logger);
    }

    return this.#portHandler;
  }

  get stateViewHandle() {
    const lo = this.getLo("get-updateStateView");
    if (!this.#stateViewHandle) {
      this.#stateViewHandle = this.portHandler.getPortHandle(
        f42PDef.F42_HM_STATE.id,
        false,
        f42PDef.F42_HM_STATE.key
      );
    }

    return this.#stateViewHandle;
  }

  get targetListHandle() {
    const lo = this.getLo("get-targetListHandle");
    if (!this.#targetListHandle) {
      this.#targetListHandle = this.portHandler.getPortHandle(
        f42PDef.F42_HM_TARGETS.id,
        false,
        f42PDef.F42_HM_TARGETS.key
      );
    }

    return this.#targetListHandle;
  }

  #updateStateView() {
    const lo = this.getLo("updateStateView");
    this.stateViewHandle.clear();
    this.stateViewHandle.write(this.serialObjBasic);
  }

  #postTargetList() {
    const lo = this.getLo("postTargetList");
    this.targetListHandle.clear();
    this.targetListHandle.write(Object.keys(this.#tgtList));
  }

  ////////////////////////
  // backup / restore functions
  ///////////////////////

  /**
   * Wipes all data and overwrites the bup file
   */
  #reset() {
    // call init
    this.#init();

    // save to file
    this.#saveToFile();
  }

  /**
   * TODO:
   * NOT IMPLEMENTED YET
   */
  #loadFromPort() {
    const lo = this.getLo("loadFromPort", "NOT IMPLEMENTED YET");
  }

  #resetFromFile() {
    const lo = this.getLo("resetFromFile", "NOT IMPLEMENTED YET");
  }

  #saveToFile() {
    const lo = this.getLo("saveToFile");

    // write the serialized version to file
    // see F42Base.serialize() for details
    this.ns.write(
      F42_HMO_FILE_PATH,
      this.serialize(true),
      "w"
    );
  }

  ////////////////////////
  // misc
  ///////////////////////

  #clearActions() {
    const lo = this.getLo("clearActions");

    for (const tgtSrvHost in this.#tgtList) {
      let tgtSrv = this.#getTgtSrv(tgtSrvHost);

      // set all to completed to force reset of actions
      tgtSrv.actions[F42_HACK_ACTION_WEAK].status = F42_ACTION_STATUS_COMPLETED;
      tgtSrv.actions[F42_HACK_ACTION_GROW].status = F42_ACTION_STATUS_COMPLETED;
      tgtSrv.actions[F42_HACK_ACTION_HACK].status = F42_ACTION_STATUS_COMPLETED;
    }

    // update op ts to invsalidate all outstanding jobs
    this.#meta.id = timestampAsBase62Str();

    // bup
    this.#saveToFile();
  }

  ////////////////////////
  // serialization
  ///////////////////////

  /**
   * 
   */
  get serialObj() {
    let serialObj = {
      tgtSrvsCpyPortKey: this.#tgtSrvsCpyPortKey,
      meta: this.#meta,
      tgtList: {},
      shouldKill: this.#shouldKill,
    };

    for (const hostname in this.#tgtList) {
      serialObj.tgtList[hostname] = this.#tgtList[hostname].serialObj;
    }

    return serialObj;
  }

  get serialObjBasic() {
    let serialObj = {
      meta: this.#meta,
      targets: {},
      gen: timestampAsBase62Str()
    };

    for (const hostname in this.#tgtList) {
      serialObj.targets[hostname] = this.#tgtList[hostname].serialObjBasic;
    }

    return serialObj;
  }

  /**
   * Called automagically by F42Base
   */
  unserialize(serialObj) {
    this.#tgtSrvsCpyPortKey = serialObj.tgtSrvsCpyPortKey;
    this.#meta = serialObj.meta;
    this.#tgtList = {};
    this.#shouldKill = serialObj.shouldKill;

    for (const hostname in serialObj.tgtList) {
      this.#tgtList[hostname] = new TargetServer(
        this.ns,
        this.logger,
        hostname,
        this.#meta.id,
        serialObj.tgtList[hostname]
      );
    }
  }
}
