import F42Base from '/f42/classes/F42Base.class';
import ActionJob from '/f42/hack-man/classes/ActionJob.class';
import TargetServer from '/f42/hack-man/classes/TargetServer.class';
import HMJobMsg from '/f42/hack-man/classes/HMJobMsg.class';
import { HMJobMsg_Interface, HMJobMsgResult_Interface, HMJobMsgWrapper_Interface } from '/f42/classes/helpers/interfaces';
import { PORT_POSTED_JOBS } from '/f42/cfg/port-defs';
import { timestampAsBase62Str } from '/f42/utility/utility-functions';
import { ActionType, JobMsgStatus, MsgObjType } from '/f42/hack-man/classes/enums';
import { getEmpty_HMJobMsgResult } from '/f42/classes/helpers/empty-object-getters';

const DEBUG_NO_SEND = false;
const MSG_VERSION = 10;

export default class JobMessageWrapper extends F42Base implements HMJobMsgWrapper_Interface {
  #actionJob: ActionJob;
  msgId: string;
  portId: number;
  ver: number;
  status: JobMsgStatus;
  
  target: string;
  actionType: ActionType;
  metaId: string;
  jobId: string;

  batchNum: number;
  totBatches: number;
  threads: number;
  totThreads: number;
  estAmt: number;
  estTime: number;
  
  result: HMJobMsgResult_Interface;

  constructor(actionJob: ActionJob) {
    super(actionJob.logger);
    this.ver = MSG_VERSION;
    this.#actionJob = actionJob;
    this.msgId = "msgId_" + timestampAsBase62Str(Math.random());
    this.portId = PORT_POSTED_JOBS;
    this.status = JobMsgStatus.INIT;
    this.target = "";
    this.actionType = ActionType.GROW;
    this.metaId = actionJob.tgtSrv.metaId;
    this.jobId = actionJob.id;
    this.batchNum = 1;
    this.totBatches = 1;
    this.threads = 0;
    this.totThreads = 0;
    this.estAmt = 0;
    this.estTime = 0;
    this.result = getEmpty_HMJobMsgResult();
  
    this.allowedLogFunctions = [
      // "setStatusSent",
      // "setStatusSent",
      // "unsetStatusSent",
      // "postMsg",
      // "processReceivedMessage"
      // "sendResult",
    ];
  }

  // ////////////////
  // id
  // ////////////////

  get id(): string {
    return this.msgId;
  }

  // ////////////////
  // msg
  // ////////////////

  get msgType():MsgObjType {
    return MsgObjType.JOB;
  }

  buildMsg(
    threads: number,
    totThreads: number,
    batchNum: number,
    totBatches: number,
    estAmt: number,
    estTime: number): void {

    this.getLo("buildMsg");
    this.threads = threads;
    this.totThreads = totThreads;
    this.batchNum = batchNum;
    this.totBatches = totBatches;
    this.estAmt = estAmt;
    this.estTime = estTime;
  }

  get msgToSend(): HMJobMsg {
    // const lo = this.getLo("msgToSend");
    const msgToSend = new HMJobMsg(this.ns, this.id);
    msgToSend.hydrate(this);

    // lo.g("HMJobMsg >> %s", JSON.stringify(msgToSend.serialize(), null, 2));

    return msgToSend;
  }

  postMsg(): boolean {
    const lo = this.getLo("postMsg");
    this.setStatusSent();

    let sendResult;

    // try to send
    if (DEBUG_NO_SEND) {
      lo.g("DEBUG_NO_SEND");
      sendResult = false;
    }
    else {
      sendResult = this.msgToSend.push();
    }

    lo.g("sendResult: %s", sendResult);

    // change msg status if sent
    if (!sendResult) {
      // lo.g("call >> this.unsetStatusSent()");
      this.unsetStatusSent();
    }

    return sendResult;
  }

  processReceivedMessage(rcvdMessage: HMJobMsg_Interface): void {
    const lo = this.getLo("processReceivedMessage");

    this.setStatusReceive();

    // copy result fields from received message
    this.result = rcvdMessage.result;

    lo.g("result: %s", JSON.stringify(this.result, null, 2));
  }

  // ////////////////
  // status
  // ////////////////

  // no function for init as can only be set on init

  setStatusSent(): void {
    this.getLo("setStatusSent");
    this.#chkCanChangeStatus(JobMsgStatus.SENT);
    this.status = JobMsgStatus.SENT;
  }

  unsetStatusSent(): void {
    this.getLo("unsetStatusSent");

    if (this.status === JobMsgStatus.SENT) {
      this.status = JobMsgStatus.INIT;
    }
    else {
      throw new Error("ActionJob.setStatusUnSent: Can't unsend, not in sent state: " + this.status);
    }
  }

  setStatusReceive(): void {
    this.#chkCanChangeStatus(JobMsgStatus.RECEIVED);
    this.status = JobMsgStatus.RECEIVED;
  }

  setStatusClosed(): void {
    this.#chkCanChangeStatus(JobMsgStatus.CLOSED);
    this.status = JobMsgStatus.CLOSED;
  }

  setStatusCancel(): void {
    this.status = JobMsgStatus.CANCELLED;
  }

  #chkCanChangeStatus(reqStatus: JobMsgStatus): void {
    const lo = this.getLo("chkCanChangeStatus");

    if (this.status == JobMsgStatus.CLOSED || this.status == JobMsgStatus.CANCELLED) {
      throw lo.gThrowErr("Message closed/cancelled, can't change status");
    }

    const errFmt = "Can only change status to %s when status is %s: %s";

    if (reqStatus == JobMsgStatus.INIT) {
      throw lo.gThrowErr("Can't change status to init");
    }
    else if (reqStatus == JobMsgStatus.SENT && this.status != JobMsgStatus.INIT) {
      throw lo.gThrowErr(errFmt, "SENT", "INIT", JobMsgStatus[this.status]);
    }
    else if (reqStatus == JobMsgStatus.RECEIVED && this.status != JobMsgStatus.SENT) {
      throw lo.gThrowErr(errFmt, "RECEIVED", "SENT", JobMsgStatus[this.status]);
    }
    else if (reqStatus == JobMsgStatus.CLOSED && this.status != JobMsgStatus.RECEIVED) {
      throw lo.gThrowErr(errFmt, "CLOSED", "RECEIVED", JobMsgStatus[this.status]);
    }
  }

  get canSend():boolean {
    return this.status === JobMsgStatus.INIT;
  }

  get isStatusReceived(): boolean {
    return this.status === JobMsgStatus.RECEIVED;
  }

  static rcvdMsgHasValidStatus(rcvdMsg: HMJobMsg_Interface): boolean {
    return rcvdMsg.status === JobMsgStatus.SENT;
  }

  // ////////////////
  // utility
  // ////////////////

  get tgtSrv(): TargetServer {
    return this.#actionJob.tgtSrv;
  }
}