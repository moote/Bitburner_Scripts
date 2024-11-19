// import CLFlagValidator from "/f42/classes/cl-flag-validation/flag-validator-class";

// export enum ClFlagDef_ValidTest {
//   ANY,
//   MATCH,
//   RANGE,
// }

// export enum ClFlagDef_ValidType {
//   STRING,
//   INT,
//   FLOAT,
//   BOOLEAN,
//   STRING_ARR,
//   INT_ARR,
//   FLOAT_ARR,
// }

// export interface ClFlagDef_Interface {
//   flag: string,
//   default: string | boolean | number | string[] | number[],
//   required: boolean,
//   description: string,
//   validation: {
//     test: ClFlagDef_ValidationTest,
//     varType: ClFlagDef_ValidType,
//     min: number,
//     max: number,
//     matchArr: string[],
//   }
// }

export type ClFlagDef_Type = [
  string,
  string | boolean,
  boolean,
  string,
  (string | boolean | number | string[])[]
];

export default class ClFlagDef {
  static getReqStrAny(flag: string, desc: string, def = ""): ClFlagDef_Type {
    return [flag, def, true, desc, ["any", "string"]];
  }

  // static getReqStrAny(flag: string, desc: string, def = ""): ClFlagDef_Interface {
  //   return {
  //     flag: flag,
  //     default: def,
  //     required: true,
  //     description: desc,
  //     validation: {
  //       test: ClFlagDef_ValidationTest.ANY,
  //       varType: ClFlagDef_ValidType.STRING
  //     }
  //   };
  // }

  static getOptStrAny(flag: string, desc: string, def = ""): ClFlagDef_Type {
    return [flag, def, false, desc, ["any", "string"]];
  }

  // any string arr

  static getReqStrArrAny(flag: string, desc: string, def = []): ClFlagDef_Type {
    return [flag, def, true, desc, ["any", "string"]];
  }

  static getOptStrArrAny(flag: string, desc: string, def = []): ClFlagDef_Type {
    return [flag, def, false, desc, ["any", "string"]];
  }

  // boolean

  static getReqBool(flag: string, desc: string): ClFlagDef_Type {
    return [flag, false, true, desc, ["any", "boolean"]];
  }

  static getOptBool(flag: string, desc: string): ClFlagDef_Type {
    return [flag, false, false, desc, ["any", "boolean"]];
  }

  // any int

  static getReqIntAny(flag: string, desc: string, def = ""): ClFlagDef_Type {
    return [flag, def, true, desc, ["any", "int"]];
  }

  static getOptIntAny(flag: string, desc: string, def = ""): ClFlagDef_Type {
    return [flag, def, false, desc, ["any", "int"]];
  }

  // any float

  static getReqFloatAny(flag: string, desc: string, def = ""): ClFlagDef_Type {
    return [flag, def, true, desc, ["any", "float"]];
  }

  static getOptFloatAny(flag: string, desc: string, def = ""): ClFlagDef_Type {
    return [flag, def, false, desc, ["any", "float"]];
  }

  // any int arr

  static getReqIntArrAny(flag: string, desc: string, def = []): ClFlagDef_Type {
    return [flag, def, true, desc, ["any", "int"]];
  }

  static getOptIntArrAny(flag: string, desc: string, def = []): ClFlagDef_Type {
    return [flag, def, false, desc, ["any", "int"]];
  }

  // any float arr 

  static getReqFloatArrAny(flag: string, desc: string, def = []): ClFlagDef_Type {
    return [flag, def, true, desc, ["any", "float"]];
  }

  static getOptFloatArrAny(flag: string, desc: string, def = []): ClFlagDef_Type {
    return [flag, def, false, desc, ["any", "float"]];
  }

  // range int

  static getReqIntRange(flag: string, desc: string, min: number, max: number, def = ""): ClFlagDef_Type {
    return F42ClFlagDef.#checkRange("int", flag, true, desc, min, max, def);
  }

  static getOptIntRange(flag: string, desc: string, min: number, max: number, def = ""): ClFlagDef_Type {
    return F42ClFlagDef.#checkRange("int", flag, false, desc, min, max, def);
  }

  // range float

  static getReqFloatRange(flag: string, desc: string, min: number, max: number, def = ""): ClFlagDef_Type {
    return F42ClFlagDef.#checkRange("float", flag, true, desc, min, max, def);
  }

  static getOptFloatRange(flag: string, desc: string, min: number, max: number, def = ""): ClFlagDef_Type {
    return F42ClFlagDef.#checkRange("float", flag, false, desc, min, max, def);
  }

  static #checkRange(type: string, flag: string, req: boolean, desc: string, min: number, max: number, def: string): ClFlagDef_Type {
    let testType = type;

    if (testType == "int" || testType == "float") {
      testType = "number";
    }

