import { PORT_HM_STATE } from "/f42/cfg/port-defs";
import { HMStateMsg_Interface } from "/f42/classes/helpers/interfaces";
import MsgSocketReader, { MsgScktAcceptedMsg_Type } from "/f42/classes/Messaging/MsgSocketReader.class";
import { MsgObjType } from "/f42/hack-man/classes/enums";
import HMStateMsg from "/f42/hack-man/classes/HMStateMsg.class";

export class HMStateMsgReader extends MsgSocketReader {
  constructor(ns: NS){
    super(ns, PORT_HM_STATE);
  }

  #validateMsg(msg: MsgScktAcceptedMsg_Type | boolean): HMStateMsg | false {
    if((typeof msg !== "boolean") && this.isHMStateMsg_Interface(msg)){
      return HMStateMsg.preHydrate(this.ns, msg);
    }
    else{
      return false;
    }
  }

  /**
   * Pops a message and hydrates a new HMStateMsg object with the
   * serialized data.
   * 
   * @returns A hydrated HMStateMsg, or false if there is an error
   */
  popMessage(): HMStateMsg | false {
    return this.#validateMsg(super.popMessage());
  }

  /**
   * Peeks a message and hydrates a new HMStateMsg object with the
   * serialized data.
   * 
   * @returns A hydrated HMStateMsg, or false if there is an error
   */
  peekMessage(): HMStateMsg | false {
    return this.#validateMsg(super.peekMessage());
  }
}