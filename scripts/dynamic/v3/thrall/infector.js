import F42Logger from "/scripts/classes/f42-logger-class.js";
import F42ClFlagDef from "/scripts/classes/f42-cl-flag-def-class.js";

const ORDER_66_PORT = 66;
const VERSION = 22;
const VERSION_FILE_PATH = "scripts/dynamic/v3/thrall/version_" + VERSION + ".txt";
const PAYLOAD_FILES = [
  "scripts/dynamic/v3/thrall/control.js",
  "scripts/dynamic/v3/thrall/weaken_.js",
  "scripts/dynamic/v3/thrall/grow_.js",
  "scripts/dynamic/v3/thrall/hack_.js",
  VERSION_FILE_PATH
];
const HOME = "home";
const FILTER_JOB_FILE = "v3/thrall/tmp";
const FILTER_ALL_THRALL_FILE = "v3/thrall";
const FILTER_VERSION_FILE = "thrall/version_";
const MATCH_PS_JOB_REGEX = /_\.js/g;
const MATCH_PS_CONTROL_REGEX = /thrall\/control\.js/g;

/** @param {NS} ns */
export async function main(ns) {
  let logger = new F42Logger(ns, false, true, false, "Thrall infection and execution");
  let scriptTitle = "Thrall Infector v" + VERSION;
  let scriptDescription = "Thrall infection and execution";
  let scriptFlags = [
    F42ClFlagDef.getOptBool("p", "Propagate to uninfected / wrong versioned purchsed servers"),
    F42ClFlagDef.getOptBool("o66-act", "Activate order 66"),
    F42ClFlagDef.getOptBool("o66-deact", "Deactivate order 66"),
    F42ClFlagDef.getOptBool("o66-test", "Show current order 66 status"),
  ];
  let feedback = logger.initFeedback(scriptTitle, scriptDescription, scriptFlags);

  if (!feedback) {
    return;
  }

  feedback.printTitle(false);

  if (feedback.getFlag("p")) {
    feedback.printSubTitle("Propagating Payload:");
    ThrallInfector.propagateSelf(feedback);
  }
  else if (feedback.getFlag("o66-act")) {
    ThrallInfector.activateOrder66(ns);
    feedback.printSubTitle("ORDER 66 ACTIVATED");
  }
  else if (feedback.getFlag("o66-deact")) {
    ThrallInfector.deActivateOrder66(ns);
    feedback.printSubTitle("ORDER 66 DEACTIVATED");
  }
  else if (feedback.getFlag("o66-test")) {
    if (ThrallInfector.isOrder66Active(ns)) {
      feedback.printSubTitle("ORDER 66 IS ACTIVE");
    }
    else {
      feedback.printSubTitle("ORDER 66 NOT ACTIVE");
    }
  }
  else {
    // issue order66 to stop all processing
    ThrallInfector.activateOrder66(ns);

    // init new infector
    const tInfect = new ThrallInfector(feedback);

    // periodically check o66 status
    while (true) {
      tInfect.checkOrder66();
      await ns.sleep(1000);
    }
  }

  feedback.printEnd();
}

class ThrallInfector {
  /**
   * Copies thrall payload to purchsed servers with wrong/missing
   * version. Starts processing if o66 inactive.
   * 
   * @param {F42Feedback} feedback
   */
  static propagateSelf(feedback) {
    for (const pServ of feedback.ns.getPurchasedServers()) {
      if (!ThrallInfector.isVersionFileValid(feedback.ns, pServ)) {
        feedback.ns.scp(PAYLOAD_FILES, pServ, HOME);

        if (!ThrallInfector.isOrder66Active(feedback.ns)) {
          ns.exec(PAYLOAD_FILES[0], pServ);
          feedback.print("- Payload installed and started on: ", pServ);
        }
        else{
          feedback.print("- Payload installed on: ", pServ);
        }
      }
    }
  }

  /**
   * Post order 66 command that will halt all thrall processes until removed
   * 
   * @param {NS} ns
   */
  static activateOrder66(ns) {
    ns.writePort(ORDER_66_PORT, { order66: true });
  }

  /**
   * Post order 66 command that will halt all thrall processes until removed
   * 
   * @param {NS} ns
   */
  static deActivateOrder66(ns) {
    ns.clearPort(ORDER_66_PORT);
  }

  /**
   * Test to see if order 66 active
   * 
   * @param {NS} ns
   */
  static isOrder66Active(ns) {
    return ns.peek(ORDER_66_PORT) !== "NULL PORT DATA";
  }

  /**
   * Test matching version file exists
   * 
   * @param {NS} ns
   * @param {string} hostname
   */
  static isVersionFileValid(ns, hostname) {
    return ns.fileExists(VERSION_FILE_PATH, hostname);
  }

