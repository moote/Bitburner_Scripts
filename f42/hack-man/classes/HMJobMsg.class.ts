import MsgBase from "/f42/classes/Messaging/MsgBase.class";
import MsgQueue from "/f42/classes/Messaging/MsgQueue.class";
import { PORT_POSTED_JOBS } from "/f42/cfg/port-defs";
import { ActionType, JobMsgStatus, MsgObjType } from "/f42/hack-man/classes/enums";
import { HMJobMsg_Interface, HMJobMsgResult_Interface } from "/f42/classes/helpers/interfaces";
import { getEmpty_HMJobMsgResult } from "/f42/classes/helpers/empty-object-getters";

/**
 * Job message for HackManager
 */
export default class HMJobMsg extends MsgBase implements HMJobMsg_Interface {
  static portId: number = PORT_POSTED_JOBS;
  status: JobMsgStatus;
  target: string;
  actionType: ActionType;
  metaId: string;
  jobId: string;
  batchNum: number;
  totBatches: number;
  threads: number;
  isAccepted: boolean;
  isReturned: boolean;
  msgAcceptedTs: number;
  msgReturnedTs: number;
  result: HMJobMsgResult_Interface;

  //   function isFoo(object: any): object is Foo {
  //   return 'fooProperty' in object;
  // }

  static preHydrate(ns: NS, rawObj: HMJobMsg_Interface): HMJobMsg | false {
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

    this.target = "";
    this.status = JobMsgStatus.INIT;
    this.actionType = ActionType.GROW;
    this.metaId = "";
    this.jobId = "";
    this.batchNum = 0;
    this.totBatches = 0;
    this.threads = 0;
    this.isAccepted = false;
    this.isReturned = false;
    this.msgAcceptedTs = 0;
    this.msgReturnedTs = 0;
    this.msgReturnedTs = 0;
    this.result = getEmpty_HMJobMsgResult();
  }

  /**
   * Override MsgBase so exact type can be declared
   */
  get msgPort(): MsgQueue {
    return <MsgQueue>super.msgPort;
  }

  get msgType(): MsgObjType {
    return MsgObjType.JOB;
  }

  serialize(): HMJobMsg_Interface {
    // return data including any inherited
    return {
      ...super.serialize(),
      msgType: this.msgType,
      target: this.target,
      status: this.status,
      actionType: this.actionType,
      metaId: this.metaId,
      jobId: this.jobId,
      batchNum: this.batchNum,
      totBatches: this.totBatches,
      threads: this.threads,
      result: this.result,
    };
  }

  hydrate(rawObj: HMJobMsg_Interface): void {
    if (
      typeof rawObj.target === "undefined"
      || typeof rawObj.status === "undefined"
      || typeof rawObj.actionType === "undefined"
      || typeof rawObj.metaId === "undefined"
      || typeof rawObj.jobId === "undefined"
      || typeof rawObj.batchNum === "undefined"
      || typeof rawObj.totBatches === "undefined"
      || typeof rawObj.threads === "undefined"
      || typeof rawObj.result === "undefined"
    ) {
      throw new Error("HMJobMsg.hydrate: Invalid data: " + JSON.stringify(rawObj, null, 2));
    }
    else {
      this.target = rawObj.target;
      this.status = rawObj.status;
      this.actionType = rawObj.actionType;
      this.metaId = rawObj.metaId;
      this.jobId = rawObj.jobId;
      this.batchNum = rawObj.batchNum;
      this.totBatches = rawObj.totBatches;
      this.threads = rawObj.threads;
      this.result = rawObj.result;
    }

    // pass down for remainder of fields processing
    super.hydrate(rawObj);
  }
}
