import assert from "assert/strict";
import analyze from "../src/analyzer.js";
import optimize from "../src/optimizer.js";
import generate from "../src/generator.js";
import parser from "../src/parser.js";

function dedent(s) {
  return `${s}`.replace(/(?<=\n)\s+/g, "").trim();
}

const fixtures = [
  {
    name: "vardec",
    source: `
        x = 21
        print(x)
    `,
    expected: dedent`
        let x_1 = 21;
        console.log(x_1);
    `,
  },
  {
    name: "small",
    source: `
        x = 21
        x += 1
        x -= 1
        y = (5 ** (-x)) / (-100) > (-x)
        print(y && y || x * 2 != 5)
    `,
    expected: dedent`
        let x_1 = 21;
        x_1 = x_1 + 1;
        x_1 = x_1 - 1;
        let y_2 = 5 ** -x_1 / -100 > -x_1;
        console.log(y_2 && y_2 || x_1 * 2 != 5);
    `,
  },
  {
    name: "for loops",
    source: `
        for (i = 0, i += 1)
            print("hello")
        end i < 10
    `,
    expected: dedent`
      for(let i_1 = 0; i_1 < 10; i_1++) {
        console.log("hello");
      }
    `,
  },
  {
    name: "true false",
    source: `
        y = true
        x = false
        print(y)
        print(x)
    `,
    expected: dedent`
        let y_1 = true;
        let x_2 = false;
        console.log(y_1);
        console.log(x_2);
    `,
  },
  {
    name: "functions",
    source: `
      Function f(x, y)
        x = 0
        y = 1
        x = 2 - x
        return x
        end f
    `,
    expected: dedent`
        function f_1(x_2, y_3) {
           x_2 = 0;
           y_3 = 1;
           x_2 = 2 - x_2;
           return x_2;
        }
    `,
  },
  {
    name: "short return",
    source: `
      Function g(x)
        x = 0
        return
        end g
    `,
    expected: dedent`
        function g_1(x_2) {
            x_2 = 0;
            return;
        }
    `,
  },
];

describe("The code generator", () => {
  for (const fixture of fixtures) {
    it(`produces expected js output for the ${fixture.name} program`, () => {
      const actual = generate(optimize(analyze(parser(fixture.source))));
      assert.deepEqual(actual, fixture.expected);
    });
  }
});
