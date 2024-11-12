import F42Base from '/f42/classes/F42Base.class';
import ActionJob from '/f42/hack-man/classes/ActionJob.class';
import TargetServer from '/f42/hack-man/classes/TargetServer.class';

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

class MsgSendObj implements MsgSendInterface {
  target: string;
  actionType: string;
  metaId: string;
  jobId: string;
  msgId: string;
  batchNum: number;
  threads: number;
  isAccepted: boolean;
  isReturned: boolean;
  msgAcceptedTs: number;
  msgReturnedTs: number;
  result: MsgResultInterface;
}

interface MsgSendInterface {
  target: string;
  actionType: string;
  metaId: string;
  jobId: string;
  msgId: string;
  batchNum: number;
  threads: number;
  isAccepted: boolean;
  isReturned: boolean;
  msgAcceptedTs: number;
  msgReturnedTs: number;
  result: MsgResultInterface;
}

interface MsgInterface {
  ver: number;
  status: string;
  target: string;
  actionType: string;
  metaId: string;
  jobId: string;
  msgId: string;

  isInit: boolean;
  isSent: boolean;
  isAccepted: boolean;
  isReturned: boolean;
  isReceived: boolean;
  isClosed: boolean;
  isCancel: boolean;

  msgSentTs: number;
  msgAcceptedTs: number;
  msgReturnedTs: number;
  msgReceivedTs: number;
  msgClosedTs: number;
  msgCancelTs: number;

  batchNum: number;
  totBatches: number;
  threads: number;
  totThreads: number;
  estAmt: number;
  estTime: number;
  result: MsgResultInterface;
}

interface MsgResultInterface {
  pid: number;
  actionedBy: string;
  startTs: number;
  endTs: number;
  startAmt: number;
  endAmt: number;
  amt: number;
}

export default class JobMessage extends F42Base {
  #doneInit = false;
  #actionJob: ActionJob;
  #msg: MsgInterface;

  constructor(actionJob: ActionJob) {
    super(actionJob.logger);
    this.#doInitAll(actionJob);

    this.allowedLogFunctions = [
      // "setStatusSent",
      // "setStatusSent",
      // "unsetStatusSent",
      // "postMsg",
      // "processReceivedMessage"
    ];
  }

  #doInitAll(actionJob: ActionJob): void {
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
  #testInit(): void {
    if (this.#doneInit) {
      throw new Error("Init Error: can't run init functions, already initialised");
    }
  }

  // ////////////////
  // id
  // ////////////////

  #initId(): void {
    this.#testInit();
    this.#msg.msgId = "msgId_" + timestampAsBase62Str(Math.random());
  }

  get id(): string {
    return this.#msg.msgId;
  }

  // ////////////////
  // msg
  // ////////////////

  buildMsg(
    threads: number,
    totThreads: number,
    batchNum: number,
    totBatches: number,
    estAmt: number,
    estTime: number): void {

    this.getLo("buildMsg");
    this.#msg.threads = threads;
    this.#msg.totThreads = totThreads;
    this.#msg.batchNum = batchNum;
    this.#msg.totBatches = totBatches;
    this.#msg.estAmt = estAmt;
    this.#msg.estTime = estTime;
    return this.#msg;
  }

  get msg(): MsgInterface {
    return this.#msg;
  }

  get msgToSend(): MsgSendObj {
    const msgToSend = new MsgSendObj();
    for (const key of this.msg) {
      msgToSend[key] = this.msg[key];
    }
    return msgToSend;
  }

  postMsg(): boolean {
    const lo = this.getLo("postMsg");

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
        this.msgToSend
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

  processReceivedMessage(rcvdMessage: MsgSendInterface): void {
    const lo = this.getLo("processReceivedMessage");

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

  setStatusSent(): void {
    const lo = this.getLo("setStatusSent");

    this.#chkCanChangeStatus(MSG_STATUS_SENT);
    this.#msg.isSent = true;
    this.#msg.msgSentTs = Date.now();

    lo.g("\n - this.#msg.isSent: %s\n - this.#msg.msgSentTs: %d", this.#msg.isSent, this.#msg.msgSentTs);
  }

  unsetStatusSent(): void {
    const lo = this.getLo("unsetStatusSent");

    if (this.status == MSG_STATUS_SENT) {
      this.#msg.isSent = false;
      this.#msg.msgSentTs = 0;
    }
    else {
      throw new Error("ActionJob.setStatusUnSent: Can't unsend, not in sent state: %s", this.status);
    }

    lo.g("\n - this.#msg.isSent: %s\n - this.#msg.msgSentTs: %d", this.#msg.isSent, this.#msg.msgSentTs);
  }

  setStatusAccept(ts: number): void {
    this.#chkCanChangeStatus(MSG_STATUS_ACCEPT);
    this.#msg.isAccepted = true;
    this.#msg.msgAcceptedTs = ts;
  }

  setStatusReturn(ts: number): void {
    this.#chkCanChangeStatus(MSG_STATUS_RETURN);
    this.#msg.isReturned = true;
    this.#msg.msgReturnedTs = ts;
  }

  setStatusReceive(): void {
    this.#chkCanChangeStatus(MSG_STATUS_RECEIVE);
    this.#msg.isReceived = true;
    this.#msg.msgReceivedTs = Date.now();
  }

  setStatusClosed(): void {
    this.#chkCanChangeStatus(MSG_STATUS_CLOSED);
    this.#msg.isClosed = true;
    this.#msg.isCancel = false;
    this.#msg.msgClosedTs = Date.now();
  }

  setStatusCancel(): void {
    this.#msg.isClosed = false;
    this.#msg.isCancel = true;
    this.#msg.msgCancelTs = Date.now();
  }

  #chkCanChangeStatus(reqStatus: string): void {
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

  get status(): string {
    return JobMessage.getStatus(this.#msg);
  }

  get isStatusReceived(): boolean {
    return this.status === MSG_STATUS_RECEIVE;
  }

  /**
   * Static function to get status using the status flags,
   * can parse any valid set of flags, so can be used for
   * reseived messages etc.
   */
  static getStatus(testMsgObj: MsgInterface|MsgSendInterface): string {
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

  static rcvdMsgHasValidStatus(rcvdMsg: MsgSendInterface): boolean {
    return rcvdMsg.isReturned;
  }

  // ////////////////
  // utility
  // ////////////////

  get tgtSrv(): TargetServer {
    return this.#actionJob.tgtSrv;
  }
}