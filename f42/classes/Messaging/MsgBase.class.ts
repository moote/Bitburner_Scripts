import MsgQueue from '/f42/classes/Messaging/MsgQueue.class';
import MsgSocket from '/f42/classes/Messaging/MsgSocket.class';
import { MsgObj_Interface, MsgObjData_Interface } from '/f42/classes/helpers/interfaces';
import { MsgObjType } from '/f42/hack-man/classes/enums';

export default class MsgBase implements MsgObj_Interface {
  #msgId: string;
  #portId: number;
  #msgPort: MsgQueue | MsgSocket;

  constructor(msgId: string, portId: number, msgPort: MsgQueue | MsgSocket) {
    this.#msgId = msgId;
    this.#portId = portId;
    this.#msgPort = msgPort;
  }

  get msgId(): string { // req for MsgObjData_Interface
    return this.#msgId;
  }

  get portId(): number { // req for MsgObjData_Interface
    return this.#portId;
  }

  get msgPort(): MsgQueue | MsgSocket { // req for MsgObjData_Interface
    return this.#msgPort;
  }

  get msgType() : MsgObjType {
    return MsgObjType.BASE;
  }

  /**
   * Req for MsgObjData_Interface; push to relevant queue/socket
   * 
   * @returns Result of push
   */
  push(): boolean {
    return this.#msgPort.pushMessage(this.serialize());
  }

  serialize(): MsgObjData_Interface{
    return {
      msgId: this.#msgId,
      portId: this.#portId,
      msgType: this.msgType,
    };
  }

  hydrate(rawObj: MsgObjData_Interface): void{
    if(
      typeof rawObj.msgId === "undefined"
      || typeof rawObj.portId === "undefined"
      || typeof rawObj.msgType === "undefined"
    ){
      throw new Error("MsgBase.hydrate: Invalid data: " + JSON.stringify(rawObj, null, 2));
    }
    else{
      this.#msgId = rawObj.msgId;
      this.#portId = rawObj.portId;
    }
  }
}