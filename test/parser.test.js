import parser from "../src/parser.js"
import * as fs from "node:fs"

try {
    parser(fs.readFileSync("examples/glhfProject/main.gg"))
    parser(fs.readFileSync("examples/math.gg"))
    parser(fs.readFileSync("examples/array.gg"))
    parser(fs.readFileSync("examples/dictionary.gg"))
    console.log("Syntax ok")
} catch(e) {
    console.log(e.message)
    process.exit(1)
}