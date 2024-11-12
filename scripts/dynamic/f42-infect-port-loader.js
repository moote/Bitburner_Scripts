import F42Logger from "/scripts/classes/f42-logger-class.js";
import F42ClFlagDef from "/scripts/classes/f42-cl-flag-def-class.js";
import { F42_PAYLOAD_VER, F42_PAYLOAD_FILES, F42_PAYLOAD_FINGERPRINT_PATH } from "/scripts/utility/payload-fingerprint.js";
import { F42_PORT_HACK_CFG } from "/scripts/cfg/port-defs.js";

const F42_TARGET = "hong-fang-tea"; // hack target hostname
const F42_PS_RAM_TARGET_GB = 8192; // purchased server ram target

/**
 * @param {NS} ns 
 * 
 * Parse the cfg file as JSON object and load into the
 * infection cfg port (4)
 */
export async function main(ns) {
  let logger = new F42Logger(ns, false, true, false, "Update Infect Config Port");
  let scriptTitle = "Update Infect Config Port";
  let scriptDescription = "Updates the infect config port with it's settings";
  let scriptFlags = [
    F42ClFlagDef.getOptBool("show-curr-port", "If set true the current config port"),
  ];
  let feedback = logger.initFeedback(scriptTitle, scriptDescription, scriptFlags);

  if (!feedback) {
    return;
  }

  let currentPort = peekCfgPort(ns);

  if (feedback.parsedClFlags["show-curr-port"]) {
    feedback.printTitle();
    feedback.printSubTitle("Current port setting:");
    feedback.printf(currentPort);
    feedback.printEnd();
    return;
  }

  // check target exists and is compromised
  if (!ns.serverExists(F42_TARGET)) {
    feedback.addUserDefErrorAndEnd(
      "ERROR",
      "Target does not exist: %s",
      F42_TARGET
    );
    return;
  }

  let targetObj = ns.getServer(F42_TARGET);

  if (!targetObj.hasAdminRights) {
    feedback.addUserDefError("ERROR", "Target not compromised : %s", F42_TARGET);
    feedback.addUserDefErrorAndEnd(
      "ERROR",
      "Use: run /scripts/fab42-srv-compromise.js %s",
      F42_TARGET
    );
    return;
  }

  // init cfg object
  let infectCfgObj = {
    status: 0,
    target: F42_TARGET,
    hackScriptPath: F42_PAYLOAD_FILES,
    hackScriptVer: F42_PAYLOAD_VER,
    hackScriptFingerprintPath: F42_PAYLOAD_FINGERPRINT_PATH,
    hackScriptExeRam: 0,
    hackScriptExeRam2: 0,
    moneyMinLimitMult: 0.8,
    securityMaxLimitMult: 0.2,
    moneyMinLimit: 0,
    securityMaxLimit: 0,
    timestamp: 0,
    psMan: {
      ramTargetGb: F42_PS_RAM_TARGET_GB,
      debugMode: false,
      minSleepMillis: 500,
      maxSleepMillis: 1000
    }
  }

  // set timestamp
  infectCfgObj.timestamp = Date.now();

  // set script exe RAM
  infectCfgObj.hackScriptExeRam = ns.getScriptRam(infectCfgObj.hackScriptPath[0], "home");

  // get actual exe RAM
  let testPid = ns.exec(infectCfgObj.hackScriptPath[0], "home", 1);
  if (testPid != 0) {
    let runningScriptObj = ns.getRunningScript(testPid, "home");
    infectCfgObj.hackScriptExeRam2 = (runningScriptObj.ramUsage * runningScriptObj.threads);
    ns.kill(testPid);
  }

  // set money min limit
  infectCfgObj.moneyMinLimit = ns.getServerMaxMoney(infectCfgObj.target) * infectCfgObj.moneyMinLimitMult;

  // get security level diff
  let secDiff = ns.getServerBaseSecurityLevel(infectCfgObj.target) - ns.getServerMinSecurityLevel(infectCfgObj.target);

  // set the max limit
  infectCfgObj.securityMaxLimit = ns.getServerMinSecurityLevel(infectCfgObj.target) + (secDiff * infectCfgObj.securityMaxLimitMult);

  //log
  feedback.printSubTitle("Prev. setting:");
  feedback.printf(currentPort);
  
  // save to port
  ns.clearPort(F42_PORT_HACK_CFG.id);
  ns.writePort(F42_PORT_HACK_CFG.id, infectCfgObj);

  // read and display currnet port to verify
  feedback.printSubTitle("Curr. setting:");
  feedback.printf(peekCfgPort(ns));
  feedback.printEnd();
}

function peekCfgPort(ns)
{
  return JSON.stringify(ns.peek(F42_PORT_HACK_CFG.id), null, 2);
}