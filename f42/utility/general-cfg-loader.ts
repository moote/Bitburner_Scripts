import { NS } from '@ns'
import { GeneralCfgMsg_Interface } from '/f42/classes/helpers/interfaces'
import GeneralCfgMsg from '/f42/classes/Messaging/GeneralCfgMsg.class';
import { getEmpty_GeneralCfgMsg } from '/f42/classes/helpers/empty-object-getters';

export async function main(ns: NS): Promise<void> {
  loadGeneralCfgSocket(ns);
}

export function loadGeneralCfgSocket(ns: NS): void {
  // config definition
  const genCfg: GeneralCfgMsg_Interface = getEmpty_GeneralCfgMsg();
  genCfg.purchasedServers = {
    serverLimit: 100,
    ramTargetGb: 262144,
    purchaseLoopDelayMS: 750,
    upgradeLoopDelayMS: 250,
    debugMode: true,
  };

  // push to socket
  GeneralCfgMsg.staticPush(ns, genCfg);
}