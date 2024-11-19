import { PORT_HM_CTRL } from "/f42/cfg/port-defs";
import { HMCtrlMsg_Interface } from "/f42/classes/helpers/interfaces";
import { MsgQAcceptedMsg_Type, MsgQueueReader } from "/f42/classes/MsgQueueReader.class";
import { MsgObjType } from "/f42/hack-man/classes/enums";
import { HMCtrlMsg } from "/f42/hack-man/classes/HMCtrlMsg.class";

export class HMCtrlMsgQReader extends MsgQueueReader {
  constructor(ns: NS){
    super(ns, PORT_HM_CTRL);
  }

  #isHMCtrlMsg_Interface(msg: MsgQAcceptedMsg_Type): msg is HMCtrlMsg_Interface {
    return msg.msgType === MsgObjType.CTRL;
  }

  #validateMsg(msg: MsgQAcceptedMsg_Type | boolean): HMCtrlMsg | false {
    if((typeof msg !== "boolean") && this.#isHMCtrlMsg_Interface(msg)){
      return HMCtrlMsg.preHydrate(this.ns, msg);
    }
    else{
      return false;
    }
  }

  /**
   * Pops a message and hydrates a new HMCtrlMsg object with the
   * serialized data.
   * 
   * @returns A hydrated HMCtrlMsg, or false if there is an error
   */
  popMessage(): HMCtrlMsg | boolean {
    return this.#validateMsg(super.popMessage());
  }

  /**
   * Peeks a message and hydrates a new HMCtrlMsg object with the
   * serialized data.
   * 
   * @returns A hydrated HMCtrlMsg, or false if there is an error
   */
  peekMessage(): HMCtrlMsg | boolean {
    return this.#validateMsg(super.peekMessage());
  }
}