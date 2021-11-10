"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInterfaceDescriptions = exports.getInterfaceStringFromDescription = void 0;
const util_1 = require("./util");
function isKeyNameValid(keyName) {
    const regex = /^[a-zA-Z_][a-zA-Z\d_]*$/;
    return regex.test(keyName);
}
function parseKeyMetaData(key) {
    const isOptional = key.endsWith("--?");
    if (isOptional) {
        return {
            isOptional,
            keyValue: key.slice(0, -3)
        };
    }
    else {
        return {
            isOptional,
            keyValue: key
        };
    }
}
function findNameById(id, names) {
    return names.find(_ => _.id === id).name;
}
function removeNullFromUnion(unionTypeName) {
    const typeNames = unionTypeName.split(" | ");
    const nullIndex = typeNames.indexOf("null");
    typeNames.splice(nullIndex, 1);
    return typeNames.join(" | ");
}
function replaceTypeObjIdsWithNames(typeObj, names) {
    return (Object.entries(typeObj)
        // quote key if is invalid and question mark if optional from array merging
        .map(([key, type]) => {
        const { isOptional, keyValue } = parseKeyMetaData(key);
        const isValid = isKeyNameValid(keyValue);
        const validName = isValid ? keyValue : `'${keyValue}'`;
        return isOptional ? [`${validName}?`, type, isOptional] : [validName, type, isOptional];
    })
        // replace hashes with names referencing the hashes
        .map(([key, type, isOptional]) => {
        if (!util_1.isHash(type)) {
            return [key, type, isOptional];
        }
        const newType = findNameById(type, names);
        return [key, newType, isOptional];
    })
        // if union has null, remove null and make type optional
        .map(([key, type, isOptional]) => {
        if (!(util_1.isNonArrayUnion(type) && type.includes("null"))) {
            return [key, type, isOptional];
        }
        const newType = removeNullFromUnion(type);
        const newKey = isOptional ? key : `${key}?`; // if already optional dont add question mark
        return [newKey, newType, isOptional];
    })
        // make null optional and set type as any
        .map(([key, type, isOptional]) => {
        if (type !== "null") {
            return [key, type, isOptional];
        }
        const newType = "any";
        const newKey = isOptional ? key : `${key}?`; // if already optional dont add question mark
        return [newKey, newType, isOptional];
    })
        .reduce((agg, [key, value]) => {
        agg[key] = value;
        return agg;
    }, {}));
}
function getInterfaceStringFromDescription({ name, typeMap }) {
    const stringTypeMap = Object.entries(typeMap)
        .map(([key, name]) => `  ${key}: ${name};\n`)
        .reduce((a, b) => (a += b), "");
    let interfaceString = `interface ${name} {\n`;
    interfaceString += stringTypeMap;
    interfaceString += "}";
    return interfaceString;
}
exports.getInterfaceStringFromDescription = getInterfaceStringFromDescription;
function getInterfaceDescriptions(typeStructure, names) {
    return names
        .map(({ id, name }) => {
        const typeDescription = util_1.findTypeById(id, typeStructure.types);
        if (typeDescription.typeObj) {
            const typeMap = replaceTypeObjIdsWithNames(typeDescription.typeObj, names);
            return { name, typeMap };
        }
        else {
            return null;
        }
    })
        .filter(_ => _ !== null);
}
exports.getInterfaceDescriptions = getInterfaceDescriptions;
//# sourceMappingURL=get-interfaces.js.map