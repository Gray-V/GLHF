import parser from "../src/parser.js"
import * as fs from "node:fs"
import assert from "assert"

assert.notEqual(parser(fs.readFileSync("examples/glhfProject/main.gg")), Error)
assert.notEqual(parser(fs.readFileSync("examples/math.gg")), Error)
assert.notEqual(parser(fs.readFileSync("examples/array.gg")), Error)
assert.notEqual(parser(fs.readFileSync("examples/dictionary.gg")), Error)