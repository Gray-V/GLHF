import * as core from "./core.js"


const INT = core.intType
const FLOAT = core.floatType
const STRING = core.stringType
const BOOLEAN = core.boolType
const ANY = core.anyType
const VOID = core.voidType


class Context {
  constructor({ parent = null, locals = new Map(), inLoop = false, function: f = null }) {
    Object.assign(this, { parent, locals, inLoop, function: f })
  }
  add(name, entity) {
    this.locals.set(name, entity)
  }
  lookup(name) {
    return this.locals.get(name) || this.parent?.lookup(name)
  }
  static root() {
    return new Context({ locals: new Map(Object.entries(core.standardLibrary)) })
  }
  newChildContext(props) {
    return new Context({ ...this, ...props, parent: this, locals: new Map() })
  }
}

export default function analyze(match) {

  let context = Context.root()

  function must(condition, message, errorLocation) {
    if (!condition) {
      const prefix = errorLocation.at.source.getLineAndColumnMessage()
      throw new Error(`${prefix}${message}`)
    }
  }

  function mustNotAlreadyBeDeclared(name, at) {
    must(!context.lookup(name), `Identifier ${name} already declared`, at)
  }

  function mustHaveBeenFound(entity, name, at) {
    must(entity, `Identifier ${name} not declared`, at)
  }

  function mustHaveNumericType(e, at) {
    must([INT, FLOAT].includes(e.type), "Expected a number", at)
  }

  function mustHaveNumericOrStringType(e, at) {
    must([INT, FLOAT, STRING].includes(e.type), "Expected a number or string", at)
  }

  function mustHaveBooleanType(e, at) {
    must(e.type === BOOLEAN, "Expected a boolean", at)
  }

  function mustHaveIntegerType(e, at) {
    must(e.type === INT, "Expected an integer", at)
  }

  function mustHaveAnArrayType(e, at) {
    must(e.type?.kind === "ArrayType", "Expected an array", at)
  }

  function mustHaveADictType(e, at) {
    must(e.type?.kind === "DictType", "Expected a dictionary", at)
  }

  function mustHaveAnOptionalType(e, at) {
    must(e.type?.kind === "OptionalType", "Expected an optional", at)
  }

  function mustHaveAStructType(e, at) {
    must(e.type?.kind === "StructType", "Expected a struct", at)
  }


  const builder = match.matcher.grammar.createSemantics().addOperation("rep", {
    Program(statements) {
      return core.program(statements.children.map(s => s.rep()))
    },

    Block(statements, condOPs) {
      if (condOPs.children.length > 0) {
        return core.block(statements.rep(), condOPs.children.map(c => c.rep()))
      }
      return statements.children.map(s => s.rep())
    },

    // EnumBlock(_open, expression, _arrow, Exp, _close){
    //   return core.enumBlock(expression.sourceString, Exp.rep())
    //   //NOT CORRECT, THERE IS NO ENUMBLOCK IN CORE YET
    // },

    Ass(relid, _eq, exp) {
      const initializer = exp.rep()
      const variable = core.variable(relid.sourceString, readOnly, initializer.type)
      // Handle index vs id for declaration
      mustNotAlreadyBeDeclared(relid.sourceString, { at: id })
      context.add(relid.sourceString, variable)
      return core.variableDeclaration(variable, initializer)
    },

    Params(_open, paramList, _close){
      return paramList.asIteration().children.map(p => p.rep())
    },

    ForIncrement(_for, _open, id, exp, _close, block, _glhf_end, endExp) {
      const [low, high] = [exp.rep(), endExp.rep()]
      mustHaveIntegerType(low, { at: exp1 })
      mustHaveIntegerType(high, { at: endExp })
      const iterator = core.variable(id.sourceString, INT, true)
      context = context.newChildContext({ inLoop: true })
      context.add(id.sourceString, iterator)
      const body = block.rep()
      context = context.parent
      return core.forRangeStatement(iterator, low, high, body)
    },

    ForIterate(_for, id, _in, exp, block, _glhf_end, _forEnd) {
      const collection = exp.rep()
      if (collection.type.kind === "ArrayType") {
        const iterator = core.variable(id.sourceString, true, collection.type.baseType)
        context = context.newChildContext({ inLoop: true })
        context.add(id.sourceString, iterator)
        const body = block.rep()
        context = context.parent
        return core.forStatement(iterator, collection, body)
      }
      if (collection.type.kind === "DictType") {
        const iterator = core.variable(id.sourceString, true, core.arrayType([collection.type.baseType, collection.type.baseType]))
        context = context.newChildContext({ inLoop: true })
        context.add(id.sourceString, iterator)
        const body = block.rep()
        context = context.parent
        return core.forStatement(iterator, collection, body)
      }
    },

    ReturnSomething(exp){
      return core.returnStatement(exp)
    },

    ExpUnary(_open, unaryOp, _close, exp){
      const [op, operand] = [unaryOp.sourceString, exp.rep()]
      let type
      if (op === "-") {
        mustHaveNumericType(operand, { at: exp })
        type = operand.type
      } else if (op === "!") {
        mustHaveBooleanType(operand, { at: exp })
        type = BOOLEAN
      }
      return core.unary(op, operand, type)
    },

    Exp_Ternary(exp, _questionMark, exp1, colon, exp2) {
      const test = exp.rep()
      mustHaveBooleanType(test, { at: exp })
      const [consequent, alternate] = [exp1.rep(), exp2.rep()]
      mustBothHaveTheSameType(consequent, alternate, { at: colon })
      return core.conditional(test, consequent, alternate, consequent.type)
    },
    
    Exp1_or(exp, _ops, exps) {
      let left = exp.rep()
      mustHaveBooleanType(left, { at: exp })
      for (let e of exps.children) {
        let right = e.rep()
        mustHaveBooleanType(right, { at: e })
        left = core.binary("||", left, right, BOOLEAN)
      }
      return left
    },

    Exp2_and(exp, _ops, exps) {
      let left = exp.rep()
      mustHaveBooleanType(left, { at: exp })
      for (let e of exps.children) {
        let right = e.rep()
        mustHaveBooleanType(right, { at: e })
        left = core.binary("&&", left, right, BOOLEAN)
      }
      return left
    },

    Exp3_compare(exp1, relop, exp2) {
      const [left, op, right] = [exp1.rep(), relop.sourceString, exp2.rep()]
      // == and != can have any operand types as long as they are the same
      // But inequality operators can only be applied to numbers and strings
      if (["<=", "<","==", "!=", ">=", ">"].includes(op)) {
        mustHaveNumericOrStringType(left, { at: exp1 })
      }
      mustBothHaveTheSameType(left, right, { at: relop })
      return core.binary(op, left, right, BOOLEAN)
    },

    Exp4_add(exp1, addOp, exp2) {
      const [left, op, right] = [exp1.rep(), addOp.sourceString, exp2.rep()]
      if (op === "+") {
        mustHaveNumericOrStringType(left, { at: exp1 })
      } else {
        mustHaveNumericType(left, { at: exp1 })
      }
      mustBothHaveTheSameType(left, right, { at: addOp })
      return core.binary(op, left, right, left.type)
    },

    Exp5_multiply(exp1, mulOp, exp2) {
      const [left, op, right] = [exp1.rep(), mulOp.sourceString, exp2.rep()]
      mustHaveNumericType(left, { at: exp1 })
      mustBothHaveTheSameType(left, right, { at: mulOp })
      return core.binary(op, left, right, left.type)
    },

    Exp6_power(exp1, powerOp, exp2) {
      const [left, op, right] = [exp1.rep(), powerOp.sourceString, exp2.rep()]
      mustHaveNumericType(left, { at: exp1 })
      mustBothHaveTheSameType(left, right, { at: powerOp })
      return core.binary(op, left, right, left.type)
    },

    Exp7_parens(_open, expression, _close) {
      return expression.rep()
    },

    Exp7_id(id) {
      // When an id appears in an expression, it had better have been declared
      const entity = context.lookup(id.sourceString)
      mustHaveBeenFound(entity, id.sourceString, { at: id })
      return entity
    },

    true(_) {
      return true
    },

    false(_) {
      return false
    },

    intlit(_digits) {
      return BigInt(this.sourceString)
    },

    floatlit(_whole, _point, _fraction, _e, _sign, _exponent) {
      return Number(this.sourceString)
    },

    stringlit(_openQuote, _chars, _closeQuote) {
      return this.sourceString
    },
  })

  return builder(match).rep()
}