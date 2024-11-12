import { F42_THRALL_ACT_RESULT_PATH } from "/scripts/dynamic/v2/thrall/hack_.js";

/** @param {NS} ns */
export async function main(ns) {
  const weakenScriptPath = "/scripts/dynamic/v2/thrall/weaken_.js";
  const growScriptPath = "/scripts/dynamic/v2/thrall/grow_.js";
  const hackScriptPath = "/scripts/dynamic/v2/thrall/hack_.js";
  const weakenAction = {
    path: weakenScriptPath,
    ram: ns.getScriptRam(weakenScriptPath),
  };
  const growAction = {
    path: growScriptPath,
    ram: ns.getScriptRam(growScriptPath),
  };
  const hackAction = {
    path: hackScriptPath,
    ram: ns.getScriptRam(hackScriptPath),
  };

  const newJobPort = 10;
  const completedJobPort = 11;
  const workingUpdPort = 12;
  const thisHostname = ns.getHostname();
  let potentialJob;
  let jobAction = false;
  let jobPid;
  let jobList = {};
  let pendingMsgArr = [];
  let acceptedJob = false;
  let startAmt = 0;
  let endAmt = 0;

  const ONE_JOB = false;
  let hasOneJob = false;

  ns.disableLog("ALL");
  // ns.enableLog("sleep");

  if (thisHostname == "home") {
    ns.tail();
  }

  while (true) {
    // get job
    if (!ONE_JOB || !hasOneJob) {
      try {
        potentialJob = popMessage(ns, newJobPort);
      }
      catch (e) {
        potentialJob == false;
      }

      acceptedJob = false;

      if (potentialJob !== false) {
        jobAction = false;

        switch (potentialJob.actionType) {
          case "weak":
            jobAction = weakenAction;
            startAmt = ns.getServerSecurityLevel(potentialJob.target);
            break;
          case "grow":
            jobAction = growAction;
            startAmt = ns.getServerMoneyAvailable(potentialJob.target);
            break;
          case "hack":
            jobAction = hackAction;
            startAmt = ns.getServerMoneyAvailable(potentialJob.target);
            break;
          default:
            //do nothing
            break;
        }

        if (jobAction != false) {
          if (checkCanRun(ns, jobAction.ram, thisHostname, potentialJob.threads)) {
            tcLog(ns, "RUN(%s): %s >> %s", potentialJob.msgId, potentialJob.target, potentialJob.actionType);

            // start job
            jobPid = ns.run(
              jobAction.path,
              potentialJob.threads,
              potentialJob.target
            );

            // add job to running list
            potentialJob.msgAcceptedTs = Date.now();
            potentialJob.isAccepted = true;
            potentialJob.result.actionedBy = thisHostname;
            potentialJob.result.startTs = potentialJob.msgAcceptedTs;
            potentialJob.result.startAmt = startAmt;

            jobList[jobPid] = potentialJob;
            acceptedJob = true;

            if (ONE_JOB) {
              hasOneJob = true;
            }
          }
        }

        if (!acceptedJob) {
          // push message back for another thrall
          pushMessage(ns, newJobPort, potentialJob);
        }
      }
    }
    else {
      tcLog(ns, "ONE_JOB mode preventing loading more jobs");
    }

    // test for completed jobs; result file for pid will be available
    for (let jobPid in jobList) {
      // tcLog(ns, "checking pid: %d", jobPid);

      let fPath = ns.sprintf(F42_THRALL_ACT_RESULT_PATH, jobPid);
      if (ns.fileExists(fPath)) {
        // script has ended, build message and queue
        let actionResult = JSON.parse(ns.read(fPath));

        tcLog(ns, "FOUND_RESULT: %s", JSON.stringify(actionResult, null, 2));

        // delete file
        ns.rm(fPath);

        // save results
        jobList[jobPid].result.amt = actionResult.amt;
        jobList[jobPid].result.endTs = actionResult.endTs;

        if (actionResult.type == "grow") {
          tcLog(ns, "END_AMT GROW: %s * %s -> %s", jobList[jobPid].startAmt, actionResult.amt, jobList[jobPid].result.endAmt);
          jobList[jobPid].result.endAmt = (jobList[jobPid].startAmt * actionResult.amt);
        }
        else {
          tcLog(ns, "END_AMT NOT GROW: %s + %s -> %s", jobList[jobPid].startAmt, actionResult.amt, jobList[jobPid].result.endAmt);
          jobList[jobPid].result.endAmt = (jobList[jobPid].startAmt + actionResult.amt);
        }

        // build and send message
        pendingMsgArr.push(jobList[jobPid]);

        tcLog(ns, "MSG_PENDING: %s", jobList[jobPid].msgId);
        tcLog(ns, "PENDING_MSG_CNT: %d", pendingMsgArr.length);

        // delete job from list
        delete jobList[jobPid];
      }
    }

    // interate pending messages, if failed to post (stack full), stop iteration 
    // and push last message back into queue
    for (let i = 0; i < pendingMsgArr.length; i++) {
      let msg = pendingMsgArr.pop();
      msg.msgReturnedTs = Date.now();
      msg.isReturned = true;
      let msgSent = false;
      tcLog(ns, "TRY_SEND: %s", msg.msgId);
      try {
        if (pushMessage(ns, completedJobPort, msg)) {
          msgSent = true;

          if (ONE_JOB) {
            // one job completed
            tcLog(ns, "One job completed, exiting");
            return;
          }
        }
        else {
          msgSent = false;
        }
      }
      catch (e) {
        msgSent = false;
      }

      if (!msgSent) {
        tcLog(ns, "MSG_NOT_SENT: %s", msg.msgId);
        msg.msgReturnedTs = 0;
        msg.isReturned = false;
        pendingMsgArr.push(msg);
        break;
      }
      else{
        tcLog(ns, "MSG_SENT: %s", msg.msgId);
      }

      tcLog(ns, "PENDING_MSG_CNT: %d", pendingMsgArr.length);
    }

    await ns.sleep(getRandomNumberInRange(100, 1000));
  }
}

