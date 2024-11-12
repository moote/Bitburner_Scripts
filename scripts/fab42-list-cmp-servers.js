import HackConfig from "/scripts/dynamic/f42-hack-cfg-class.js";
import F42Logger from "/scripts/classes/f42-logger-class.js";
import F42ClFlagDef from "/scripts/classes/f42-cl-flag-def-class.js";
import { getCurrentFingerprint } from "/scripts/utility/payload-fingerprint.js";

/**
 * @param {NS} ns
 * @version 2.0
 * */
export async function main(ns) {
  let logger = new F42Logger(ns, false, true, false, "List Compromised Servers");
  let scriptTitle = "List Compromised Servers";
  let scriptDescription = "List compromised servers, optionally display only purchased servers";
  let scriptFlags = [
    F42ClFlagDef.getOptBool("only-owned", "If set true shows just servers that are owned (purchased servers)"),
    F42ClFlagDef.getOptBool("restart-thrall", "If only owned and this set, then will kill all processes, copy latest thrall files and start the controller"),
    F42ClFlagDef.getOptBool("kill-all", "If only owned and this set, then will kill all processes, no restart"),
  ];
  let feedback = logger.initFeedback(scriptTitle, scriptDescription, scriptFlags);

  if (!feedback) {
    return;
  }

  // int hack payload object
  const hackConfig = new HackConfig(ns, true, logger);
  if (!hackConfig.hasConfig) {
    feedback.addUserDefError(
      "ERROR",
      "!! HackConfig port is empty"
    );
    feedback.printFlagErrorsAndEnd(true);
    return;
  }

  // init vars
  var opVars = {
    onlyOwned: feedback.parsedClFlags["only-owned"],
    restartThrall: feedback.getFlag("restart-thrall"),
    killAll: feedback.getFlag("kill-all"),
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

  feedback.printf("- Current RAM target: %s", ns.formatRam(hackConfig.psRamTargetGb));
  feedback.printf("\n\n");


  // render home server
  renderServer(hackConfig, opVars, ns.getServer(), 0);

  // recursivly scan all severs
  scanAdjServers(hackConfig, "home", 0, opVars);

  let colSpecs = [
    [5, "Owned"],
    [5, "Depth"],
    [opVars.maxHostnameLength, "Host"],
    [6, "Max$"],
    [4, "Lev"],
    [5, "SRAM"],
    [5, "RAM"],
    [7, "U-RAM"],
    [7, "A-RAM"],
    [6, "C-Thrd"],
    [6, "O-Thrd"],
    [8, "Thrd-Err"],
    [5, "Bdoor"],
    [5, "FPVer"]
  ];

  let rowFormat = [];
  let colTitles = [];
  let colSpacers = [];

  for(const colSpec of colSpecs){
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

function scanAdjServers(hackConfig, baseServer, depthCnt, opVars) {
  let i = 1;

  if (baseServer == "home") {
    i = 0;
  }
  else {
    depthCnt++;
  }

  let adjServers = hackConfig.ns.scan(baseServer);

  if (baseServer = "home" || adjServers.length > 1) {
    for (i; i < adjServers.length; i++) {
      let serverObj = hackConfig.ns.getServer(adjServers[i]);

      let canShow = false;

      if (opVars.onlyOwned && serverObj.purchasedByPlayer) {
        canShow = true;

        const thrallCtrlPath = "scripts/dynamic/v3/thrall/control.js";
        const thrallFiles = [
          "scripts/dynamic/v3/thrall/control.js",
          "scripts/dynamic/v3/thrall/weaken_.js",
          "scripts/dynamic/v3/thrall/grow_.js",
          "scripts/dynamic/v3/thrall/hack_.js",
        ];

        if(opVars.restartThrall && hackConfig.ns.fileExists(thrallCtrlPath, serverObj.hostname)){
          // kill running
          hackConfig.ns.kill(thrallCtrlPath, serverObj.hostname);

          // copy latest
          hackConfig.ns.scp(thrallFiles, serverObj.hostname);

          // start new
          hackConfig.ns.exec(thrallCtrlPath, serverObj.hostname);
        }
        else if(opVars.killAll && hackConfig.ns.fileExists(thrallCtrlPath, serverObj.hostname)){
          // kill running
          hackConfig.ns.killall(serverObj.hostname);
        }
      }
      else if (!opVars.onlyOwned && (serverObj.purchasedByPlayer || serverObj.hasAdminRights)) {
        canShow = true;
      }

      if (canShow) {
        renderServer(hackConfig, opVars, serverObj, depthCnt);
      }

      // scan recursively
      scanAdjServers(hackConfig, serverObj.hostname, depthCnt, opVars);
    }
  }
}

function renderServer(hackConfig, opVars, serverObj, depthCnt) {
  // init ram amounts
  let serverBaseRAM = serverObj.maxRam;
  let serverUsedRAM = serverObj.ramUsed;
  let serverAvailRAM = serverBaseRAM - serverUsedRAM;

  // get process info
  //  [{"filename":"scripts/fab42-simple-hack.js","threads":853,"args":[],"pid":31,"temporary":false}]
  let processInfo = hackConfig.ns.ps(serverObj.hostname);
  // hackConfig.ns.tprintf("Threads: %s", JSON.stringify(processInfo));
  let currThreadCnt = 0;

  // init optimal count based on current available ram
  let optThreadCnt = Math.floor(serverAvailRAM / hackConfig.hackScriptExeRam);

  // look at all matching processes and count current threads
  for (const processObj of processInfo) {
    // hackConfig.ns.tprintf("PID %d: %s", processObj.pid, JSON.stringify(processObj));
    if (processObj.filename == hackConfig.hackScriptPath[0]) {
      currThreadCnt += processObj.threads;
    }
  }

  // add current threads to optimal to get true optimal
  optThreadCnt += currThreadCnt;

  // look for fingerprint
  let currFPrint = getCurrentFingerprint(hackConfig.ns, serverObj.hostname);

  // print results
  opVars.matchList.push([
    serverObj.purchasedByPlayer ? "*" : "",
    depthCnt,
    serverObj.hostname,
    hackConfig.ns.formatNumber(hackConfig.ns.getServerMaxMoney(serverObj.hostname), 1),
    hackConfig.ns.formatNumber(hackConfig.ns.getServerSecurityLevel(serverObj.hostname), 1),
    hackConfig.hackScriptExeRam,
    hackConfig.ns.formatRam(serverBaseRAM, 0),
    hackConfig.ns.formatRam(serverUsedRAM, 1),
    hackConfig.ns.formatRam(serverAvailRAM, 1),
    currThreadCnt,
    optThreadCnt,
    currThreadCnt != optThreadCnt ? "*" : "",
    serverObj.backdoorInstalled ? "*" : "",
    currFPrint ? currFPrint.ver : "x"
  ]);

  if (serverObj.hostname.length > opVars.maxHostnameLength) {
    opVars.maxHostnameLength = serverObj.hostname.length;
  }
}
