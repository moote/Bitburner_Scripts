import MsgSocket from "/f42/classes/MsgSocket.class";

/**
 * A message queue that is fixed to one port,
 * used for reaing incoming messages
 */
export class MsgSocketReader extends MsgSocket {
  #portId: number;

  constructor(ns: NS, portId:number){
    super(ns);
    this.#portId = portId;
  }

  /**
   * @deprecated This is a read only queue; do not use
   */
  pushMessage(msgObj: MsgObjInterface): boolean {
    throw new Error("This queue is for reading only! " + msgObj.msgId);
  }

  popMessage(): MsgObjInterface | boolean {
    return super.popMessage(this.#portId);
  }

  peekMessage(): MsgObjInterface | boolean {
    return super.peekMessage(this.#portId);
  }
}