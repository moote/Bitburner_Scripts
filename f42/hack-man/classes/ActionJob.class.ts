import F42Base from "/f42/classes/F42Base.class";
import { timestampAsBase62Str } from "/f42/utility/utility-functions";
import JobMessage, * as jMsg from "/f42/hack-man/classes/JobMsg.class";
import { MsgErrorInvalidMsg, MsgErrorBadStatus, MsgErrorDuplicate } from "/f42/utility/utility-functions";
import ActionBase from "/f42/hack-man/classes/ActionBase.class";
import TargetServer from "/f42/hack-man/classes/TargetServer.class";

const JOB_STATUS_INIT = "init"; // job setup
const JOB_STATUS_SENDING = "send"; // all messages created and ready to send / activly sending; can also receive in this state
const JOB_STATUS_PROCESSING = "process"; // all messages sent, waiting to receive all and then process
const JOB_STATUS_COMPLETED = "done"; // all messages receive and processed
const JOB_STATUS_CANCELLED = "cancel"; // job was cancelled before completion

export default class ActionJob extends F42Base {
  #doneInit = false;
  #id: string;
  #action: ActionBase;
  #status: string;

  #estAmt: number;
  #estTime: number;
  #threads: number;

  #batchMessages: JobMessage[];
  #messagesSent: number;
  #messagesRcvd: number;

  #jobStartTs: number;
  #jobEndTs: number;
  #startAmt: number;
  #endAmt: number;
  #jobAmt: number;

  #maxThreadBatch = 100;

  constructor(action: ActionBase) {
    super(action.logger);
    this.#doInitAll(action);

    if (serialObj) {
      this.unserialize(serialObj);
    }

    this.allowedLogFunctions = [
      "setStatusComplete",
      // "checkReceivedMsg",
      // "batchJob",
      // "sendMessages"
    ];
  }

  #doInitAll(action: ActionBase): void {
    this.#initId();
    this.#initAction(action);
    this.setStatusInit();
    this.#batchMessages = [];
    this.#messagesSent = 0;
    this.#messagesRcvd = 0;
    this.#jobStartTs = Date.now();


