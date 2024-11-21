import Logger from '/f42/classes/Logger.class';
import { NS } from '@ns'

type ColSpec_Type = [number, string][];

export async function main(ns : NS) : Promise<void> {
  const scriptTitle = "Purchased Server Pricing";
  const scriptDescription = "List of current purchaed server prices";
  const logger = new Logger(ns, false, true, false, scriptTitle, true);
  const feedback = logger.initFeedback(scriptTitle, scriptDescription);
  // const flags = feedback.flagValidator;

  if (feedback.printHelpAndEnd()) {
    return;
  }

  feedback.printTitle(false);
  feedback.printHiLi("- Purchased server limit: %d", ns.getPurchasedServerLimit());
  feedback.printLineSeparator();

  const colSpecs: ColSpec_Type = [
    [12, "GB"],
    [12, "GB Nice"],
    [12, "Price ($)"],
  ];

  let rowFormat: string | number[] = [];
  const colTitles: string[] = [];
  const colSpacers: string[] = [];

  for (const colSpec of colSpecs) {
    rowFormat.push(colSpec[0]);
    colSpacers.push(Array(colSpec[0] + 1).join("-"));
    colTitles.push(colSpec[1]);
  }

  rowFormat = "%" + rowFormat.join("s | %") + "s"

  feedback.printHiLi(rowFormat, ...colTitles);
  feedback.printHiLi(rowFormat, ...colSpacers);

  let GB = 4;
  while(GB <= 524288){
    feedback.printf(
      rowFormat,
      GB,
      ns.formatRam(GB),
      ns.formatNumber(ns.getPurchasedServerCost(GB), 2)
    );
    // await ns.sleep(100);
    GB = GB * 2;
  }

  feedback.printEnd();
}