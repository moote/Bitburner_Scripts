/**
 * @param {NS} ns
 * @version 2.0
 * */
export async function main(ns) {
  var opVars = {
    isVerbose: false,
    reqMinRAM: 0,
    reqHackLevel: 0,
    reqHackPorts: 0,
    doCopy: false,
    fileToCopy: "",
    fileToCopyRAM: 0.0,
  };

  ns.tprintf("\n--------------------------");
  ns.tprintf("Sever scan and hack");

  if (ns.args.length < 4) {
    ns.tprintf("Usage: run srv-scan-hack.js [verbose: bool] [min server RAM] [max server hack level] [max server ports] [hack file path to copy and execute | optional]");
    ns.tprintf("- hack file path is optional, will just analyse if not set");
    ns.tprintf("!! You must set all required args !!");
    return;
  }

  let userHackLev = ns.getHackingLevel();
  opVars.isVerbose = ns.args[0];
  opVars.reqMinRAM = ns.args[1];
  opVars.reqHackLevel = ns.args[2];
  opVars.reqHackPorts = ns.args[3];

  if (ns.args.length == 5) {
    opVars.doCopy = true;
    opVars.fileToCopy = ns.args[4];
  }

  // calc the max number of ports we can open
  var userMaxHackPorts = 0;

  if (ns.fileExists("BruteSSH.exe", "home")) {
    userMaxHackPorts++;
    if (ns.fileExists("FTPCrack.exe", "home")) {
      userMaxHackPorts++;
      if (ns.fileExists("relaySMTP.exe", "home")) {
        userMaxHackPorts++;
        if (ns.fileExists("HTTPWorm.exe", "home")) {
          userMaxHackPorts++;
          if (ns.fileExists("SQLInject.exe", "home")) {
            userMaxHackPorts++;
          }
        }
      }
    }
  }

  if (opVars.reqHackPorts > userMaxHackPorts) {
    ns.tprintf("!! You requested severs with %d ports, but you can only hack %d !!", opVars.reqHackPorts, userMaxHackPorts);
    return;
  }

  if (opVars.reqHackLevel > userHackLev) {
    ns.tprintf("!! Your requested hack level (%d) is greater than your hack level (%d) !!", opVars.reqHackLevel, userHackLev);
    return;
  }

  ns.tprintf("- You can hack %d ports", userMaxHackPorts);
  ns.tprintf("- Your hack level is: %d", userHackLev);

  if (opVars.doCopy) {
    // get file size
    try {
      opVars.fileToCopyRAM = ns.getScriptRam(opVars.fileToCopy);
    }
    catch (e) {
      ns.tprintf("!! Requested hack file not a valid script: %s", opVars.fileToCopy);
      return;
    }

    ns.tprintf("--------------------------");
    ns.tprintf("target conditions:");
    ns.tprintf("- Min server RAM: %d", opVars.reqMinRAM);
    ns.tprintf("- Max server hack lev: %d", opVars.reqHackLevel);
    ns.tprintf("- Max server hack ports: %d", opVars.reqHackPorts);
    ns.tprintf("- File to copy & execute: %s", opVars.fileToCopy);
    ns.tprintf("- %f RAM required by script", opVars.fileToCopyRAM);

    if (opVars.fileToCopyRAM > opVars.reqMinRAM) {
      ns.tprintf("!! Script requires more RAM (%f) than your requested min RAM (%d) !!", fileToCopyRAM, opVars.reqMinRAM);
      return;
    }
  }
  else {
    ns.tprintf("- Analyse only, no file copy");
  }

  ns.tprintf("Scanning servers:");
  ns.tprintf("--------------------------");
  ns.tprintf("- U-RAM: Used RAM");
  ns.tprintf("- A-RAM: Available RAM");
  ns.tprintf("- H-Lev: Server hacking skill level");
  ns.tprintf("- H-P0rts: Server open ports required for Nuke\n\n");

  const rowFormat = '%6s | %5s | %-30s | %5s | %7s | %7s | %5s | %7s | %-20s';
  ns.tprintf(rowFormat, "Target", "Depth", "Host", "RAM", "U-RAM", "A-RAM", "H-Lev", "H-P0rts", "Results");
  ns.tprintf(rowFormat, '------', '-----', '--------------------', '-----', '------', '------', '-----', '-------', '--------------------');

  // recursivly scan all severs
  scanAdjServers(ns, "home", 0, opVars, rowFormat);

  ns.tprintf("--------------------------");
  ns.tprintf("END");
}

