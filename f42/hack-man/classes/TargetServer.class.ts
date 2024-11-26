import F42Base from "/f42/classes/F42Base.class";
import ActionBase from "/f42/hack-man/classes/ActionBase.class";
import WeakenAction from "/f42/hack-man/classes/ActionWeaken.class";
import GrowAction from "/f42/hack-man/classes/ActionGrow.class";
import HackAction from "/f42/hack-man/classes/ActionHack.class";
import Logger from "/f42/classes/Logger.class";
import { ActionType, TgtSrvOpMode, TgtSrvOpModeStatus, TgtSrvStatus } from "/f42/hack-man/classes/enums";
import { getEmpty_JobState_Interface } from "/f42/classes/helpers/empty-object-getters";
import { HasState_Interface, HMJobMsg_Interface, JobState_Interface, TSrvState_Interface } from "/f42/classes/helpers/interfaces";
import { Server } from "@ns";

type ActionList_Type = [
  WeakenAction,
  GrowAction,
  HackAction,
]

type ActionUnion_Type = WeakenAction | GrowAction | HackAction;

export default class TargetServer extends F42Base implements HasState_Interface {
  #initTs: number;
  #doneInit = false;
  #metaId: string;
  #hostname: string;
  #srvObj!: Server;
  #status = TgtSrvStatus.NEW;
  #actions: ActionList_Type;
  #opMode = TgtSrvOpMode.FREE;

  /**
   * @param {object} ns
   * @param {Logger} logger
   * @param {string} hostname
   */
  constructor(
    logger: Logger,
    hostname: string,
    metaId: string,
    initialStatus: TgtSrvStatus = TgtSrvStatus.NEW,
    initialOpMode: TgtSrvOpMode = TgtSrvOpMode.FREE
  ) {
    super(logger);
    this.#status = initialStatus;
    this.#opMode = initialOpMode;
    this.#initTs = Date.now();
    this.#metaId = metaId;
    this.#hostname = this.#validateHostname(hostname);
    this.updateSrvObj();
    this.#actions = this.#initActions();
    this.#doneInit = true;

    this.allowedLogFunctions = [
      // "checkReceivedMsg",
      // "checkTargetActions",
      // "checkStatusActionable",
      // "changeOpMode",
      // "setStatusActive",
      // "setStatusPaused",
      // "validateHostname",
    ];
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
  #validateHostname(hostname: string): string {
    // const lo = this.getLo("validateHostname", "hostname: %s", hostname);
    this.#testInit();

    // validate hostname
    if (!this.ns.serverExists(hostname)) {
      throw new Error("TargetServer set #initHostname: Invalid hostname, server does not exist: " + hostname);
    }

    // validate root access
    if (!this.ns.hasRootAccess(hostname)) {
      throw new Error("TargetServer set #initHostname: No root access on target server: " + hostname);
    }

    return hostname;
  }

  /**
   * @returns {string}
   */
  get hostname(): string {
    return this.#hostname;
  }

  // ////////////////
  // opMode
  // ////////////////

  get opMode(): TgtSrvOpMode {
    return this.#opMode;
  }

  get opModeStr(): string {
    return TgtSrvOpMode[this.#opMode];
  }

  get opModeStatus(): TgtSrvOpModeStatus {
    // make sure latest server data
    this.updateSrvObj();

    // parse status
    if (this.#status === TgtSrvStatus.PAUSED) {
      return TgtSrvOpModeStatus.PAUSED;
    }
    else if (this.#opMode === TgtSrvOpMode.FREE) {
      return TgtSrvOpModeStatus.FREE;
    }
    else if (this.#opMode === TgtSrvOpMode.MONEY_MAX) {
      if (
        this.moneyAvailable < this.moneyMax
        || this.hackDifficulty > this.minDifficulty
      ) {
        return TgtSrvOpModeStatus.IN_PROGRESS;
      }
      else {
        return TgtSrvOpModeStatus.DONE;
      }
    }
    else {
      if (this.moneyAvailable > 0) {
        return TgtSrvOpModeStatus.IN_PROGRESS;
      }
      else {
        return TgtSrvOpModeStatus.DONE;
      }
    }
  }

  // ////////////////
  // state
  // ////////////////

  get state(): TSrvState_Interface {
    return {
      hydrated: true,
      initTs: this.#initTs,
      opMode: this.opModeStr,
      status: this.statusStr,
      totalHacked: this.ns.formatNumber(this.hackAction.totalAmt),
      totalGrown: this.ns.formatNumber(this.growAction.totalAmt),
      totalWeakened: this.ns.formatNumber(this.weakenAction.totalAmt),
      startedJobs: this.totalStartedJobs,
      compJobs: this.totalCompJobs,
      activeJob: this.activeJobState,
      jobsStoredCnt: this.totalJobsStored,
      raw: {
        totalHacked: this.hackAction.totalAmt,
        totalGrown: this.growAction.totalAmt,
        totalWeakened: this.weakenAction.totalAmt,
      },
    };
  }

  get activeJobState(): JobState_Interface {
    let jobState = getEmpty_JobState_Interface();

    for (const key in this.#actions) {
      const action: ActionBase = this.#actions[key];

      // this will be an active job state, or an empty
      // one if no active job; test with 'hydrated' property
      jobState = action.state;

      if (jobState.hydrated) {
        // found an active job state, return
        return jobState;
      }
    }

    // no active job state found, return the last empty one
    return jobState;
  }

  get totalStartedJobs(): number {
    return this.hackAction.jobCnt +
      this.growAction.jobCnt +
      this.weakenAction.jobCnt;
  }

  get totalCompJobs(): number {
    return this.hackAction.compJobCnt +
      this.growAction.compJobCnt +
      this.weakenAction.compJobCnt;
  }

  get totalJobsStored(): number {
    return this.hackAction.jobListCnt +
      this.growAction.jobListCnt +
      this.weakenAction.jobListCnt;
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
      throw new Error("TargetServer.updateSrvObj(): Invalid hostname");
    }

    this.#srvObj = this.ns.getServer(this.#hostname);

    if (!this.#srvObj || typeof this.#srvObj === "undefined") {
      throw new Error("TargetServer.updateSrvObj(): Failed to get Server object");
    }
  }

