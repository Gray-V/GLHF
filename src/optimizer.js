import * as core from "./core.js"

export default function optimize(node) {
    console.log("Node constructor name:", node.constructor.name);
    console.log(node)
    return optimizers[node.kind]?.(node) ?? node
}
const optimizers = {
    Program(p) {
        p.statements = p.statements.flatMap(optimize);
        return p;
    },
    VariableDeclaration(d) {
        d.variable = optimize(d.variable)
        d.initializer = optimize(d.initializer)
        return d
      },
    BinaryExpression(e) {
        e.op = optimize(e.op)
        e.left = optimize(e.left)
        e.right = optimize(e.right)
        if (e.op === "??") {
          // Coalesce empty optional unwraps
          if (e.left?.kind === "EmptyOptional") {
            return e.right
          }
        } else if (e.op === "&&") {
          // Optimize boolean constants in && and ||
          if (e.left === true) return e.right
          if (e.right === true) return e.left
        } else if (e.op === "||") {
          if (e.left === false) return e.right
          if (e.right === false) return e.left
        } else if ([Number, BigInt].includes(e.left.constructor)) {
          // Numeric constant folding when left operand is constant
          if ([Number, BigInt].includes(e.right.constructor)) {
            if (e.op === "+") return e.left + e.right
            if (e.op === "%") return e.left % e.right
            if (e.op === "-") return e.left - e.right
            if (e.op === "*") return e.left * e.right
            if (e.op === "/") return e.left / e.right
            if (e.op === "**") return e.left ** e.right
            if (e.op === "<") return e.left < e.right
            if (e.op === "<=") return e.left <= e.right
            if (e.op === "==") return e.left === e.right
            if (e.op === "!=") return e.left !== e.right
            if (e.op === ">=") return e.left >= e.right
            if (e.op === ">") return e.left > e.right
          }
          if (e.left === 0 && e.op === "+") return e.right
          if (e.left === 1 && e.op === "*") return e.right
          if (e.left === 0 && e.op === "-") return core.unary("-", e.right)
          if (e.left === 1 && e.op === "**") return 1
          if (e.left === 0 && ["*", "/"].includes(e.op)) return 0
        } else if ([Number, BigInt].includes(e.right.constructor)) {
          // Numeric constant folding when right operand is constant
          if (["+", "-"].includes(e.op) && e.right === 0) return e.left
          if (["*", "/"].includes(e.op) && e.right === 1) return e.left
          if (e.op === "*" && e.right === 0) return 0
          if (e.op === "**" && e.right === 0) return 1
        }
        return e
      },
      UnaryExpression(e) {
        e.op = optimize(e.op)
        e.operand = optimize(e.operand)
        if (e.operand.constructor === Number) {
          if (e.op === "-") {
            return -e.operand
          }
        }
        return e
      },
      Assignment(s) {
        console.log("hello")
        console.log(s.source)
        s.source = optimize(s.source)
        s.target = optimize(s.target)
        if (s.source === s.target) {
          return []
        }
        return s
      },
      ReturnStatement(s) {
        s.exp = optimize(s.exp)
        return s
      },
      ShortReturnStatement(s) {
        return s
      },
      FunctionDeclaration(d) {
        d.fun = optimize(d.fun)
        if (d.body.statements) d.body.statements = d.body.statements.flatMap(optimize)
        return d
      },
      ArrayExpression(e) {
        e.elements = e.elements.map(optimize)
        return e
      },
      
}