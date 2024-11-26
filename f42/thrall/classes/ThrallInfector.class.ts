import { NS } from '@ns'
import FeedbackRenderer from '/f42/classes/FeedbackRenderer';

export const VERSION = 38;
const ORDER_66_PORT = 66;
const VERSION_FILE_PATH = "f42/thrall/version_" + VERSION + ".txt";
const PAYLOAD_FILES = [
  "f42/thrall/control.js",
  "f42/thrall/weaken_.js",
  "f42/thrall/grow_.js",
  "f42/thrall/hack_.js",
  "f42/thrall/classes/ThrallControl.class.js",
  "f42/thrall/classes/interfaces.js",
  VERSION_FILE_PATH
];
const HOME = "home";
const FILTER_JOB_FILE = "f42/thrall/tmp";
const FILTER_ALL_THRALL_FILE = "f42/thrall";
const FILTER_VERSION_FILE = "thrall/version_";
const MATCH_PS_JOB_REGEX = /_\.js/g;
const MATCH_PS_CONTROL_REGEX = /thrall\/control\.js/g;

export default class ThrallInfector {
  /**
   * Copies thrall payload to purchsed servers with wrong/missing
   * version. Starts processing if o66 inactive.
   * 
   */
  static propagateSelf(feedback: FeedbackRenderer): void {
    for (const pServ of feedback.ns.getPurchasedServers()) {
      if (!ThrallInfector.isVersionFileValid(feedback.ns, pServ)) {
        feedback.ns.scp(PAYLOAD_FILES, pServ, HOME);

        if (!ThrallInfector.isOrder66Active(feedback.ns)) {
          feedback.ns.exec(PAYLOAD_FILES[0], pServ);
          feedback.print("- Payload installed and started on: ", pServ);
        }
        else {
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
  static activateOrder66(ns: NS): void {
    ns.writePort(ORDER_66_PORT, { order66: true });
  }

  /**
   * Post order 66 command that will halt all thrall processes until removed
   * 
   * @param {NS} ns
   */
  static deActivateOrder66(ns: NS): void {
    ns.clearPort(ORDER_66_PORT);
  }

  /**
   * Test to see if order 66 active
   * 
   * @param {NS} ns
   */
  static isOrder66Active(ns: NS): boolean {
    return ns.peek(ORDER_66_PORT) !== "NULL PORT DATA";
  }

  /**
   * Test matching version file exists
   * 
   * @param {NS} ns
   * @param {string} hostname
   */
  static isVersionFileValid(ns: NS, hostname: string): boolean {
    return ns.fileExists(VERSION_FILE_PATH, hostname);
  }

  /**
   * Start the thrall control script with version flag
   * to allow visual indication of the running version
   * 
   * @param {NS} ns
   * @param {string} hostname
   */
  static startControl(ns: NS, hostname: string): void {
    ns.exec(PAYLOAD_FILES[0], hostname, 1, "-v", VERSION);
  }

  #ns: NS;
  #feedback: FeedbackRenderer;
  #order66Active: boolean;

  constructor(feedback: FeedbackRenderer) {
    this.#ns = feedback.ns;
    this.#feedback = feedback;

    // kill running versions of this script
    this.#killInfectPS();

    // start at true as that is state we will be in
    // after clean start
    this.#order66Active = true;
    this.#init();
  }

  /**
   * @returns {NS}
   */
  get ns(): NS {
    return this.#ns;
  }

  get feedback(): FeedbackRenderer {
    return this.#feedback;
  }

  /**
   * Initialisation; performs clean install on 
   * home and all thralls that need it. Forces stop
   * on all others.
   */
  #init(): void {
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
  checkOrder66(): void {
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
  homeCleanInstall(): boolean {
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
  homeStopProcessing(): void {
    this.#killAllJobPS(HOME);
    this.#killCtrlPS(HOME);
    this.#rmAllJobFiles(HOME);
  }

  /**
   * Helper to start processing on home
   */
  homeStartProcessing(): void {
    this.#startControl(HOME);
  }

  /**
   * Helper to restart all thrall servers
   * 
   * @param {boolean} forceStop
   */
  remoteCleanInstall(forceStop = false): void {
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
  #doRemoteCleanInstall(hostname: string, forceStop = false): void {
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
  remoteStopProcessing(): void {
    for (const pHost of this.ns.getPurchasedServers()) {
      this.#doRemoteStopProcessing(pHost);
    }
  }

  /**
   * Stop processing on individual thrall
   * 
   * @param {string} hostname
   */
  #doRemoteStopProcessing(hostname: string): void {
    this.#chkHostNotHome(hostname, "doRemoteStopProcessing");

    this.#killAllPS(hostname);
    this.#rmAllJobFiles(hostname);
  }

  /**
   * Helper to start processing on all thrall servers
   */
  remoteStartProcessing(): void {
    for (const pHost of this.ns.getPurchasedServers()) {
      this.#startControl(pHost);
    }
  }

  /**
   * Kill any other running versions of this script
   */
  #killInfectPS(): void {
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
  #killAllJobPS(hostname: string): void {
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
  #killCtrlPS(hostname: string): void {
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
  #killAllPS(hostname: string): void {
    this.#chkHostNotHome(hostname, "killAllPS");

    this.ns.killall(hostname);
  }

  /**
   * Delete all version files
   * 
   * @param {string} hostname
   */
  #rmAllVersionFiles(hostname: string): void {
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
  #rmAllJobFiles(hostname: string): void {
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
  #rmAllFiles(hostname: string): void {
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
  #scpPayload(hostname: string): void {
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
  isVersionFileValid(hostname: string): boolean {
    return ThrallInfector.isVersionFileValid(this.ns, hostname);
  }

  /**
   * Write a new version file if current does not match
   */
  #writeVersionFile(): void {
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
  #startControl(hostname: string): void {
    this.feedback.print("startControl: ", hostname);
    ThrallInfector.startControl(this.ns, hostname);
  }

  /**
   * Used to stop dangerous processes running on home
   * 
   * @param {string} hostname
   * @param {string} functionName
   */
  #chkHostNotHome(hostname: string, functionName: string): void {
    if (HOME == hostname) {
      throw new Error("Infector: Illegal function call on home: " + functionName);
    }
  }
}