  /**
   * @returns { Server }
   */
  get srvObj(): Server {
    if (!this.#srvObj) {
      this.updateSrvObj();
    }

    return this.#srvObj;
  }

  get moneyMax(): number {
    if (typeof this.srvObj.moneyMax !== "undefined") {
      return this.srvObj.moneyMax;
    }
    else {
      return 0;
    }
  }

  get moneyAvailable(): number {
    if (typeof this.srvObj.moneyAvailable !== "undefined") {
      return this.srvObj.moneyAvailable;
    }
    else {
      return 0;
    }
  }

  get hackDifficulty(): number {
    if (typeof this.srvObj.hackDifficulty !== "undefined") {
      return this.srvObj.hackDifficulty;
    }
    else {
      return 0;
    }
  }

  get minDifficulty(): number {
    if (typeof this.srvObj.minDifficulty !== "undefined") {
      return this.srvObj.minDifficulty;
    }
    else {
      return 0;
    }
  }

  // ////////////////
  // status
  // ////////////////

  setStatusActive(): boolean {
    const lo = this.getLo("setStatusActive");

    if (TgtSrvStatus.ACTIVE === this.#status) {
      return false;
    }
    else {
      this.#status = TgtSrvStatus.ACTIVE;
      lo.g("status >> ACTIVE ▶️");
      return true;
    }
  }

  setStatusPaused(): boolean {
    const lo = this.getLo("setStatusPaused");

    if (TgtSrvStatus.PAUSED === this.#status) {
      return false;
    }
    else {
      this.#status = TgtSrvStatus.PAUSED;
      lo.g("status >> PAUSED ⏸");
      return true;
    }
  }

  /**
   * @returns {TgtSrvStatus}
   */
  get status(): TgtSrvStatus {
    return this.#status;
  }

  /**
   * @returns {string}
   */
  get statusStr(): string {
    return TgtSrvStatus[this.#status];
  }

  // ////////////////
  // actions
  // ////////////////

  #initActions(): ActionList_Type {
    this.#testInit();
    return [
      new WeakenAction(this),
      new GrowAction(this),
      new HackAction(this),
    ];
  }

  /**
   * Returns WeakenAction
   * 
   * @returns {WeakenAction}
   */
  get weakenAction(): WeakenAction {
    return this.#actions[ActionType.WEAK];
  }

  /**
   * Returns GrowAction
   * 
   * @returns {GrowAction}
   */
  get growAction(): GrowAction {
    return this.#actions[ActionType.GROW];
  }

  /**
   * Returns HackAction
   * 
   * @returns {HackAction}
   */
  get hackAction(): HackAction {
    return this.#actions[ActionType.HACK];
  }

  get hasActiveAction(): boolean {
    if (
      this.weakenAction.hasActiveJob
      || this.growAction.hasActiveJob
      || this.hackAction.hasActiveJob
    ) {
      return true;
    }
    else {
      return false;
    }
  }

  /**
   * Gets the active action if one exists
   * 
   * @returns The active action if found, else false
   */
  get activeAction(): ActionUnion_Type | false {
    for (const action of this.#actions) {
      if (action.hasActiveJob) {
        return action;
      }
    }
    return false;
  }

  /**
   * Cancels any active job
   * 
   * @returns True if active job found and canceled, false if no active jobs
   */
  cancelActiveJob(): boolean {
    for (const action of this.#actions) {
      if (action.tryCancel()) {
        return true;
      }
    }
    return false;
  }

