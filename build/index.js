"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const get_type_structure_1 = require("./get-type-structure");
const get_interfaces_1 = require("./get-interfaces");
const get_names_1 = require("./get-names");
const util_1 = require("./util");
function JsonToTS(json, userOptions) {
    const defaultOptions = {
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
    const isArrayOfObjects = util_1.isArray(json) &&
        json.length > 0 &&
        json.reduce((a, b) => a && util_1.isObject(b), true);
    if (!(util_1.isObject(json) || isArrayOfObjects)) {
        throw new Error("Only (Object) and (Array of Object) are supported");
    }
    const typeStructure = get_type_structure_1.getTypeStructure(json, [], options.camelCaseKey);
    /**
     * due to merging array types some types are switched out for merged ones
     * so we delete the unused ones here
     */
    get_type_structure_1.optimizeTypeStructure(typeStructure);
    const names = get_names_1.getNames(typeStructure, options.rootName);
    return get_interfaces_1.getInterfaceDescriptions(typeStructure, names).map(get_interfaces_1.getInterfaceStringFromDescription);
}
exports.default = JsonToTS;
JsonToTS.default = JsonToTS;
module.exports = JsonToTS;
//# sourceMappingURL=index.js.map