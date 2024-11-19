import { HMCtrlMsg_Interface, HMJobMsg_Interface, MsgObjData_Interface } from "/f42/classes/helpers/interfaces";
import MsgQueue from "/f42/classes/MsgQueue.class";

export type MsgQAcceptedMsg_Type = HMCtrlMsg_Interface | HMJobMsg_Interface;

/**
 * A message queue that is fixed to one port,
 * used for reaing incoming messages
 */
export class MsgQueueReader extends MsgQueue {
  #portId: number;

  constructor(ns: NS, portId:number){
    super(ns);
    this.#portId = portId;
  }

  /**
   * @deprecated This is a read only queue; do not use
   */
  pushMessage(msgObj: MsgQAcceptedMsg_Type): boolean {
    throw new Error("This queue is for reading only! " + msgObj.msgId);
  }

  popMessage(): MsgQAcceptedMsg_Type | boolean {
    return super.popMessage(this.#portId);
  }

  peekMessage(): MsgQAcceptedMsg_Type | boolean {
    return super.peekMessage(this.#portId);
  }
}