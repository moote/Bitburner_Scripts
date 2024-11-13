import MsgQueue from '/f42/classes/MsgQueue.class';
import MsgSocket from '/f42/classes/MsgSocket.class';
import { MsgObjInterface } from '/f42/cfg/port-defs';

export default class MsgBase implements MsgObjInterface {
  #msgId: "base";
  #portId: 0;
  #msgPort: MsgQueue | MsgSocket = undefined;

  constructor(msgId: string, portId: number, msgPort: MsgPort) {
    this.#msgId = msgId;
    this.#portId = portId;
    this.#msgPort = msgPort;
  }

  get msgId(): string { // req for MsgObjInterface
    return this.#msgId;
  }

  get portId(): number { // req for MsgObjInterface
    return this.#portId;
  }

  get msgPort(): MsgPort { // req for MsgObjInterface
    return this.#msgPort;
  }

  /**
   * Req for MsgObjInterface; push to relevant queue/socket
   * 
   * @returns Result of push
   */
  push(): boolean {
    return this.#msgPort.pushMessage(this.serialize());
  }

  serialize(): MsgObjInterface{
    return {
      msgId: this.#msgId,
      portId: this.#portId,
    };
  }

  hydrate(rawObj: MsgObjInterface): void{
    if(
      typeof rawObj.msgId === "undefined"
      || typeof rawObj.portId === "undefined"
    ){
      throw new Error("MsgBase.unserialize: Invalid data: " + JSON.stringify(rawObj, null, 2));
    }
    else{
      this.#msgId = rawObj.msgId;
      this.#portId = rawObj.portId;
    }
  }
}