function scanAdjServers(ns, baseServer, depthCnt, opVars, rowFormat) {
  let i = 1;

  if (baseServer == "home") {
    i = 0;
  }
  else {
    depthCnt++;
  }

  let adjServers = ns.scan(baseServer);

  if (baseServer = "home" || adjServers.length > 1) {
    for (i; i < adjServers.length; i++) {
      let serverHostName = adjServers[i];
      let serverBaseRAM = ns.getServerMaxRam(serverHostName);
      let serverUsedRAM = ns.getServerUsedRam(serverHostName);
      let serverAvailRAM = serverBaseRAM - serverUsedRAM;
      let serverHackLev = ns.getServerRequiredHackingLevel(serverHostName);
      let serverHackPorts = ns.getServerNumPortsRequired(serverHostName);

      let hasRoot = ns.hasRootAccess(serverHostName);
      let canHack = ns.hasRootAccess(serverHostName);

      var resultStrs = [];
      var hasFileCopied = false;
      var hasFileExe = false;
      var fileExeThreads = 0;

      if (!canHack) {
        canHack = (serverHackLev <= opVars.reqHackLevel && serverHackPorts <= opVars.reqHackPorts);
      }

      if (canHack) {
        if (serverBaseRAM > 0 && serverAvailRAM >= opVars.reqMinRAM) {
          if (opVars.doCopy) {
            resultStrs.push("file_cpy_req");

            // file copy & execution here
            if (!hasRoot) {
              resultStrs.push("no_root");

              // open ports
              if (serverHackPorts > 0) {
                for (let j = serverHackPorts; j > 0; j--) {
                  switch (j) {
                    case 5: // SQL
                      ns.sqlinject(serverHostName);
                      resultStrs.push("sqlinject");
                      break;
                    case 4: // HTTP
                      ns.httpworm(serverHostName);
                      resultStrs.push("httpworm");
                      break;
                    case 3: // SMTP
                      ns.relaysmtp(serverHostName);
                      resultStrs.push("relaysmtp");
                      break;
                    case 2: // FTP
                      ns.ftpcrack(serverHostName);
                      resultStrs.push("ftpcrack");
                      break;
                    case 1: // SSH
                      ns.brutessh(serverHostName);
                      resultStrs.push("brutessh");
                      break;
                  }
                }
              }

              // nuke
              ns.nuke(serverHostName);

              // re-test root
              hasRoot = ns.hasRootAccess(serverHostName);

              if (hasRoot) {
                resultStrs.push("nuked");
              }
              else {
                resultStrs.push("nuke_failed");
              }
            }
            else {
              resultStrs.push("existing_root");
            }

            // only copy/exe if we now have root
            if (hasRoot) {
              // file copy
              if (ns.scp(opVars.fileToCopy, serverHostName)) {
                hasFileCopied = true;

                // calc threads
                fileExeThreads = Math.trunc(serverAvailRAM / opVars.fileToCopyRAM);

                // file execution
                if (ns.exec(opVars.fileToCopy, serverHostName, fileExeThreads)) {
                  hasFileExe = true;
                }
              }
            }
          }

          // test for success and log
          if (hasFileCopied) {
            resultStrs.push("file_cpyd");

            if (hasFileExe) {
              resultStrs.push("file_exe");
              resultStrs.push(fileExeThreads + "_threads");
            }
          }
          else {
            resultStrs.push("no_file_cpy");
            resultStrs.push("no_file_exe");
          }
        }
        else {
          canHack = false;

          if (serverBaseRAM == 0) {
            resultStrs.push("ram_zero");
          }

          if (serverAvailRAM < opVars.reqMinRAM) {
            resultStrs.push("a_ram_too_low");
          }
        }
      }
      else {
        if (serverHackLev > opVars.reqHackLevel) {
          resultStrs.push("h_lev_too_high");
        }

        if (serverHackPorts > opVars.reqHackPorts) {
          resultStrs.push("h_ports_too_high");
        }
      }

      // print results
      if (canHack || opVars.isVerbose) {
        ns.tprintf(
          rowFormat,
          canHack ? "*" : "",
          depthCnt,
          serverHostName,
          ns.formatRam(serverBaseRAM, 0),
          ns.formatRam(serverUsedRAM, 1),
          ns.formatRam(serverAvailRAM, 1),
          serverHackLev,
          serverHackPorts,
          resultStrs.join(' | ')
        );
      }

      // scan recursively
      scanAdjServers(ns, serverHostName, depthCnt, opVars, rowFormat);
    }
  }
}