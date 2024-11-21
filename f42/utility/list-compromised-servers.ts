import { NS, Server } from '@ns'
import FeedbackRenderer from '/f42/classes/FeedbackRenderer';
import Logger from '/f42/classes/Logger.class';
import GeneralCfgMsgReader from '/f42/classes/Messaging/GeneralCfgMsgReader';
import GeneralCfgMsg from '/f42/classes/Messaging/GeneralCfgMsg.class';

interface ListCmpOpVars_Interface {
  cfgMsg: GeneralCfgMsg;
  onlyOwned: boolean;
  matchList: (string | number)[][];
  maxHostnameLength: number;
}

type ColSpec_Type = [number, string][];

export async function main(ns: NS): Promise<void> {
  const scriptTitle = "List Compromised Servers";
  const scriptDescription = "List compromised servers, optionally display only purchased servers";
  const logger = new Logger(ns, false, true, false, scriptTitle, true);
  const feedback = logger.initFeedback(scriptTitle, scriptDescription);
  const flags = feedback.flagValidator;

  flags.addBooleanFlag("o", "Only list purchased servers");

  if (feedback.printHelpAndEnd()) {
    return;
  }

  // init vars
  const cgfReader = new GeneralCfgMsgReader(ns);
  const cfgMsg = cgfReader.peekMessage();

  if (cfgMsg === false) {
    feedback.addUserDefErrorAndEnd("CONFIG", "General cfg socket is empty");
    return;
  }

  const opVars: ListCmpOpVars_Interface = {
    cfgMsg: cfgMsg,
    onlyOwned: flags.getFlagBoolean("o"),
    matchList: [],
    maxHostnameLength: 0
  };

  feedback.printTitle();
  feedback.printf("- U-RAM: Used RAM");
  feedback.printf("- A-RAM: Available RAM");
  feedback.printf("- C-Thrd: Current threads");
  feedback.printf("- O-Thrd: Optimal number of threads");
  feedback.printf("- Thrd-Err: Non optimal number of threads running");
  feedback.printf("- Bdoor: Backdoor installed");

  if (opVars.onlyOwned) {
    feedback.printf("- All servers showm are owned");
  }
  else {
    feedback.printf("- All servers showm are owned and/or have root access");
  }

  feedback.printf("- Current RAM target: %s", opVars.cfgMsg.purchasedServers.ramTargetGb);
  feedback.printf("\n\n");


  // render home server
  renderServer(feedback, opVars, ns.getServer(), 0);

  // recursivly scan all severs
  scanAdjServers(feedback, "home", 0, opVars);

  const colSpecs: ColSpec_Type = [
    [5, "Owned"],
    [5, "Depth"],
    [opVars.maxHostnameLength, "Host"],
    [6, "Max$"],
    [4, "Lev"],
    [5, "RAM"],
    [7, "U-RAM"],
    [7, "A-RAM"],
    [6, "C-Thrd"],
    [5, "Bdoor"]
  ];

  let rowFormat: string | number[] = [];
  const colTitles: string[] = [];
  const colSpacers: string[] = [];

  for (const colSpec of colSpecs) {
    rowFormat.push(colSpec[0]);
    colSpacers.push(Array(colSpec[0] + 1).join("-"));
    colTitles.push(colSpec[1]);
  }

  rowFormat = "%" + rowFormat.join("s | %") + "s"

  feedback.printHiLi(rowFormat, ...colTitles);
  feedback.printHiLi(rowFormat, ...colSpacers);

  for (const row of opVars.matchList) {
    feedback.printf(
      rowFormat,
      ...row
    );
  }

  feedback.printEnd();
}

function scanAdjServers(feedback: FeedbackRenderer, baseServer: string, depthCnt: 0, opVars: ListCmpOpVars_Interface) {
  let i = 1;

  if (baseServer == "home") {
    i = 0;
  }
  else {
    depthCnt++;
  }

  const adjServers = feedback.ns.scan(baseServer);

  if (baseServer === "home" || adjServers.length > 1) {
    for (i; i < adjServers.length; i++) {
      const serverObj = feedback.ns.getServer(adjServers[i]);

      let canShow = false;

      if (opVars.onlyOwned && serverObj.purchasedByPlayer) {
        canShow = true;
      }
      else if (!opVars.onlyOwned && (serverObj.purchasedByPlayer || serverObj.hasAdminRights)) {
        canShow = true;
      }

      if (canShow) {
        renderServer(feedback, opVars, serverObj, depthCnt);
      }

      // scan recursively
      scanAdjServers(feedback, serverObj.hostname, depthCnt, opVars);
    }
  }
}

function renderServer(feedback: FeedbackRenderer, opVars: ListCmpOpVars_Interface, serverObj: Server, depthCnt: number) {
  // init ram amounts
  const serverBaseRAM = serverObj.maxRam;
  const serverUsedRAM = serverObj.ramUsed;
  const serverAvailRAM = serverBaseRAM - serverUsedRAM;

  // get process info
  const processInfo = feedback.ns.ps(serverObj.hostname);
  let currThreadCnt = 0;

  // count all running processes
  for (const processObj of processInfo) {
    currThreadCnt += processObj.threads;
  }

  // print results
  opVars.matchList.push([
    serverObj.purchasedByPlayer ? "*" : "",
    depthCnt,
    serverObj.hostname,
    feedback.ns.formatNumber(feedback.ns.getServerMaxMoney(serverObj.hostname), 1),
    feedback.ns.formatNumber(feedback.ns.getServerSecurityLevel(serverObj.hostname), 1),
    feedback.ns.formatRam(serverBaseRAM, 0),
    feedback.ns.formatRam(serverUsedRAM, 1),
    feedback.ns.formatRam(serverAvailRAM, 1),
    currThreadCnt,
    serverObj.backdoorInstalled ? "*" : "",
  ]);

  if (serverObj.hostname.length > opVars.maxHostnameLength) {
    opVars.maxHostnameLength = serverObj.hostname.length;
  }
}