  get allowedActionsForOpMode(): ActionType[] {
    if (TgtSrvOpMode.MONEY_MAX === this.#opMode) {
      return [ActionType.WEAK, ActionType.GROW];
    }
    else if (TgtSrvOpMode.MONEY_MIN === this.#opMode) {
      return [ActionType.HACK];
    }
    else {
      return [ActionType.WEAK, ActionType.GROW, ActionType.HACK];
    }
  }

  // ////////////////
  // main loop functions
  // ////////////////

  /**
   * Changes op mode to requested one, if change needed.
   * If change needed, any active action/job is cancelled.
   * 
   * @param newOpMode The TgtSrvOpMode to change to
   * @returns True if mode changed, false if no change needed
   */
  changeOpMode(newOpMode: TgtSrvOpMode): boolean {
    const lo = this.getLo("changeOpMode");

    if (newOpMode === this.#opMode) {
      if (this.status === TgtSrvStatus.PAUSED) {
        lo.g("opMode %s activate >>", this.opModeStr);
        this.setStatusActive();
        return true;
      }
      else {
        // do nothing
        lo.g("Already running req mode: newOpMode === this.#opMode; no action needed 👋");
        return false;
      }
    }
    else {
      // cancel active action/job
      this.cancelActiveJob();

      // change mode
      lo.g("Op mode changed from %s to %s 🎉", this.opModeStr, TgtSrvOpMode[newOpMode]);
      this.#opMode = newOpMode;

      // // unpause if paused
      // if(this.status === TgtSrvStatus.PAUSED){
      //   this.setStatusActive();
      // }

      // pause new mode by default
      this.setStatusPaused();

      return true;
    }
  }

  checkStatusActionable(): void {
    const lo = this.getLo("checkStatusActionable");
    switch (this.status) {
      case TgtSrvStatus.NEW:
        lo.g("tgtSrv: %s > STATUS_NEW", this.hostname);
        // set active
        this.setStatusActive();

        // check actions
        this.#checkTargetActions();
        break;
      case TgtSrvStatus.ACTIVE:
        lo.g("tgtSrv: %s > STATUS_ACTIVE", this.hostname);
        // check actions
        this.#checkTargetActions();
        break;
      case TgtSrvStatus.PAUSED:
        lo.g("tgtSrv: %s > STATUS_PAUSED", this.hostname);
        // do nothing
        break;
      default:
        throw lo.gThrowErr("!! TargetServer.checkStatusActionable: Unknown target server status: %s 😱", this.status);
        break;
    }
  }

  /**
   * Actions MUST be run/tested in looping order: Weaken > Grow > Weaken > Hack
   * A test is done first to see if any action is running, if it is, 
   * it should be allowed to continue. If none are running, then check in
   * the above order of precedence.
   */
  #checkTargetActions(): void {
    const lo = this.getLo("checkTargetActions");
    const activeAct = this.activeAction;

    // get a list of allowed action types based on op mode
    const allowedActions = this.allowedActionsForOpMode;
    lo.g("Allowed actions: %s", JSON.stringify(allowedActions));

    if (activeAct !== false) {
      if ((allowedActions.includes(activeAct.type))) {
        // keep running allowed action
        lo.g("Continuing %s", ActionType[activeAct.type]);
        activeAct.checkTargetNeedsAction();
      }
      else {
        // cancel action that's not allowed in this mode
        lo.g("Cancelling %s, not allowed in this mode (%s)", ActionType[activeAct.type], this.#opMode);
        activeAct.tryCancel();
      }
    }
    else {
      // iterate allowed actions in order
      for (const allowedActType of allowedActions) {
        lo.g("testing: %s", allowedActType);
        if (this.#actions[allowedActType].checkTargetNeedsAction()) {
          lo.g("%s actioned 🎉", ActionType[allowedActType]);
          break;
        }
      }

      // no actions can run, pause
      if(this.activeAction === false){
        lo.g("No active actions, pausing ⏸️");
        this.setStatusPaused(); 
      }
    }
  }

  checkReceivedMsg(rcvdMsg: HMJobMsg_Interface): boolean {
    const lo = this.getLo(
      "checkReceivedMsg",
      " CHK_ACTION: %s -> %s %d",
      this.hostname,
      rcvdMsg.msgId,
      rcvdMsg.actionType
    );

    if (rcvdMsg.actionType in this.#actions) {
      lo.g("MATCH_ACTION: %s", rcvdMsg.target);
      return this.#actions[rcvdMsg.actionType].checkReceivedMsg(rcvdMsg);
    }
    else {
      throw lo.gThrowErr("Invalid action type: %s", JSON.stringify(rcvdMsg, null, 2));
    }
  }
}