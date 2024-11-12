export const F42_PORT_MAX_PORT_LENGTH_TEST = 1;
export const F42_PORT_HMO_COPY = { id: 2, key: "c839hf" };
export const F42_MSG_STACK_HM_CTRL = 3;
export const F42_PORT_HACK_CFG = { id: 4, key: "u3t87y" };
export const F42_HM_TARGETS = { id: 5, key: "83n5k7" };
export const F42_HM_STATE = { id: 6, key: "xwi847" };
export const F42_MSG_STACK_POSTED_JOBS = 10;
export const F42_MSG_STACK_COMPLETED_JOBS = 11;
export const F42_THRALL_SRV_WORKING_LOG = { id: 12, key: "c09354" };
export const F42_THRALL_INFECT_CFG = { id: 20, key: "ti47j7" };
export const F42_ORDER_66 = { id: 66, key: "ord-66" };

export const F42_RES_PORTS = {
  [F42_PORT_MAX_PORT_LENGTH_TEST]: { name: "Max port length", accessKey: "8453hb" },
  [F42_PORT_HMO_COPY]: { name: "HackManager object copy", accessKey: F42_PORT_HMO_COPY.key },
  [F42_MSG_STACK_HM_CTRL]: { name: "MSG_STACK see F42MessageStack: used to control HackManager", accessKey: "7682hd", isMessageStack: true },
  [F42_PORT_HACK_CFG.id]: { name: "Hack config", accessKey: F42_PORT_HACK_CFG.key },
  [F42_HM_TARGETS.id]: { name: "HackManager target list", accessKey: F42_HM_TARGETS.key },
  [F42_HM_STATE.id]: { name: "HackManager state view", accessKey: F42_HM_STATE.key },
  7: { name: "tbd", accessKey: "" },
  8: { name: "tbd", accessKey: "" },
  9: { name: "tbd", accessKey: "" },
  [F42_MSG_STACK_POSTED_JOBS]: { name: "MSG_STACK see F42MessageStack: Posted jobs for thrall servers", accessKey: "j7492k", isMessageStack: true },
  [F42_MSG_STACK_COMPLETED_JOBS]: { name: "MSG_STACK see F42MessageStack: Completed jobs posted by thrall servers", accessKey: "3m4vc2", isMessageStack: true },
  [F42_THRALL_SRV_WORKING_LOG.id]: { name: "Thrall server working log", accessKey: F42_THRALL_SRV_WORKING_LOG.key },
  13: { name: "tbd", accessKey: "" },
  14: { name: "tbd", accessKey: "" },
  15: { name: "tbd", accessKey: "" },
  16: { name: "tbd", accessKey: "" },
  17: { name: "tbd", accessKey: "" },
  18: { name: "tbd", accessKey: "" },
  19: { name: "tbd", accessKey: "" },
  [F42_THRALL_INFECT_CFG.id]: { name: "Thrall infect cfg port", accessKey: F42_THRALL_INFECT_CFG.key },
  [F42_ORDER_66.id]: { name: "Order 66", accessKey: F42_ORDER_66.key },
};

/**
 * Should be implemented for any data sent to port/stack
 */
export interface StackMsgObjInterface {
  msgId: string;
  portId: number;
}

