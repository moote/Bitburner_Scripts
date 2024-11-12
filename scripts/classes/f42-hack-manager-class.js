import F42Base from '/scripts/classes/f42-base-class.js';
import F42MessageStack from '/scripts/classes/f42-message-stack-class.js';
import F42PortHandler from '/scripts/classes/f42-port-handler-class.js';
import { timestampAsBase62Str } from "/scripts/utility/utility-functions.js";
import * as f42PortDefs from "/scripts/cfg/port-defs.js";

// see for details F42HackManager.initHackManagerObject
const F42_HMO_META_V = 1;
const F42_HMO_SRV_V = 1;

const F42_MSG_ACT_ADD_TS = "add-ts";
const F42_MSG_ACT_RM_TS = "rm-ts";
const F42_MSG_ACT_FORCE_SAVE_HMO = "force-save-hmo";
const F42_MSG_ACT_RESET_HMO = "reset-hmo";
const F42_MSG_ACT_CLEAR_ACTIONS = "clear-actions";
const F42_MSG_ACT_ORDER_66 = "ORDER-66";

const F42_HMO_FILE_PATH = "/scripts/cfg/hack-manager-bup.json.txt";
const F42_SRV_COMP_FILE_PATH = "/scripts/fab42-srv-compromise.js";

// new|active|paused|reananlyse|remove
const F42_TGT_SRV_STATUS_NEW = "new";
const F42_TGT_SRV_STATUS_ACTIVE = "active";
const F42_TGT_SRV_STATUS_PAUSED = "paused";
const F42_TGT_SRV_STATUS_REANAL = "reananlyse";
const F42_TGT_SRV_STATUS_REMOVE = "remove";

// none|pending|posted|received|completed
const F42_ACTION_STATUS_NONE = "none";
const F42_ACTION_STATUS_PENDING = "pending";
const F42_ACTION_STATUS_POSTED = "posted";
const F42_ACTION_STATUS_RUNNING = "running";
const F42_ACTION_STATUS_RECEIVED = "received";
const F42_ACTION_STATUS_COMPLETED = "completed";

// pending|running|complete
const F42_ACTION_RESULT_PENDING = "pending";
const F42_ACTION_RESULT_RUNNING = "running";
const F42_ACTION_RESULT_COMPLETE = "complete";

const F42_HACK_ACTION_WEAK = "weak";
const F42_HACK_ACTION_GROW = "grow";
const F42_HACK_ACTION_HACK = "hack";

const F42_WEAKEN_1T = 0.05;
const F42_HACK_MONEY_PERC = 0.75;

const F42_HM_STAT_EARN = "EARN";

/**
 * weakenDiffMax = ((base - min) * F42_WEAKEN_DIFF_MAX_PERC)
 * if currentDiff (hackDifficulty - minDifficulty) > weakenDiffMax
 *    >> trigger weaken
 * 
 * @param {number} F42_WEAKEN_DIFF_MAX_PERC
 */
const F42_WEAKEN_DIFF_MAX_PERC = 0.1;

/**
 * (max * F42_GROW_LEVEL_MIN_PERC)
 * percentage of max money above which grow won't trigger
 */
const F42_GROW_LEVEL_MIN_PERC = 0.9;

export default class F42HackManager extends F42Base {
  #targetServersCpyPortKey = f42PortDefs.F42_RES_PORTS[f42PortDefs.F42_PORT_HMO_COPY].accessKey;
  #hackManagerObj = {};
  #maxThreadBatch = 30;
  #shouldKill = false; // used for dev/testing/debug

