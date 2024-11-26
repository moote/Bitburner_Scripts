import { Server } from "@ns";
import { ActionType, CtrlMsgAct, HMOpMode, HMTradeTargetState, MsgObjType } from "/f42/hack-man/classes/enums";
import { GeneralCfgMsg_Interface, HMCtrlMsg_Interface, HMJobMsgResult_Interface, HMState_Interface, JobState_Interface, StonkTradeMsg_Interface, TSrvState_Interface } from "/f42/classes/helpers/interfaces";
import { PORT_GENERAL_CFG, PORT_HM_CTRL, PORT_STONK_TRADE } from "/f42/cfg/port-defs";
import { timestampAsBase62Str } from "/f42/utility/utility-functions";
import { TraderOpMode } from "/f42/stonks/classes/stats/interfaces";

// \\\\\\\\\\\\\\\\\
// Server
// /////////////////

export function getEmpty_Server(): Server {
  return {
    hostname: "",
    ip: "",
    sshPortOpen: false,
    ftpPortOpen: false,
    smtpPortOpen: false,
    httpPortOpen: false,
    sqlPortOpen: false,
    hasAdminRights: false,
    cpuCores: 999,
    isConnectedTo: false,
    ramUsed: 0,
    maxRam: 0,
    organizationName: "",
    purchasedByPlayer: false,
  };
}

// \\\\\\\\\\\\\\\\\
// State
// /////////////////

export function getEmpty_HMState_Interface(): HMState_Interface {
  return {
    meta: {
      ver: 0,
      sVer: 0,
      id: "",
      initTs: 0,
    },
    opMode: HMOpMode[HMOpMode.HACK],
    tradeTgtState: HMTradeTargetState[HMTradeTargetState.NO_TARGET],
    targets: {},
    gen: "",
  };
}

export function getEmpty_TSrvState_Interface(): TSrvState_Interface {
  return {
    hydrated: false,
    initTs: 0,
    opMode: "",
    status: "",
    totalHacked: "",
    totalGrown: "",
    totalWeakened: "",
    startedJobs: 0,
    compJobs: 0,
    activeJob: getEmpty_JobState_Interface(),
    jobsStoredCnt: 0,
    raw: {
      totalWeakened: 0,
      totalGrown: 0,
      totalHacked: 0,
    },
  };
}

export function getEmpty_JobState_Interface(): JobState_Interface {
  return {
    hydrated: false,
    type: ActionType.GROW,
    typeStr: ActionType[ActionType.GROW],
    estAmt: 0,
    estTime: 0,
    startTime: 0,
    msgSent: 0,
    msgRcvd: 0,
    amt: 0,
  }
}

// \\\\\\\\\\\\\\\\\
// Messages
// /////////////////

export function getEmpty_HMJobMsgResult(): HMJobMsgResult_Interface {
  return {
    pid: 0,
    actionedBy: "",
    startTs: 0,
    endTs: 0,
    startAmt: 0,
    endAmt: 0,
    amt: 0,
  };
}

export function getEmpty_HMCtrlMsg(): HMCtrlMsg_Interface {
  return {
    action: CtrlMsgAct.PAUSE,
    payload: "",
    msgId: timestampAsBase62Str(),
    portId: PORT_HM_CTRL,
    msgType: MsgObjType.CTRL,
  };
}

export function getEmpty_GeneralCfgMsg(): GeneralCfgMsg_Interface {
  return {
    msgId: timestampAsBase62Str(),
    portId: PORT_GENERAL_CFG,
    msgType: MsgObjType.GENERAL_CFG,
    purchasedServers: {
      serverLimit: 0,
      ramTargetGb: 0,
      purchaseLoopDelayMS: 2001,
      upgradeLoopDelayMS: 2001,
      debugMode: false,
    }
  };
}

export function getEmpty_StonkTradeMsg(): StonkTradeMsg_Interface {
  return {
    msgId: timestampAsBase62Str(),
    portId: PORT_STONK_TRADE,
    msgType: MsgObjType.STONK_TRADE,
    symbol: "FAB42",
    opMode: TraderOpMode[TraderOpMode.TEST],
    startBalance: 0,
    balance: 0,
    profit: 0,
    shares: 0,
    avPrice: 0,
    potProfit: 0,
    trades: 0,
  };
}