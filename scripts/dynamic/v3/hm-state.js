import F42Logger from '/scripts/classes/f42-logger-class.js';
import F42PortHandler from '/scripts/classes/f42-port-handler-class.js';
// import F42ClFlagDef from "/scripts/classes/f42-cl-flag-def-class.js";
import { F42_HM_STATE } from "/scripts/cfg/port-defs.js";
import { getActivityVisStr } from "/scripts/utility/utility-functions.js";
import { F42_ANSI_COL_H1, F42_ANSI_COL_H2, F42_ANSI_COL_HILI, F42_ANSI_COL_TXT, F42_ANSI_COL_ERR } from "/scripts/classes/f42-feedback-class.js";

/** @param {NS} ns */
export async function main(ns) {
  let logger = new F42Logger(ns, false, false, true, "HackManager:State", true);
  let scriptTitle = "HackManager";
  let scriptDescription = "Displays content of HM state port";
  let scriptFlags = [];
  let feedback = logger.initFeedback(scriptTitle, scriptDescription, scriptFlags);

  if (!feedback) {
    return;
  }

  let portHandler = new F42PortHandler(ns, logger);
  let viewPh = portHandler.getPortHandle(F42_HM_STATE.id, false, F42_HM_STATE.key);

  while (true) {
    if(!viewPh.peek()){
      ns.clearLog();
      feedback.printErr("No data on status port, waiting 3s...");
      await ns.sleep(3000);
      continue;
    }

    const sData = viewPh.peek();

    // feedback.printf(viewPh.peek());
    // await ns.sleep(500);
    // continue;

    let hManElapsed = (Date.now() - sData.meta.initTs);
    let maxHostLen = 0;
    let targets = [];
    let totals = {
      weak: 0,
      grow: 0,
      hack: 0,
      rate: "",
    };
    const COL_HACK = "\x1b[38;5;200m";
    let skippedTargets = 0;

    for (const hostname in sData.targets) {
      let tgtData = sData.targets[hostname];

      if(tgtData.totalHacked < 100){
        skippedTargets++;
        continue;
      }

      if (hostname.length > maxHostLen) {
        maxHostLen = hostname.length;
      }

      let rate = tgtData.raw.totalHacked / (Date.now() - tgtData.initTs);

      targets.push([
        hostname,
        tgtData.totalWeakened,
        tgtData.totalGrown,
        tgtData.totalHacked,
        ns.formatNumber(rate, 2) + "/s",
        tgtData.completedJobs,
        "-",
        tgtData.activeJob.type,
        fmatNumber(ns, tgtData.activeJob.estAmt),
        timeFormat(ns, tgtData.activeJob.estTime),
        calcRemaingTime(ns, tgtData.activeJob.startTime, tgtData.activeJob.estTime),
        tgtData.activeJob.msgSent,
        tgtData.activeJob.msgRcvd,
        fmatNumber(tgtData.activeJob.amt),
      ]);

      totals.weak += tgtData.raw.totalWeakened;
      totals.grow += tgtData.raw.totalGrown;
      totals.hack += tgtData.raw.totalHacked;
    }

    let colSpecs = [
      [maxHostLen, "Target", false, false, 'Totals:'],
      [8, "Weak", false, false, ns.formatNumber(totals.weak, 2)],
      [8, "Grow($)", false, false, ns.formatNumber(totals.weak, 2)],
      [8, "Hack($)", COL_HACK, false, ns.formatNumber(totals.hack, 2)],
      [8, "Rate", COL_HACK, false, ns.formatNumber(totals.hack / hManElapsed, 2) + "/s"],
      [4, "Jobs", false, false, ""],
      [1, "-", false, false, ""],
      [4, "Type", false, true, ""],
      [8, "Est. Amt", false, true, ""],
      [6, "Time", false, false, ""],
      [6, "Rem.", false, false, ""],
      [4, "Sent", false, false, ""],
      [4, "Rcvd", false, false, ""],
      [4, "Amt", false, true, ""],
    ];

    let hRowFormat = [];
    let rowFormat = [];
    let hackRowFormat = [];
    let colTitles = [];
    let colSpacers = [];
    let colTotals = [];

    for (const colSpec of colSpecs) {
      if (colSpec[2]) {
        hRowFormat.push(colSpec[2] + "%" + colSpec[0] + "s" + F42_ANSI_COL_HILI);
        rowFormat.push(colSpec[2] + "%" + colSpec[0] + "s" + F42_ANSI_COL_TXT);
      }
      else {
        hRowFormat.push("%" + colSpec[0] + "s");
        rowFormat.push("%" + colSpec[0] + "s");
      }

      if (colSpec[2] || colSpec[3]) {
        hackRowFormat.push(COL_HACK + "%" + colSpec[0] + "s" + F42_ANSI_COL_TXT);
      }
      else {
        hackRowFormat.push("%" + colSpec[0] + "s");
      }

      colSpacers.push(Array(colSpec[0] + 1).join("-"));
      colTitles.push(colSpec[1]);
      colTotals.push(colSpec[4]);
    }

    hRowFormat = hRowFormat.join(" | ");
    rowFormat = rowFormat.join(" | ");
    hackRowFormat = hackRowFormat.join(" | ");

    ns.clearLog();
    feedback.title = ns.sprintf("HackManager v%s (%s)", sData.meta.ver, sData.meta.id);
    feedback.printTitle(false);
    feedback.printSubTitle("Targets:");
    feedback.printHiLi(hRowFormat, ...colTitles);
    feedback.printHiLi(hRowFormat, ...colSpacers);

    for (const row of targets) {
      feedback.printf(
        (row[7] == "hack" ? hackRowFormat : rowFormat),
        ...row
      );
    }

    feedback.printHiLi(hRowFormat, ...colSpacers);
    feedback.printHiLi(hRowFormat, ...colTotals);
    feedback.printHiLi(hRowFormat, ...colSpacers);
    feedback.printHiLi("- %d Targets with low earnings hidden", skippedTargets);

    feedback.printf(getActivityVisStr(feedback.ns));
    await ns.sleep(500);
  }
}

function timeFormat(ns, time) {
  if (!time) {
    return "-";
  }

  let fmatTime = ns.tFormat(time);

  return fmatTime.replace(/\s[a-z]+\s?/gm, (match) => {
    return match.substr(1, 1);
  });
}

function calcRemaingTime(ns, startTime, estTime) {
  if (!startTime || !estTime) {
    return "-";
  }

  let endTime = startTime + estTime;
  let remTime = endTime - Date.now();
  // return ns.tFormat(remTime);

  return timeFormat(ns, remTime);
}

function fmatNumber(ns, num) {
  if (!num) {
    return 0;
  }

  return ns.formatNumber(num, 2);
}

// {
//   "meta": {
//     "ver": 4,
//     "sVer": 4,
//     "id": "utHYOW5"
//   },
//   "targets": {
//     "foodnstuff": {
//       "totalHacked": "9.002m",
//       "totalGrown": "2.392k",
//       "totalWeakened": "328.325",
//       "completedJobs": 22,
//       "activeJob": {
//         "type": "",
//         "estAmt": "",
//         "estTime": "",
//         "msgSent": 0,
//         "msgRcvd": 0,
//         "amt": 0
//       },
//       "raw": {
//         "totalHacked": 9001600,
//         "totalGrown": 2391.555381379711,
//         "totalWeakened": 328.32500000000005
//       }
//     }
//   },
//   "gen": "utI0tiC"
// }