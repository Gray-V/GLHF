import assert from 'node:assert/strict'
import analyze from '../src/analyzer.js'
import {
  program,
  variableDeclaration,
  variable,
  binary,
  floatType
} from '../src/core.js'
import parser from '../src/parser.js'

// Programs that are semantically correct
const semanticChecks = [
  ['variable declaration', 'x = 10'],
  ['function', 'Function load()\nFile.parent.start_menu\nend load\n'],
  [
    'function and call',
    'Function load()\nFile.parent.start_menu\nend load\nload()'
  ],
  [
    'recursive function',
    'Function load()\nFile.parent.start_menu\nload()\nend load'
  ],
  ['division', 'print(5/2)'],
  ['subtraction', 'print(2-2)'],
  ['exponential', 'print(2**2)'],
  ['exponential with negative', 'print(-2**2)'],
  ['modulos', 'print(3%2)'],
  ['subscript', 'array_1 = [1,2,3]\nprint(array_1[1])'],
  ['for each in array', 'for e in array\nend for'],
  ['for indexed', 'for (i = 0, i += 1)\nprint("HAI")\nend i < 5'],
  [
    'for iterable in array',
    'array = [0,1,2]\nfor i in array\nprint(i)\nend for'
  ],
  [
    'nested for',
    'for (i = 0, i += 1)\nfor(j = 0, j += 1)\nprint("HAI^2")\nend j < 10\nprint("HAI")\nend i < 10'
  ],
  ['dictionary', 'dict_2 = <<"hello" : "world", 2 : "wow", 2.02 : true>>'],
  [
    'dictionary iterable',
    'dict_2 = <<"hello" : "world", 2 : "wow", 2.02 : true>>\nfor i in dict_2\nprint(i)\nend for'
  ],
  [
    'multi line dictionary',
    'dict_1 = <<\n"hello": 1 + 3,\n"cars": "black",\n1: "socks"\n>>'
  ],
  ['array declaration', 'array_1 = ["hello","goodbye","run away", 1]'],
  ['add to array', 'array_1.add("2")'],
  [
    'insert to array',
    'array_1 = ["hello","goodbye","run away", 1]\narray_1.insert(1, "hi")'
  ],
  ['overwrite array index', 'array_1[1] = "hello"'],
  ['delete array index', 'array_1.delete(2)'],
  ['set settings', 'Window default()\nwidth = 200\nheight = 100\nend default'],
  ['multiple arithmetic operations', 'print(5-2+2/3)'],
  ['variable declaration int', 'x = 1'],
  ['assign to array element using indexing', 'a = [1,2,3]\n a[1]=100\n'],
  ['empty return', 'Gameloop a ()\nreturn\n end a'],
  ['return', 'Function a ()\nreturn 1\n end a'],
  ['short return', 'Function a ()\n return\n end a'],
  ['ternary operator', 'print(true ? 1 : 2)'],
  ['! operator', 'print(!true)'],
  ['== operator', 'print(1 == 1)'],
  ['!= operator', 'print(1 != 2)'],
  ['< operator', 'print(1 < 2)'],
  ['<= operator', 'print(1 <= 2)'],
  ['> operator', 'print(1 > 2)'],
  ['>= operator', 'print(1 >= 2)'],
  ['&& operator', 'print(true && true)'],
  ['|| operator', 'print(true || false)'],
  ['exp7 perentheses', 'print((1+2)*3)'],
  [
    'enum',
    "Function main()\n return 1\n end main\nFunction on_click()\n x = true\n return x\n end on_click\nstart_button = false\n~ on_click()\n'start_button' ->main()\nend ~"
  ]
]

// // Programs that are syntactically correct but have semantic errors
const semanticErrors = [
  [
    'must have the same type',
    'x = 1 + 1.0',
    /Operands must have the same type/
  ],
  ['must have a numeric type', "x = 'hi' - 'hi'", /Expected a number/],
  ['must have a boolean type', "x = 'hi' || 'hello'", /Expected a boolean/],
  [
    'assigning undeclared variable',
    'x = x + 5',
    /Gamer! You forgot to identify your variable/
  ],
  ['must have numeric or string type', "x = 'hi' - true", /Expected a number/],
  [
    'must have integer type',
    "array_1 = ['hello','goodbye','run away', 1]\nprint(array_1[1.1])",
    /Expected an integer/
  ],
  [
    'must have array type',
    'array_1 = 1\nprint(array_1[1])',
    /Expected an array/
  ]
]
// Test cases for expected semantic graphs after processing the AST. In general
// this suite of cases should have a test for each kind of node, including
// nodes that get rewritten as well as those that are just "passed through"
// by the analyzer. For now, we're just testing the various rewrites only.
describe('The analyzer', () => {
  for (const [scenario, source] of semanticChecks) {
    it(`recognizes ${scenario}`, () => {
      assert.ok(analyze(parser(source)))
    })
  }
  for (const [scenario, source, errorMessagePattern] of semanticErrors) {
    it(`throws on ${scenario}`, () => {
      assert.throws(() => analyze(parser(source)), errorMessagePattern)
    })
  }
})
