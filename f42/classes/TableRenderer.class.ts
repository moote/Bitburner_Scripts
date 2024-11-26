import { NS } from "@ns";
import { F42_ANSI_COL_HILI, F42_ANSI_COL_RESET, F42_ANSI_COL_TXT } from "/f42/classes/FeedbackRenderer";

export default class TableRenderer {
  #ns: NS;
  #renderArr: string[];

  constructor(ns: NS) {
    this.#ns = ns;
    this.#renderArr = [];
  }

  get ns(): NS {
    return this.#ns;
  }

  get renderArr(): string[] {
    return this.#renderArr;
  }

  get renderStr(): string {
    return this.#renderArr.join("\n");
  }

  newRender(): void {
    this.#renderArr = [];
  }

  renderHead(colSpecArr: [number, string][]): string {
    let head = this.renderSpacerRow(colSpecArr, F42_ANSI_COL_HILI) + "\n";
    head = head + this.addRow(this.renderTitleRow(colSpecArr), F42_ANSI_COL_HILI) + "\n";
    head = head + this.renderSpacerRow(colSpecArr, F42_ANSI_COL_HILI) + "\n";
    return head;
  }

  renderBodyRow(
    colSpecArr: [number, string][],
    valueArr: (string | number)[],
    txtCol: string = F42_ANSI_COL_TXT
  ): string {
    return this.addRow(
      this.#ns.sprintf(this.getRowFormat(colSpecArr), ...valueArr),
      txtCol
    );
  }

  renderSpacerRow(
    colSpecArr: [number, string][],
    txtCol: string = F42_ANSI_COL_TXT
  ): string {
    const colSpacers: string[] = [];

    for (const colSpec of colSpecArr) {
      colSpacers.push(Array(colSpec[0] + 1).join("-"));
    }

    return this.addRow(
      this.#ns.sprintf(this.getRowFormat(colSpecArr), ...colSpacers),
      txtCol
    );
  }

  protected getRowFormat(colSpecArr: [number, string][]): string {
    const rowFormat: number[] = [];

    for (const colSpec of colSpecArr) {
      rowFormat.push(colSpec[0]);
    }

    return "%-" + rowFormat.join("s | %-") + "s";
  }

  protected renderTitleRow(colSpecArr: [number, string][]): string {
    const colTitles: string[] = [];

    for (const colSpec of colSpecArr) {
      colTitles.push(colSpec[1]);
    }

    return this.#ns.sprintf(this.getRowFormat(colSpecArr), ...colTitles);
  }

  protected addRow(rowStr: string, txtCol: string = F42_ANSI_COL_TXT): string {
    const row = `${txtCol}${rowStr}${F42_ANSI_COL_RESET}`;
    this.#renderArr.push(row);
    return row;
  }
}