  #stats;
  #statsPh;

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
    return F42MessageStack.pushMessage(ns, f42PortDefs.F42_MSG_STACK_HM_CTRL, {
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
    return F42MessageStack.pushMessage(ns, f42PortDefs.F42_MSG_STACK_HM_CTRL, {
      action: F42_MSG_ACT_RM_TS,
      payload: hostname,
      timestamp: timestampAsBase62Str()
    });
  }

  static forceSaveHMO(ns) {
    // post to stack
    return F42MessageStack.pushMessage(ns, f42PortDefs.F42_MSG_STACK_HM_CTRL, {
      action: F42_MSG_ACT_FORCE_SAVE_HMO,
      payload: true,
      timestamp: timestampAsBase62Str()
    });
  }

  static clearActions(ns) {
    // post to stack
    return F42MessageStack.pushMessage(ns, f42PortDefs.F42_MSG_STACK_HM_CTRL, {
      action: F42_MSG_ACT_CLEAR_ACTIONS,
      payload: true,
      timestamp: timestampAsBase62Str()
    });
  }

  static resetHackManagerObject(ns) {
    // post to stack
    return F42MessageStack.pushMessage(ns, f42PortDefs.F42_MSG_STACK_HM_CTRL, {
      action: F42_MSG_ACT_RESET_HMO,
      payload: true,
      timestamp: timestampAsBase62Str()
    });
  }

  constructor(ns, logger) {
    super(ns, logger);
    this.#loadHackManagerObject();
    this.#initStats(ns, logger);
  }

  #initStats() {
    let nowTs = Date.now();
    this.#stats = {
      startTs: nowTs,
      updatedTs: nowTs,
      totalEarned: 0,
      earningRate: 0,
      formatted: {
        startDate: Date(nowTs),
        updatedDate: Date(nowTs),
        totalEarned: "",
        earningRate: "",
      },
      earnings: {},
    };