    if (typeof min !== testType) {
      throw new Error("F42ClFlagDef.checkRange: min must match type: " + testType + " found " + (typeof min));
    }

    if (typeof max !== testType) {
      throw new Error("F42ClFlagDef.checkRange: max must match type: " + testType + " found " + (typeof max));
    }

    desc = desc + " (" + min + " to " + max + ")";

    return [flag, def, req, desc, ["range", type, min, max]];
  }

  // match string

  static getReqStrMatchOne(flag: string, desc: string, matchArr: string[], def = []): ClFlagDef_Type {
    return F42ClFlagDef.#checkMatch("string", flag, true, desc, 1, 1, matchArr, def);
  }

  static getOptStrMatchOne(flag: string, desc: string, matchArr: string[], def = []): ClFlagDef_Type {
    return F42ClFlagDef.#checkMatch("string", flag, false, desc, 1, 1, matchArr, def);
  }

  static getReqStrMatchMulti(flag: string, desc: string, min: number, max: number, matchArr: string[], def = []): ClFlagDef_Type {
    return F42ClFlagDef.#checkMatch("string", flag, true, desc, min, max, matchArr, def);
  }

  static getOptStrMatchMulti(flag: string, desc: string, min: number, max: number, matchArr: string[], def = []): ClFlagDef_Type {
    return F42ClFlagDef.#checkMatch("string", flag, false, desc, min, max, matchArr, def);
  }

  // match int

  static getReqIntMatchOne(flag: string, desc: string, matchArr: string[], def = []): ClFlagDef_Type {
    return F42ClFlagDef.#checkMatch("int", flag, true, desc, 1, 1, matchArr, def);
  }

  static getOptIntMatchOne(flag: string, desc: string, matchArr: string[], def = []): ClFlagDef_Type {
    return F42ClFlagDef.#checkMatch("int", flag, false, desc, 1, 1, matchArr, def);
  }

  static getReqIntMatchMulti(flag: string, desc: string, min: number, max: number, matchArr: string[], def = []): ClFlagDef_Type {
    return F42ClFlagDef.#checkMatch("int", flag, true, desc, min, max, matchArr, def);
  }

  static getOptIntMatchMulti(flag: string, desc: string, min: number, max: number, matchArr: string[], def = []): ClFlagDef_Type {
    return F42ClFlagDef.#checkMatch("int", flag, false, desc, min, max, matchArr, def);
  }

  // match float

  static getReqFloatMatchOne(flag: string, desc: string, matchArr: string[], def = []): ClFlagDef_Type {
    return F42ClFlagDef.#checkMatch("float", flag, true, desc, 1, 1, matchArr, def);
  }

  static getOptFloatMatchOne(flag: string, desc: string, matchArr: string[], def = []): ClFlagDef_Type {
    return F42ClFlagDef.#checkMatch("float", flag, false, desc, 1, 1, matchArr, def);
  }

  static getReqFloatMatchMulti(flag: string, desc: string, min: number, max: number, matchArr: string[], def = []): ClFlagDef_Type {
    return F42ClFlagDef.#checkMatch("float", flag, true, desc, min, max, matchArr, def);
  }

  static getOptFloatMatchMulti(flag: string, desc: string, min: number, max: number, matchArr: string[], def = []): ClFlagDef_Type {
    return F42ClFlagDef.#checkMatch("float", flag, false, desc, min, max, matchArr, def);
  }

  static #checkMatch(type: string, flag: string, req: boolean, desc: string, min: number, max: number, matchArr: string[], def: string): ClFlagDef_Type {
    let testType = type;

    if (testType == "int" || testType == "float") {
      testType = "number";
    }

    // if(typeof min !== testType){
    //   throw new Error("F42ClFlagDef.checkMatch: min must match type: " + testType);
    // }

    // if(typeof min !== testType){
    //   throw new Error("F42ClFlagDef.checkMatch: max must match type: " + testType);
    // }

    // if(matchArr.length < min){
    //   throw new Error("F42ClFlagDef.checkMatch: matchArr must be >= to: " + min);
    // }

    if (matchArr.length < max) {
      throw new Error("F42ClFlagDef.checkMatch: matchArr must be <= to: " + max);
    }

    for (const val of matchArr) {
      if (typeof val !== testType) {
        throw new Error("F42ClFlagDef.checkMatch: all values in matchArr must be type: " + testType);
      }
    }

    if (max == 1) {
      desc = desc + " (one from : [" + matchArr + "])";

      return [flag, def, req, desc, ["match", type, matchArr]];
    }
    else {
      desc = desc + " (" + min + " - " + max + " from : [" + matchArr + "])";
      return [flag, def, req, desc, ["match", type, min, max, matchArr]];
    }
  }
}

// interface CLFlagDefMatch [
//   string,
//   string,
//   boolean,
//   string,
//   [
//     "match",
//     string,
//     number,
//     number,
//     (string | number)[]
//   ]
// ]