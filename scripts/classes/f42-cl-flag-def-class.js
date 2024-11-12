

export default class F42ClFlagDef{
  // any string
  static getReqStrAny(flag, desc, def = ""){
    return [flag, def, true, desc, ["any", "string"]];
  }
  
  static getOptStrAny(flag, desc, def = ""){
    return [flag, def, false, desc, ["any", "string"]];
  }

  // any string arr
  
  static getReqStrArrAny(flag, desc, def = []){
    return [flag, def, true, desc, ["any", "string"]];
  }
  
  static getOptStrArrAny(flag, desc, def = []){
    return [flag, def, false, desc, ["any", "string"]];
  }

  // boolean
  
  static getReqBool(flag, desc){
    return [flag, false, true, desc, ["any", "boolean"]];
  }
  
  static getOptBool(flag, desc){
    return [flag, false, false, desc, ["any", "boolean"]];
  }

  // any int

  static getReqIntAny(flag, desc, def = ""){
    return [flag, def, true, desc, ["any", "int"]];
  }
  
  static getOptIntAny(flag, desc, def = ""){
    return [flag, def, false, desc, ["any", "int"]];
  }

  // any float

  static getReqFloatAny(flag, desc, def = ""){
    return [flag, def, true, desc, ["any", "float"]];
  }
  
  static getOptFloatAny(flag, desc, def = ""){
    return [flag, def, false, desc, ["any", "float"]];
  }

  // any int arr

  static getReqIntArrAny(flag, desc, def = []){
    return [flag, def, true, desc, ["any", "int"]];
  }
  
  static getOptIntArrAny(flag, desc, def = []){
    return [flag, def, false, desc, ["any", "int"]];
  }

  // any float arr 

  static getReqFloatArrAny(flag, desc, def = []){
    return [flag, def, true, desc, ["any", "float"]];
  }
  
  static getOptFloatArrAny(flag, desc, def = []){
    return [flag, def, false, desc, ["any", "float"]];
  }

  // range int

  static getReqIntRange(flag, desc, min, max, def = ""){
    return F42ClFlagDef.#checkRange("int", flag, true, desc, min, max, def);
  }
  
  static getOptIntRange(flag, desc, min, max, def = ""){
    return F42ClFlagDef.#checkRange("int", flag, false, desc, min, max, def);
  }

  // range float

  static getReqFloatRange(flag, desc, min, max, def = ""){
    return F42ClFlagDef.#checkRange("float", flag, true, desc, min, max, def);
  }
  
  static getOptFloatRange(flag, desc, min, max, def = ""){
    return F42ClFlagDef.#checkRange("float", flag, false, desc, min, max, def);
  }

  static #checkRange(type, flag, req, desc, min, max, def){
    let testType = type;

    if(testType == "int" || testType == "float"){
      testType = "number";
    }

    if(typeof min !== testType){
      throw new Error("F42ClFlagDef.checkRange: min must match type: " + testType + " found " + (typeof min));
    }

    if(typeof max !== testType){
      throw new Error("F42ClFlagDef.checkRange: max must match type: " + testType + " found " + (typeof max));
    }

    desc = desc + " (" + min + " to " + max + ")";

    return [flag, def, req, desc, ["range", type, min, max]];
  }

  // match string

  static getReqStrMatchOne(flag, desc, matchArr, def = []){
    return F42ClFlagDef.#checkMatch("string", flag, true, desc, 1, 1, matchArr, def);
  }
  
  static getOptStrMatchOne(flag, desc, matchArr, def = []){
    return F42ClFlagDef.#checkMatch("string", flag, false, desc, 1, 1, matchArr, def);
  }

  static getReqStrMatchMulti(flag, desc, min, max, matchArr, def = []){
    return F42ClFlagDef.#checkMatch("string", flag, true, desc, min, max, matchArr, def);
  }
  
  static getOptStrMatchMulti(flag, desc, min, max, matchArr, def = []){
    return F42ClFlagDef.#checkMatch("string", flag, false, desc, min, max, matchArr, def);
  }

  // match int

  static getReqIntMatchOne(flag, desc, matchArr, def = []){
    return F42ClFlagDef.#checkMatch("int", flag, true, desc, 1, 1, matchArr, def);
  }
  
  static getOptIntMatchOne(flag, desc, matchArr, def = []){
    return F42ClFlagDef.#checkMatch("int", flag, false, desc, 1, 1, matchArr, def);
  }

  static getReqIntMatchMulti(flag, desc, min, max, matchArr, def = []){
    return F42ClFlagDef.#checkMatch("int", flag, true, desc, min, max, matchArr, def);
  }
  
  static getOptIntMatchMulti(flag, desc, min, max, matchArr, def = []){
    return F42ClFlagDef.#checkMatch("int", flag, false, desc, min, max, matchArr, def);
  }

  // match float

  static getReqFloatMatchOne(flag, desc, matchArr, def = []){
    return F42ClFlagDef.#checkMatch("float", flag, true, desc, 1, 1, matchArr, def);
  }
  
  static getOptFloatMatchOne(flag, desc, matchArr, def = []){
    return F42ClFlagDef.#checkMatch("float", flag, false, desc, 1, 1, matchArr, def);
  }

  static getReqFloatMatchMulti(flag, desc, min, max, matchArr, def = []){
    return F42ClFlagDef.#checkMatch("float", flag, true, desc, min, max, matchArr, def);
  }
  
  static getOptFloatMatchMulti(flag, desc, min, max, matchArr, def = []){
    return F42ClFlagDef.#checkMatch("float", flag, false, desc, min, max, matchArr, def);
  }

  static #checkMatch(type, flag, req, desc, min, max, matchArr, def){
    let testType = type;

    if(testType == "int" || testType == "float"){
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

    if(matchArr.length < max){
      throw new Error("F42ClFlagDef.checkMatch: matchArr must be <= to: " + max);
    }

    for(const val of matchArr){
      if(typeof val !== testType){
        throw new Error("F42ClFlagDef.checkMatch: all values in matchArr must be type: " + testType);
      }
    }

    if(max == 1){
      desc = desc + " (one from : [" + matchArr + "])";

      return [flag, def, req, desc, ["match", type, matchArr]];
    }
    else{
      desc = desc + " (" + min + " - " + max + " from : [" + matchArr + "])";
      return [flag, def, req, desc, ["match", type, min, max, matchArr]];
    }
  }
}