    let portHandler = new F42PortHandler(this.ns, this.logger);
    this.#statsPh = portHandler.getPortHandle(f42PortDefs.F42_HM_STATS, false, f42PortDefs.F42_HM_STATS_KEY);
    this.#statsPh.clear();
    this.#statsPh.write(this.#stats);
  }

  get shouldKill() {
    return this.#shouldKill;
  }

  debugReset() {
    this.log("debugReset", "Reset function, used for testing/debugging only");
    this.#loadHackManagerObject(true);
  }

  // ????FAV?
  mainLoop() {
    // check target server message stack
    this.#checkTargetServerMessageStack();

    // check completed actions stack
    this.#checkCompletedJobs();

    // parse completed actions list

    // parse target servers and generate new actions
    this.#parseServers();
  }

  /**
   * Dequeue messages on stack
   */
  #checkTargetServerMessageStack() {
    let fnN = "checkTargetServerMessageStack";
    this.log(fnN, "");

    let tsMsg;
    let hasChanged = false;

    while (tsMsg !== false) {
      tsMsg = F42MessageStack.popMessage(super.ns, f42PortDefs.F42_MSG_STACK_HM_CTRL);

      // this.log(fnN, "tsMsg: %s", JSON.stringify(tsMsg));

      if (tsMsg !== false) {
        switch (tsMsg.action) {
          case F42_MSG_ACT_ADD_TS:
            this.log(fnN, "Add target server: %s", tsMsg.payload.hostname);

            // check if exists already
            if (tsMsg.payload.hostname in this.#hackManagerObj.targetServers) {
              this.log(fnN, "Server already a target: %s", tsMsg.payload.hostname);
            }
            else {
              // save locally
              this.#addTargetServer(tsMsg.payload);

              // update change flag
              hasChanged = true;
            }

            break;
          case F42_MSG_ACT_RM_TS:
            this.log(fnN, "Delete target server: %s", tsMsg.payload);

            if (!(tsMsg.payload in this.#hackManagerObj.targetServers)) {
              this.log(fnN, "Server not a target: %s", tsMsg.payload);
            }
            else {
              // delete
              delete this.#hackManagerObj.targetServers[tsMsg.payload];

              // update change flag
              hasChanged = true;
            }

            break;
          case F42_MSG_ACT_FORCE_SAVE_HMO:
            this.log(fnN, "Force target server save to txt file");
            // set change flag true to trigger save
            hasChanged = true;
            break;
          case F42_MSG_ACT_RESET_HMO:
            this.log(fnN, "Reset target server list");
            this.#loadHackManagerObject(true);
            break;
          case F42_MSG_ACT_CLEAR_ACTIONS:
            this.log(fnN, "Clear actions");
            this.#clearActions();
            break;
          case F42_MSG_ACT_ORDER_66:
            this.log(fnN, "Order 66");
            // todo: NOT IMPLEMENTED
            break;
          default:
            throw new Error("!! F42HackManager.checkTargetServerMessageStack: Unknown message action: " + tsMsg.action);
            break;
        }
      }
    }

    if (hasChanged) {
      this.#writeHMOToFile();
    }
  }

  #writeHMOToFile(withThisHMO = false) {
    let fnN = "writeHMOToFile";
    this.log(fnN, "Writing to file (withThisHMO: %s): %s", withThisHMO, F42_HMO_FILE_PATH);

    // write to file
    let hmO = this.#hackManagerObj;

    if (withThisHMO !== false) {
      hmO = withThisHMO;
    }

    super.ns.write(
      F42_HMO_FILE_PATH,
      JSON.stringify(hmO, null, 4),
      "w"
    );
  }

  #addTargetServer(srvObj) {
    let fnN = "addTargetServer";
    this.log(fnN, "");

    // build new object
    let uid = timestampAsBase62Str();

    let newObj = {
      srvObj: srvObj,
      status: F42_TGT_SRV_STATUS_NEW, // new|active|paused|reananlyse|remove
      actions: {
        [F42_HACK_ACTION_WEAK]: this.#getActionObj(uid, F42_HACK_ACTION_WEAK),
        [F42_HACK_ACTION_GROW]: this.#getActionObj(uid, F42_HACK_ACTION_GROW),
        [F42_HACK_ACTION_HACK]: this.#getActionObj(uid, F42_HACK_ACTION_HACK),
      }
    }

    // add to list
    this.#hackManagerObj.targetServers[srvObj.hostname] = structuredClone(newObj);
    this.log(fnN, "tsMsg: %s", JSON.stringify(newObj));
  }

  /**
   * 
   * meta.metaVer:          - manually increment whenever new fields are add to meta
   * meta.targetServersVer: - manually increment whenever new fields added to targetServers
   * meta.operationTs:      - updated by server to record running version, applied to all
   *                        outgoing messages; a reset will reset this and make server
   *                        drop any incoming messages with a mismatched version
   */
  #initHackManagerObject() {
    return {
      meta: {
        metaVer: F42_HMO_META_V, // see desc
        targetServersVer: F42_HMO_SRV_V, // see desc
        operationTs: timestampAsBase62Str(), // see desc
      },
      currStats: {},
      targetServers: {}
    };
  }

  #getActionObj(uid, type) {
    let fnN = "getActionObj";
    this.log(fnN, type);

    return {
      threads: 0,
      batches: 0,
      batchesSent: 0,
      batchesRcvd: 0,
      minCores: 1,
      status: F42_ACTION_STATUS_NONE, // none|pending|posted|running|completed
      messageId: super.ns.sprintf("%s-%s", uid, type),
      estTime: 0,
      estAmt: 0,
      result: {
        status: F42_ACTION_RESULT_PENDING, // pending|running|complete
        actionedBy: "",
        startedTs: 0,
        endedTs: 0,
        estCompleteTs: 0,
        cores: 0,
        time: 0,
        startAmt: 0,
        endAmt: 0,
        amt: 0
      }
    };
  }

  #parseServers() {
    let fnN = "parseServers";
    this.log(fnN, "");

    for (const targetSrvHostname in this.#hackManagerObj.targetServers) {
      let targetSrv = this.#hackManagerObj.targetServers[targetSrvHostname];

      // refresh server obj
      targetSrv.srvObj = super.ns.getServer(targetSrvHostname);

      switch (targetSrv.status) {
        case F42_TGT_SRV_STATUS_NEW:
          // this.log(fnN, "targetSrv: %s > F42_TGT_SRV_STATUS_NEW", targetSrvHostname);
          // set active
          targetSrv.status = F42_TGT_SRV_STATUS_ACTIVE;

          // check actions
          this.#checkTargetActions(targetSrv);
          break;
        case F42_TGT_SRV_STATUS_ACTIVE:
          // this.log(fnN, "targetSrv: %s > F42_TGT_SRV_STATUS_ACTIVE", targetSrvHostname);
          // check actions
          this.#checkTargetActions(targetSrv);
          break;
        case F42_TGT_SRV_STATUS_PAUSED:
          // this.log(fnN, "targetSrv: %s > F42_TGT_SRV_STATUS_PAUSED", targetSrvHostname);
          // do nothing
          break;
        case F42_TGT_SRV_STATUS_REANAL:
          // this.log(fnN, "targetSrv: %s > F42_TGT_SRV_STATUS_REANAL", targetSrvHostname);
          // TODO
          break;
        case F42_TGT_SRV_STATUS_REMOVE:
          // this.log(fnN, "targetSrv: %s > F42_TGT_SRV_STATUS_REMOVE", targetSrvHostname);
          // TODO
          break;
        default:
          throw new Error(
            super.ns.sprintf(
              "!! HackManager.#parseServers -> Unknown target server status: %",
              targetSrv.status
            )
          );
          break;
      }
    }
  }

  #checkTargetActions(targetServer) {
    // let fnN = "checkTargetActions";
    // this.log(fnN, "");

    // test weaken only
    // this.#checkTargetNeedsWeaken(targetServer);

    if (!this.#checkTargetNeedsWeaken(targetServer)) {
      if (!this.#checkTargetNeedsGrow(targetServer)) {
        this.#hackTarget(targetServer);
      }
    }
  }

  #checkTargetNeedsWeaken(targetServer) {
    let fnN = "checkTargetNeedsWeaken";
    this.log(fnN, "");

    let hackDifficultyDiff = targetServer.srvObj.hackDifficulty - targetServer.srvObj.minDifficulty;

    if (this.#shouldTriggerWeaken(targetServer.srvObj)) {
      switch (targetServer.actions[F42_HACK_ACTION_WEAK].status) {
        // none|pending|posted|running|received|completed
        case F42_ACTION_STATUS_NONE:
          this.#targetWeakenAnalyse(targetServer, hackDifficultyDiff);
          this.log(fnN, "F42_ACTION_STATUS_NONE");
          break;
        case F42_ACTION_STATUS_PENDING:
          // server has been analysed, but message still needs posting
          this.#buildJobMessage(targetServer, F42_HACK_ACTION_WEAK);
          this.log(fnN, "F42_ACTION_STATUS_PENDING");
          break;
        case F42_ACTION_STATUS_POSTED:
          this.log(fnN, "F42_ACTION_STATUS_POSTED");
          break;
        case F42_ACTION_STATUS_RUNNING:
          this.log(fnN, "F42_ACTION_STATUS_RUNNING");
          break;
        case F42_ACTION_STATUS_RECEIVED:
          this.log(fnN, "F42_ACTION_STATUS_RECEIVED");
          break;
        case F42_ACTION_STATUS_COMPLETED:
          this.log(fnN, "F42_ACTION_STATUS_COMPLETED");
          // set none and re-analyse
          this.#actionPostCompleteReset(targetServer.actions[F42_HACK_ACTION_WEAK]);
          this.#targetWeakenAnalyse(targetServer, hackDifficultyDiff);
          break;
        default:
          throw new Error(
            super.ns.sprintf(
              "!! HackManager.#checkTargetNeedsWeaken -> Unknown target server weaken action status: %",
              targetSrv.actions[F42_HACK_ACTION_WEAK].status
            )
          );
      }

      return true;
    }
    else {
      return false;
    }
  }

  /**
  * weakenDiffMax = ((base - min) * F42_WEAKEN_DIFF_MAX_PERC)
  * if currentDiff (hackDifficulty - minDifficulty) > weakenDiffMax
  *    >> trigger weaken
  */
  #shouldTriggerWeaken(tgtSrvObj) {
    let currDiff = tgtSrvObj.hackDifficulty - tgtSrvObj.minDifficulty;
    let weakenDiffMax = (tgtSrvObj.baseDifficulty - tgtSrvObj.minDifficulty) * F42_WEAKEN_DIFF_MAX_PERC;
    return currDiff > weakenDiffMax;
  }

  #targetWeakenAnalyse(targetServer, hackDifficultyDiff) {
    let fnN = "targetWeakenAnalyse";
    this.log(fnN, "");

    // set pending
    targetServer.actions[F42_HACK_ACTION_WEAK].status = F42_ACTION_STATUS_PENDING;

    // analyse
    targetServer.actions[F42_HACK_ACTION_WEAK].estAmt = hackDifficultyDiff;

    try {
      targetServer.actions[F42_HACK_ACTION_WEAK].estTime = super.ns.formulas.hacking.weakenTime(
        targetServer.srvObj,
        super.ns.getPlayer()
      );
    }
    catch (e) {
      // dont have formulas
      targetServer.actions[F42_HACK_ACTION_WEAK].estTime = super.ns.getWeakenTime(targetServer.srvObj.hostname);
    }

    targetServer.actions[F42_HACK_ACTION_WEAK].threads = Math.ceil(hackDifficultyDiff / F42_WEAKEN_1T);

    if (targetServer.actions[F42_HACK_ACTION_WEAK].threads <= 0) {
      targetServer.actions[F42_HACK_ACTION_WEAK].threads = 1;
    }

    // post weaken job msg
    this.#buildJobMessage(targetServer, F42_HACK_ACTION_WEAK);
  }

  #checkTargetNeedsGrow(targetServer) {
    let fnN = "checkTargetNeedsGrow";
    this.log(
      fnN,
      "targetServer: %s",
      targetServer.srvObj.hostname
    );

    // calc diff
    let moneyDiff = targetServer.srvObj.moneyMax - targetServer.srvObj.moneyAvailable;

    this.log(
      fnN,
      ">> grow status: %s\n>> moneyMax: %s\n>> moneyAvailable: %s\n>> moneyDiff: %s",
      targetServer.actions[F42_HACK_ACTION_GROW].status,
      targetServer.srvObj.moneyMax,
      targetServer.srvObj.moneyAvailable,
      super.ns.formatNumber(moneyDiff)
    );

    if (this.#shouldTriggerGrow(targetServer.srvObj)) {
      switch (targetServer.actions[F42_HACK_ACTION_GROW].status) {
        // none|pending|posted|running|received|completed
        case F42_ACTION_STATUS_NONE:
          this.#targetGrowAnalyse(targetServer, moneyDiff);
          break;
        case F42_ACTION_STATUS_PENDING:
          // server has been analysed, but message still needs posting
          this.#buildJobMessage(targetServer, F42_HACK_ACTION_GROW);
          break;
        case F42_ACTION_STATUS_POSTED:
        case F42_ACTION_STATUS_RUNNING:
        case F42_ACTION_STATUS_RECEIVED:
          // do nothing
          break;
        case F42_ACTION_STATUS_COMPLETED:
          // set none and re-analyse
          this.#actionPostCompleteReset(targetServer.actions[F42_HACK_ACTION_GROW]);
          this.#targetGrowAnalyse(targetServer, moneyDiff);
          break;
        default:
          throw new Error(
            super.ns.sprintf(
              "!! HackManager.#checkTargetNeedsGrow -> Unknown target server grow action status: %",
              targetSrv.actions[F42_HACK_ACTION_GROW].status
            )
          );
      }

      return true;
    }
    else {
      return false;
    }
  }

  /**
   * (max * F42_GROW_LEVEL_MIN_PERC)
   * percentage of max money above which grow won't trigger
   * 
   * ????FAV?
   */
  #shouldTriggerGrow(tgtSrvObj) {
    return tgtSrvObj.moneyAvailable < (tgtSrvObj.moneyMax * F42_GROW_LEVEL_MIN_PERC);
  }

  #targetGrowAnalyse(targetServer, moneyDiff) {
    let fnN = "targetGrowAnalyse";
    this.log(
      fnN,
      "targetServer: %s | moneyDiff: %s",
      targetServer.srvObj.hostname,
      super.ns.formatNumber(moneyDiff)
    );

    // set pending
    targetServer.actions[F42_HACK_ACTION_GROW].status = F42_ACTION_STATUS_PENDING;

    // analyse
    targetServer.actions[F42_HACK_ACTION_GROW].estAmt = moneyDiff;
    try {
      targetServer.actions[F42_HACK_ACTION_GROW].estTime = super.ns.formulas.hacking.growTime(
        targetServer.srvObj,
        super.ns.getPlayer()
      );

      targetServer.actions[F42_HACK_ACTION_GROW].threads = Math.ceil(super.ns.formulas.hacking.growThreads(
        targetServer.srvObj,
        super.ns.getPlayer(),
        targetServer.srvObj.moneyMax
      ));
    }
    catch (e) {
      // don't have formulas
      let growMultiplier = targetServer.srvObj.moneyMax / targetServer.srvObj.moneyAvailable;

      targetServer.actions[F42_HACK_ACTION_GROW].threads = Math.ceil(super.ns.growthAnalyze(
        targetServer.srvObj.hostname,
        growMultiplier
      ));
    }

    if (targetServer.actions[F42_HACK_ACTION_GROW].threads <= 0) {
      targetServer.actions[F42_HACK_ACTION_GROW].threads = 1;
    }

    // post grow job msg
    this.#buildJobMessage(targetServer, F42_HACK_ACTION_GROW);
  }

  #hackTarget(targetServer) {
    let fnN = "hackTarget";
    this.log(fnN, "targetServer > %s", targetServer.srvObj.hostname);

    switch (targetServer.actions[F42_HACK_ACTION_HACK].status) {
      // none|pending|posted|running|received|completed
      case F42_ACTION_STATUS_NONE:
        this.#targetHackAnalyse(targetServer);
        break;
      case F42_ACTION_STATUS_PENDING:
        // server has been analysed, but message still needs posting
        this.#buildJobMessage(targetServer, F42_HACK_ACTION_HACK);
        break;
      case F42_ACTION_STATUS_POSTED:
      case F42_ACTION_STATUS_RUNNING:
      case F42_ACTION_STATUS_RECEIVED:
        // do nothing
        break;
      case F42_ACTION_STATUS_COMPLETED:
        // set none and re-analyse
        this.#actionPostCompleteReset(targetServer.actions[F42_HACK_ACTION_HACK]);
        this.#targetHackAnalyse(targetServer);
        break;
      default:
        throw new Error(
          super.ns.sprintf(
            "!! HackManager.#hackTarget -> Unknown target server hack action status: %",
            targetSrv.actions[F42_HACK_ACTION_HACK].status
          )
        );
    }
  }

  #targetHackAnalyse(targetServer) {
    let fnN = "targetHackAnalyse";
    this.log(fnN, "targetServer > %s", targetServer.srvObj.hostname);

    // set pending
    targetServer.actions[F42_HACK_ACTION_HACK].status = F42_ACTION_STATUS_PENDING;

    // calc hack amount
    let hackAmt = targetServer.srvObj.moneyMax * F42_HACK_MONEY_PERC;

    // analyse
    targetServer.actions[F42_HACK_ACTION_HACK].estAmt = hackAmt;

    try {
      targetServer.actions[F42_HACK_ACTION_HACK].estTime = super.ns.formulas.hacking.hackTime(
        targetServer.srvObj,
        super.ns.getPlayer()
      );
    }
    catch (e) {
      // don't have formulas
      super.ns.getHackTime(targetServer.srvObj.hostname);
    }

    targetServer.actions[F42_HACK_ACTION_HACK].threads = Math.ceil(super.ns.hackAnalyzeThreads(
      targetServer.srvObj.hostname,
      hackAmt
    ));

    if (targetServer.actions[F42_HACK_ACTION_HACK].threads <= 0) {
      targetServer.actions[F42_HACK_ACTION_HACK].threads = 1;
    }

    // post hack job msg
    this.#buildJobMessage(targetServer, F42_HACK_ACTION_HACK);
  }

  // ????FAV?
  #buildJobMessage(targetServer, action) {
    let fnN = "buildJobMessage (" + action + ")";
    this.log(fnN, "targetServer > %s", targetServer.srvObj.hostname);

    let actionObj = targetServer.actions[action];
    // this.log(
    //   fnN,
    //   "actionObj: %s",
    //   JSON.stringify(actionObj, null, 2)
    // );

    if (actionObj.batches == 0) {
      // first run, calc batches
      this.log(fnN, "init batch calc");
      actionObj.batches = Math.ceil(actionObj.threads / this.#maxThreadBatch);
      actionObj.batchesSent = 0;
      actionObj.batchesRcvd = 0;
    }

    let shouldBatch = (actionObj.batches > 1);
    let jobMsg;
    let batchNumber;
    let threadsThisBatch;
    let threadsRemaining;

    if (shouldBatch) {
      // action is batched
      batchNumber = actionObj.batchesSent + 1;
      threadsRemaining = actionObj.threads - (actionObj.batchesSent * this.#maxThreadBatch);
      threadsThisBatch = threadsRemaining > this.#maxThreadBatch ? this.#maxThreadBatch : threadsRemaining;
    }

    jobMsg = this.#getJobMessageObj(targetServer, action, batchNumber, actionObj.batches, threadsThisBatch);

    this.log(
      fnN,
      "batchNumber: %s\n> threadsRemaining: %s\n> threadsThisBatch: %s\n> jobMsg: %s\n",
      batchNumber,
      threadsRemaining,
      threadsThisBatch,
      JSON.stringify(jobMsg, null, 2)
    );

    if (this.#postJob(jobMsg)) {
      // message post successful
      actionObj.batchesSent += 1;
      threadsRemaining -= threadsThisBatch;

      if (threadsRemaining == 0) {
        // all batch msgs sent, set posted
        actionObj.status = F42_ACTION_STATUS_POSTED;

        // trigger kill for debug
        // this.#shouldKill = true;
        // this.log(fnN, "targetServer.actions.%s @ kill: %s", action, JSON.stringify(targetServer.actions[action], null, 2));
      }
      else {
        // re-run for next batch msg
        this.#buildJobMessage(targetServer, action);
      }
    }
    else {
      // stack full, so do nothing and try again next loop
    }
  }

  #getJobMessageObj(targetServer, targetAction, batchNum = undefined, totBatches = undefined, batchThreads = undefined) {
    let fnN = "getJobMessageObj";
    this.log(fnN, "");

    let actionObj = targetServer.actions[targetAction];

    let msg = {
      target: targetServer.srvObj.hostname,
      action: targetAction,
      batched: false,
      batchNum: 1,
      totBatches: 1,
      threads: actionObj.threads,
      totThreads: actionObj.threads,
      messageId: actionObj.messageId,
      estAmt: actionObj.estAmt,
      estTime: actionObj.estTime,
      operationTs: this.#hackManagerObj.meta.operationTs,
      messageTs: Date.now()
    };

    if (batchNum) {
      if (totBatches === undefined || batchThreads === undefined) {
        throw new Error("getJobMessageObj(): batchNum specified, totBatches and batchThreads can't be undefined");
      }

      msg.batched = true;
      msg.batchNum = batchNum;
      msg.totBatches = totBatches;
      msg.threads = batchThreads;
    }

    return msg;
  }

  #postJob(msgObj) {
    let fnN = "postJob";
    this.log(fnN, "");

    return F42MessageStack.pushMessage(
      super.ns,
      f42PortDefs.F42_MSG_STACK_POSTED_JOBS,
      msgObj
    );
  }

  #checkCompletedJobs() {
    const fnN = "checkCompletedJobs";
    this.log(fnN, "");

    // check stack has messages
    if (!F42MessageStack.peekMessage(super.ns, f42PortDefs.F42_MSG_STACK_COMPLETED_JOBS)) {
      return;
    }

    // set limit for number of jobs to check
    let maxJobs = 20;

    while (maxJobs > 0) {
      let completedJob = F42MessageStack.popMessage(super.ns, f42PortDefs.F42_MSG_STACK_COMPLETED_JOBS);

      if (!completedJob) {
        break;
      }

      this.log(fnN, "%s >> %s", completedJob.jobMsg.target, completedJob.jobMsg.action);

      // validate operation ts
      if (completedJob.jobMsg.operationTs != this.#hackManagerObj.meta.operationTs) {
        this.log(
          fnN,
          "operationTs mismatch, dropping completed job: %s",
          JSON.stringify(completedJob, null, 2)
        );
        continue;
      }

      // validate target
      const targetServer = this.#hackManagerObj.targetServers[completedJob.jobMsg.target];

      if (!targetServer) {
        this.log(
          fnN,
          "invalid target server, dropping completed job: %s",
          JSON.stringify(completedJob, null, 2)
        );
        continue;
      }

      // ????FAV?

      // update target server
      let targetAction = targetServer.actions[completedJob.jobMsg.action];

      // update batch counts
      targetAction.batchesRcvd++;

      if (targetAction.batchesRcvd == targetAction.batchesSent) {
        // job can be completed
        targetAction.status = F42_ACTION_STATUS_COMPLETED;
        targetAction.result.status = F42_ACTION_RESULT_COMPLETE;
      }

      targetAction.result.actionedBy = completedJob.thrall;
      targetAction.result.startedTs = completedJob.startTs;
      targetAction.result.endedTs = completedJob.endTs;
      targetAction.result.time = (completedJob.endTs - completedJob.startTs);
      targetAction.result.startAmt = completedJob.startAmt;
      targetAction.result.endAmt = completedJob.endAmt;
      targetAction.result.amt = completedJob.actionAmt;

      if (F42_HACK_ACTION_HACK == completedJob.jobMsg.action) {
        this.#addStat(F42_HM_STAT_EARN, {
          amt: targetAction.result.amt,
          amtf: this.ns.formatNumber(targetAction.result.amt),
          source: targetServer.srvObj.hostname,
          actionedBy: targetAction.result.actionedBy,
        });
      }

      this.log(
        fnN,
        "job %s: %s",
        (F42_ACTION_STATUS_COMPLETED == targetAction.status ? "completed" : "partially completed"),
        // log full path here to make sure we haven't decoupled data
        JSON.stringify(this.#hackManagerObj.targetServers[completedJob.jobMsg.target].actions[completedJob.jobMsg.action], null, 2)
      );

      maxJobs--;
    }
  }

  // ????FAV?
  #actionPostCompleteReset(actionObject) {
    let fnN = "actionPostCompleteReset";
    this.log(fnN, "");

    actionObject.status = F42_ACTION_STATUS_NONE;
    actionObject.batches = 0;
    actionObject.batchesSent = 0;
    actionObject.batchesRcvd = 0;
  }

  #clearActions() {
    let fnN = "clearActions";
    this.log(fnN, "");

    for (const tgtSrvHost in this.#hackManagerObj.targetServers) {
      let tgtSrv = this.#hackManagerObj.targetServers[tgtSrvHost];

      // set all to completed to force reset of actions
      tgtSrv.actions[F42_HACK_ACTION_WEAK].status = F42_ACTION_STATUS_COMPLETED;
      tgtSrv.actions[F42_HACK_ACTION_GROW].status = F42_ACTION_STATUS_COMPLETED;
      tgtSrv.actions[F42_HACK_ACTION_HACK].status = F42_ACTION_STATUS_COMPLETED;
    }

    // update op ts to invsalidate all outstanding jobs
    this.#hackManagerObj.meta.operationTs = timestampAsBase62Str();

    // bup
    this.#writeHMOToFile();
  }

  /**
   * Called on init; load list from file
   */
  #loadHackManagerObject(reset = false) {
    let fnN = "loadHackManagerObject";
    this.log(fnN, "reset: %s", reset);

    // rest if requested
    if (reset) {
      this.#hackManagerObj = this.#initHackManagerObject();

      // overwrite file
      this.#writeHMOToFile(this.#hackManagerObj);

      // clear and rewrite port

    }
    else {
      if (!super.ns.fileExists(F42_HMO_FILE_PATH)) {
        this.#loadHackManagerObject(true);
        return;
      }

      // try load from txt file
      let fileData = super.ns.read(F42_HMO_FILE_PATH);

      if (fileData === "") {
        this.#loadHackManagerObject(true);
        return;
      }

      this.#hackManagerObj = JSON.parse(fileData);

      // try load from port

      // validate object
      if (!this.#hackManagerObj.meta || this.#hackManagerObj.meta.metaVer !== F42_HMO_META_V) {
        this.#loadHackManagerObject(true);
        return;
      }
    }

    // log
    this.log(fnN, "HackManagerObject: %s", JSON.stringify(this.#hackManagerObj));
  }

  #addStat(statType, statData) {
    let statsChanged = false;
    let nowTs = Date.now();

    switch (statType) {
      case F42_HM_STAT_EARN:
        this.#stats.totalEarned += statData.amt;
        this.#stats.formatted.totalEarned = this.ns.formatNumber(this.#stats.totalEarned);
        // this.#stats.earnings[ts] = { ...statData };
        statsChanged = true;
        break;
    }

    if (statsChanged) {
      this.#stats.updatedTs = nowTs;
      this.#stats.formatted.updatedDate = Date(nowTs).toString();
      this.#stats.earningRate = (this.#stats.totalEarned / ((nowTs - this.#stats.startTs) / 1000));
      this.#stats.formatted.earningRate = this.ns.formatNumber(this.#stats.earningRate) + "/sec";
      this.#statsPh.clear();
      this.#statsPh.write(this.#stats);
    }
  }
}
