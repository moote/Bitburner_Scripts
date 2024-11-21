import { Server } from "@ns";
import { ActionType, CtrlMsgAct, MsgObjType } from "/f42/hack-man/classes/enums";
import { GeneralCfgMsg_Interface, HMCtrlMsg_Interface, HMJobMsgResult_Interface, HMState_Interface, JobState_Interface, TSrvState_Interface } from "/f42/classes/helpers/interfaces";
import { PORT_GENERAL_CFG, PORT_HM_CTRL } from "/f42/cfg/port-defs";
import { timestampAsBase62Str } from "/f42/utility/utility-functions";

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
    cpuCores: 0,
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
    msgId: timestampAsBase62Str(),
    portId: PORT_HM_CTRL,
    msgType: MsgObjType.BASE,
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