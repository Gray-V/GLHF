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
    Ass(e) {
        e.relid = optimize(s.relid)
        e.exp = optimize(s.exp)
        if (e.relid === e.exp) {
            return []
        }
        return e
    },
    Params(p) {
      for (param in p.statements){
        param.id = optimize(param.id)
      }
      return p
    },
    For_increment(e){
        e.assignment = optimize(e.assignment)
        e.updateExp = optimize(e.updateExp)
        e.endExp = optimize(e.endExp)
        e.block = optimize(e.block)

        if (e.updateExp.constructor === Number) {
            if (e.endExp.constructor === Number) {
                if (e.updateExp > e.endExp) {
                    return []
                }
            }
        }
        return e
    },
    For_iterable(e){
        e.id = optimize(e.id)
        e.exp = optimize(e.exp)
        e.block = optimize(e.block)
        //TODO
        if (e.exp.constructor === core.EmptyArray) {
            return []
        }
        return e
    },
    Return(e){
        e = optimize(e)
        return e
    },
    Stmt_function(s){ 
        s.id = optimize(s.id)
        s.params = optimize(s.params)
        if (s.block) s.block = optimize(s.block)
        return s
    },
    Stmt(s){
        s = optimize(s)
        return s
    },

    //TODO
    Stmt_enum(e){
        e = optimize(e)
        return e
    },
    //TODO
    Exp_unary(e){
        e.op = optimize(e.op)
        e.operand = optimize(e.operand)
        if (e.operand.constructor === Number) {
            if (e.op === "-") {
                return -e.operand
            }
            else if (e.op === "!") {
                return !e.operand
            }
        }
        return e
    },
    Exp_ternary(e){
        e.exp = optimize(e.exp)
        e.exp1 = optimize(e.exp1)
        e.exp2 = optimize(e.exp2)
        if (e.exp === true) return e.exp2
        else if (e.exp === false) return e.exp2
        return e
    },
    Exp1_binary(e) {
        e.relop = optimize(e.relop)
        e.exp1 = optimize(e.exp1)
        e.exp2 = optimize(e.exp2)
        if (e.relop === "||") {
            // Optimize boolean constants in && and ||
            if (e.exp1 === true) return e.exp2
            else if (e.exp2 === true) return e.exp1
        }
        return e
    },
    Exp2_binary(e) {
        e.relop = optimize(e.relop)
        e.exp1 = optimize(e.exp1)
        e.exp2 = optimize(e.exp2)
        if (e.relop === "&&") {
            // Optimize boolean constants in && and ||
            if (e.exp1 === true) return e.exp2
            else if (e.exp2 === true) return e.exp1
        }
        return e
    },
    Exp3_binary(e) {
        e.op = optimize(e.op)
        e.left = optimize(e.left)
        e.right = optimize(e.right)
        if ([Number, BigInt].includes(e.left.constructor)) {
            if ([Number, BigInt].includes(e.right.constructor)) {
                if (e.op === "<") return e.left < e.right
                else if (e.op === "<=") return e.left <= e.right
                else if (e.op === "==") return e.left === e.right
                else if (e.op === "!=") return e.left !== e.right
                else if (e.op === ">=") return e.left >= e.right
                else if (e.op === ">") return e.left > e.right
            }
        } 
        return e
    },
    Exp4_binary(e) { 
        e.op = optimize(e.op)
        e.left = optimize(e.left)
        e.right = optimize(e.right)
        if ([Number, BigInt].includes(e.left.constructor)) {
            if ([Number, BigInt].includes(e.right.constructor)) {
                if (e.op === "+") return e.left + e.right
                else if (e.op === "-") return e.left - e.right
            }
        } else if (e.right.constructor === Number) {
            // Numeric constant folding when right operand is constant
            if (["+", "-"].includes(e.op) && e.right === 0) return e.left
        } 
        return e
    },
    Exp5_binary(e) {
        e.op = optimize(e.op)
        e.left = optimize(e.left)
        e.right = optimize(e.right)
        if ([Number, BigInt].includes(e.left.constructor)) {
            if ([Number, BigInt].includes(e.right.constructor)) {
                if (e.op === "*") return e.left * e.right
                else if (e.op === "/") return e.left / e.right
                else if (e.op === "%") return e.left % e.right
            }
        } else if (e.right.constructor === Number) {
            // Numeric constant folding when right operand is constant
            if (["*", "/"].includes(e.op) && e.right === 1) return e.left
        }
        return e
    },
    Exp6_binary(e) {
        e.op = optimize(e.op)
        e.left = optimize(e.left)
        e.right = optimize(e.right)
        if ([Number, BigInt].includes(e.left.constructor)) {
            if ([Number, BigInt].includes(e.right.constructor)) {
                if (e.op === "**") return e.left ** e.right
            }
        } 
        else if (e.right.constructor === Number) {
            // Numeric constant folding when right operand is constant
            if (e.op === "**" && e.right === 0) return 1 // TODO: What to do about %
        }
        return e
    },
    Exp7_parens(e) {
        e = optimize(e)
        return e
    },
    Exp7_id(e) {
        e = optimize(e)
        return e
    },
    id(e){
        e = optimize(e)
        return e
    },
    true(e) {
        return e
    },
    false(e) {
        return e
    },
    OpAss(e) {
        e.id = optimize(e.id)
        e.exp = optimize(e.exp)
        e.op = optimize(e.op)
        if (e.relid === e.exp) {
            return []
        }
        return e
    },
    Method(d) {
        d.object = optimize(d.object)
        d.method = optimize(d.method)
        // if (d.body) d.body = optimize(d.body)
        return d
    },
    //TODO?
    Array(e) {
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
    Index(e) {    
        e.id = optimize(e.id)
        e.exp = optimize(e.exp)
        return e
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