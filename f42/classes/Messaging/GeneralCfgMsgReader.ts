import { PORT_GENERAL_CFG } from "/f42/cfg/port-defs";
import GeneralCfgMsg from "/f42/classes/Messaging/GeneralCfgMsg.class";
import MsgSocketReader, { MsgScktAcceptedMsg_Type } from "/f42/classes/Messaging/MsgSocketReader.class";

export default class GeneralCfgMsgReader extends MsgSocketReader {
  constructor(ns: NS){
    super(ns, PORT_GENERAL_CFG);
  }

  #validateMsg(msg: MsgScktAcceptedMsg_Type | boolean): GeneralCfgMsg | false {
    if((typeof msg !== "boolean") && this.isGeneralCfgMsg_Interface(msg)){
      return GeneralCfgMsg.preHydrate(this.ns, msg);
    }
    else{
      return false;
    }
  }

  /**
   * Pops a message and hydrates a new GeneralCfgMsg object with the
   * serialized data.
   * 
   * @returns A hydrated GeneralCfgMsg, or false if there is an error
   */
  popMessage(): GeneralCfgMsg | false {
    return this.#validateMsg(super.popMessage());
  }

  /**
   * Peeks a message and hydrates a new GeneralCfgMsg object with the
   * serialized data.
   * 
   * @returns A hydrated GeneralCfgMsg, or false if there is an error
   */
  peekMessage(): GeneralCfgMsg | false {
    return this.#validateMsg(super.peekMessage());
  }
}