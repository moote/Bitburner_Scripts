import { PORT_HM_CTRL } from "/f42/cfg/port-defs";
import { MsgQueueReader } from "/f42/classes/MsgQueueReader.class";
import { HMCtrlMsg } from "/f42/hack-man/classes/HMCtrlMsg.class";

export class HMCtrlMsgQReader extends MsgQueueReader {
  constructor(ns: NS){
    super(ns, PORT_HM_CTRL);
  }

  /**
   * Pops a message and hydrates a new HMCtrlMsg object with the
   * serialized data.
   * 
   * @returns A hydrated HMCtrlMsg, or false if there is an error
   */
  popMessage(): HMCtrlMsg | boolean {
    return HMCtrlMsg.preHydrate(this.ns, super.popMessage());
  }

  /**
   * Peeks a message and hydrates a new HMCtrlMsg object with the
   * serialized data.
   * 
   * @returns A hydrated HMCtrlMsg, or false if there is an error
   */
  peekMessage(): HMCtrlMsg | boolean {
    return HMCtrlMsg.preHydrate(super.peekMessage());
  }
}