import MsgQueue from "/f42/classes/MsgQueue.class";
import MsgSocket from "/f42/classes/MsgSocket.class";

/**
 * 
 * MessageQueue: can hold 0:n messages to a system limit, then they are pooped off
 * MessageSocket: can 0:1 messages, used for cfg, status, etc.
 * 
 */

// export const PORT_TYPE_SOCKET = "socket";
// export const PORT_TYPE_QUEUE = "queue";

// 1
// 2
export const PORT_HM_CTRL = 3;
export const PORT_HACK_CFG = 4;
export const PORT_HM_TARGETS = 5;
export const PORT_HM_STATE = 6;
// 7
// 8
// 9
export const PORT_POSTED_JOBS = 10;
export const PORT_COMPLETED_JOBS = 11;
export const PORT_THRALL_SRV_WORKING_LOG = 12;
//13 - never use
// 14 - 19
export const PORT_THRALL_INFECT_CFG = 20;
// 21 - 65
export const PORT_ORDER_66 = 66;

export const MSG_QUEUES = [
  PORT_HM_CTRL,
  PORT_POSTED_JOBS,
  PORT_COMPLETED_JOBS,
];

export const MSG_SOCKETS = [
  PORT_HACK_CFG,
  PORT_HM_TARGETS,
  PORT_HM_STATE,
];


// export const F42_RES_PORTS = {
//   [PORT_MAX_PORT_LENGTH_TEST]: { name: "Max port length", accessKey: "8453hb" },
//   [PORT_HMO_COPY]: { name: "HackManager object copy", accessKey: PORT_HMO_COPY.key },
//   [PORT_HM_CTRL]: { name: "MSG_QUEUE see F42MessageStack: used to control HackManager", accessKey: "7682hd", isMsgQueue: true },
//   [PORT_HACK_CFG.id]: { name: "Hack config", accessKey: PORT_HACK_CFG.key },
//   [PORT_HM_TARGETS.id]: { name: "HackManager target list", accessKey: PORT_HM_TARGETS.key },
//   [PORT_HM_STATE.id]: { name: "HackManager state view", accessKey: PORT_HM_STATE.key },
//   7: { name: "tbd", accessKey: "" },
//   8: { name: "tbd", accessKey: "" },
//   9: { name: "tbd", accessKey: "" },
//   [PORT_POSTED_JOBS]: { name: "MSG_QUEUE see F42MessageStack: Posted jobs for thrall servers", accessKey: "j7492k", isMsgQueue: true },
//   [PORT_COMPLETED_JOBS]: { name: "MSG_QUEUE see F42MessageStack: Completed jobs posted by thrall servers", accessKey: "3m4vc2", isMsgQueue: true },
//   [PORT_THRALL_SRV_WORKING_LOG.id]: { name: "Thrall server working log", accessKey: PORT_THRALL_SRV_WORKING_LOG.key },
//   13: { name: "tbd", accessKey: "" },
//   14: { name: "tbd", accessKey: "" },
//   15: { name: "tbd", accessKey: "" },
//   16: { name: "tbd", accessKey: "" },
//   17: { name: "tbd", accessKey: "" },
//   18: { name: "tbd", accessKey: "" },
//   19: { name: "tbd", accessKey: "" },
//   [PORT_THRALL_INFECT_CFG.id]: { name: "Thrall infect cfg port", accessKey: PORT_THRALL_INFECT_CFG.key },
//   [PORT_ORDER_66.id]: { name: "Order 66", accessKey: PORT_ORDER_66.key },
// };

/**
 * Should be implemented for any data sent to port/stack
 */
export interface MsgObjInterface {
  msgId: string;
  portId: number;
  msgPort: MsgQueue | MsgSocket;
  push: () => boolean;
}