  /**
   * Start the thrall control script with version flag
   * to allow visual indication of the running version
   * 
   * @param {NS} ns
   * @param {string} hostname
   */
  static startControl(ns, hostname) {
    ns.exec(PAYLOAD_FILES[0], hostname, 1, "-v", VERSION);
  }

  #ns;
  #feedback;
  #order66Active;

  /**
   * @param {F42Feedback} feedback
   */
  constructor(feedback) {
    this.#ns = feedback.ns;
    this.#feedback = feedback;

    // kill running versions of this script
    this.#killInfectPS(HOME);

    // start at true as that is state we will be in
    // after clean start
    this.#order66Active = true;
    this.#init();
  }

  /**
   * @returns {NS}
   */
  get ns() {
    return this.#ns;
  }

  /**
   * @returns {F42Feedback}
   */
  get feedback() {
    return this.#feedback;
  }

  /**
   * Initialisation; performs clean install on 
   * home and all thralls that need it. Forces stop
   * on all others.
   */
  #init() {
    if (!this.homeCleanInstall()) {
      // if install wasn't needed (matching version)
      // make sure all processing is stopped
      this.homeStopProcessing();
    }
    this.remoteCleanInstall(true);
    this.checkOrder66();
  }

  /**
   * Checks status of Order66 runs appropriate functions on
   * home and all thrall servers
   */
  checkOrder66() {
    if (ThrallInfector.isOrder66Active(this.ns)) { // order 66 active
      if (!this.#order66Active) {
        // stop all processing
        this.#order66Active = true;
        this.homeStopProcessing();
        this.remoteStopProcessing();
      }
    }
    else { // order 66 inactive
      if (this.#order66Active) {
        // start all processing
        this.#order66Active = false;
        this.homeStartProcessing();
        this.remoteStartProcessing();
      }
    }
  }

  /**
   * Helper to restart home
   * 
   * @returns {boolean} True if install was run
   */
  homeCleanInstall() {
    if (this.isVersionFileValid(HOME)) {
      // do nothing
      this.feedback.printf("homeCleanInstall: home v%d OK", VERSION);
      return false;
    }
    else {
      this.feedback.printf("homeCleanInstall: home v%d NOT FOUND", VERSION);
      this.#killAllJobPS(HOME);
      this.#killCtrlPS(HOME);
      this.#rmAllJobFiles(HOME);
      this.#writeVersionFile();
      return true;
    }
  }

  /**
   * Helper to stop all processing and
   * clean job files on home
   */
  homeStopProcessing() {
    this.#killAllJobPS(HOME);
    this.#killCtrlPS(HOME);
    this.#rmAllJobFiles(HOME);
  }

  /**
   * Helper to start processing on home
   */
  homeStartProcessing() {
    this.#startControl(HOME);
  }

  /**
   * Helper to restart all thrall servers
   * 
   * @param {boolean} forceStop
   */
  remoteCleanInstall(forceStop = false) {
    this.feedback.printf("remoteCleanInstall: Testing %d purchased servers", this.ns.getPurchasedServers().length);
    for (const pHost of this.ns.getPurchasedServers()) {
      this.#doRemoteCleanInstall(pHost, forceStop);
    }
  }

  /**
   * Helper to stop all processing and
   * clean job files on all thrall servers
   * 
   * @param {string} hostname
   * @param {boolean} forceStop
   */
  #doRemoteCleanInstall(hostname, forceStop = false) {
    this.#chkHostNotHome(hostname, "doRemoteCleanInstall");

    if (!this.isVersionFileValid(hostname)) {
      this.feedback.printf("doRemoteCleanInstall: v%d -> %s", VERSION, hostname);
      this.#killAllPS(hostname);
      this.#rmAllFiles(hostname);
      this.#scpPayload(hostname);
    }
    else if (forceStop) {
      this.#doRemoteStopProcessing(hostname);
    }
  }

  /**
   * Helper to stop all processing and
   * clean job files on all thrall servers
   */
  remoteStopProcessing() {
    for (const pHost of this.ns.getPurchasedServers()) {
      this.#doRemoteStopProcessing(pHost);
    }
  }

  /**
   * Stop processing on individual thrall
   * 
   * @param {string} hostname
   */
  #doRemoteStopProcessing(hostname) {
    this.#chkHostNotHome(hostname, "doRemoteStopProcessing");

    this.#killAllPS(hostname);
    this.#rmAllJobFiles(hostname);
  }

  /**
   * Helper to start processing on all thrall servers
   */
  remoteStartProcessing() {
    for (const pHost of this.ns.getPurchasedServers()) {
      this.#startControl(pHost);
    }
  }

  /**
   * Kill any other running versions of this script
   */
  #killInfectPS() {
    let killCnt = 0;
    for (const psInfo of this.ns.ps(HOME)) {
      if (psInfo.filename == this.ns.getScriptName() && psInfo.pid != this.ns.pid) {
        this.ns.kill(psInfo.pid) ? killCnt++ : null;
      }
    }
    this.feedback.printf("killInfectPS: killed %d process%s", killCnt, (killCnt > 1 ? "es" : ""));
  }

  /**
   * Kill all job processes (weaken_.js, grow_.js, hack_.js)
   * 
   * @param {string} hostname
   */
  #killAllJobPS(hostname) {
    let killCnt = 0;
    for (const psInfo of this.ns.ps(hostname)) {
      if (psInfo.filename.match(MATCH_PS_JOB_REGEX)) {
        this.ns.kill(psInfo.filename, hostname, ...psInfo.args) ? killCnt++ : null;
      }
    }
    this.feedback.printf("killAllJobPS: killed %d process%s", killCnt, (killCnt > 1 ? "es" : ""));
  }

  /**
   * Kill all control.js processes
   * 
   * @param {string} hostname
   */
  #killCtrlPS(hostname) {
    let killCnt = 0;
    for (const psInfo of this.ns.ps(hostname)) {
      if (psInfo.filename.match(MATCH_PS_CONTROL_REGEX)) {
        this.ns.kill(psInfo.filename, hostname, ...psInfo.args) ? killCnt++ : null;
      }
    }
    this.feedback.printf("killCtrlPS: killed %d process%s", killCnt, (killCnt > 1 ? "es" : ""));
  }

  /**
   * Kills ALL processes on target thrall server;
   * can not be run on home
   * 
   * @param {string} hostname
   */
  #killAllPS(hostname) {
    this.#chkHostNotHome(hostname, "killAllPS");

    this.ns.killall(hostname);
  }

  /**
   * Delete all version files
   * 
   * @param {string} hostname
   */
  #rmAllVersionFiles(hostname) {
    let fileCnt = 0;
    for (const filePath of this.ns.ls(hostname, FILTER_VERSION_FILE)) {
      this.ns.rm(filePath, hostname) ? fileCnt++ : null;
    }
    this.feedback.print("rmAllVersionFiles: files removed: ", fileCnt);
  }

  /**
   * Delete all job files; all files in thrall/tmp
   * 
   * @param {string} hostname
   */
  #rmAllJobFiles(hostname) {
    let fileCnt = 0;
    for (const filePath of this.ns.ls(hostname, FILTER_JOB_FILE)) {
      this.ns.rm(filePath, hostname) ? fileCnt++ : null;
    }
    this.feedback.print("rmAllJobFiles: files removed: ", fileCnt);
  }

  /**
   * Removes ALL files on target thrall server;
   * can not be run on home
   * 
   * @param {string} hostname
   */
  #rmAllFiles(hostname) {
    this.#chkHostNotHome(hostname, "rmAllFiles");

    for (const filePath of this.ns.ls(hostname, FILTER_ALL_THRALL_FILE)) {
      this.ns.rm(filePath, hostname);
    }
  }

  /**
   * Copy all payload files to thrall; destination
   * can not be home
   * 
   * @param {string} hostname
   */
  #scpPayload(hostname) {
    this.#chkHostNotHome(hostname, "scpPayload");

    if (this.ns.scp(PAYLOAD_FILES, hostname, HOME)) {
      this.feedback.print("scpPayload: all payload files copied to: ", hostname);
    }
    else {
      this.feedback.print("scpPayload: one or more payload files failed to copy to: ", hostname);
    }
  }

  /**
   * Test to see is version file matches on target
   */
  isVersionFileValid(hostname) {
    return ThrallInfector.isVersionFileValid(this.ns, hostname);
  }

  /**
   * Write a new version file if current does not match
   */
  #writeVersionFile() {
    if (!this.isVersionFileValid(HOME)) {
      this.#rmAllVersionFiles(HOME);
      this.ns.write(
        VERSION_FILE_PATH,
        "v." + VERSION,
        "w"
      );
      this.feedback.print("writeVersionFile: new version file written: v", VERSION);
    }
    else {
      this.feedback.print("writeVersionFile: existing file is valid");
    }
  }

  /**
   * Starts the thrall control function on target host
   * 
   * @param {string} hostname
   */
  #startControl(hostname) {
    this.feedback.print("startControl: ", hostname);
    ThrallInfector.startControl(this.ns, hostname);
  }

  /**
   * Used to stop dangerous processes running on home
   * 
   * @param {string} hostname
   * @param {string} functionName
   */
  #chkHostNotHome(hostname, functionName) {
    if (HOME == hostname) {
      throw new Error("Infector: Illegal function call on home: " + functionName);
    }
  }
}