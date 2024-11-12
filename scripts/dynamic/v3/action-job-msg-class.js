import F42Base from '/scripts/classes/f42-base-class.js';
import F42MessageStack from '/scripts/classes/f42-message-stack-class.js';
import { timestampAsBase62Str } from "/scripts/utility/utility-functions.js";
import { F42_MSG_STACK_POSTED_JOBS } from "/scripts/cfg/port-defs.js";

export const MSG_STATUS_PRE_INIT = "pre-init";
export const MSG_STATUS_INIT = "init";
export const MSG_STATUS_SENT = "sent";
export const MSG_STATUS_ACCEPT = "accept";
export const MSG_STATUS_RETURN = "return";
export const MSG_STATUS_RECEIVE = "receive";
export const MSG_STATUS_CLOSED = "closed";
export const MSG_STATUS_CANCEL = "cancel";

const DEBUG_NO_SEND = false;

export default class ActionJobMessage extends F42Base {
  #doneInit = false;
  #actionJob;
  #msg = {
    ver: 3,
    target: "",
    actionType: "",
    metaId: "",
    jobId: "",
    msgId: "",

    isInit: false,
    isSent: false,
    isAccepted: false,
    isReturned: false,
    isReceived: false,
    isClosed: false,
    isCancel: false,

    msgSentTs: 0,
    msgAcceptedTs: 0,
    msgReturnedTs: 0,
    msgReceivedTs: 0,
    msgClosedTs: 0,
    msgCancelTs: 0,

    batchNum: 1,
    totBatches: 1,
    threads: 0,
    totThreads: 0,
    estAmt: 0,
    estTime: 0,

