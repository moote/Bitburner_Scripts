import MsgBase from "/f42/classes/MsgBase.class";
import MsgQueue from "/f42/classes/MsgQueue.class";
import { PORT_POSTED_JOBS } from "/f42/cfg/port-defs";

export interface HMJobMsg_Interface {
  target: string;
  actionType: string;
  metaId: string;
  jobId: string;
  msgId: string;
  portId: number;
  batchNum: number;
  threads: number;
  isAccepted: boolean;
  isReturned: boolean;
  msgAcceptedTs: number;
  msgReturnedTs: number;
  result: HMJobMsgResult_Interface;
}

export interface HMJobMsgResult_Interface {
  pid: number;
  actionedBy: string;
  startTs: number;
  endTs: number;
  startAmt: number;
  endAmt: number;
  amt: number;
}

/**
 * Job message for HackManager
 */
export default class HMJobMsg extends MsgBase implements HMJobMsg_Interface {
  static portId: number = PORT_POSTED_JOBS;
  target: string;
  actionType: string;
  metaId: string;
  jobId: string;
  batchNum: number;
  threads: number;
  isAccepted: boolean;
  isReturned: boolean;
  msgAcceptedTs: number;
  msgReturnedTs: number;
  result: JobMsgResult_Interface;

  static preHydrate(ns: NS, rawObj: HMJobMsg_Interface): HMJobMsg | boolean {
    if (!rawObj) {
      return false;
    }

    // ns.tprintf("HMJobMsg:preHydrate: msg: %s", JSON.stringify(rawObj, null, 2));

    // do hydration & return
    const newMsg = new HMJobMsg(ns, "hydrating");
    newMsg.hydrate(rawObj);
    return newMsg;
  }

  constructor(ns: NS, msgId: string) {
    super(
      msgId,
      HMJobMsg.portId,
      new MsgQueue(ns)
    );
  }

  /**
   * Override MsgBase so exact type can be declared
   */
  get msgPort(): MsgQueue {
    return super.msgPort;
  }

  serialize(): HMJobMsg_Interface {
    // return data including any inherited
    return {
      ...super.serialize(),
      target: this.target,
      actionType: this.actionType,
      metaId: this.metaId,
      jobId: this.jobId,
      batchNum: this.batchNum,
      threads: this.threads,
      isAccepted: this.isAccepted,
      isReturned: this.isReturned,
      msgAcceptedTs: this.msgAcceptedTs,
      msgReturnedTs: this.msgReturnedTs,
      result: this.result,
    };
  }

  hydrate(rawObj: HMJobMsg_Interface): HMJobMsg {
    if (
      typeof rawObj.target === "undefined"
      || typeof rawObj.actionType === "undefined"
      || typeof rawObj.metaId === "undefined"
      || typeof rawObj.jobId === "undefined"
      || typeof rawObj.batchNum === "undefined"
      || typeof rawObj.threads === "undefined"
      || typeof rawObj.isAccepted === "undefined"
      || typeof rawObj.isReturned === "undefined"
      || typeof rawObj.msgAcceptedTs === "undefined"
      || typeof rawObj.msgReturnedTs === "undefined"
      || typeof rawObj.result === "undefined"
    ) {
      throw new Error("HMJobMsg.hydrate: Invalid data: " + JSON.stringify(rawObj, null, 2));
    }
    else {
      this.target = rawObj.target;
      this.actionType = rawObj.actionType;
      this.metaId = rawObj.metaId;
      this.jobId = rawObj.jobId;
      this.batchNum = rawObj.batchNum;
      this.threads = rawObj.threads;
      this.isAccepted = rawObj.isAccepted;
      this.isReturned = rawObj.isReturned;
      this.msgAcceptedTs = rawObj.msgAcceptedTs;
      this.msgReturnedTs = rawObj.msgReturnedTs;
      this.result = rawObj.result;
    }

    // pass down for remainder of fields processing
    super.hydrate(rawObj);
  }
}