    this.#jobStartTs = 0;
    this.#jobEndTs = 0;
    this.#startAmt = this.action.currTargetAmt;
    this.#endAmt = 0;
    this.#jobAmt = 0;

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
    this.#id = timestampAsBase62Str(Math.random());
  }

  get id(): string {
    return this.#id;
  }

  // ////////////////
  // action
  // ////////////////

  #initAction(action: ActionBase): void {
    this.#testInit();
    this.#action = action;
  }

  get action(): ActionBase {
    return this.#action;
  }

  // ////////////////
  // status
  // ////////////////

  setStatusInit(): void {
    this.#status = JOB_STATUS_INIT;
  }

  setStatusSending(): void {
    this.#status = JOB_STATUS_SENDING;
    this.sendMessages();
  }

  setStatusProcessing(): void {
    this.#status = JOB_STATUS_PROCESSING;
  }

  setStatusComplete(): void {
    this.getLo("setStatusComplete");
    this.#jobEndTs = Date.now();
    this.#endAmt = this.#action.currTargetAmt;
    this.#status = JOB_STATUS_COMPLETED;

    // update action state
    this.action.setStatusNoJob();

    // update target stats
    this.tgtSrv.statCloseJob(this.type, this.#jobAmt);
  }

  setStatusCancel(): void {
    this.#jobEndTs = Date.now();
    this.#endAmt = this.#action.currTargetAmt;

    // cancel messages
    for (const msg of this.#batchMessages) {
      this.#jobAmt += msg.result.amt;
      msg.setStatusCancel();
    }

    this.#status = JOB_STATUS_CANCELLED;

    // update action state
    this.action.setStatusNoJob();

    // update target stats
    this.tgtSrv.statCloseJob(this.type, this.#jobAmt);
  }

  get isStatusInit(): boolean {
    this.getLo("get isStatusInit", this.#status);
    return this.#status === JOB_STATUS_INIT;
  }

  get isStatusSending(): boolean {
    this.getLo("get isStatusSending", this.#status);
    return this.#status === JOB_STATUS_SENDING;
  }

  get isStatusProcessing(): boolean {
    this.getLo("get isStatusProcessing", this.#status);
    return this.#status === JOB_STATUS_PROCESSING;
  }

  get isStatusCompleted(): boolean {
    this.getLo("get isStatusCompleted", this.#status);
    return this.#status === JOB_STATUS_COMPLETED;
  }

  get isStatusCancelled(): boolean {
    this.getLo("get isStatusCancelled", this.#status);
    return this.#status === JOB_STATUS_CANCELLED;
  }

  get status(): string {
    return this.#status;
  }

  // ////////////////
  // called from msg
  // ////////////////

  get target(): string {
    return this.#action.target;
  }

  get type(): string {
    return this.#action.type;
  }

  get metaId(): string {
    return this.#action.metaId;
  }

  get tgtSrv(): TargetServer {
    return this.#action.tgtSrv;
  }

  // ////////////////
  // estAmt
  // ////////////////

  set estAmt(val: number) {
    this.#estAmt = val;
  }

  get estAmt(): number {
    return this.#estAmt;
  }

  // ////////////////
  // estTime
  // ////////////////

  set estTime(val: number) {
    this.#estTime = val;
  }

  get estTime(): number {
    return this.#estTime;
  }

  // ////////////////
  // threads
  // ////////////////

  set threads(val: number) {
    if (val <= 0) {
      val = 1;
    }

    this.#threads = val;
  }

  get threads(): number {
    return this.#threads;
  }

  // ////////////////
  // messages
  // ////////////////

  get #batchCount(): number {
    return this.#batchMessages.length;
  }

  batchJob(): void {
    const lo = this.getLo("batchJob", this.type);

    // calc batches
    const batchTotal = Math.ceil(this.#threads / this.#maxThreadBatch);
    let remThreadCnt = this.#threads + 0;
    let threadsThisBatch = 0;
    let msgCnt = 0;

    // add messages to array
    while (remThreadCnt > 0) {
      msgCnt++;

      if (remThreadCnt >= this.#maxThreadBatch) {
        threadsThisBatch = this.#maxThreadBatch
      }
      else {
        threadsThisBatch = remThreadCnt;
      }

      const estBatchAmt = ((this.estAmt / this.#threads) * threadsThisBatch);

      // make msg
      const msg = new JobMessage(this);
      msg.buildMsg(threadsThisBatch, this.#threads, msgCnt, batchTotal, estBatchAmt, this.estTime)
      this.#batchMessages.push(msg);

      lo.g("New msgId: %s", msg.id);

      // decrease rem thread cnt
      remThreadCnt -= threadsThisBatch;
    }

    // update target stats
    this.tgtSrv.statStartJob(this.type, this.#estAmt, this.#estTime);

    // change status to send messageges
    this.setStatusSending();
  }

  sendMessages(): void {
    const lo = this.getLo("sendMessages", "this.#batchCount: %s", this.#batchCount);

    if (!this.#status === JOB_STATUS_SENDING) {
      lo.g("!! Can't send messages if not in send state: status: %s", this.#status)
    }

    for (const msg of this.#batchMessages) {
      if (msg.status === jMsg.MSG_STATUS_INIT) {
        if (!msg.postMsg()) {
          // can't send message, stack probably full break and try again next loop
          lo.g("can't post message, exiting loop");
          break;
        }
        else {
          this.#messagesSent++;

          // update target stats
          this.tgtSrv.statMsgSent();
        }
      }
    }

    lo.g("this.#messagesSent: %d", this.#messagesSent);

    // check to see if all messages sent
    if (this.#messagesSent == this.#batchCount) {
      // change status
      this.setStatusProcessing();
    }
    else if (this.#messagesSent > this.#batchCount) {
      throw new Error(this.ns.sprintf(
        "Message sent count greater than batch count: messagesSent: %s | batchCount: %s",
        this.#messagesSent,
        this.#batchCount
      ));
    }
  }

  /**
   * Checks message received by HackManager and passed down:
   * 
   * HackManager >> TargetServer >> BaseAction >> ActionJob
   * 
   * @returns {boolean} True if message belongs to this job
   * @throws {Error} Throws error if m
   */
  checkReceivedMsg(rcvdMsg: MsgSendInterface): boolean {
    const lo = this.getLo("checkReceivedMsg", "CHK_MSG: %s", rcvdMsg.msgId);

    for (const msg of this.#batchMessages) {
      lo.g("rcvdMsg.msgId == msg.id: %s == %s", rcvdMsg.msgId, msg.id);
      if (rcvdMsg.msgId == msg.id) {
        if (msg.isStatusReceived) {
          // rcvd message is a duplicate, drop
          throw new MsgErrorDuplicate(
            this.ns.sprintf("Message is a duplicate: %s", rcvdMsg.msgId)
          );
        }

        // make sure state of received message is ahead of batch message
        if (JobMessage.rcvdMsgHasValidStatus(rcvdMsg)) {
          // message match, save to batch message for processing and return
          msg.processReceivedMessage(rcvdMsg);
          this.#incMessagesReceived(rcvdMsg);
          lo.g("MATCH_MSG");

          return true;
        }
        else {
          // bad status id throw error
          throw new MsgErrorBadStatus(
            this.ns.sprintf("Message status is invalid: %s", this.stringify(rcvdMsg))
          );
        }
      }
    }

    // bad message id throw error
    throw new MsgErrorInvalidMsg(
      this.ns.sprintf("Message id is invalid: %s", this.stringify(rcvdMsg))
    );
  }

  // inc received count and close job if all messages received
  #incMessagesReceived(rcvdMsg: MsgSendInterface): void {
    this.#messagesRcvd++;

    // inc job total
    this.#jobAmt += rcvdMsg.result.amt;

    // update target stats
    this.tgtSrv.statMsgRcvd(this.#jobAmt);

    // check if need to close
    if (this.#messagesRcvd == this.#batchCount) {
      // close messages
      for (const msg of this.#batchMessages) {
        msg.setStatusClosed();
      }

      // close job
      this.setStatusComplete();
    }
  }
}