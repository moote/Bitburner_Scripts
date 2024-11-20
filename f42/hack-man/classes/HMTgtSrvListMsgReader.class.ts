import { PORT_HM_TARGETS } from "/f42/cfg/port-defs";
import { HMTgtSrvListMsg_Interface } from "/f42/classes/helpers/interfaces";
import MsgSocketReader, { MsgScktAcceptedMsg_Type } from "/f42/classes/Messaging/MsgSocketReader.class";
import { MsgObjType } from "/f42/hack-man/classes/enums";
import HMTgtSrvListMsg from "/f42/hack-man/classes/HMTgtSrvListMsg.class";

export default class HMTgtSrvListMsgReader extends MsgSocketReader {
  constructor(ns: NS){
    super(ns, PORT_HM_TARGETS);
  }

  #validateMsg(msg: MsgScktAcceptedMsg_Type | boolean): HMTgtSrvListMsg | false {
    if((typeof msg !== "boolean") && this.isHMTgtSrvListMsg_Interface(msg)){
      return HMTgtSrvListMsg.preHydrate(this.ns, msg);
    }
    else{
      return false;
    }
  }

  /**
   * Pops a message and hydrates a new HMTgtSrvListMsg object with the
   * serialized data.
   * 
   * @returns A hydrated HMTgtSrvListMsg, or false if there is an error
   */
  popMessage(): HMTgtSrvListMsg | false {
    return this.#validateMsg(super.popMessage());
  }

  /**
   * Peeks a message and hydrates a new HMTgtSrvListMsg object with the
   * serialized data.
   * 
   * @returns A hydrated HMTgtSrvListMsg, or false if there is an error
   */
  peekMessage(): HMTgtSrvListMsg | false {
    return this.#validateMsg(super.peekMessage());
  }
}