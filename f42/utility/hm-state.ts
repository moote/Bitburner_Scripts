import Logger from '/f42/classes/Logger.class';
import { getActivityVisStr } from '/f42/utility/utility-functions';
import { F42_ANSI_COL_HILI, F42_ANSI_COL_TXT } from "f42/classes/FeedbackRenderer"
import { HMStateMsgReader } from '/f42/hack-man/classes/HMStateMsgReader.class';

/** @param {NS} ns */
export async function main(ns: NS): Promise<void> {
  const scriptTitle = "HackManager:State";
  const scriptDescription = "Renders content of HM state port";
  const logger = new Logger(ns, false, false, true, scriptTitle, true);
  const feedback = logger.initFeedback(scriptTitle, scriptDescription);

  if (feedback.printHelpAndEnd()) {
    return;
  }

  const hmStateMsgReader = new HMStateMsgReader(ns);

  while (true) {
    const hmStateMsg = hmStateMsgReader.peekMessage();

    if(hmStateMsg === false){
      ns.clearLog();
      feedback.printErr("No data on status port, waiting 3s...");
      await ns.sleep(3000);
      continue;
    }

    const sData = hmStateMsg.state;

    // feedback.printf(msgScktReader.peekMessage().state);
    // await ns.sleep(500);
    // continue;

    const hManElapsed = (Date.now() - sData.meta.initTs);
    let maxHostLen = 0;
    const targets = [];
    const totals = {
      weak: 0,
      grow: 0,
      hack: 0,
      rate: "",
    };
    const COL_HACK = "\x1b[38;5;200m";
    const skippedTargets = 0;

    for (const hostname in sData.targets) {
      const tgtData = sData.targets[hostname];

      // if(tgtData.totalHacked < 100){
      //   skippedTargets++;
      //   continue;
      // }

      if (hostname.length > maxHostLen) {
        maxHostLen = hostname.length;
      }

      const rate = tgtData.raw.totalHacked / (Date.now() - tgtData.initTs);

      targets.push([
        hostname,
        tgtData.totalWeakened,
        tgtData.totalGrown,
        tgtData.totalHacked,
        ns.formatNumber(rate, 2) + "/s",
        tgtData.compJobs,
        "-",
        tgtData.activeJob.type,
        fmatNumber(ns, tgtData.activeJob.estAmt),
        timeFormat(ns, tgtData.activeJob.estTime),
        calcRemaingTime(ns, tgtData.activeJob.startTime, tgtData.activeJob.estTime),
        tgtData.activeJob.msgSent,
        tgtData.activeJob.msgRcvd,
        fmatNumber(ns, tgtData.activeJob.amt),
      ]);

      totals.weak += tgtData.raw.totalWeakened;
      totals.grow += tgtData.raw.totalGrown;
      totals.hack += tgtData.raw.totalHacked;
    }

    const colSpecs: [number, string, false | string, boolean, string][] = [
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

    const hRowFormat: string[] | string = [];
    const rowFormat = [];
    const hackRowFormat = [];
    const colTitles = [];
    const colSpacers = [];
    const colTotals = [];

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

    const hRowFormatStr = hRowFormat.join(" | ");
    const rowFormatStr = rowFormat.join(" | ");
    const hackRowFormatStr = hackRowFormat.join(" | ");

    ns.clearLog();
    feedback.title = ns.sprintf("HackManager v%s (%s)", sData.meta.ver, sData.meta.id);
    feedback.printTitle(false);
    feedback.printSubTitle("Targets:");
    feedback.printHiLi(hRowFormatStr, ...colTitles);
    feedback.printHiLi(hRowFormatStr, ...colSpacers);

    for (const row of targets) {
      feedback.printf(
        (row[7] == "hack" ? hackRowFormatStr : rowFormatStr),
        ...row
      );
    }

    feedback.printHiLi(hRowFormatStr, ...colSpacers);
    feedback.printHiLi(hRowFormatStr, ...colTotals);
    feedback.printHiLi(hRowFormatStr, ...colSpacers);
    feedback.printHiLi("- %d Targets with low earnings hidden", skippedTargets);

    feedback.printf(getActivityVisStr(feedback.ns));
    await ns.sleep(500);
  }
}

function timeFormat(ns: NS, time: number) {
  if (!time) {
    return "-";
  }

  const fmatTime = ns.tFormat(time);

  return fmatTime.replace(/\s[a-z]+\s?/gm, (match) => {
    return match.substr(1, 1);
  });
}

function calcRemaingTime(ns: NS, startTime: number, estTime: number) {
  if (!startTime || !estTime) {
    return "-";
  }

  const endTime = startTime + estTime;
  const remTime = endTime - Date.now();
  // return ns.tFormat(remTime);

  return timeFormat(ns, remTime);
}

function fmatNumber(ns: NS, num: number) {
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