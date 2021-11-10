"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.optimizeTypeStructure = exports.getTypeStructure = void 0;
const hash = require("hash.js");
const lodash_1 = require("lodash");
const util_1 = require("./util");
const model_1 = require("./model");
function createTypeDescription(typeObj, isUnion) {
    if (util_1.isArray(typeObj)) {
        return {
            id: Hash(JSON.stringify([...typeObj, isUnion])),
            arrayOfTypes: typeObj,
            isUnion
        };
    }
    else {
        return {
            id: Hash(JSON.stringify(typeObj)),
            typeObj
        };
    }
}
function getIdByType(typeObj, types, isUnion = false) {
    let typeDesc = types.find(el => {
        return typeObjectMatchesTypeDesc(typeObj, el, isUnion);
    });
    if (!typeDesc) {
        typeDesc = createTypeDescription(typeObj, isUnion);
        types.push(typeDesc);
    }
    return typeDesc.id;
}
function Hash(content) {
    return hash
        .sha1()
        .update(content)
        .digest("hex");
}
function typeObjectMatchesTypeDesc(typeObj, typeDesc, isUnion) {
    if (util_1.isArray(typeObj)) {
        return arraysContainSameElements(typeObj, typeDesc.arrayOfTypes) && typeDesc.isUnion === isUnion;
    }
    else {
        return objectsHaveSameEntries(typeObj, typeDesc.typeObj);
    }
}
function arraysContainSameElements(arr1, arr2) {
    if (arr1 === undefined || arr2 === undefined)
        return false;
    return arr1.sort().join("") === arr2.sort().join("");
}
function objectsHaveSameEntries(obj1, obj2) {
    if (obj1 === undefined || obj2 === undefined)
        return false;
    const entries1 = Object.entries(obj1);
    const entries2 = Object.entries(obj2);
    const sameLength = entries1.length === entries2.length;
    const sameTypes = entries1.every(([key, value]) => {
        return obj2[key] === value;
    });
    return sameLength && sameTypes;
}
function getSimpleTypeName(value) {
    if (value === null) {
        return "null";
    }
    else if (value instanceof Date) {
        return "Date";
    }
    else {
        return typeof value;
    }
}
function getTypeGroup(value) {
    if (util_1.isDate(value)) {
        return model_1.TypeGroup.Date;
    }
    else if (util_1.isArray(value)) {
        return model_1.TypeGroup.Array;
    }
    else if (util_1.isObject(value)) {
        return model_1.TypeGroup.Object;
    }
    else {
        return model_1.TypeGroup.Primitive;
    }
}
function createTypeObject(obj, types, camelCaseKey) {
    return Object.entries(obj).reduce((typeObj, [key, value]) => {
        const { rootTypeId } = getTypeStructure(value, types, camelCaseKey);
        key = camelCaseKey ? lodash_1.camelCase(key) : key;
        return {
            ...typeObj,
            [key]: rootTypeId
        };
    }, {});
}
function getMergedObjects(typesOfArray, types) {
    const typeObjects = typesOfArray.map(typeDesc => typeDesc.typeObj);
    const allKeys = typeObjects
        .map(typeObj => Object.keys(typeObj))
        .reduce((a, b) => [...a, ...b], [])
        .filter(util_1.onlyUnique);
    const commonKeys = typeObjects.reduce((commonKeys, typeObj) => {
        const keys = Object.keys(typeObj);
        return commonKeys.filter(key => keys.includes(key));
    }, allKeys);
    const getKeyType = key => {
        const typesOfKey = typeObjects
            .filter(typeObj => {
            return Object.keys(typeObj).includes(key);
        })
            .map(typeObj => typeObj[key])
            .filter(util_1.onlyUnique);
        if (typesOfKey.length === 1) {
            return typesOfKey.pop();
        }
        else {
            return getInnerArrayType(typesOfKey, types);
        }
    };
    const typeObj = allKeys.reduce((obj, key) => {
        const isMandatory = commonKeys.includes(key);
        const type = getKeyType(key);
        const keyValue = isMandatory ? key : toOptionalKey(key);
        return {
            ...obj,
            [keyValue]: type
        };
    }, {});
    return getIdByType(typeObj, types, true);
}
function toOptionalKey(key) {
    return key.endsWith("--?") ? key : `${key}--?`;
}
function getMergedArrays(typesOfArray, types) {
    const idsOfArrayTypes = typesOfArray
        .map(typeDesc => typeDesc.arrayOfTypes)
        .reduce((a, b) => [...a, ...b], [])
        .filter(util_1.onlyUnique);
    if (idsOfArrayTypes.length === 1) {
        return getIdByType([idsOfArrayTypes.pop()], types);
    }
    else {
        return getIdByType([getInnerArrayType(idsOfArrayTypes, types)], types);
    }
}
// we merge union types example: (number | string), null -> (number | string | null)
function getMergedUnion(typesOfArray, types) {
    const innerUnionsTypes = typesOfArray
        .map(id => {
        return util_1.findTypeById(id, types);
    })
        .filter(_ => !!_ && _.isUnion)
        .map(_ => _.arrayOfTypes)
        .reduce((a, b) => [...a, ...b], []);
    const primitiveTypes = typesOfArray.filter(id => !util_1.findTypeById(id, types) || !util_1.findTypeById(id, types).isUnion); // primitives or not union
    return getIdByType([...innerUnionsTypes, ...primitiveTypes], types, true);
}
function getInnerArrayType(typesOfArray, types) {
    // return inner array type
    const containsNull = typesOfArray.includes("null");
    const arrayTypesDescriptions = typesOfArray.map(id => util_1.findTypeById(id, types)).filter(_ => !!_);
    const allArrayType = arrayTypesDescriptions.filter(typeDesc => util_1.getTypeDescriptionGroup(typeDesc) === model_1.TypeGroup.Array).length ===
        typesOfArray.length;
    const allArrayTypeWithNull = arrayTypesDescriptions.filter(typeDesc => util_1.getTypeDescriptionGroup(typeDesc) === model_1.TypeGroup.Array).length + 1 ===
        typesOfArray.length && containsNull;
    const allObjectTypeWithNull = arrayTypesDescriptions.filter(typeDesc => util_1.getTypeDescriptionGroup(typeDesc) === model_1.TypeGroup.Object).length + 1 ===
        typesOfArray.length && containsNull;
    const allObjectType = arrayTypesDescriptions.filter(typeDesc => util_1.getTypeDescriptionGroup(typeDesc) === model_1.TypeGroup.Object).length ===
        typesOfArray.length;
    if (typesOfArray.length === 0) {
        // no types in array -> empty union type
        return getIdByType([], types, true);
    }
    if (typesOfArray.length === 1) {
        // one type in array -> that will be our inner type
        return typesOfArray.pop();
    }
    if (typesOfArray.length > 1) {
        // multiple types in merge array
        // if all are object we can merge them and return merged object as inner type
        if (allObjectType)
            return getMergedObjects(arrayTypesDescriptions, types);
        // if all are array we can merge them and return merged array as inner type
        if (allArrayType)
            return getMergedArrays(arrayTypesDescriptions, types);
        // all array types with posibble null, result type = null | (*mergedArray*)[]
        if (allArrayTypeWithNull) {
            return getMergedUnion([getMergedArrays(arrayTypesDescriptions, types), "null"], types);
        }
        // all object types with posibble null, result type = null | *mergedObject*
        if (allObjectTypeWithNull) {
            return getMergedUnion([getMergedObjects(arrayTypesDescriptions, types), "null"], types);
        }
        // if they are mixed or all primitive we cant merge them so we return as mixed union type
        return getMergedUnion(typesOfArray, types);
    }
}
function getTypeStructure(targetObj, // object that we want to create types for
types = [], camelCaseKey = false) {
    switch (getTypeGroup(targetObj)) {
        case model_1.TypeGroup.Array:
            const typesOfArray = targetObj.map(_ => getTypeStructure(_, types, camelCaseKey).rootTypeId).filter(util_1.onlyUnique);
            const arrayInnerTypeId = getInnerArrayType(typesOfArray, types); // create "union type of array types"
            const typeId = getIdByType([arrayInnerTypeId], types); // create type "array of union type"
            return {
                rootTypeId: typeId,
                types
            };
        case model_1.TypeGroup.Object:
            const typeObj = createTypeObject(targetObj, types, camelCaseKey);
            const objType = getIdByType(typeObj, types);
            return {
                rootTypeId: objType,
                types
            };
        case model_1.TypeGroup.Primitive:
            return {
                rootTypeId: getSimpleTypeName(targetObj),
                types
            };
        case model_1.TypeGroup.Date:
            const dateType = getSimpleTypeName(targetObj);
            return {
                rootTypeId: dateType,
                types
            };
    }
}
exports.getTypeStructure = getTypeStructure;
function getAllUsedTypeIds({ rootTypeId, types }) {
    const typeDesc = types.find(_ => _.id === rootTypeId);
    const subTypes = (typeDesc) => {
        switch (util_1.getTypeDescriptionGroup(typeDesc)) {
            case model_1.TypeGroup.Array:
                const arrSubTypes = typeDesc.arrayOfTypes
                    .filter(util_1.isHash)
                    .map(typeId => {
                    const typeDesc = types.find(_ => _.id === typeId);
                    return subTypes(typeDesc);
                })
                    .reduce((a, b) => [...a, ...b], []);
                return [typeDesc.id, ...arrSubTypes];
            case model_1.TypeGroup.Object:
                const objSubTypes = Object.values(typeDesc.typeObj)
                    .filter(util_1.isHash)
                    .map(typeId => {
                    const typeDesc = types.find(_ => _.id === typeId);
                    return subTypes(typeDesc);
                })
                    .reduce((a, b) => [...a, ...b], []);
                return [typeDesc.id, ...objSubTypes];
        }
    };
    return subTypes(typeDesc);
}
function optimizeTypeStructure(typeStructure) {
    const usedTypeIds = getAllUsedTypeIds(typeStructure);
    const optimizedTypes = typeStructure.types.filter(typeDesc => usedTypeIds.includes(typeDesc.id));
    typeStructure.types = optimizedTypes;
}
exports.optimizeTypeStructure = optimizeTypeStructure;
//# sourceMappingURL=get-type-structure.js.map