import { getTypeStructure, optimizeTypeStructure } from "./get-type-structure";
import { Options } from "./model";
import { getInterfaceDescriptions, getInterfaceStringFromDescription } from "./get-interfaces";
import { getNames } from "./get-names";
import { isArray, isObject } from "./util";

export default function JsonToTS(json: any, userOptions?: Options): string[] {
  const defaultOptions: Options = {
    rootName: "RootObject",
    camelCaseKey: false
  };
  const options = {
    ...defaultOptions,
    ...userOptions
  };

  /**
   * Parsing currently works with (Objects) and (Array of Objects) not and primitive types and mixed arrays etc..
   * so we shall validate, so we dont start parsing non Object type
   */
  const isArrayOfObjects =
    isArray(json) &&
    json.length > 0 &&
    json.reduce((a, b) => a && isObject(b), true);

  if (!(isObject(json) || isArrayOfObjects)) {
    throw new Error("Only (Object) and (Array of Object) are supported");
  }

  const typeStructure = getTypeStructure(json, [], options.camelCaseKey);
  /**
   * due to merging array types some types are switched out for merged ones
   * so we delete the unused ones here
   */
  optimizeTypeStructure(typeStructure);

  const names = getNames(typeStructure, options.rootName);

  return getInterfaceDescriptions(typeStructure, names).map(
    getInterfaceStringFromDescription
  );
}

(<any>JsonToTS).default = JsonToTS;
module.exports = JsonToTS;
