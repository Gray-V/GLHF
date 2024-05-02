export function program(statements) {
  return { kind: "Program", statements };
}

export function block(statements) {
  return { kind: "Block", statements };
}

export function enumBlock(statements) {
  return { kind: "EnumBlock", statements };
}

export function variableDeclaration(variable, initializer) {
  return { kind: "VariableDeclaration", variable, initializer };
}

export function variable(name, readOnly, type) {
  return { kind: "Variable", name, readOnly, type };
}

export const boolType = { kind: "BoolType" };
export const intType = { kind: "IntType" };
export const floatType = { kind: "FloatType" };
export const stringType = { kind: "StringType" };
export const voidType = { kind: "VoidType" };
export const anyType = { kind: "AnyType" };

export function functionDeclaration(fun, params, body) {
  return { kind: "FunctionDeclaration", fun, params, body };
}

export function paramList(params) {
  return { kind: "ParamList", params };
}

export function fun(name, type) {
  return { kind: "Function", name, type };
}

export function arrayType(baseType) {
  return { kind: "ArrayType", baseType };
}

export function dictType(baseType) {
  return { kind: "DictType", baseType };
}

export function functionType(paramTypes, returnType) {
  return { kind: "FunctionType", paramTypes, returnType };
}

export function assignment(target, source) {
  return { kind: "Assignment", target, source };
}

export function returnStatement(exp) {
  return { kind: "ReturnStatement", exp };
}

export function shortReturnStatement() {
  return { kind: "ShortReturnStatement" };
}

export function enumStatement(test, consequent, alternate) {
  return { kind: "EnumStatement", test, consequent, alternate };
}

export function forStatement(iterator, collection, body) {
  return { kind: "ForStatement", iterator, collection, body };
}

export function forRangeStatement(iterator, low, high, body) {
  return { kind: "ForRangeStatement", iterator, low, high, body };
}

export function conditional(test, consequent, alternate, type) {
  return { kind: "Conditional", test, consequent, alternate, type };
}

export function binary(op, left, right, type) {
  return { kind: "BinaryExpression", op, left, right, type };
}

export function unary(op, operand, type) {
  return { kind: "UnaryExpression", op, operand, type };
}

export function subscript(array, index) {
  return {
    kind: "SubscriptExpression",
    array,
    index,
    type: array.type,
  };
}

export function arrayExpression(elements) {
  return { kind: "ArrayExpression", elements, type: arrayType(anyType) };
}

export function callExpression(callee, args) {
  return { kind: "FunctionCall", callee, args, type: callee.type };
}

export function path(path) {
  return { kind: "Path", path, type: arrayType(stringType) };
}

export function print(print) {
  return { kind: "Print", print };
}

const floatToFloatType = functionType([floatType], floatType);
const floatFloatToFloatType = functionType([floatType, floatType], floatType);
const stringToIntsType = functionType([stringType], arrayType(intType));
const anyToVoidType = functionType([anyType], voidType);

export const standardLibrary = Object.freeze({
  int: intType,
  float: floatType,
  boolean: boolType,
  string: stringType,
  void: voidType,
  any: anyType,
  π: variable("π", true, floatType),
  print: fun("print", anyToVoidType),
  sin: fun("sin", floatToFloatType),
  cos: fun("cos", floatToFloatType),
  exp: fun("exp", floatToFloatType),
  ln: fun("ln", floatToFloatType),
  hypot: fun("hypot", floatFloatToFloatType),
  bytes: fun("bytes", stringToIntsType),
  codepoints: fun("codepoints", stringToIntsType),
});

String.prototype.type = stringType;
Number.prototype.type = floatType;
BigInt.prototype.type = intType;
Boolean.prototype.type = boolType;
