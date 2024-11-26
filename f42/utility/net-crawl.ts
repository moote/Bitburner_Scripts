import { NS } from '@ns'
import { F42_ANSI_COL_HILI, F42_ANSI_COL_RESET, F42_ANSI_COL_TXT } from '/f42/classes/FeedbackRenderer';

export async function main(ns: NS): Promise<void> {
  const timingMs = Date.now();
  scanAdj(ns);
  ns.tprintf(">> DONE: %s", ns.tFormat(Date.now() - timingMs, true));
}

function scanAdj(ns: NS, hostname?: string, depth = 0): void {
  const scanResult = ns.scan(hostname);
  if (scanResult.length === 0) return;
  let skipFirst = (typeof hostname !== "undefined");

  for (const childHostname of ns.scan(hostname)) {
    if (skipFirst) {
      skipFirst = false;
      continue;
    }
    const srvObj = ns.getServer(childHostname);

    if (srvObj.purchasedByPlayer) continue;

    let statusStr = "";
    let colCode = F42_ANSI_COL_TXT;

    if (srvObj.hasAdminRights) statusStr += " R";
    if (srvObj.backdoorInstalled) {
      statusStr += "B";
      colCode = F42_ANSI_COL_HILI;
    }

    ns.tprintf(
      "%s[%s%s%s%s (%d)",
      "+".repeat(depth),
      colCode,
      srvObj.hostname,
      statusStr,
      F42_ANSI_COL_RESET,
      depth
    );
    scanAdj(ns, srvObj.hostname, depth + 1);
  }
}