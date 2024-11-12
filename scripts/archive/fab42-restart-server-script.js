/** @param {NS} ns */
export async function main(ns) {
  // ns.tprintf("\n--------------------------");
  // ns.tprintf("Restart Server Script");

  // if (ns.args.length != 2) {
  //   ns.tprintf("Usage: run fab42-restart-server-script.js [hostname] [scriptPath]");
  //   ns.tprintf("!! You must set all required args !!");
  //   return;
  // }

  let hostname = ns.args[0];
  let scriptPath = ns.args[1];

  restartScript(ns, hostname, scriptPath);
}

async function restartScript(ns, hostname, scriptPath) {
  ns.print("Restart Server Script");
  ns.printf("Hostname: %s", hostname);
  ns.printf("Script: %s", scriptPath);

  // get script execution RAM
  let scriptExeRAM = ns.getScriptRam(scriptPath);

  // get active scripts
  let activeScripts = ns.ps(hostname);

  // kill any active scripts
  if (activeScripts.length > 0) {
    ns.print("Killing %d active scripts...", activeScripts.length);
    ns.killall(hostname);
  }

  // look for all matching processes and kill
  for (const processObj of activeScripts) {
    if (processObj.filename == hackConfigObj.hackScriptPath) {
      ns.print("Killing PID:%d with %d threads on %s", processObj.pid, processObj.threads, hostname);
      ns.kill(processObj.pid)
    }
  }

  // pause to let memory clear
  // await ns.sleep(750);

  // get host available RAM
  let serverBaseRAM = ns.getServerMaxRam(hostname);
  let serverUsedRAM = ns.getServerUsedRam(hostname);
  let serverAvailRAM = serverBaseRAM - serverUsedRAM;

  ns.printf("Max RAM: %s", ns.formatRam(serverBaseRAM));
  ns.printf("Used RAM: %s", ns.formatRam(serverUsedRAM));
  ns.printf("Avail RAM: %s", ns.formatRam(serverAvailRAM));

  // calc threads
  let scriptExeThreads = Math.trunc(serverAvailRAM / scriptExeRAM);

  // delete file if exists and copy latest
  if (ns.fileExists(scriptPath, hostname)) {
    ns.printf("Deleting existing file: %s", scriptPath);
    ns.rm(scriptPath, hostname);
  }

  ns.scp(scriptPath, hostname);

  // start script with max threads
  ns.printf("Starting script with %d threads", scriptExeThreads);
  ns.exec(scriptPath, hostname, scriptExeThreads);
}