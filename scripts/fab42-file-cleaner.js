/**
 * @param {NS} ns
 * @version 1.8
 * */
export async function main(ns) {
  var targetStr = " >*<";
  var fileToRemove = "";
  let doRemove = false;

  ns.tprintf("\n--------------------------");
  ns.tprintf("File Cleaner");

  if (ns.args.length < 1) {
    ns.tprintf("Usage: run file-cleaner.js [file path to remove] [remove file? | optional]");
    ns.tprintf("- By default script only scans, set optional second argument to 'true' to remove file");
    ns.tprintf("!! You must set all required args !!");
    return;
  }

  fileToRemove = ns.args[0];

  if(ns.args.length == 2){
    if(ns.args[1] === true){
      doRemove = true;
    }
    else{
      ns.tprintf("!! Second argument must be 'true' if you want to scan & delete, omit for scan only");
      return;
    }
  }

  ns.tprintf("--------------------------");
  ns.tprintf("Target conditions:");
  if(doRemove){
    ns.tprintf("- All reachable servers will be checked, and file removed if found");
    ns.tprintf("- File to remove: %s", fileToRemove);
  }
  else{
    ns.tprintf("- Test mode only, no file removal");
    ns.tprintf("- All reachable servers will be checked");
    ns.tprintf("- File to test: %s", fileToRemove);
  }
  ns.tprintf("Scanning servers:");
  ns.tprintf("%s denotes file found\n", targetStr);
  ns.tprintf("--------------------------");

  // recursivly scan all severs
  scanAdjServers(ns, "home", "", targetStr, fileToRemove, doRemove);

  ns.tprintf("--------------------------");
  ns.tprintf("END");
}

function scanAdjServers(ns, baseServer, depthStr, targetStr, fileToRemove, doRemove) {
  let i = 1;

  if (baseServer == "home") {
    i = 0;
  }
  else {
    depthStr += ">";
  }

  let adjServers = ns.scan(baseServer);

  if (baseServer = "home" || adjServers.length > 1) {
    for (i; i < adjServers.length; i++) {
      let serverHostName = adjServers[i];
      let resultStr = depthStr + serverHostName

      if (ns.fileExists(fileToRemove, serverHostName)) {
        // append target string
        resultStr += targetStr;

        if (doRemove && ns.rm(fileToRemove, serverHostName)) {
          resultStr += " | file_removed";
        }
      }

      // print results
      ns.tprintf(resultStr);

      // scan recursively
      scanAdjServers(ns, serverHostName, depthStr, targetStr, fileToRemove, doRemove);
    }
  }
}
