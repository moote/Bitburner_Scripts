import F42Logger from '/scripts/classes/f42-logger-class.js';
import F42ClFlagDef from '/scripts/classes/f42-cl-flag-def-class.js';

/** @param {NS} ns */
export async function main(ns) {
  let logger = new F42Logger(ns, false, false, true, "HackTest", true);
  let scriptTitle = "HackTest";
  let scriptDescription = "Testing hack shit";
  let scriptFlags = [
    F42ClFlagDef.getReqStrAny("target", "Target host name"),
    F42ClFlagDef.getReqIntAny("m", "Max threads", 100),
    F42ClFlagDef.getReqIntAny("s", "Thread test loop step", 10),
  ];
  let feedback = logger.initFeedback(scriptTitle, scriptDescription, scriptFlags);

  if (!feedback) {
    return;
  }

  let target = feedback.getFlag("target");

  if ("home" == target) {
    feedback.addUserDefErrorAndEnd("--target", "Target can not be home server");
    return;
  }

  if (!ns.serverExists(target)) {
    feedback.addUserDefErrorAndEnd("--target", "Not a valid server: %s", target);
    return;
  }

  let targetServer = ns.getServer(target);

  if(!targetServer.hasAdminRights){
    feedback.addUserDefError("--target", "You do not have root on: %s", target);
    feedback.addUserDefErrorAndEnd(">>>", "run /scripts/fab42-srv-compromise.js %s", target);
    return;
  }

  const pathPayload = "ht-payload/payload.js";
  const pathPayloadResult = "ht-payload/result.txt";
  const payloadFileList = [
    pathPayload,
    pathPayloadResult,
  ];

  // build the payload
  let payload = `/**
 * AUTO CREATED BY hack-test.js from home server
 * 
 * @param {NS} ns
 */
export async function main(ns) {
  let results = {host: "%s"};
  results.weak1T = ns.weakenAnalyze(1);
  results.wAnal = {};
  for (let i = 0; i <= %d; i += %d) {
    let t = i;
    if (t == 0) t = 1;
    results.wAnal["t"+t] = ns.weakenAnalyze(t);
  }
  ns.write("%s", JSON.stringify(results, null, 2), "w");
}
`;

  payload = ns.sprintf(payload, target, feedback.getFlag("m"), feedback.getFlag("s"), pathPayloadResult);

  feedback.printTitle(false);
  feedback.printHiLi("Deploying payload...");

  // delete first if they exist
  rmLocalAndRemoteFiles(ns, target, payloadFileList);

  // make local file so we can copy
  ns.write(pathPayload, payload, "w");

  // copy local payload to target
  if (!ns.scp(pathPayload, target)) {
    // throw new HackTestError(ns, "Could not copy payload file: %s to %s", pathPayload, target);
    feedback.addUserDefErrorAndEnd("ERROR", "Could not copy payload file: %s to %s", pathPayload, target);
    return;
  }

  // excute on target
  let pidPayload = ns.exec(pathPayload, target);
  if(!pidPayload){
    // throw new HackTestError(ns, "Could not execute payload file on %s", target);
    feedback.addUserDefErrorAndEnd("ERROR", "Could not execute payload file on %s", target);
    return;
  }

  // saftey limit on loop
  const maxLoops = 50;
  let loopCnt = 0;

  // loop until we can red the result
  while (!ns.fileExists(pathPayloadResult, target) && loopCnt < maxLoops) {
    feedback.printHiLi(".");
    loopCnt++;
    await ns.sleep(500);
  }

  if(ns.kill(pathPayload, target)){
    feedback.printHiLi(">> Payload killed on target: %s", target);
  }

  // error if loop not exists
  if (!ns.fileExists(pathPayloadResult, target)) {
    // throw new HackTestError(ns, "Payload file not generated on %s", target);
    feedback.addUserDefErrorAndEnd("ERROR", "Payload file not generated on %s", target);
    return;
  }

  // copy result locally
  if (!ns.scp(pathPayloadResult, "home", target)) {
    // throw new HackTestError(ns, "Could not copy payload result file back to home from: %s", target);
    feedback.addUserDefErrorAndEnd("ERROR", "Could not copy payload result file back to home from: %s", target);
    return;
  }

  // read result
  let payloadResult = JSON.parse(ns.read(pathPayloadResult));

  // delete files on target & local
  rmLocalAndRemoteFiles(ns, target, payloadFileList);

  feedback.printSubTitle("Stats for %s", target)
  feedback.printf("- base sec: %s", ns.getServerBaseSecurityLevel(target));
  feedback.printf("- min sec: %s", ns.getServerMinSecurityLevel(target));
  feedback.printf("- curr sec: %s", ns.getServerSecurityLevel(target));
  feedback.printSubTitle("Payload Result:");
  feedback.printf(JSON.stringify(payloadResult, null, 2));
  feedback.printEnd();
}

function rmLocalAndRemoteFiles(ns, target, payloadFileList){
  for (let plFile of payloadFileList) {
    if (ns.fileExists(plFile, target)) {
      ns.rm(plFile, target);
    }

    if (ns.fileExists(plFile)) {
      ns.rm(plFile);
    }
  }
}

class HackTestError extends Error {
  constructor(ns, errMsg, ...errMsgArgs) {
    if (errMsgArgs.length > 0) {
      errMsg = ns.sprintf(errMsg, ...errMsgArgs);
    }

    super(errMsg);
  }
}