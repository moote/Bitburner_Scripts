import F42Logger from '/scripts/classes/f42-logger-class.js';
// import F42ClFlagDef from '/scripts/classes/f42-cl-flag-def-class.js';
// import TargetServer from "/scripts/dynamic/v3/target-server-class.js";
// import HackAction from "/scripts/dynamic/v3/hack-action-class.js";
// import { getRandomNumberInRange, timestampAsBase62Str } from "/scripts/utility/utility-functions.js";

/** @param {NS} ns */
export async function main(ns: NS): void {
    // targetServerTest(ns);
    // thrallInfectorTest(ns);
    // portContentsTest(ns);
    // testNums(ns);
    // await shorthandIfTest(ns);
    await gangTest(ns);
}

/** @param {NS} ns */
async function gangTest(ns: NS): void {
    const scriptTitle = "Gang Test";
    const logger = new F42Logger(ns, true, true, false, scriptTitle, false);
    const scriptDescription = "";
    const scriptFlags = [];
    const feedback = logger.initFeedback(scriptTitle, scriptDescription, scriptFlags);
    if (!feedback) {
        return;
    }

    let topMemInfo;

    for (const mName of ns.gang.getMemberNames()) {
        if (!topMemInfo || ns.gang.getMemberInformation(mName).hack > topMemInfo.hack) {
            topMemInfo = ns.gang.getMemberInformation(mName);
        }
    }

    feedback.printf("Top member (hacking): %s", topMemInfo.toString());

    while (true) {
        const duration = await ns.gang.nextUpdate();

        ns.ui.clearTerminal();
        feedback.printTitle();

        const gangInfo = ns.gang.getGangInformation();



        feedback.printf("Gang completed %s of activity.", ns.tFormat(duration));
        feedback.print("Bonus time remaining: ", ns.tFormat(ns.gang.getBonusTime()));
        feedback.print("Wanted level: ", gangInfo.wantedLevel);
        feedback.print("Wanted level gain: ", gangInfo.wantedLevelGainRate);
        feedback.print(timestampAsBase62Str());
    }

    feedback.printLineSeparator();
    // feedback.printHiLi("evenCnt: %d / %d", evenCnt, maxLoops);
    feedback.printEnd();
}

// /** @param {NS} ns */
// async function shorthandIfTest(ns: NS): void {
//     const scriptTitle = "Shorthand If Test";
//     const logger = new F42Logger(ns, false, true, false, scriptTitle, true);
//     const scriptDescription = "";
//     const scriptFlags = [];
//     const feedback = logger.initFeedback(scriptTitle, scriptDescription, scriptFlags);
//     if (!feedback) {
//         return;
//     }

//     ns.ui.clearTerminal();
//     feedback.printTitle();

//     const maxLoops = 10;
//     let remLoops = maxLoops;
//     let evenCnt = 0;

//     while (remLoops > 0) {
//         const rndNum = Math.floor(Math.random() * 1000);
//         const rndMod = rndNum % 2;

//         feedback.printf("Remainder type: %s", typeof rndMod);

//         if (rndMod === 0) {
//             feedback.printHiLi("* rndNum: %d >> rndMod: %d", rndNum, rndMod);
//             evenCnt++;
//         }
//         else {
//             feedback.printf("rndNum: %d >> rndMod: %d", rndNum, rndMod);
//         }

//         // rndMod === 0 ? evenCnt++ : null;

//         remLoops--;
//         // await ns.sleep(getRandomNumberInRange(10, 50));
//     }

//     feedback.printLineSeparator();
//     feedback.printHiLi("evenCnt: %d / %d", evenCnt, maxLoops);
//     feedback.printEnd();
// }

// function testNums(ns: NS): void {
//     const rnd = Math.random();
//     const rndThou = Math.floor(rnd * 1000);
//     const rndRemainder = rndThou % 2;

//     ns.printf("rnd: %f typeof %s", rnd, typeof rnd);
//     ns.printf("rndThou: %f typeof %s", rndThou, typeof rndThou);
//     ns.printf("rndRemainder: %f typeof %s", rndRemainder, typeof rndRemainder);
//     ns.printf("rndRemainder isSafeInteger?: %t", Number.isSafeInteger(rndRemainder));
//     ns.printf("rndRemainder isInteger?: %t", Number.isInteger(rndRemainder));
//     ns.printf("rndRemainder == 0: %t", (rndRemainder == 0));
//     ns.printf("rndRemainder === 0: %t", (rndRemainder === 0));
// }

// /** @param {NS} ns */
// async function targetServerTest(ns: NS): void {
//     const logger = new F42Logger(ns, true, false, true, "HMV3", false);
//     const scriptTitle = "HackManager V3 TEst";
//     const scriptDescription = "";
//     const scriptFlags = [];
//     const feedback = logger.initFeedback(scriptTitle, scriptDescription, scriptFlags);
//     if (!feedback) {
//         return;
//     }

//     feedback.printTitle();

//     const tgtSrv = new TargetServer(ns, logger, "joesguns");
//     ns.tprintf(tgtSrv.toString());
// }

// /** @param {NS} ns */
// function thrallInfectorTest(ns: NS): void {
//     ns.tprintf("FILES: >>>>>>>>>>>>>>");
//     for (const filePath of ns.ls(ns.getHostname(), "v3/thrall")) {
//         ns.tprintf(filePath);
//     }

//     ns.tprintf("Purchased Servers: >>>>>>>>>>>>>>");
//     for (const pHost of ns.getPurchasedServers()) {
//         ns.tprintf("%s", pHost);
//     }

//     ns.tprintf("Processes: >>>>>>>>>>>>>>");
//     // const thrallJobRegex = /_\.js/g;
//     const thrallCtrlRegex = /thrall\/control\.js/g;
//     for (const psInfo of ns.ps(ns.getHostname())) {
//         if (psInfo.filename.match(thrallCtrlRegex)) {
//             ns.tprintf("%s <<<<< MATCH", psInfo.filename);
//             // ns.kill(psInfo.filename, ns.getHostname(), ...psInfo.args);
//         }
//         else {
//             ns.tprintf("%s", psInfo.filename);
//         }
//     }
// }

// /** @param {NS} ns */
// function portContentsTest(ns: NS): void {
//     let portData = ns.peek(66);
//     ns.tprintf(JSON.stringify(portData, null, 2));

//     if (portData === "NULL PORT DATA") {
//         ns.tprintf("EMPTY");
//     }
//     else {
//         ns.tprintf("NOT EMPTY");
//     }

//     ns.writePort(66, true);
//     portData = ns.peek(66);
//     ns.tprintf(JSON.stringify(portData, null, 2));

//     if (portData === "NULL PORT DATA") {
//         ns.tprintf("EMPTY");
//     }
//     else {
//         ns.tprintf("NOT EMPTY");
//     }

//     ns.clearPort(66);
// }