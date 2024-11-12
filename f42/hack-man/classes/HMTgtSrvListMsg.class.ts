import MsgBase from "/f42/classes/MsgBase.class";
import MsgSocket from "/f42/classes/MsgSocket.class";
import { PORT_HM_TARGETS } from "/f42/cfg/port-defs";

/**
 * TargetServer list socket message for HackManager
 */
export class HMTgtSrvListMsg extends MsgBase {
  static portId: number = PORT_HM_TARGETS;

  #targets: string[];

  /**
   * Factory helper function for push
   * 
   * @param ns Bitburner NS
   * @param target Array of target hostnames
   * @returns Result of push
   */
  static staticPush(ns: NS, targets: string[]): boolean {
    const msg = new HMTgtSrvListMsg(ns, targets);
    return msg.push();
  }

  constructor(ns: NS, targets: string[]) {
    super(
      timestampAsBase62Str(),
      HMTgtSrvListMsg.portId,
      new MsgSocket(ns)
    );

    this.#targets = targets;
  }

  /**
   * Override MsgBase so exact type can be declared
   */
  get msgPort(): MsgSocket {
    return this.#msgPort();
  }

  get targets(): string {
    return this.#targets;
  }
}
