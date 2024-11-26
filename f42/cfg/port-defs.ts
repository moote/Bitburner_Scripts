/**
 * 
 * MessageQueue: can hold 0:n messages to a system limit, then they are popped off
 * MessageSocket: can 0:1 messages, used for cfg, status, etc.
 * 
 */

export const PORT_TYPE_BASE = "base";
export const PORT_TYPE_SOCKET = "socket";
export const PORT_TYPE_QUEUE = "queue";

// 1
// 2
export const PORT_HM_CTRL = 3;
export const PORT_GENERAL_CFG = 4;
export const PORT_HM_TARGETS = 5;
export const PORT_HM_STATE = 6;
export const PORT_STONK_TRADE = 7;
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
  PORT_STONK_TRADE,
];

export const MSG_SOCKETS = [
  PORT_GENERAL_CFG,
  PORT_HM_TARGETS,
  PORT_HM_STATE,
];
