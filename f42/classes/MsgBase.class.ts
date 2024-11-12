import MsgQueue from '/f42/classes/MsgQueue.class';
import MsgSocket from '/f42/classes/MsgSocket.class';
import { MsgObjInterface } from '/f42/cfg/port-defs';

export default class MsgBase implements MsgObjInterface {
  #msgId: "base";
  #msgPortId: 0;
  #msgPort: MsgQueue | MsgSocket = undefined;

  constructor(msgId: string, msgPortId: number, msgPort: MsgPort){
    this.#msgId = msgId;
    this.#msgPortId = msgPortId;
    this.#msgPort = msgPort;
  }

  get msgId(): string { // req for MsgObjInterface
    return this.#msgId;
  }

  get portId(): number { // req for MsgObjInterface
    return this.#msgPortId;
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
    return this.#msgPort.pushMessage(this);
  }
}