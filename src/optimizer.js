import * as core from "./core.js"

export default function optimize(node) {
    console.log("Node constructor name:", node.constructor.name);
    console.log(node)
    return optimizers[node.kind]?.(node) ?? node
}
const optimizers = {
    Program(p) {
        p.statements = optimize(p.statements)
        return p
    },
    Block(b){
        b.statements = optimize(b.statements)
        return b
    },
    EnumBlock(b){
        b.statements = optimize(b.statements)
        return b
    },
    Assignment(r,exp) {
        r.source = optimize(r.source)
        exp.target = optimize(exp.target)
        if (r.source === exp.target) {
            return []
        }
        return r
    },
    Params(p) {
      for (param in p.statements){
        param.id = optimize(param.id)
      }
      return p
    },
    For_increment(id, exp, block){
        id = optimize(id)
        exp = optimize(exp)
        block = optimize(block)
        return [id, exp, block]
    },
    For_iterable(id, exp, block){
        id = optimize(id)
        exp = optimize(exp)
        block = optimize(block)
        return [id, exp, block]
    },
    ForEachLoop(s) {
      s.variable = optimize(s.variable)
      s.expression = optimize(s.expression)
      s.body = optimize(s.body)
      if (s.expression.constructor === core.EmptyArray) {
          return []
      } // TODO !!!
      return s
    },
    
    Return_something(e){
        e = optimize(e)
        return e
    },
    Stmt_function(id, params, block, exp){ 
        id = optimize(id)
        params = optimize(params)
        block = optimize(block)
        exp = optimize(exp)
        return [id, params, block, exp]
    },
    Stmt(s){
        s = optimize(s)
        return s
    },
    Stmt_enum(s,e){
        s = optimize(s)
        e = optimize(e)
        return [s,e]
    },
    Exp_unary(u,e){
        u = optimize(u)
        e = optimize(e)
        return [u,e]

        // e.op = optimize(e.op)
        // e.operand = optimize(e.operand)
        // if (e.operand.constructor === Number) {
        //     if (e.op === "-") {
        //         return -e.operand
        //     }
        // }
        // return e
    },

    //Expressions
    //SPLIT
    BinaryExpression(e) {
        e.op = optimize(e.op)
        e.left = optimize(e.left)
        e.right = optimize(e.right)
        if (e.op === "and") {
            // Optimize boolean constants in && and ||
            if (e.left === true) return e.right
            else if (e.right === true) return e.left
        } else if (e.op === "or") {
            if (e.left === false) return e.right
            else if (e.right === false) return e.left
        } else if ([Number, BigInt].includes(e.left.constructor)) {
            // Numeric constant folding when left operand is constant
            if ([Number, BigInt].includes(e.right.constructor)) {
                if (e.op === "+") return e.left + e.right
                else if (e.op === "-") return e.left - e.right
                else if (e.op === "*") return e.left * e.right
                else if (e.op === "/") return e.left / e.right
                else if (e.op === "**") return e.left ** e.right
                else if (e.op === "%") return e.left % e.right
                else if (e.op === "<") return e.left < e.right
                else if (e.op === "<=") return e.left <= e.right
                else if (e.op === "==") return e.left === e.right
                else if (e.op === "!=") return e.left !== e.right
                else if (e.op === ">=") return e.left >= e.right
                else if (e.op === ">") return e.left > e.right
            } else if (e.left === 0 && e.op === "+") return e.right
            else if (e.left === 1 && e.op === "*") return e.right
            else if (e.left === 0 && e.op === "-")
                return new core.UnaryExpression("-", e.right)
            else if (e.left === 1 && e.op === "**") return 1
            else if (e.left === 0 && ["*", "/"].includes(e.op)) return 0
        } else if (e.right.constructor === Number) {
            // Numeric constant folding when right operand is constant
            if (["+", "-"].includes(e.op) && e.right === 0) return e.left
            else if (["*", "/"].includes(e.op) && e.right === 1) return e.left
            else if (e.op === "*" && e.right === 0) return 0
            else if (e.op === "**" && e.right === 0) return 1 // TODO: What to do about %
        }
        return e
    },


    true(e) {
        return e
    },
    false(e) {
        return e
    },
    OpAss(id, op, exp) {
        id = optimize(id)
        op = optimize(op)
        exp = optimize(exp)
        return [id, op, exp]
    },
    MethodDeclaration(d) {
        // TODO: How to do this?
        d.name = optimize(d.name)
        d.returnType = optimize(d.returnType)
        d.params = optimize(d.params)
        if (d.body) d.body = optimize(d.body)
        return d
    },
    ArrayExpression(e) {
        e.elements = optimize(e.elements)
        return e
    },
    Call(c) {
        c.callee = optimize(c.callee)
        c.args = optimize(c.args)
        return c
    },
    Path(c) {
        c.object = optimize(c.object)
        c.member = optimize(c.member)
        return c
    },
    Wait(n) {
        n = optimize(n)
        return n
    },
    Index(id, exp) {    
        id = optimize(id)
        exp = optimize(exp)
        return [id, exp]
    },
    Print(p) {
        p.argument = optimize(p.argument)
        return p
    },
    Dictionary(e) {
        e.elements = optimize(e.elements)
        return e
    },
    Dictionary_format(e) {
        e.key = optimize(e.key)
        e.value = optimize(e.value)
        return e
    },
    IfStatement(s) {
        s.test = optimize(s.test)
        s.consequent = optimize(s.consequent)
        s.alternate = optimize(s.alternate)
        for (let i = 0; i < s.test.length; i++) {
            if (s.test[i].constructor === Boolean && s.test[i]) {
                // Ask Dr. Toal what to do if we have lots of else-ifs because we can't rely on recursion.
                return s.consequent[i]
            }
            if (
                i === s.test.length - 1 &&
                s.test[i].constructor === Boolean &&
                !s.test[i]
            ) {
                return s.alternate
            }
        }
        return s
    },


    num_string(e) {
        return e
    },
    num_float(e) {
        return e
    },
    num_int(e) {
        return e
    },

}