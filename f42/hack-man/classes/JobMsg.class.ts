import F42Base from '/f42/classes/F42Base.class';
import ActionJob from '/f42/hack-man/classes/ActionJob.class';
import TargetServer from '/f42/hack-man/classes/TargetServer.class';
import HMJobMsg, { HMJobMsgResult_Interface } from '/f42/hack-man/classes/HMJobMsg.class';
import { timestampAsBase62Str } from '/f42/utility/utility-functions';
import { PORT_POSTED_JOBS } from '/f42/cfg/port-defs';

export const MSG_STATUS_PRE_INIT = "pre-init";
export const MSG_STATUS_INIT = "init";
export const MSG_STATUS_SENT = "sent";
export const MSG_STATUS_ACCEPT = "accept";
export const MSG_STATUS_RETURN = "return";
export const MSG_STATUS_RECEIVE = "receive";
export const MSG_STATUS_CLOSED = "closed";
export const MSG_STATUS_CANCEL = "cancel";

const DEBUG_NO_SEND = false;

interface MsgInterface {
  ver: number;
  status: string;
  target: string;
  actionType: string;
  metaId: string;
  jobId: string;
  msgId: string;
  portId: number;

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
  result: HMJobMsgResult_Interface;
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
      // "sendResult",
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
    this.#msg.isAccepted = false;
    this.#msg.isReturned = false;
    this.#msg.msgAcceptedTs = 0;
    this.#msg.msgReturnedTs = 0;
    this.#msg.portId = PORT_POSTED_JOBS;
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
    this.#msg = {};
    this.#msg.result = {
      pid: 0,
      actionedBy: "",
      startTs: 0,
      endTs: 0,
      startAmt: 0,
      endAmt: 0,
      amt: 0,
    };
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

  get msgToSend(): HMJobMsg {
    // const lo = this.getLo("msgToSend");
    const msgToSend = new HMJobMsg(this.ns, this.id);
    msgToSend.hydrate(this.#msg);

    // lo.g("HMJobMsg >> %s", JSON.stringify(msgToSend.serialize(), null, 2));

    return msgToSend;
  }

  postMsg(): boolean {
    // const lo = this.getLo("postMsg");

    // this.ns.tprintf(this.tgtSrv.serialize(true));
    // this.log(fnN, "this.tgtSrv: %s", this.tgtSrv);
    // this.log(fnN, "this.#msg:\n%s", this.stringify(this.#msg));
    // throw new Error("CAVEMAN_DEBUG");

    this.setStatusSent();

    let sendResult;

    // try to send
    if (DEBUG_NO_SEND) {
      // lo.g("DEBUG_NO_SEND");
      sendResult = false;
    }
    else {
      // sendResult = F42MessageStack.pushMessage(
      //   super.ns,
      //   F42_MSG_STACK_POSTED_JOBS,
      //   this.msgToSend
      // );

      sendResult = this.msgToSend.push();
    }

    // lo.g("sendResult: %s", sendResult);

    // change msg status if sent
    if (!sendResult) {
      // lo.g("call >> this.unsetStatusSent()");
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