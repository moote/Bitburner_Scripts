import HackConfig from '/scripts/dynamic/f42-hack-cfg-class.js';
import ScriptLauncher from '/scripts/dynamic/f42-script-launcher-class.js';

/**
 * Manage loading hack config from port, provides an instance of
 * ScriptLauncher to run/restart scripts
 */
export default class HackUtility {
  #ns;
  #hackConfig;
  #scriptLauncher;
  #writeLog = false;

  constructor(ns, doCheckConfig) {
    // save NetScript interface
    this.#ns = ns;
    this.#log("Init class: HackUtility");

    // init config
    this.#hackConfig = new HackConfig(ns, doCheckConfig);

    // ini script launcher
    this.#scriptLauncher = new ScriptLauncher(this.#hackConfig);
  }

  set writeLog(doWriteLog = false) {
    this.#writeLog = doWriteLog;
  }

  get ns() {
    return this.#ns;
  }

  /**
   * @return {HackConfig} The attached HackConfig instance
   */
  get cfg() {
    return this.#hackConfig;
  }

  /**
   * @return {ScriptLauncher} The attached ScriptLauncher instance
   */
  get scriptLauncher() {
    return this.#scriptLauncher;
  }

  #log(msg) {
    if (this.#writeLog) {
      this.#ns.print(msg);
    }
  }
}
