import { TypeDescription, TypeStructure } from "./model";
export declare function getTypeStructure(targetObj: any, // object that we want to create types for
types?: TypeDescription[], camelCaseKey?: boolean): TypeStructure;
export declare function optimizeTypeStructure(typeStructure: TypeStructure): void;
