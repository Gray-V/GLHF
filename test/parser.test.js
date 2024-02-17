import parser from "../src/parser.js"
import * as fs from "node:fs"
import assert from "assert"

assert.notEqual(parser(fs.readFileSync("examples/glhfProject/main.gg")), Error)