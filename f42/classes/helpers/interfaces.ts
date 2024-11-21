import { Server } from "@ns";
import MsgQueue from "/f42/classes/Messaging/MsgQueue.class";
import MsgSocket from "/f42/classes/Messaging/MsgSocket.class";
import { ActionType, CtrlMsgAct, HMOpMode, JobMsgStatus, MsgObjType, TgtSrvOpMode } from "/f42/hack-man/classes/enums";
import ActionJob from "/f42/hack-man/classes/ActionJob.class";

// \\\\\\\\\\\\\\\\\
// Hydratable
// /////////////////

export interface Hydratable_Interface {
  hydrated: boolean,
}

// \\\\\\\\\\\\\\\\\
// Misc
// /////////////////

export interface ActionJobList {
  [key: string]: ActionJob
}

// \\\\\\\\\\\\\\\\\
// Messages
// /////////////////

/**
 * Should be implemented for any data sent to port/stack
 */
export interface MsgObjData_Interface {
  msgId: string;
  portId: number;
  msgType: MsgObjType;
}

export interface MsgObj_Interface extends MsgObjData_Interface {
  msgPort: MsgQueue | MsgSocket;
  push: () => boolean;
  serialize: () => MsgObjData_Interface;
  hydrate: (dataObj: MsgObjData_Interface) => void;
}

// GENERAL CFG SOCKET

export interface GeneralCfgMsg_Interface extends MsgObjData_Interface {
  purchasedServers: GeneralCfgMsgPSrv_Interface;
}

export interface GeneralCfgMsgPSrv_Interface {
  serverLimit: number;
  ramTargetGb: number;
  purchaseLoopDelayMS: number;
  upgradeLoopDelayMS: number;
  debugMode: boolean;
}

// HACK MANAGER CTRL

export type CtrlMsgAllowed_Type = (
  Server |
  string |
  boolean |
  HMOpMode |
  TgtSrvOpMode.MONEY_MAX |
  TgtSrvOpMode.MONEY_MIN
);

export interface HMCtrlMsg_Interface extends MsgObjData_Interface {
  action: CtrlMsgAct,
}

export interface HMCtrlMsgPayload_Interface extends HMCtrlMsg_Interface {
  payload: CtrlMsgAllowed_Type,
}

// JOB

export interface HMJobMsgWrapper_Interface extends HMJobMsg_Interface {
  ver: number;

  // target: string;
  // actionType: ActionType;
  // metaId: string;
  // jobId: string;

  // batchNum: number;
  totBatches: number;
  // threads: number;
  totThreads: number;
  estAmt: number;
  estTime: number;

  // result: HMJobMsgResult_Interface;
}

export interface HMJobMsg_Interface extends MsgObjData_Interface {
  status: JobMsgStatus;
  target: string;
  actionType: ActionType;
  metaId: string;
  jobId: string;

  batchNum: number;
  threads: number;

  result: HMJobMsgResult_Interface;
}

export interface HMJobMsgResult_Interface {
  pid: number;
  actionedBy: string;
  startTs: number;
  endTs: number;
  startAmt: number;
  endAmt: number;
  amt: number;
}

// TARGET SERVER LIST

export interface HMTgtSrvListMsg_Interface extends MsgObjData_Interface {
  targets: string[],
}

// STATE

export interface HMStateMsg_Interface extends MsgObjData_Interface {
  state: HMState_Interface;
}

// \\\\\\\\\\\\\\\\\
// State
// /////////////////

export interface HasState_Interface {
  state: Hydratable_Interface;
}

export interface HMState_Interface {
  meta: {
    ver: number;
    sVer: number;
    id: string;
    initTs: number;
  },
  targets: { [key: string]: TSrvState_Interface },
  gen: string;
}

export interface TSrvState_Interface extends Hydratable_Interface {
  initTs: number,
  opMode: string,
  status: string,
  totalHacked: string,
  totalGrown: string,
  totalWeakened: string,
  startedJobs: number,
  compJobs: number,
  activeJob: JobState_Interface,
  jobsStoredCnt: number,
  raw: {
    totalWeakened: number,
    totalGrown: number,
    totalHacked: number,
  }
}

export interface JobState_Interface extends Hydratable_Interface {
  type: ActionType,
  estAmt: number,
  estTime: number,
  startTime: number,
  msgSent: number,
  msgRcvd: number,
  amt: number
}

// HAckManager

export interface HMMeta_Interface {
  ver: number,
  sVer: number,
  id: string,
  initTs: number,
}