import MsgBase from "/f42/classes/MsgBase.class";
import MsgSocket from "/f42/classes/MsgSocket.class";
import { PORT_HM_STATE } from "/f42/cfg/port-defs";
import { timestampAsBase62Str } from "/f42/utility/utility-functions";

export interface HMStateInterface {
  meta: {
    ver: number;
    sVer: number;
    id: string;
    initTs: number;
  },
  targets: {[key: string]: TSrvStateInterface},
  gen: number;
}

export interface TSrvStateInterface {
  initTs: number,
  totalHacked: number,
  totalGrown: number,
  totalWeakened: number,
  completedJobs: number,
  activeJob: JobStateInterface,
  raw: {
    totalHacked: number,
    totalGrown: number,
    totalWeakened: number,
  }
}

export interface JobStateInterface {
  type: string,
  estAmt: number,
  estTime: number,
  startTime: number,
  msgSent: number,
  msgRcvd: number,
  amt: number
}

interface HMStateMsg_Interface {
  state: HMStateInterface;
}

/**
 * TargetServer list socket message for HackManager
 */
export class HMStateMsg extends MsgBase implements HMStateMsg_Interface {
  static portId: number = PORT_HM_STATE;

  #state: HMStateInterface;

  static preHydrate(ns: NS, rawObj: HMStateMsg_Interface): HMStateMsg{
    if(!rawObj){
      return false;
    }
    
    // do hydration & return
    const newMsg = new HMStateMsg(ns, {});
    newMsg.hydrate(rawObj);
    return newMsg;
  }

  /**
   * Factory helper function for push
   * 
   * @param ns Bitburner NS
   * @param target Array of target hostnames
   * @returns Result of push
   */
  static staticPush(ns: NS, state: HMStateInterface): boolean {
    const msg = new HMStateMsg(ns, state);
    return msg.push();
  }

  constructor(ns: NS, state: HMStateInterface) {
    super(
      timestampAsBase62Str(),
      HMStateMsg.portId,
      new MsgSocket(ns)
    );

    this.#state = state;
  }

  /**
   * Override MsgBase so exact type can be declared
   */
  get msgPort(): MsgSocket {
    return super.msgPort;
  }

  get state(): HMStateInterface {
    return this.#state;
  }

  serialize(): HMTgtSrvListMsg_Interface {
    // return data including any inherited
    return {
      ...super.serialize(),
      state: this.#state,
    };
  }

  hydrate(rawObj: HMTgtSrvListMsg_Interface): HMTgtSrvListMsg {
    if(
      typeof rawObj.state === "undefined"
    ){
      throw new Error("HMTgtSrvListMsg.hydrate: Invalid data: " + JSON.stringify(rawObj, null, 2));
    }
    else{
      this.#state = rawObj.state;
    }

    // pass down for remainder of fields processing
    super.hydrate(rawObj);
  }
}
