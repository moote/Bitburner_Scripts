// Importing
import HackUtility from 'scripts/dynamic/f42-hack-utility-class';
// import HackConfig from 'scripts/dynamic/f42-hack-cfg-class.js';
import { numberToBase62Str, getRandomNumberInRange } from "scripts/utility/utility-functions";

import F42Logger from "scripts/classes/f42-logger-class";

/**
 * @param {NS} ns
 * @version 4.0
**/
export async function main(ns) {

  ns.tprintf("???");

  ns.tprint("!!!");
  ns.tprint("!!!");

  // if (!ns.args[0]) {
  //   ns.tprint('You must specify a file path');
  // }
  // else {
  //   for (const path of ns.ls("home", ns.args[0])) {
  //     ns.tprintf("%s >> pid: %s", path, path.split("-")[0].split("/").pop());
  //   }
  // }
}

// export async function main(ns) {
//   // let hostname = "fab42-2048GB-1729516848759";
//   // let processInfo = ns.ps(hostname);
//   // ns.tprint(processInfo);

//   // let growthMulti = 1.75;
//   // let hostname = "omega-net";
//   // ns.tprint(ns.growthAnalyze(hostname, growthMulti, 1));
//   // ns.tprint(ns.growthAnalyze(hostname, growthMulti, 2));
//   // ns.tprint(ns.growthAnalyze(hostname, growthMulti, 3));

//   // const hackConfig = new HackConfig(ns, true);
//   // ns.tprintf(">>>> Class::HackConfig.status: %s", hackConfig.statusVerbose);
//   // ns.tprintf(">>>> Class::HackConfig.target: %s", hackConfig.target);
//   // ns.tprintf(">>>> Class::HackConfig.hackScriptPath: %s", hackConfig.hackScriptPath);

//   // let serverObj = ns.getServer();
//   // ns.tprintf(JSON.stringify(serverObj));

//   ns.tail();
//   const hackUtil = new HackUtility(ns, true);
//   // const targetHost = "f42-8GB-usyCJ8k";
//   // hackUtil.scriptLauncher.restartScript(targetHost);
//   // hackUtil.scriptLauncher.runScript(targetHost, 0, 0, []);
//   // hackUtil.scriptLauncher.runScript(targetHost, 0, 0, ["scripts/dynamic/hackpayload.js", "scripts/dynamic/f42-hack-payload-class.js"]);

//   let rndNum = getRandomNumberInRange(hackUtil.cfg.psMinSleepMillis, hackUtil.cfg.psMaxSleepMillis);
//   ns.tprintf(">>>> hackUtil.cfg.minSleepMillis: %d", hackUtil.cfg.psMinSleepMillis);
//   ns.tprintf(">>>> hackUtil.cfg.maxSleepMillis: %d", hackUtil.cfg.psMaxSleepMillis);
//   ns.tprintf(">>>> rndNum: %d", rndNum);

//   const data = ns.flags([
//     ['delay', 0], // a default number means this flag is a number
//     ['server', 'foodnstuff'], //  a default string means this flag is a string
//     ['exclude', []], // a default array means this flag is a default array of string
//     ['help', false], // a default boolean means this flag is a boolean
//     ['v', false], // short form
//   ]);
//   ns.tprint(data);
// }