    result: {
      pid: 0,
      actionedBy: "",
      startTs: 0,
      endTs: 0,
      startAmt: 0,
      endAmt: 0,
      amt: 0,
    },
  };

  constructor(actionJob, serialObj = undefined) {
    super(actionJob.ns, actionJob.logger, serialObj);
    this.#doInitAll(actionJob);

    if (serialObj) {
      this.unserialize(serialObj);
    }

    this.allowedLogFunctions = [
      // "setStatusSent",
      // "setStatusSent",
      // "unsetStatusSent",
      // "postMsg",
      // "processReceivedMessage"
    ];
  }

  #doInitAll(actionJob) {
    this.#actionJob = actionJob;
    this.#initId();
    this.#msg.target = this.#actionJob.target;
    this.#msg.actionType = this.#actionJob.type;
    this.#msg.metaId = this.#actionJob.metaId;
    this.#msg.jobId = this.#actionJob.id;
    this.#msg.isInit = true;
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
  // id
  // ////////////////

  #initId() {
    this.#testInit();
    this.#msg.msgId = "msgId_" + timestampAsBase62Str(Math.random());
  }

  get id() {
    return this.#msg.msgId;
  }

  // ////////////////
  // msg
  // ////////////////

  buildMsg(threads, totThreads, batchNum, totBatches, estAmt, estTime) {
    let fnN = this.log("buildMsgs", "");

    this.#msg.threads = threads;
    this.#msg.totThreads = totThreads;
    this.#msg.batchNum = batchNum;
    this.#msg.totBatches = totBatches;
    this.#msg.estAmt = estAmt;
    this.#msg.estTime = estTime;

    return this.#msg;
  }

  get msg() {
    return this.#msg;
  }

  postMsg() {
    let lo = this.getLo("postMsg");

    // this.ns.tprintf(this.tgtSrv.serialize(true));
    // this.log(fnN, "this.tgtSrv: %s", this.tgtSrv);
    // this.log(fnN, "this.#msg:\n%s", this.stringify(this.#msg));
    // throw new Error("CAVEMAN_DEBUG");

    this.setStatusSent();

    let sendResult;

    // try to send
    if (DEBUG_NO_SEND) {
      lo.g("DEBUG_NO_SEND");
      sendResult = false;
    }
    else {
      sendResult = F42MessageStack.pushMessage(
        super.ns,
        F42_MSG_STACK_POSTED_JOBS,
        this.#msg
      );
    }

    lo.g("sendResult: %s", sendResult);

    // change msg status if sent
    if (!sendResult) {
      lo.g("call >> this.unsetStatusSent()");
      this.unsetStatusSent();
    }

    return sendResult;
  }

  processReceivedMessage(rcvdMessage) {
    let lo = this.getLo("processReceivedMessage");

    // set statuses from thrall and new status
    this.setStatusAccept(rcvdMessage.msgAcceptedTs);
    this.setStatusReturn(rcvdMessage.msgReturnedTs);
    this.setStatusReceive();

    // copy result fields from received message
    this.#msg.result = rcvdMessage.result;

    lo.g("result: %s", this.stringify(this.#msg.result));
  }

  // ////////////////
  // status
  // ////////////////

  // no function for init as can only be set on init

  setStatusSent() {
    let lo = this.getLo("setStatusSent");

    this.#chkCanChangeStatus(MSG_STATUS_SENT);
    this.#msg.isSent = true;
    this.#msg.msgSentTs = Date.now();

    lo.g("\n - this.#msg.isSent: %s\n - this.#msg.msgSentTs: %d", this.#msg.isSent, this.#msg.msgSentTs);
  }

  unsetStatusSent() {
    let lo = this.getLo("unsetStatusSent");

    if (this.status == MSG_STATUS_SENT) {
      this.#msg.isSent = false;
      this.#msg.msgSentTs = 0;
    }
    else {
      throw new Error("ActionJob.setStatusUnSent: Can't unsend, not in sent state: %s", this.status);
    }

    lo.g("\n - this.#msg.isSent: %s\n - this.#msg.msgSentTs: %d", this.#msg.isSent, this.#msg.msgSentTs);
  }

  setStatusAccept(ts) {
    this.#chkCanChangeStatus(MSG_STATUS_ACCEPT);
    this.#msg.isAccepted = true;
    this.#msg.msgAcceptedTs = ts;
  }

  setStatusReturn(ts) {
    this.#chkCanChangeStatus(MSG_STATUS_RETURN);
    this.#msg.isReturned = true;
    this.#msg.msgReturnedTs = ts;
  }

  setStatusReceive() {
    this.#chkCanChangeStatus(MSG_STATUS_RECEIVE);
    this.#msg.isReceived = true;
    this.#msg.msgReceivedTs = Date.now();
  }

  setStatusClosed() {
    this.#chkCanChangeStatus(MSG_STATUS_CLOSED);
    this.#msg.isClosed = true;
    this.#msg.isCancel = false;
    this.#msg.msgClosedTs = Date.now();
  }

  setStatusCancel() {
    this.#msg.isClosed = false;
    this.#msg.isCancel = true;
    this.#msg.msgCancelTs = Date.now();
  }

  #chkCanChangeStatus(reqStatus) {
    if (this.status == MSG_STATUS_CLOSED && this.status == MSG_STATUS_CANCEL) {
      throw new Error("Message closed/cancelled, can't change status");
    }

    if (reqStatus == MSG_STATUS_INIT) {
      throw new Error("Can't change status to init");
    }
    else if (reqStatus == MSG_STATUS_SENT && this.status != MSG_STATUS_INIT) {
      this.ns.tprintf(this.status);
      throw new Error(this.ns.sprintf("Can only change status to sent when status is init: %s", this.stringify(this.#msg)));
    }
    else if (reqStatus == MSG_STATUS_ACCEPT && this.status != MSG_STATUS_SENT) {
      throw new Error(this.ns.sprintf("Can only change status to accept when status is sent: %s", this.stringify(this.#msg)));
    }
    else if (reqStatus == MSG_STATUS_RETURN && this.status != MSG_STATUS_ACCEPT) {
      throw new Error(this.ns.sprintf("Can only change status to return when status is accept: %s", this.stringify(this.#msg)));
    }
    else if (reqStatus == MSG_STATUS_RECEIVE && this.status != MSG_STATUS_RETURN) {
      throw new Error(this.ns.sprintf("Can only change status to receive when status is return: %s", this.stringify(this.#msg)));
    }
    else if (reqStatus == MSG_STATUS_CLOSED && this.status != MSG_STATUS_RECEIVE) {
      throw new Error(this.ns.sprintf("Can only change status to closed when status is receive: %s", this.stringify(this.#msg)));
    }
  }

  get status() {
    return ActionJobMessage.getStatus(this.#msg);
  }

  get isStatusReceived(){
    return this.status === MSG_STATUS_RECEIVE;
  }

  /**
   * Static function to get status using the status flags,
   * can parse any valid set of flags, so can be used for
   * reseived messages etc.
   */
  static getStatus(testMsgObj) {
    if (testMsgObj.isCancel) {
      return MSG_STATUS_CANCEL;
    }
    else if (testMsgObj.isClosed) {
      return MSG_STATUS_CLOSED;
    }
    else if (testMsgObj.isReceived) {
      return MSG_STATUS_RECEIVE;
    }
    else if (testMsgObj.isReturned) {
      return MSG_STATUS_RETURN;
    }
    else if (testMsgObj.isAccepted) {
      return MSG_STATUS_ACCEPT;
    }
    else if (testMsgObj.isSent) {
      return MSG_STATUS_SENT;
    }
    else if (testMsgObj.isInit) {
      return MSG_STATUS_INIT;
    }
    else {
      return MSG_STATUS_PRE_INIT;
    }
  }

  static rcvdMsgHasValidStatus(rcvdMsg) {
    return ActionJobMessage.getStatus(rcvdMsg) == MSG_STATUS_RETURN;
  }

  // ////////////////
  // utility
  // ////////////////

  get tgtSrv() {
    return this.#actionJob.tgtSrv;
  }

  // ////////////////
  // serialization
  // ////////////////

  get serialObj() {
    return {
      doneInit: this.#doneInit,
      msg: this.#msg,
    };
  }

  get serialObjBasic() {
    let sob = {
      [this.#msg.msgId]: {
        status: this.status,
        // ver: this.#msg.ver,
        target: this.#msg.target,
        actionType: this.#msg.actionType,
        // metaId: this.#msg.metaId,
        // jobId: this.#msg.jobId,
        msgId: this.#msg.msgId,
        batchNum: this.ns.sprintf("%d / %d", this.#msg.batchNum, this.#msg.totBatches),
        threads: this.#msg.threads,
        estAmt: this.ns.formatNumber(this.#msg.estAmt),
        estTime: this.#msg.estTime,
        result: this.#msg.result,
      },
    };

    return sob;
  }

  /**
   * Called automagically by F42Base
   */
  unserialize(serialObj) {
    this.#doneInit = serialObj.doneInit;
    this.#msg = serialObj.msg;
  }
}