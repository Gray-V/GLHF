import * as core from "./core.js";
const INT = core.intType;
const FLOAT = core.floatType;
const STRING = core.stringType;
const BOOLEAN = core.boolType;
const ANY = core.anyType;

class Context {
  constructor({
    parent = null,
    locals = new Map(),
    inLoop = false,
    function: f = null,
  }) {
    Object.assign(this, { parent, locals, inLoop, function: f });
  }
  add(name, entity) {
    this.locals.set(name, entity);
    return entity;
  }
  lookup(name) {
    return this.locals.get(name) || this.parent?.lookup(name);
  }
  static root() {
    return new Context({
      locals: new Map(Object.entries(core.standardLibrary)),
    });
  }
  newChildContext(props) {
    return new Context({ ...this, ...props, parent: this, locals: new Map() });
  }
}

export default function analyze(match) {
  let context = Context.root();

  function must(condition, message, errorLocation) {
    if (!condition) {
      const prefix = errorLocation.at.source.getLineAndColumnMessage();
      throw new Error(`${prefix}${message}`);
    }
  }

  function mustBothHaveTheSameType(e1, e2, at) {
    const types = {
      number: (e) => (e % 1 ? FLOAT : INT),
      string: (_) => STRING,
      boolean: (_) => BOOLEAN,
    };
    must(e1.type === e2.type, "Operands must have the same type", at);
  }
  function mustNotAlreadyBeDeclared(name, at) {
    must(!context.lookup(name), "Identifier already declared", at);
  }

  function mustHaveBeenFound(entity, name, at) {
    must(entity, `Gamer! You forgot to identify your variable`, at);
  }

  function mustHaveNumericType(e, at) {
    must([INT, FLOAT].includes(e.type), "Expected a number", at);
  }

  function mustHaveNumericOrStringType(e, at) {
    must(
      [INT, FLOAT, STRING].includes(e.type),
      "Expected a number or string",
      at
    );
  }

  function mustHaveBooleanType(e, at) {
    must(e.type === BOOLEAN, "Expected a boolean", at);
  }

  function mustHaveIntegerType(e, at) {
    must(e.type === INT, "Expected an integer", at);
  }

  function mustHaveAnArrayType(e, at) {
    must(e.type?.kind === "ArrayType", "Expected an array", at);
  }

  const builder = match.matcher.grammar.createSemantics().addOperation("rep", {
    Program(statements) {
      return core.program(statements.children.map((s) => s.rep()));
    },

    Block(statements, next) {
      return core.block(
        [...statements.children, ...next.children].flatMap((s) => s.rep())
      );
    },

    Enum_Block(statements, _arrow, exp) {
      return core.enumBlock(statements.children.map((s) => s.rep()));
    },

    Ass(relid, _eq, exp) {
      const relidName = relid.sourceString;
      let variable = context.lookup(relidName);
      const initializer = exp.rep();
      let type = initializer.type;

      if (!variable) {
        variable = core.variable(relidName, false, type);
        context.add(relidName, variable);
        return core.variableDeclaration(variable, initializer);
      }
      variable.type = type;
      return core.assignment(variable, initializer);
    },

    Params(_open, paramList, _close) {
      return core.paramList(
        paramList.asIteration().children.map((p) => p.rep())
      );
    },

    For_increment(
      _for,
      _open,
      assignment,
      _comma,
      updateExp,
      _close,
      block,
      _glhf_end,
      endExp
    ) {
      const iterator = assignment.rep();
      context = context.newChildContext({ inLoop: true });
      context.add(iterator.variable.name, iterator.variable);
      const [update, end] = [updateExp.rep(), endExp.rep()];
      mustHaveNumericType(update.target, { at: updateExp });
      mustHaveNumericType(end.left, { at: endExp });
      mustHaveNumericType(end.right, { at: endExp });
      const body = block.rep();
      context = context.parent;
      return core.forRangeStatement(iterator, update, end, body);
    },
    For_iterable(_for, id, _in, exp, block, _glhf_end, _forEnd) {
      const collection = exp.rep();
      if (collection.type.kind === "ArrayType") {
        const iterator = core.variable(
          id.sourceString,
          true,
          collection.type.baseType
        );
        context = context.newChildContext({ inLoop: true });
        context.add(id.sourceString, iterator);
        const body = block.rep();
        context = context.parent;
        return core.forStatement(iterator, collection, body);
      }
    },

    Return_something(_return, exp) {
      const returnValue = exp.rep();
      return core.returnStatement(returnValue);
    },

    Return_short(_return) {
      return core.shortReturnStatement();
    },

    Stmt_function(_builtInTypes, id, params, block, _glhf_end, exp) {
      const fun = core.fun(id.sourceString, ANY);
      mustNotAlreadyBeDeclared(id.sourceString, { at: id });
      context.add(id.sourceString, fun);
      context = context.newChildContext({ inLoop: false, function: fun });
      const param = params.rep();
      const body = block.rep();
      context = context.parent;
      exp.rep();
      return core.functionDeclaration(fun, param, body);
    },

    Stmt(_stmt) {
      return _stmt.rep();
    },

    Stmt_enum(_enum_symbol, exp, enum_block, _glhf_end, _enum_symbol2) {
      const test = exp.rep();
      context = context.newChildContext();
      const consequent = enum_block.rep();
      context = context.parent;
      const alternate = enum_block.rep();
      return core.enumStatement(test, consequent, alternate);
    },

    Exp_unary(unaryOp, exp) {
      const [op, operand] = [unaryOp.sourceString, exp.rep()];
      let type;
      if (op === "-") {
        mustHaveNumericType(operand, { at: exp });
        type = operand.type;
      } else if (op === "!") {
        mustHaveBooleanType(operand, { at: exp });
        type = BOOLEAN;
      }
      return core.unary(op, operand, type);
    },

    Exp_ternary(exp, _questionMark, exp1, colon, exp2) {
      const test = exp.rep();
      mustHaveBooleanType(test, { at: exp });
      const [consequent, alternate] = [exp1.rep(), exp2.rep()];
      mustBothHaveTheSameType(consequent, alternate, { at: colon });
      return core.conditional(test, consequent, alternate, consequent.type);
    },

    Exp1_binary(exp, _ops, exps) {
      let left = exp.rep();
      mustHaveBooleanType(left, { at: exp });
      for (let e of exps.children) {
        let right = e.rep();
        mustHaveBooleanType(right, { at: e });
        left = core.binary("||", left, right, BOOLEAN);
      }
      return left;
    },

    Exp2_binary(exp, _ops, exps) {
      let left = exp.rep();
      mustHaveBooleanType(left, { at: exp });
      for (let e of exps.children) {
        let right = e.rep();
        mustHaveBooleanType(right, { at: e });
        left = core.binary("&&", left, right, BOOLEAN);
      }
      return left;
    },

    Exp3_binary(exp1, relop, exp2) {
      const [left, op, right] = [exp1.rep(), relop.sourceString, exp2.rep()];
      if (["<=", "<", "==", "!=", ">=", ">"].includes(op)) {
        mustHaveNumericOrStringType(left, { at: exp1 });
      }
      mustBothHaveTheSameType(left, right, { at: relop });
      return core.binary(op, left, right, BOOLEAN);
    },

    Exp4_binary(exp1, addOp, exp2) {
      const [left, op, right] = [exp1.rep(), addOp.sourceString, exp2.rep()];
      if (op === "+") {
        mustHaveNumericOrStringType(left, { at: exp1 });
      } else {
        mustHaveNumericType(left, { at: exp1 });
      }
      mustBothHaveTheSameType(left, right, { at: addOp });
      return core.binary(op, left, right, left.type);
    },

    Exp5_binary(exp1, mulOp, exp2) {
      const [left, op, right] = [exp1.rep(), mulOp.sourceString, exp2.rep()];
      mustHaveNumericType(left, { at: exp1 });
      mustBothHaveTheSameType(left, right, { at: mulOp });
      return core.binary(op, left, right, left.type);
    },

    Exp6_binary(exp1, powerOp, exp2) {
      const [left, op, right] = [exp1.rep(), powerOp.sourceString, exp2.rep()];
      mustHaveNumericType(left, { at: exp1 });
      mustBothHaveTheSameType(left, right, { at: powerOp });
      return core.binary(op, left, right, left.type);
    },

    Exp7_parens(_open, expression, _close) {
      return expression.rep();
    },

    Exp7_id(id) {
      const entity = context.lookup(id.sourceString);
      mustHaveBeenFound(entity, id.sourceString, { at: id });
      return entity;
    },

    id(_first, _rest) {
      return (
        context.lookup(this.sourceString) ??
        context.add(
          this.sourceString,
          core.variable(this.sourceString, false, ANY)
        )
      );
    },

    true(_) {
      return true;
    },

    false(_) {
      return false;
    },

    OpAss(id, op, exp) {
      const variable = context.lookup(id.sourceString);
      mustHaveBeenFound(variable, id.sourceString, { at: id });
      const source = exp.rep();
      mustBothHaveTheSameType(variable, source, { at: op });
      return core.assignment(
        variable,
        core.binary(op.sourceString.charAt(0), variable, source, variable.type)
      );
    },

    Method(exp1, _period, exp2) {
      const object = exp1.rep();
      const method = exp2.sourceString;
      return core.callExpression(object, method);
    },

    Array(_open, exps, _close) {
      const elements = exps.asIteration().children.map((e) => e.rep());
      return new core.arrayExpression(elements);
    },

    Call(callee, _open, exps, _close) {
      const fun = callee.rep();
      const args = exps.asIteration().children.map((e) => e.rep());
      return core.callExpression(fun, args);
    },

    Path(_file, exps) {
      const path = exps.asIteration().children.map((e) => e.sourceString);
      return core.path(path);
    },

    Index(id, _open, exp, _close) {
      const array = context.lookup(id.sourceString);
      const index = exp.rep();
      mustHaveAnArrayType(array, { at: id });
      mustHaveIntegerType(index, { at: exp });
      return core.subscript(array, index);
    },

    Print(_print, _open, exps, _end) {
      const print = exps.asIteration().children.map((e) => e.rep());
      return core.print(print);
    },

    Dictionary(_arrowsLeft, exps, _arrowsRight) {
      const elements = exps.asIteration().children.map((e) => e.rep());
      const baseType = elements[0]?.type ?? ANY;
      elements.forEach((e) =>
        mustBothHaveTheSameType(e, elements[0], { at: _arrowsLeft })
      );
      elements.type = core.dictType(baseType);
      return elements;
    },

    Dictionary_format(exp1, _colon, exp2) {
      return [exp1.rep(), exp2.rep()];
    },

    num_float(_num, _point, _num2) {
      return Number(this.sourceString);
    },

    num_int(_num) {
      return BigInt(this.sourceString);
    },

    string(_openQuote, _chars, _closeQuote) {
      return this.sourceString;
    },
  });

  return builder(match).rep();
}
