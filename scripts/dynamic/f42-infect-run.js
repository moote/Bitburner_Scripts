import HackConfig from '/scripts/dynamic/f42-hack-cfg-class.js';
import F42Logger from '/scripts/classes/f42-logger-class.js';
import F42ClFlagDef from '/scripts/classes/f42-cl-flag-def-class.js';
import { isFingerprintExist, isFingerprintMatch, getCurrentFingerprint } from "/scripts/utility/payload-fingerprint.js";

const F42_MIN_TARGET_RAM = 16;
const F42_HOSTNAME_HOME = "home";
const F42_PAYLOAD_BUP_PATH = "scripts/dynamic/bup/";

/**
 * @param {NS} ns
 * @version 1.0
 * 
 * 
 */
export async function main(ns) {
  // get user hack level
  let userHackLev = ns.getHackingLevel();

  // calc the max number of ports we can open
  var userMaxHackPorts = 0;

  if (ns.fileExists("BruteSSH.exe", F42_HOSTNAME_HOME)) {
    userMaxHackPorts++;
    if (ns.fileExists("FTPCrack.exe", F42_HOSTNAME_HOME)) {
      userMaxHackPorts++;
      if (ns.fileExists("relaySMTP.exe", F42_HOSTNAME_HOME)) {
        userMaxHackPorts++;
        if (ns.fileExists("HTTPWorm.exe", F42_HOSTNAME_HOME)) {
          userMaxHackPorts++;
          if (ns.fileExists("SQLInject.exe", F42_HOSTNAME_HOME)) {
            userMaxHackPorts++;
          }
        }
      }
    }
  }

  let logger = new F42Logger(ns, false, true, true, "Infect");
  let scriptTitle = "Infector";
  let scriptDescription = "Scan for hackable servers, hack, copy payload and execute.\n* Make sure to inc. HACK_SCRIPT_VERSION in f42-infect-port-loader.js if for --overwrite-payload to work.";
  let scriptFlags = [
    F42ClFlagDef.getOptBool("infect", "If set true then it will run the infection"),
    F42ClFlagDef.getOptBool("verbose", "If set true will output non-matching servers"),
    F42ClFlagDef.getOptBool("overwrite-payload", "If set true then payload will be overwritten and re-executed on all hackable servers"),
    F42ClFlagDef.getOptIntAny("min-ram", "Min 'maxRAM' on target servers, default to " + F42_MIN_TARGET_RAM, F42_MIN_TARGET_RAM),
    F42ClFlagDef.getOptIntAny("max-hack-lev", "Max hack level on target servers, default to user value", userHackLev),
    F42ClFlagDef.getOptIntAny("max-srv-ports", "Max ports required to hack on target servers, default to user value", userMaxHackPorts),
    F42ClFlagDef.getOptStrAny("only-host", "Only infect specified host, if it matches all other criteria"),
  ];
  let feedback = logger.initFeedback(scriptTitle, scriptDescription, scriptFlags);

  if (!feedback) {
    return;
  }

  // int hack payload object
  const hackConfig = new HackConfig(ns, false, logger);
  hackConfig.checkConfig();

  if (!hackConfig.hasConfig) {
    feedback.addUserDefErrorAndEnd(
      "ERROR",
      "HackConfig port is empty"
    );
    return;
  }

  var opVars = {
    isVerbose: feedback.parsedClFlags["verbose"],
    reqMinRAM: feedback.parsedClFlags["min-ram"],
    reqHackLevel: feedback.parsedClFlags["max-hack-lev"],
    reqHackPorts: feedback.parsedClFlags["max-srv-ports"],
    doInfect: feedback.parsedClFlags["infect"],
    infectionPayload: hackConfig.hackScriptPath,
    infectionPayloadExeRAM: hackConfig.hackScriptExeRam,
    payloadVer: hackConfig.hackScriptVer,
    payloadFingerprintPath: hackConfig.hackScriptFingerprintPath,
    overwritePayload: (feedback.parsedClFlags["infect"] && feedback.parsedClFlags["overwrite-payload"]),
    onlyHost: feedback.parsedClFlags["only-host"] || false,
    matchList: [],
    maxHostnameLength: 0
  };

  // ns.tprintf(JSON.stringify(opVars, null, 2));
  // return;

  feedback.printTitle();

  if (opVars.reqHackPorts > userMaxHackPorts) {
    feedback.addUserDefErrorAndEnd(
      "ERROR",
      "You requested severs with %d ports, but you can only hack %d",
      opVars.reqHackPorts,
      userMaxHackPorts
    );
    return;
  }

  if (opVars.reqHackLevel > userHackLev) {
    feedback.addUserDefErrorAndEnd(
      "ERROR",
      "Your requested hack level (%d) is greater than your hack level (%d)",
      opVars.reqHackLevel,
      userHackLev
    );
    return;
  }

  feedback.printf("- You can hack %d ports", userMaxHackPorts);
  feedback.printf("- Your hack level is: %d", userHackLev);

  feedback.printSubTitle("Target conditions:");

  if (opVars.doInfect) {
    if (opVars.infectionPayloadExeRAM > opVars.reqMinRAM) {
      feedback.addUserDefErrorAndEnd(
        "ERROR",
        "Script requires more RAM (%f) than your requested min RAM (%d)",
        infectionPayloadExeRAM,
        opVars.reqMinRAM
      );
      return;
    }
  }
  else {
    feedback.printHiLi(">> Analyse only, no file copy");
  }

  if (opVars.overwritePayload) {
    feedback.printHiLi(">> Overwrite and restart payload");
  }
  else {
    feedback.printHiLi(">> No Payload overwrite");
  }

  if (opVars.onlyHost == false) {
    feedback.printHiLi(">> Any host");
    feedback.printHiLi(">> Min server RAM: %d", opVars.reqMinRAM);
    feedback.printHiLi(">> Max server hack lev: %d", opVars.reqHackLevel);
    feedback.printHiLi(">> Max server hack ports: %d", opVars.reqHackPorts);
  }
  else {
    if (opVars.onlyHost != F42_HOSTNAME_HOME) {
      if (!ns.serverExists(opVars.onlyHost)) {
        feedback.addUserDefErrorAndEnd(
          "--only-host",
          "Sever does not exist",
          opVars.onlyHost
        );
        return;
      }

      if (ns.getServerRequiredHackingLevel(opVars.onlyHost) > userHackLev) {
        feedback.addUserDefErrorAndEnd(
          "--only-host",
          "Server hack level (%s) is greater than your level (%s)",
          ns.getServerRequiredHackingLevel(opVars.onlyHost),
          userHackLev
        );
        return;
      }

      if (ns.getServerNumPortsRequired(opVars.onlyHost) > userMaxHackPorts) {
        feedback.addUserDefErrorAndEnd(
          "--only-host",
          "Server requires more ports to hack (%s) than you can (%s)",
          ns.getServerNumPortsRequired(opVars.onlyHost),
          userMaxHackPorts
        );
        return;
      }
    }

    feedback.printHiLi(">> Only host: %s", opVars.onlyHost);
    feedback.printHiLi(">> %s maxRAM: %d", opVars.onlyHost, ns.getServerMaxRam(opVars.onlyHost));
    feedback.printHiLi(">> %s hack lev: %d", opVars.onlyHost, ns.getServerRequiredHackingLevel(opVars.onlyHost));
    feedback.printHiLi(">> %s hack ports: %d", opVars.onlyHost, ns.getServerNumPortsRequired(opVars.onlyHost));

    // match varibles to requested server
    opVars.reqMinRAM = ns.getServerMaxRam(opVars.onlyHost);
    opVars.reqHackLevel = ns.getServerRequiredHackingLevel(opVars.onlyHost);
    opVars.reqHackPorts = ns.getServerNumPortsRequired(opVars.onlyHost);
  }

  feedback.printHiLi(">> File(s) to copy & execute: %s", opVars.infectionPayload);
  feedback.printHiLi(">> %f RAM required by script", opVars.infectionPayloadExeRAM);

  feedback.printSubTitle("Scanning servers:");
  feedback.printf("- U-RAM: Used RAM");
  feedback.printf("- A-RAM: Available RAM");
  feedback.printf("- H-Lev: Server hacking skill level");
  feedback.printf("- H-P0rts: Server open ports required for Nuke\n\n");

  // backup files
  if (opVars.doInfect || opVars.overwritePayload) {
    const date = new Date(Date.now());

    for (const filePath of opVars.infectionPayload) {
      let bupFilePath = F42_PAYLOAD_BUP_PATH + filePath.split("/").pop();

      ns.write(bupFilePath, ns.sprintf("/** f42-infect-run.js auto bup: %s */\n\n", date.toString()), "w");
      ns.write(bupFilePath, ns.read(filePath), "a");
    }
  }

  // test home
  if (opVars.onlyHost == F42_HOSTNAME_HOME) {
    testServer(feedback, 0, opVars, F42_HOSTNAME_HOME);
  }
  else {
    // recursivly scan all severs
    scanAdjServers(feedback, F42_HOSTNAME_HOME, 0, opVars);
  }

  let colSpecs = [
    [6, "Target", ""],
    [5, "Depth", ""],
    [opVars.maxHostnameLength, "Host", ""],
    [5, "RAM", ""],
    [7, "U-RAM", ""],
    [7, "A-RAM", ""],
    [5, "H-Lev", ""],
    [7, "H-P0rts", ""],
    [20, "Results", "-"],
  ];

  let rowFormat = [];
  let colTitles = [];
  let colSpacers = [];

  for (const colSpec of colSpecs) {
    rowFormat.push(colSpec[2] + colSpec[0]);
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

  // end
  feedback.printEnd();
}

function scanAdjServers(feedback, baseServer, depthCnt, opVars) {
  let i = 1;

  if (baseServer == F42_HOSTNAME_HOME) {
    i = 0;
  }
  else {
    depthCnt++;
  }

  let adjServers = feedback.ns.scan(baseServer);

  if (baseServer = F42_HOSTNAME_HOME || adjServers.length > 1) {
    for (i; i < adjServers.length; i++) {
      let serverHostName = adjServers[i];

      feedback.logger.log("scanAdjServers >> opVars.onlyHost: %s\nserverHostName: %s", opVars.onlyHost, serverHostName);

      testServer(feedback, depthCnt, opVars, serverHostName);

      // scan recursively
      scanAdjServers(feedback, serverHostName, depthCnt, opVars);
    }
  }
}

function testServer(feedback, depthCnt, opVars, serverHostName) {
  if (opVars.onlyHost == false || serverHostName == opVars.onlyHost) {
    // int server details object
    let serverDetails = new F42ServerDetails(feedback.logger, serverHostName);

    // logic
    actionLogicCalc(feedback, opVars, serverDetails);

    if (serverDetails.doPayloadExe) {
      // calc threads
      serverDetails.payloadExeThreads = Math.trunc(serverDetails.availRam / opVars.infectionPayloadExeRAM);
    }

    if (!serverDetails.canHack) {
      serverDetails.canHack = (serverDetails.hackLev <= opVars.reqHackLevel && serverDetails.hackPorts <= opVars.reqHackPorts);
    }

    // throw new Error(serverDetails.toString());

    if (serverDetails.canHack) {
      if (serverDetails.maxRam > 0 && (serverDetails.availRam >= opVars.reqMinRAM || serverDetails.isHome)) {
        if (opVars.doInfect) {
          serverDetails.resultStrs.push("do_infect");

          // hack if needed
          doHack(feedback, opVars, serverDetails);

          // only copy/exe if we now have root
          if (serverDetails.hasRoot) {
            killScriptProcesses(feedback, opVars, serverDetails);
          }
        }
      }
      else {
        serverDetails.canHack = false;

        if (serverDetails.maxRam == 0) {
          serverDetails.resultStrs.push("ram_zero");
        }

        if (serverDetails.availRam < opVars.reqMinRAM) {
          serverDetails.resultStrs.push("a_ram_too_low");
        }
      }
    }
    else {
      if (serverDetails.hackLev > opVars.reqHackLevel) {
        serverDetails.resultStrs.push("h_lev_too_high");
      }

      if (serverDetails.hackPorts > opVars.reqHackPorts) {
        serverDetails.resultStrs.push("h_ports_too_high");
      }
    }

    // save print results
    if (serverDetails.canHack || opVars.isVerbose) {
      opVars.matchList.push([
        serverDetails.canHack ? "*" : "",
        depthCnt,
        serverDetails.hostname,
        feedback.ns.formatRam(serverDetails.maxRam, 0),
        feedback.ns.formatRam(serverDetails.usedRam, 1),
        feedback.ns.formatRam(serverDetails.availRam, 1),
        serverDetails.hackLev,
        serverDetails.hackPorts,
        serverDetails.resultStrs.join(' | ')
      ]);

      if (serverDetails.hostname.length > opVars.maxHostnameLength) {
        opVars.maxHostnameLength = serverDetails.hostname.length;
      }
    }
  }
}

function actionLogicCalc(feedback, opVars, serverDetails) {
  // infect triggers payload copy and excute; but only 
  // on servers without fingerprint
  if (opVars.doInfect && !serverDetails.fpExists) {
    serverDetails.doPayloadCopy = true;
    serverDetails.doPayloadExe = true;
  }

  // if overwrite set then calc extra ram freed and set all
  // actions true
  if (opVars.overwritePayload) {
    if (serverDetails.fingerprint) {
      serverDetails.availRam += serverDetails.fingerprint.totalRam;
    }
    else {
      for (const runningProcess of feedback.ns.ps(serverDetails.hostname)) {
        if (runningProcess.filename == opVars.infectionPayload[0]) {
          let rs = feedback.ns.getRunningScript(parseInt(runningProcess.pid))
          serverDetails.availRam += (rs.ramUsage * rs.threads);
        }
      }
    }

    serverDetails.doKillProcesses = true;
    serverDetails.doRmOldFiles = true;
    serverDetails.doPayloadCopy = true;
    serverDetails.doPayloadExe = true;
  }

  // matching fingerprint means infect/overwrite
  // will not remove files or copy payload. This
  // only happend when fingerprint version changes
  if (serverDetails.fpMatch) {
    serverDetails.doRmOldFiles = false;
    serverDetails.doPayloadCopy = false;
    serverDetails.resultStrs.push("fprint_match");
  }
  else {
    serverDetails.resultStrs.push("fprint_mismatch");
  }

  // home server never deletes or copies files to itself
  if (serverDetails.isHome) {
    serverDetails.doRmOldFiles = false;
    serverDetails.doPayloadCopy = false;
  }
}

/**
 * Check for and attempt to get root access
 */
function doHack(feedback, opVars, serverDetails) {
  // file copy & execution here
  if (!serverDetails.hasRoot) {
    serverDetails.resultStrs.push("no_root");

    // open ports
    if (serverDetails.hackPorts > 0) {
      for (let j = serverDetails.hackPorts; j > 0; j--) {
        switch (j) {
          case 5: // SQL
            feedback.ns.sqlinject(serverDetails.hostname);
            serverDetails.resultStrs.push("sqlinject");
            break;
          case 4: // HTTP
            feedback.ns.httpworm(serverDetails.hostname);
            serverDetails.resultStrs.push("httpworm");
            break;
          case 3: // SMTP
            feedback.ns.relaysmtp(serverDetails.hostname);
            serverDetails.resultStrs.push("relaysmtp");
            break;
          case 2: // FTP
            feedback.ns.ftpcrack(serverDetails.hostname);
            serverDetails.resultStrs.push("ftpcrack");
            break;
          case 1: // SSH
            feedback.ns.brutessh(serverDetails.hostname);
            serverDetails.resultStrs.push("brutessh");
            break;
        }
      }
    }

    // nuke
    feedback.ns.nuke(serverDetails.hostname);

    // re-test root
    serverDetails.hasRoot = feedback.ns.hasRootAccess(serverDetails.hostname);

    if (serverDetails.hasRoot) {
      serverDetails.resultStrs.push("nuked");
    }
    else {
      serverDetails.resultStrs.push("nuke_failed");
    }
  }
  else {
    serverDetails.resultStrs.push("existing_root");
  }
}

/**
 * Start parse action chain with killing processes
 */
function killScriptProcesses(feedback, opVars, serverDetails) {
  if (serverDetails.doKillProcesses) {
    if (serverDetails.fingerprint) {
      if (feedback.ns.kill(serverDetails.fingerprint.pid)) {
        serverDetails.resultStrs.push("pload_fp_kill");
        serverDetails.processesKilled = true;
      }
      else {
        serverDetails.resultStrs.push("pload_fp_no_kill");
      }
    }

    if(serverDetails.processesKilled == false) {
      for (const runningProcess of feedback.ns.ps(serverDetails.hostname)) {
        if (runningProcess.filename == opVars.infectionPayload[0]) {
          feedback.ns.kill(runningProcess.pid);
          serverDetails.processesKilled = true;
        }
      }

      if (serverDetails.processesKilled) {
        serverDetails.resultStrs.push("pload_p_kill");
      }
      else {
        serverDetails.resultStrs.push("pload_p_no_kill");
      }
    }
  }

  if (serverDetails.doRmOldFiles) {
    removeScriptFiles(feedback, opVars, serverDetails);
  }
  else if (serverDetails.doPayloadCopy) {
    copyPayload(feedback, opVars, serverDetails);
  }
  else if (serverDetails.doPayloadExe) {
    exePayload(feedback, opVars, serverDetails);
  }
}

function removeScriptFiles(feedback, opVars, serverDetails) {
  if (serverDetails.isHome) {
    throw new Error("removeScriptFiles: Script files can not be removed from home!");
  }

  if (!serverDetails.doRmOldFiles) {
    throw new Error("removeScriptFiles: Server not set for remove script files!");
  }

  if (serverDetails.fingerprint) {
    for (const filePath of serverDetails.fingerprint.payload) {
      if (feedback.ns.fileExists(filePath, serverDetails.hostname)) {
        if (feedback.ns.rm(filePath, serverDetails.hostname)) {
          serverDetails.filesDeleted = true;
        }
      }
    }

    if (serverDetails.filesDeleted) {
      serverDetails.resultStrs.push("fprint_rm");
    }
    else {
      serverDetails.resultStrs.push("fprint_no_rm");
    }
  }
  else {
    for (const filePath of opVars.infectionPayload) {
      if (feedback.ns.fileExists(filePath, serverDetails.hostname)) {
        if (feedback.ns.rm(filePath, serverDetails.hostname)) {
          serverDetails.filesDeleted = true;
        }
      }
    }

    if (serverDetails.filesDeleted) {
      serverDetails.resultStrs.push("non_fprint_rm");
    }
    else {
      serverDetails.resultStrs.push("non_fprint_no_rm");
    }
  }

  if (serverDetails.doPayloadCopy) {
    copyPayload(feedback, opVars, serverDetails);
  }
  else if (serverDetails.doPayloadExe) {
    exePayload(feedback, opVars, serverDetails);
  }
}

function copyPayload(feedback, opVars, serverDetails) {
  if (serverDetails.isHome) {
    throw new Error("copyPayload: Script files can not be copied on home!");
  }

  if (!serverDetails.doPayloadCopy) {
    throw new Error("copyPayload: Server not set for payload copy!");
  }

  if (feedback.ns.scp(opVars.infectionPayload, serverDetails.hostname)) {
    serverDetails.payloadCopied = true;
  }

  if (serverDetails.doPayloadExe) {
    exePayload(feedback, opVars, serverDetails);
  }
}

function exePayload(feedback, opVars, serverDetails) {
  // throw new Error(serverDetails.toString());
  // file execution
  if (feedback.ns.exec(opVars.infectionPayload[0], serverDetails.hostname, serverDetails.payloadExeThreads)) {
    serverDetails.payloadExe = true;
    serverDetails.resultStrs.push("payload_exe");
    serverDetails.resultStrs.push(serverDetails.payloadExeThreads + "_threads");
  }
  else {
    // throw new Error(serverDetails.toString());
    serverDetails.payloadExe = false;
    serverDetails.resultStrs.push("payload_no_exe");
  }
}

class F42ServerDetails {
  #ns;
  #logger;
  #details = {
    hostname: "",
    isHome: false,
    maxRam: 0,
    usedRam: 0,
    availRamIncRunning: 0,
    availRam: 0,
    hackLev: 0,
    hackPorts: 0,
    hasRoot: false,
    canHack: false,
    resultStrs: [],
    processesKilled: false,
    filesDeleted: false,
    payloadCopied: false,
    payloadExe: false,
    doKillProcesses: false,
    doRmOldFiles: false,
    doPayloadCopy: false,
    doPayloadExe: false,
    payloadExeThreads: 0,
    fpHostname: undefined,
    fpExists: false,
    fpMatch: false,
    fingerprint: undefined,
  };

  constructor(logger, serverHostName) {
    this.#logger = logger;
    this.#ns = logger.ns;

    //process details
    this.#details.hostname = serverHostName;
    this.#details.isHome = (F42_HOSTNAME_HOME == this.#details.hostname);
    this.#details.maxRam = this.#ns.getServerMaxRam(this.#details.hostname);
    this.#details.usedRam = this.#ns.getServerUsedRam(this.#details.hostname);
    this.#details.availRamIncRunning = this.#details.maxRam - this.#details.usedRam;
    this.#details.availRam = this.#details.maxRam - this.#details.usedRam;
    this.#details.hackLev = this.#ns.getServerRequiredHackingLevel(this.#details.hostname);
    this.#details.hackPorts = this.#ns.getServerNumPortsRequired(this.#details.hostname);
    this.#details.hasRoot = this.#ns.hasRootAccess(this.#details.hostname);
    this.#details.canHack = this.#details.hasRoot;

    // fingerprint stuffs
    this.#details.fpHostname = F42_HOSTNAME_HOME == this.#details.hostname ? undefined : this.#details.hostname
    this.#details.fpExists = isFingerprintExist(this.#ns, this.#details.fpHostname);
    this.#details.fpMatch = isFingerprintMatch(this.#ns, this.#details.fpHostname);
    this.#details.fingerprint = getCurrentFingerprint(this.#ns, this.#details.fpHostname);
  }

  get ns() { return this.#ns; }
  get logger() { return this.#logger; }

  get hostname() { return this.#details.hostname; }
  get isHome() { return this.#details.isHome; }
  get maxRam() { return this.#details.maxRam; }
  get usedRam() { return this.#details.usedRam; }
  get availRamIncRunning() { return this.#details.availRamIncRunning; }
  get availRam() { return this.#details.availRam; }
  get hackLev() { return this.#details.hackLev; }
  get hackPorts() { return this.#details.hackPorts; }
  get hasRoot() { return this.#details.hasRoot; }
  get canHack() { return this.#details.canHack; }

  get resultStrs() { return this.#details.resultStrs; }

  get processesKilled() { return this.#details.processesKilled; }
  get filesDeleted() { return this.#details.filesDeleted; }
  get payloadCopied() { return this.#details.payloadCopied; }
  get payloadExe() { return this.#details.payloadExe; }

  get doKillProcesses() { return this.#details.doKillProcesses; }
  get doRmOldFiles() { return this.#details.doRmOldFiles; }
  get doPayloadCopy() { return this.#details.doPayloadCopy; }
  get doPayloadExe() { return this.#details.doPayloadExe; }
  get payloadExeThreads() { return this.#details.payloadExeThreads; }

  get fpHostname() { return this.#details.fpHostname; }
  get fpExists() { return this.#details.fpExists; }
  get fpMatch() { return this.#details.fpMatch; }
  get fingerprint() { return this.#details.fingerprint; }

  set availRam(val) { this.#details.availRam = val; }
  set hasRoot(val) { this.#details.hasRoot = val; }
  set canHack(val) { this.#details.canHack = val; }

  set processesKilled(val) { this.#details.processesKilled = val; }
  set filesDeleted(val) { this.#details.filesDeleted = val; }
  set payloadCopied(val) { this.#details.payloadCopied = val; }
  set payloadExe(val) { this.#details.payloadExe = val; }

  set doKillProcesses(val) { this.#details.doKillProcesses = val; }
  set doRmOldFiles(val) { this.#details.doRmOldFiles = val; }
  set doPayloadCopy(val) { this.#details.doPayloadCopy = val; }
  set doPayloadExe(val) { this.#details.doPayloadExe = val; }
  set payloadExeThreads(val) { this.#details.payloadExeThreads = val; }

  addResultStr(resStr) {
    this.#details.resultStrs.push(resStr);
    logger.log("addResultStr >> %s", resStr);
  }

  toString() {
    return JSON.stringify(this.#details, null, 2);
  }
}
