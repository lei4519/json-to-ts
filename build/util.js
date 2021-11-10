"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findTypeById = exports.getTypeDescriptionGroup = exports.parseKeyMetaData = exports.isDate = exports.isObject = exports.isNonArrayUnion = exports.isArray = exports.onlyUnique = exports.isHash = void 0;
const model_1 = require("./model");
function isHash(str) {
    return str.length === 40;
}
exports.isHash = isHash;
function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
}
exports.onlyUnique = onlyUnique;
function isArray(x) {
    return Object.prototype.toString.call(x) === "[object Array]";
}
exports.isArray = isArray;
function isNonArrayUnion(typeName) {
    const arrayUnionRegex = /^\(.*\)\[\]$/;
    return typeName.includes(" | ") && !arrayUnionRegex.test(typeName);
}
exports.isNonArrayUnion = isNonArrayUnion;
function isObject(x) {
    return Object.prototype.toString.call(x) === "[object Object]" && x !== null;
}
exports.isObject = isObject;
function isDate(x) {
    return x instanceof Date;
}
exports.isDate = isDate;
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
exports.parseKeyMetaData = parseKeyMetaData;
function getTypeDescriptionGroup(desc) {
    if (desc === undefined) {
        return model_1.TypeGroup.Primitive;
    }
    else if (desc.arrayOfTypes !== undefined) {
        return model_1.TypeGroup.Array;
    }
    else {
        return model_1.TypeGroup.Object;
    }
}
exports.getTypeDescriptionGroup = getTypeDescriptionGroup;
function findTypeById(id, types) {
    return types.find(_ => _.id === id);
}
exports.findTypeById = findTypeById;
//# sourceMappingURL=util.js.map