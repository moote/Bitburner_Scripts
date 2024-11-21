import Logger from '/f42/classes/Logger.class';
import { NS } from '@ns'

export async function main(ns: NS): Promise<void> {
  const scriptTitle = "Route to Server";
  const scriptDescription = "Show the route to specified server";
  const logger = new Logger(ns, true, true, false, scriptTitle);
  const feedback = logger.initFeedback(scriptTitle, scriptDescription);
  const flags = feedback.flagValidator;
  
  flags.addStringFlag("target", "Target server's hostname", true);

  if(feedback.printHelpAndEnd()){
    return;
  }

  feedback.printTitle();

  const targetHostname = flags.getFlagString("target");
  const pathArr:string[] = [];

  // recursively scan all servers
  if (scanAdjServers(ns, targetHostname, "home", -1, pathArr)) {
    feedback.printf("Server found:");
  }
  else {
    feedback.printf("Server not found:");
  }

  // render the path
  feedback.printHiLi("\n%s\n\n", pathArr.join(" >> "));
  feedback.printEnd();
}

function scanAdjServers(ns: NS, targetHostname: string, currHostname: string, currDepth: number, pathArr: string[]) {
  // inc depth
  currDepth++;

  // add to path
  pathArr.push(currHostname);

  // init index for loop, start at 1 as 0 is previous host in chain
  let i = 1;

  if (currHostname == "home") {
    // for home there is no previous host, so start at 0
    i = 0;
  }
  else if (currHostname == targetHostname) {
    // host found return up chain
    return true;
  }

  // get adjacent servers
  const adjServers = ns.scan(currHostname);

  if (currHostname === "home" || adjServers.length > 1) {
    for (i; i < adjServers.length; i++) {
      // scan recursively
      if (scanAdjServers(ns, targetHostname, adjServers[i], currDepth, pathArr) === true) {
        // host found return up chain
        return true;
      }
    }
  }

  // if we got here path not found; remove 
  // this host from path and return false
  pathArr.pop();
  return false;
}