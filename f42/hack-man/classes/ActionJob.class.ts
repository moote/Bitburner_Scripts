import F42Base from "/f42/classes/F42Base.class";
import { timestampAsBase62Str } from "/f42/utility/utility-functions";
import JobMessageWrapper from "./JobMsgWrapper.class";
import { MsgErrorInvalidMsg, MsgErrorBadStatus, MsgErrorDuplicate } from "/f42/hack-man/classes/MsgException.class";
import ActionBase from "/f42/hack-man/classes/ActionBase.class";
import TargetServer from "/f42/hack-man/classes/TargetServer.class";
import { getEmpty_JobState_Interface } from "/f42/classes/helpers/empty-object-getters";
import { HasState_Interface, HMJobMsg_Interface, JobState_Interface } from "/f42/classes/helpers/interfaces";
import { ActionType } from "/f42/hack-man/classes/enums";

// const ActJobStatus.INIT = "init"; // job setup
// const ActJobStatus.SENDING = "send"; // all messages created and ready to send / activly sending; can also receive in this state
// const ActJobStatus.PROCESSING = "process"; // all messages sent, waiting to receive all and then process
// const ActJobStatus.COMPLETED = "done"; // all messages receive and processed
// const ActJobStatus.CANCELLED = "cancel"; // job was cancelled before completion

enum ActJobStatus {
  INIT,
  SENDING,
  PROCESSING,
  COMPLETED,
  CANCELLED,
}

export default class ActionJob extends F42Base implements HasState_Interface {
  #id: string;
  #action: ActionBase;
  #status: ActJobStatus;

  #estAmt: number;
  #estTime: number;
  #threads: number;

  #batchMessages: JobMessageWrapper[];
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
    this.#id = timestampAsBase62Str(Math.random());
    this.#action = action;
    this.#status = ActJobStatus.INIT;

    this.#estAmt = 0;
    this.#estTime = 0;
    this.#threads = 0;

    this.#batchMessages = [];
    this.#messagesSent = 0;
    this.#messagesRcvd = 0;

    this.#jobStartTs = Date.now();
    this.#jobEndTs = 0;
    this.#startAmt = this.action.currTargetAmt;
    this.#endAmt = 0;
    this.#jobAmt = 0;

