/**
 * manually inc this whenever script changes and you want 
 * f42-infect-run.js to overwite files when run with
 * --overwrite-payload
 */
export const F42_PAYLOAD_VER = 16;
export const F42_PAYLOAD_FILES = [
  "scripts/dynamic/f42-hack-payload.js",
  "scripts/dynamic/f42-hack-cfg-class.js",
  "scripts/utility/payload-fingerprint.js"
];
export const F42_PAYLOAD_FINGERPRINT_PATH = "scripts/dynamic/payload-fingerprint.txt";

export function isFingerprintExist(ns, hostname = undefined) {
  return ns.fileExists(F42_PAYLOAD_FINGERPRINT_PATH, hostname);
}

export function isFingerprintMatch(ns, hostname = undefined) {
  let isMatch = false;
  if (isFingerprintExist(ns, hostname)) {
    let currFPrint = getCurrentFingerprint(ns, hostname);

    if (!currFPrint.ver || currFPrint.ver != F42_PAYLOAD_VER) {
      isMatch = false;
    }
    else {
      isMatch = true;
    }
  }
  else {
    isMatch = false;
  }

  return isMatch;
}

/**
 * Read the local fingerprint file. If a host is supplied, it will be copied
 * from that host locally  and then read. Any existing local file will
 * be backed up and restored. 
 */
export function getCurrentFingerprint(ns, hostname = undefined) {
  let currFPrint = false;
  let localBup = false;

  if (hostname) {
    if (ns.fileExists(F42_PAYLOAD_FINGERPRINT_PATH, hostname)) {
      // backup local if exists
      if (ns.fileExists(F42_PAYLOAD_FINGERPRINT_PATH)) {
        localBup = ns.read(F42_PAYLOAD_FINGERPRINT_PATH);
      }

      // remote copy locally
      ns.scp(F42_PAYLOAD_FINGERPRINT_PATH, ns.getHostname(), hostname)
    }
    else {
      return false;
    }
  }

  // try to read and parse file
  try {
    currFPrint = JSON.parse(ns.read(F42_PAYLOAD_FINGERPRINT_PATH));
  }
  catch (e) {
    return false;
  }

  // ns.tprintf(JSON.stringify(currFPrint, null, 2));

  if (localBup != false) {
    // restore bup
    ns.write(F42_PAYLOAD_FINGERPRINT_PATH, localBup, "w");
  }

  if (currFPrint) {
    // trim leading "/" from file paths
    for (let i = 0; i < currFPrint.payload.length; i++) {
      if (currFPrint.payload[i].charAt(0) == "/") {
        currFPrint.payload[i] = currFPrint.payload[i].substr(1);
      }
    }
  }

  return currFPrint || false;
}