import F42Logger from "f42/classes/f42-logger-class";
import { randomBase62Str } from "f42/utility/utility-functions";
import F42Feedback from "/f42/classes/f42-feedback-class";
// import F42ClFlagDef from "f42/classes/f42-cl-flag-def-class";

/** @param {NS} ns */
export async function main(ns: NS): void {
  const scriptTitle = "TS Test";
  const logger = new F42Logger(ns, true, true, false, scriptTitle, false);
  const scriptDescription = "";
  const scriptFlags = [];
  const feedback = logger.initFeedback(scriptTitle, scriptDescription, scriptFlags);
  if (!feedback) {
    return;
  }

  ns.ui.clearTerminal();
  feedback.printTitle();

  const playroomA = new Playroom(feedback, "Room A", 2);
  const childJames = new Child("James", BadgeColour.Red);
  const childSamantha = new Child("Samantha", BadgeColour.Blue);
  const childChloe = new Child("Chloe", BadgeColour.Green);

  playroomA.printCapacity();
  playroomA.addChild(childJames);
  playroomA.addChild(childSamantha);
  playroomA.addChild(childChloe);

  feedback.printEnd();
}

enum BadgeColour {
  "Red",
  "Green",
  "Blue",
}

class Child {
  #name: string;
  #badgeCol: BadgeColour;
  #playroomId: string;

  constructor(name: string, badgeCol: BadgeColour) {
    this.#name = name;
    this.#badgeCol = badgeCol
  }

  get name(): string {
    return this.#name;
  }

  get badgeColour() {
    return this.#badgeCol;
  }

  set playroomId(id) {
    this.#playroomId = id;
  }

  get playroomId() {
    return this.#playroomId;
  }
}

class Playroom {
  #ns: NS;
  #feedback: F42Feedback;
  #name: string;
  #maxCapacity: number;
  #currCapacity: number;
  #children: { [key: string]: Child; };

  constructor(feedback: F42Feedback, name: string, maxCapacity: number) {
    this.#ns = feedback.ns;
    this.#feedback = feedback;
    this.#name = name;
    this.#children = {};
    this.#maxCapacity = maxCapacity;
    this.#currCapacity = 0;
  }

  get ns() {
    return this.#ns;
  }

  get name(): string {
    return this.#name;
  }

  get currCapacity(): number {
    return this.#currCapacity;
  }

  get maxCapacity(): number {
    return this.#maxCapacity;
  }

  printCapacity(): void {
    this.#feedback.printf(
      "%s current capacity: %d / %d",
      this.name,
      this.currCapacity,
      this.maxCapacity
    );
  }

  addChild(child: Child): string | boolean {
    if (this.#canAddChild()) {
      const childId = randomBase62Str();
      this.#children[childId] = child;
      child.playroomId = childId;
      this.#currCapacity++;

      this.#feedback.printHiLi("Success! %s was added to %s, and got id: %s",
        child.name,
        this.name,
        childId
      );

      this.printCapacity();

      return childId;
    }
    else {
      this.#feedback.printErr("Failure! %s was not added to %s, the room is full: %d / %d",
        child.name,
        this.name,
        this.currCapacity,
        this.maxCapacity
      );

      return false;
    }
  }

  removeChildById(reqId): Child | boolean {
    if (reqId in this.#children) {
      this.#currCapacity--;
      return this.#children[reqId];
    }
    else {
      return false;
    }
  }

  removeChildrenByName(name: string): Child[] | boolean {
    const childArr = [];

    for (const child of this.#children) {
      if (child.name == name) childArr.push(child);
    }

    if (childArr.length > 0) {
      return childArr;
    }
    else {
      return false;
    }
  }

  #canAddChild(): boolean {
    // this.#feedback.printHiLi("canAddChild: %d < %d", this.#currCapacity, this.#maxCapacity);
    return this.#currCapacity < this.#maxCapacity;
  }
}