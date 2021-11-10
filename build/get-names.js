"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNames = void 0;
const pluralize = require("pluralize");
const model_1 = require("./model");
const util_1 = require("./util");
function getName({ rootTypeId, types }, keyName, names, isInsideArray) {
    const typeDesc = types.find(_ => _.id === rootTypeId);
    switch (util_1.getTypeDescriptionGroup(typeDesc)) {
        case model_1.TypeGroup.Array:
            typeDesc.arrayOfTypes.forEach((typeIdOrPrimitive, i) => {
                getName({ rootTypeId: typeIdOrPrimitive, types }, 
                // to differenttiate array types
                i === 0 ? keyName : `${keyName}${i + 1}`, names, true);
            });
            return {
                rootName: getNameById(typeDesc.id, keyName, isInsideArray, types, names),
                names
            };
        case model_1.TypeGroup.Object:
            Object.entries(typeDesc.typeObj).forEach(([key, value]) => {
                getName({ rootTypeId: value, types }, key, names, false);
            });
            return {
                rootName: getNameById(typeDesc.id, keyName, isInsideArray, types, names),
                names
            };
        case model_1.TypeGroup.Primitive:
            // in this case rootTypeId is primitive type string (string, null, number, boolean)
            return {
                rootName: rootTypeId,
                names
            };
    }
}
function getNames(typeStructure, rootName = "RootObject") {
    return getName(typeStructure, rootName, [], false).names.reverse();
}
exports.getNames = getNames;
function getNameById(id, keyName, isInsideArray, types, nameMap) {
    let nameEntry = nameMap.find(_ => _.id === id);
    if (nameEntry) {
        return nameEntry.name;
    }
    const typeDesc = util_1.findTypeById(id, types);
    const group = util_1.getTypeDescriptionGroup(typeDesc);
    let name;
    switch (group) {
        case model_1.TypeGroup.Array:
            name = typeDesc.isUnion ? getArrayName(typeDesc, types, nameMap) : formatArrayName(typeDesc, types, nameMap);
            break;
        case model_1.TypeGroup.Object:
            /**
             * picking name for type in array requires to singularize that type name,
             * and if not then no need to singularize
             */
            name = [keyName]
                .map(key => util_1.parseKeyMetaData(key).keyValue)
                .map(name => (isInsideArray ? pluralize.singular(name) : name))
                .map(pascalCase)
                .map(normalizeInvalidTypeName)
                .map(pascalCase) // needed because removed symbols might leave first character uncapitalized
                .map(name => uniqueByIncrement(name, nameMap.map(({ name }) => name)))
                .pop();
            break;
    }
    nameMap.push({ id, name });
    return name;
}
function pascalCase(name) {
    return name
        .split(/\s+/g)
        .filter(_ => _ !== "")
        .map(capitalize)
        .reduce((a, b) => a + b);
}
function capitalize(name) {
    return name.charAt(0).toUpperCase() + name.slice(1);
}
function normalizeInvalidTypeName(name) {
    if (/^[a-zA-Z][a-zA-Z0-9]*$/.test(name)) {
        return name;
    }
    else {
        const noSymbolsName = name.replace(/[^a-zA-Z0-9]/g, "");
        const startsWithWordCharacter = /^[a-zA-Z]/.test(noSymbolsName);
        return startsWithWordCharacter ? noSymbolsName : `_${noSymbolsName}`;
    }
}
function uniqueByIncrement(name, names) {
    for (let i = 0; i < 1000; i++) {
        const nameProposal = i === 0 ? name : `${name}${i + 1}`;
        if (!names.includes(nameProposal)) {
            return nameProposal;
        }
    }
}
function getArrayName(typeDesc, types, nameMap) {
    if (typeDesc.arrayOfTypes.length === 0) {
        return "any";
    }
    else if (typeDesc.arrayOfTypes.length === 1) {
        const [idOrPrimitive] = typeDesc.arrayOfTypes;
        return convertToReadableType(idOrPrimitive, types, nameMap);
    }
    else {
        return unionToString(typeDesc, types, nameMap);
    }
}
function convertToReadableType(idOrPrimitive, types, nameMap) {
    return util_1.isHash(idOrPrimitive)
        ? // array keyName makes no difference in picking name for type
            getNameById(idOrPrimitive, null, true, types, nameMap)
        : idOrPrimitive;
}
function unionToString(typeDesc, types, nameMap) {
    return typeDesc.arrayOfTypes.reduce((acc, type, i) => {
        const readableTypeName = convertToReadableType(type, types, nameMap);
        return i === 0 ? readableTypeName : `${acc} | ${readableTypeName}`;
    }, "");
}
function formatArrayName(typeDesc, types, nameMap) {
    const innerTypeId = typeDesc.arrayOfTypes[0];
    // const isMultipleTypeArray = findTypeById(innerTypeId, types).arrayOfTypes.length > 1
    const isMultipleTypeArray = util_1.isHash(innerTypeId) &&
        util_1.findTypeById(innerTypeId, types).isUnion &&
        util_1.findTypeById(innerTypeId, types).arrayOfTypes.length > 1;
    const readableInnerType = getArrayName(typeDesc, types, nameMap);
    return isMultipleTypeArray
        ? `(${readableInnerType})[]` // add semicolons for union type
        : `${readableInnerType}[]`;
}
//# sourceMappingURL=get-names.js.map