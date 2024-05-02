import assert from "assert/strict";
import optimize from "../src/optimizer.js";
import * as core from "../src/core.js";

const x = new core.variable("x", false);
const return1p1 = new core.returnStatement(new core.binary("+", 1, 1));
const return2 = new core.returnStatement(2);
const onePlusTwo = new core.binary("+", 1, 2);
const intFun = (body) => new core.functionDeclaration("f", [], "int", body);
const or = (...d) => d.reduce((x, y) => new core.binary("||", x, y));
const and = (...c) => c.reduce((x, y) => new core.binary("&&", x, y));
const less = (x, y) => new core.binary("<", x, y);
const times = (x, y) => new core.binary("*", x, y);
const neg = (x) => new core.unary("-", x);
const array = (...elements) => new core.arrayExpression(elements);
const sub = (a, e) => new core.subscript(a, e);

const tests = [
  ["folds +", new core.binary("+", 5, 8), 13],
  ["folds -", new core.binary("-", 5n, 8n), -3n],
  ["folds *", new core.binary("*", 5, 8), 40],
  ["folds /", new core.binary("/", 5, 8), 0.625],
  ["folds **", new core.binary("**", 5, 8), 390625],
  ["folds %", new core.binary("%", 5, 8), 5],
  ["folds <", new core.binary("<", 5, 8), true],
  ["folds <=", new core.binary("<=", 5, 8), true],
  ["folds ==", new core.binary("==", 5, 8), false],
  ["folds !=", new core.binary("!=", 5, 8), true],
  ["folds >=", new core.binary(">=", 5, 8), false],
  ["folds >", new core.binary(">", 5, 8), false],
  ["optimizes +0", new core.binary("+", x, 0), x],
  ["optimizes -0", new core.binary("-", x, 0), x],
  ["optimizes *1", new core.binary("*", x, 1), x],
  ["optimizes /1", new core.binary("/", x, 1), x],
  ["optimizes *0", new core.binary("*", x, 0), 0],
  ["optimizes 0*", new core.binary("*", 0, x), 0],
  ["optimizes 0/", new core.binary("/", 0, x), 0],
  ["optimizes 0+", new core.binary("+", 0, x), x],
  ["optimizes 0-", new core.binary("-", 0, x), neg(x)],
  ["optimizes 1*", new core.binary("*", 1, x), x],
  ["folds negation", new core.unary("-", 8), -8],
  ["optimizes 1**", new core.binary("**", 1, x), 1],
  ["optimizes **0", new core.binary("**", x, 0), 1],
  ["removes left false from or", or(false, less(x, 1)), less(x, 1)],
  ["removes right false from or", or(less(x, 1), false), less(x, 1)],
  ["removes left true from and", and(true, less(x, 1)), less(x, 1)],
  ["removes right true from and", and(less(x, 1), true), less(x, 1)],
  [
    "removes x=x at beginning",
    [new core.assignment(x, x), return1p1],
    [return2],
  ],
  ["removes x=x at end", [return1p1, new core.assignment(x, x)], [return2]],
  [
    "removes x=x in middle",
    [return1p1, new core.assignment(x, x), return1p1],
    [return2, return2],
  ],
  [
    "optimizes forLoop",
    [new core.forRangeStatement(x, 3, 2, new core.block([]))],
    [],
  ],
  ["optimizes in functions", intFun(return1p1), intFun(return2)],
  ["optimizes in subscripts", sub(x, onePlusTwo), sub(x, 3)],
  ["optimizes in array literals", array(0, onePlusTwo, 9), array(0, 3, 9)],
  [
    "optimizes in arguments",
    core.callExpression(core.fun("f", "any"), [times(3, 5)]),
    core.callExpression(core.fun("f", "any"), [15]),
  ],
];
console.log(core.assignment(x, x));

describe("The optimizer", () => {
  for (const [scenario, before, after] of tests) {
    it(`${scenario}`, () => {
      assert.deepEqual(
        optimize(
          core.program(before.constructor === Array ? before : [before])
        ),
        core.program(before.constructor === Array ? after : [after])
      );
    });
  }
});
