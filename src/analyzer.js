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

    // Block(statements) {
    //   return statements.children.map(s => s.rep())
    //   //ADD BREAK RETURN CONTINUE CHECKS
    // },

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
    
    //FOR LOOPS DO NO WORK, PLEASE CHANGE TO FIT LANGUAGE
    // ForIncrement(_for, id, exp1, _comma, exp2, _close, block, glhf_end, exp3) {
    //   const [low, high] = [exp1.rep(), exp2.rep()]
    //   mustHaveIntegerType(low, { at: exp1 })
    //   mustHaveIntegerType(high, { at: exp2 })
    //   const iterator = core.variable(id.sourceString, INT, true)
    //   context = context.newChildContext({ inLoop: true })
    //   context.add(id.sourceString, iterator)
    //   const body = block.rep()
    //   context = context.parent
    //   return core.forRangeStatement(iterator, low, op.sourceString, high, body)
    // },

    // ForIterate(_for, _open, id, _in, exp, block, glhf_end, _for) {
    //   const collection = exp.rep()
    //   mustHaveAnArrayType(collection, { at: exp })
    //   const iterator = core.variable(id.sourceString, true, collection.type.baseType)
    //   context = context.newChildContext({ inLoop: true })
    //   context.add(iterator.name, iterator)
    //   const body = block.rep()
    //   context = context.parent
    //   return core.forStatement(iterator, collection, body)
    // },

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
    // Exp7?
  })
}