function tcLog(ns, msgTmp, ...msgArgs) {
  ns.printf("ThrallControl: " + msgTmp, ...msgArgs);
}

function checkCanRun(ns, scriptRamUsage, thisHostname, reqThreads) {
  let availableRam = ns.getServerMaxRam(thisHostname) - ns.getServerUsedRam(thisHostname);
  let availThreads = Math.ceil(availableRam / scriptRamUsage);
  tcLog(
    ns,
    "checkCanRun:\n- scriptRamUsage: %d\n- reqThreads: %d\n- availableRam: %d\n- availThreads: %d",
    scriptRamUsage,
    reqThreads,
    availableRam,
    availThreads
  );
  return (availThreads >= reqThreads);
}

/**
   * Try to push a message, returns false if full, if not
   * then the object is inserted in the stack and 'true' returned
   * 
   * Throws exceptions on other errors.
   */
function pushMessage(ns, portId, messageObj) {
  let mqPortHandle = ns.getPortHandle(portId);

  if (!mqPortHandle) {
    throw new Error(ns.sprintf("!! Error getting port handle: %d", portId));
  }

  return mqPortHandle.tryWrite(messageObj);
}

/**
 * Try to pop a message, returns false if empty, if not
 * then the object in the stack ir returned.
 * 
 * Throws exceptions on other errors.
 */
function popMessage(ns, portId) {
  let mqPortHandle = ns.getPortHandle(portId);

  if (!mqPortHandle) {
    throw new Error(ns.sprintf("!! Error getting port handle: %d", portId));
  }

  let popResult = mqPortHandle.read();

  if (popResult === "NULL PORT DATA") {
    return false;
  }

  return popResult;
}

function getRandomNumberInRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}