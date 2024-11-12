/** f42-infect-run.js auto bup: Mon Nov 11 2024 14:52:29 GMT-0800 (Pacific Standard Time) */

/**
 * Manage loading hack config from port
 */
export default class HackConfig {
  static #statusList = {
    notInit: 0, // Not initialised
    initNoCfg: 1, // Initialised, config not loaded
    cfgPortEmpty: 2, // Config port empty
    cfgLoaded: 3 // Config port loaded
  };

  static #statusVerbose = [
    "Not initialised",
    "Initialised, config not loaded",
    "Config port empty",
    "Config port loaded",
  ];

  #ns;
  #infectCfgObj = {
    status: HackConfig.#statusList.notInit,
    target: "",
    hackScriptPath: [],
    hackScriptExeRam: 0,
    hackScriptExeRam2: 0,
    moneyMinLimitMult: 0,
    securityMaxLimitMult: 0,
    moneyMinLimit: 0,
    securityMaxLimit: 0,
    timestamp: 0,
    psMan: {
      ramTargetGb: 0,
      debugMode: false,
      minSleepMillis: 666666,
      maxSleepMillis: 0
    }
  };
  #generalSleepTime = 3000;
  #writeLog = false;
  #logger;

  constructor(ns, doCheckConfig, logger = false) {
    if(ns === false && logger === false){
      throw new Error("HackConfig.constructor() -> You must set at least one of ns & logger");
    }

    if(logger !== false){
      this.#logger = logger;
      this.#writeLog = logger.writeLog;
      this.#log("HackConfig.constructor(): +logger");
    }
    else{
      this.#log("HackConfig.constructor(): -logger");
    }

    if(ns !== false){
      this.#ns = ns;
      this.#log("HackConfig.constructor(): +ns");
    }
    else{
      this.#ns = this.#logger.ns;
      this.#log("HackConfig.constructor(): -ns");
    }

    this.#infectCfgObj.status = HackConfig.#statusList.initNoCfg;

    if (doCheckConfig) {
      this.checkConfig();
    }
  }

  set writeLog(doWriteLog = false) {
    if (this.#logger) {
      let errMsg = "HackConfig.writeLog not available when HackConfig.#logger has been set";
      this.#logError(errMsg);
      throw new Error(errMsg);
    }

    this.#writeLog = doWriteLog;
  }

  get ns() {
    return this.#ns;
  }

  get moneyMinLimit() {
    return this.#infectCfgObj.moneyMinLimit;
  }

  get securityMaxLimit() {
    return this.#infectCfgObj.securityMaxLimit;
  }

  get status() {
    return this.#infectCfgObj.status;
  }

  get statusVerbose() {
    return HackConfig.#statusVerbose[this.#infectCfgObj.status];
  }

  get target() {
    return this.#infectCfgObj.target;
  }

  get hackScriptPath() {
    return this.#infectCfgObj.hackScriptPath;
  }

  get hackScriptExeRam() {
    return this.#infectCfgObj.hackScriptExeRam;
  }

  get hackScriptExeRam2() {
    return this.#infectCfgObj.hackScriptExeRam2;
  }

  get hackScriptVer() {
    return this.#infectCfgObj.hackScriptVer;
  }

  get hackScriptFingerprintPath() {
    return this.#infectCfgObj.hackScriptFingerprintPath;
  }

  get psRamTargetGb() {
    return this.#infectCfgObj.psMan.ramTargetGb;
  }

  get psMinSleepMillis() {
    return this.#infectCfgObj.psMan.minSleepMillis;
  }

  get psMaxSleepMillis() {
    return this.#infectCfgObj.psMan.maxSleepMillis;
  }

  get psDebugMode() {
    return this.#infectCfgObj.psMan.debugMode;
  }

  get generalSleepTime() {
    return this.#generalSleepTime;
  }

  get hasConfig() {
    this.#log("HackConfig::hasConfig: %s", HackConfig.#statusVerbose[this.#infectCfgObj.status]);
    this.#log(JSON.stringify(this.#infectCfgObj, null, 2));
    return this.#infectCfgObj.status == HackConfig.#statusList.cfgLoaded;
  }

  checkConfig() {
    let portVal = this.#ns.peek(4);

    if (portVal === "NULL PORT DATA") {
      // port empty, nothing to do
      this.#log("HackConfig::checkConfig: port empty");
      this.#infectCfgObj.target = "";
      this.#infectCfgObj.status = HackConfig.#statusList.cfgPortEmpty;
    }
    else {
      // compare timestamps
      if (portVal.timestamp > this.#infectCfgObj.timestamp) {

        // timestamp newer so load new cfg
        this.#infectCfgObj = portVal;
        this.#log("HackConfig::checkConfig: %s", this.#infectCfgObj.target);
        this.#infectCfgObj.status = HackConfig.#statusList.cfgLoaded;
      }
    }
  }

  #log(msg, ...msgArgs) {
    if (this.#logger) {
      this.#logger.log(msg, ...msgArgs);
    }
    else {
      if (this.#writeLog) {
        this.#ns.print(msg, ...msgArgs);
      }
    }
  }

  #logError(errorMsg, ...errorMsgArgs) {
    if (this.#logger) {
      this.#logger.logError(errorMsg, ...errorMsgArgs);
    }
    else {
      if (this.#writeLog) {
        this.#ns.print("ERROR " + errorMsg, ...errorMsgArgs);
      }
    }
  }
}
