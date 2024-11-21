// messages

export enum MsgObjType {
  BASE,
  CTRL,
  JOB,
  TS_LIST,
  HM_STATE,
  GENERAL_CFG,
}


// HackManager

export enum HMOpMode {
  HACK,
  TRADE_TGT,
}

export enum HMTradeTargetState {
  NO_TARGET,
  TARGET_AWAITING_ORDER,
  TARGET_GROW_TO_MAX,
  TARGET_AT_MAX,
  TARGET_HACK_TO_MIN,
  TARGET_AT_MIN
}

// TargetServer

/**
 * The status defies if the set op mode is running
 */
export enum TgtSrvStatus {
  NEW,
  ACTIVE,
  PAUSED,
}

export enum TgtSrvOpMode {
  FREE,       // free to run any action
  MONEY_MAX,  // limit to weaken / grow
  MONEY_MIN   // limit to hack
}

export enum TgtSrvOpModeStatus {
  PAUSED,
  FREE,
  IN_PROGRESS,
  DONE,
}

// ActionBase
export enum ActionType {
  WEAK,
  GROW,
  HACK,
}

export enum ActionStatus {
  NO_JOB,
  ACTIVE_JOB,
}

// HMCtrlMsg

export enum CtrlMsgAct {
  ADD_TS,
  RM_TS,
  CLEAR_ACTIONS,
  PAUSE,
  ORDER_66,
  CHANGE_OP_MODE,
  CHANGE_TT_MODE,
}

// JobMsgWrapper

export enum JobMsgStatus {
  INIT,
  SENT,
  RECEIVED,
  CLOSED,
  CANCELLED,
}