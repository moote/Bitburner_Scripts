import HackUtility from '/scripts/dynamic/f42-hack-utility-class.js';

/** @param {NS} ns */
export async function main(ns) {
  // init arg vars
  let doRestart = false;
  let ramHeadroom = 0;
  let reqThreadCount = 0;
  let scriptPath = false;

  // ceck args
  if (ns.args.length < 1) {
    // do nothing, default settings
  }
  // check for help request
  else if (ns.args[0] == "help") {
    renderError(ns, false);
    return;
  }
  else{
    // set arg vars
    doRestart = ns.args[0] == 0 ? false : true;
    ramHeadroom = ns.args[1] || 0;
    reqThreadCount = ns.args[2] || 0;
    scriptPath = ns.args[3] || false;
  }

  // ns.tprint(doRestart);
  // ns.tprint(ramHeadroom);
  // ns.tprint(reqThreadCount);
  // ns.tprint(scriptPath);
  // return;

  const hackUtil = new HackUtility(ns, true);

  if(doRestart){
    hackUtil.scriptLauncher.restartScript("home", ramHeadroom, reqThreadCount, scriptPath);
  }
  else{
    hackUtil.scriptLauncher.runScript("home", ramHeadroom, reqThreadCount, scriptPath);
  }
}

/**
 * Error render function
 */
function renderError(ns, errorMsg = false) {
  ns.tprintf("Run the hack payload on home server");
  ns.tprintf("Usage: run /scripts/dynamic/f42-hack-from-home.js [restart | help?: number | string] [threads?: number] [ramHeadroom?: number] [scriptPath?: string]");
  ns.tprintf("- restart | help (optional, default 0): if 1 then all processes with matching script name will be killed (args ignored), if 0 then nothing will be killed, if set 'help' shows this help text");
  ns.tprintf("- ramHeadroom (optional, default 0): The amound of RAM to reserve for other processes");
  ns.tprintf("- threads (optional, default 0): if 0 then max threads will be launched into available RAM, otherwise requested number of threads will be launched");
  ns.tprintf("- scriptPath (optional, default null): If not set then the HackPayload target will be used, else use requested path");

  if (errorMsg !== false) {
    ns.tprintf("!! %s !!", errorMsg);
  }
}