    this.allowedLogFunctions = [
      "setStatusComplete",
      // "checkReceivedMsg",
      // "batchJob",
      // "sendMessages"
    ];
  }

  // \\\\\\\\\\\\\\\\
  // id
  // ////////////////

  get id(): string {
    return this.#id;
  }

  // \\\\\\\\\\\\\\\\
  // action
  // ////////////////

  get action(): ActionBase {
    return this.#action;
  }

  // \\\\\\\\\\\\\\\\
  // status
  // ////////////////

  setStatusSending(): void {
    this.#status = ActJobStatus.SENDING;
    this.sendMessages();
  }

  setStatusProcessing(): void {
    this.#status = ActJobStatus.PROCESSING;
  }

  setStatusComplete(): void {
    this.getLo("setStatusComplete");
    this.#jobEndTs = Date.now();
    this.#endAmt = this.#action.currTargetAmt;
    this.#status = ActJobStatus.COMPLETED;

    // record amt on action; needed as jobs are ephemeral
    if(this.#action.type === ActionType.GROW){
      this.#action.updateActionTotalAmt(this.#endAmt - this.#startAmt);
    }
    else{
      this.#action.updateActionTotalAmt(this.#startAmt - this.#endAmt);
    }

    // update action state
    this.action.setStatusNoJob();
  }

  setStatusCancel(): void {
    this.#jobEndTs = Date.now();
    this.#endAmt = this.#action.currTargetAmt;

    // cancel messages
    for (const msg of this.#batchMessages) {
      this.#jobAmt += msg.result.amt;
      msg.setStatusCancel();
    }

    this.#status = ActJobStatus.CANCELLED;

    // update action state
    this.action.setStatusNoJob();
  }

  get isStatusInit(): boolean {
    this.getLo("get isStatusInit", ActJobStatus[this.#status]);
    return this.#status === ActJobStatus.INIT;
  }

  get isStatusSending(): boolean {
    this.getLo("get isStatusSending", ActJobStatus[this.#status]);
    return this.#status === ActJobStatus.SENDING;
  }

  get isStatusProcessing(): boolean {
    this.getLo("get isStatusProcessing", ActJobStatus[this.#status]);
    return this.#status === ActJobStatus.PROCESSING;
  }

  get isStatusCompleted(): boolean {
    this.getLo("get isStatusCompleted", ActJobStatus[this.#status]);
    return this.#status === ActJobStatus.COMPLETED;
  }

  get isStatusCancelled(): boolean {
    this.getLo("get isStatusCancelled", ActJobStatus[this.#status]);
    return this.#status === ActJobStatus.CANCELLED;
  }

  get status(): ActJobStatus {
    return this.#status;
  }

  // \\\\\\\\\\\\\\\\
  // called from msg
  // ////////////////

  get target(): string {
    return this.#action.target;
  }

  get type(): ActionType {
    return this.#action.type;
  }

  get metaId(): string {
    return this.#action.metaId;
  }

  get tgtSrv(): TargetServer {
    return this.#action.tgtSrv;
  }

  // \\\\\\\\\\\\\\\\
  // estAmt
  // ////////////////

  set estAmt(val: number) {
    this.#estAmt = val;
  }

  get estAmt(): number {
    return this.#estAmt;
  }

  // \\\\\\\\\\\\\\\\
  // estTime
  // ////////////////

  set estTime(val: number) {
    this.#estTime = val;
  }

  get estTime(): number {
    return this.#estTime;
  }

  // \\\\\\\\\\\\\\\\
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

  // \\\\\\\\\\\\\\\\
  // messages
  // ////////////////

  get #batchCount(): number {
    return this.#batchMessages.length;
  }

  batchJob(): void {
    const lo = this.getLo("batchJob", ActionType[this.type]);

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
      const msg = new JobMessageWrapper(this);
      msg.buildMsg(threadsThisBatch, this.#threads, msgCnt, batchTotal, estBatchAmt, this.estTime)
      this.#batchMessages.push(msg);

      lo.g("New msgId: %s", msg.id);

      // decrease rem thread cnt
      remThreadCnt -= threadsThisBatch;
    }

    // change status to send messageges
    this.setStatusSending();
  }

  sendMessages(): void {
    const lo = this.getLo("sendMessages", "this.#batchCount: %s", this.#batchCount);

    if (this.#status !== ActJobStatus.SENDING) {
      throw lo.gThrowErr("!! Can't send messages if not in send state: status: %s", ActJobStatus[this.#status]);
    }

    for (const msg of this.#batchMessages) {
      if (msg.canSend) {
        if (!msg.postMsg()) {
          // can't send message, stack probably full break and try again next loop
          lo.g("can't post message, exiting loop");
          break;
        }
        else {
          this.#messagesSent++;
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
  checkReceivedMsg(rcvdMsg: HMJobMsg_Interface): boolean {
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
        if (JobMessageWrapper.rcvdMsgHasValidStatus(rcvdMsg)) {
          // message match, save to batch message for processing and return
          msg.processReceivedMessage(rcvdMsg);
          this.#incMessagesReceived(rcvdMsg);
          lo.g("MATCH_MSG");

          return true;
        }
        else {
          // bad status id throw error
          throw new MsgErrorBadStatus(
            this.ns.sprintf("Message status is invalid: %s", JSON.stringify(rcvdMsg, null, 2))
          );
        }
      }
    }

    // bad message id throw error
    throw new MsgErrorInvalidMsg(
      this.ns.sprintf("Message id is invalid: %s", JSON.stringify(rcvdMsg, null, 2))
    );
  }

  // inc received count and close job if all messages received
  #incMessagesReceived(rcvdMsg: HMJobMsg_Interface): void {
    this.#messagesRcvd++;

    // inc job total
    this.#jobAmt += rcvdMsg.result.amt;

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

  // \\\\\\\\\\\\\\\\
  // state
  // ////////////////

  get state(): JobState_Interface {
    const state = getEmpty_JobState_Interface();
    state.hydrated = true;
    state.type =  this.type;
    state.typeStr =  ActionType[this.type];
    state.estAmt = this.estAmt;
    state.estTime = this.estTime;
    state.startTime = this.#jobStartTs;
    state.msgSent = this.#messagesSent;
    state.msgRcvd = this.#messagesRcvd;
    state.amt = this.#jobAmt;
    return state;
  }
}