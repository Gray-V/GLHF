// CODE GENERATOR: GLHF -> JavaScript
//
// Invoke generate(program) with the program node to get back the JavaScript
// translation as a string.

export default function generate(program) {
  const output = []

  // Variable and function names in JS will be suffixed with _1, _2, _3,
  // etc. This is because "switch", for example, is a legal name in GLHF,
  // but not in JS. So, the GLFH variable "switch" must become something
  // like "switch_1". We handle this by mapping each name to its suffix.
  const targetName = ((mapping) => {
    return (entity) => {
      if (!mapping.has(entity)) {
        mapping.set(entity, mapping.size + 1);
      }
      return `${entity.name ?? entity.description ?? entity.id}_${mapping.get(
        entity
      )}`;
    };
  })(new Map());

  function gen(node) {
    return generators[node.kind]?.(node) ?? node;
  }

  const generators = {
    // Key idea: when generating an expression, just return the JS string; when
    // generating a statement, write lines of translated JS to the output array.
    Program(p) {
      gen(p.statements);
    },
    Block(b) {
      for (s in b.statements) {
        gen(s);
      }
    },
    EnumBlock(b) {
      for (s in b.statements) {
        gen(s);
      }
    },
    //Unsure about .initializer and .variable for r and e
    Ass(r, e) {
      output.push(`let ${gen(r)} = ${gen(e)};`);
    },
    Params(p) {
      for (s in p.statements) {
        gen(s);
      }
    },
    For_increment(id, exp, block, end_exp) {
      // const i = targetName(s.variable)
      output.push(`for (let ${gen(id)}; ${gen(end_exp)}; ${gen(exp)}) {`);
      gen(block);
      output.push("}");
    },
    For_iterable(id, exp, block) {
      collection = exp.sourceString;

      if (collection.type.kind == "ArrayType") {
        output.push(`for (let ${gen(id)} of ${gen(exp)} {`);
        gen(block);
        output.push("}");
      }
      if (collection.type.kind == "DictType") {
        output.push(`for (let ${gen(id)} of ${gen(exp)}.entries()) {`);
        gen(block);
        output.push(`}`);
      }
    },
    Return_something(e) {
      output.push(`return ${e};`);
    },

    Stmt_function(id, params, block, exp) {
      output.push(`function ${gen(id)} (${gen(params).join(", ")}) {`);
      gen(block);
      output.push("}");
      output.push(`${gen(exp)}`);
    },
    Stmt(s) {
      output.push(`${gen(s)};`);
    },
    //Not sure - pushing frozen objects to output
    Stmt_enum(e, block) {
      output.push(`const ${gen(e)} = Object.freeze(
                ${gen(block)}
            )`);
    },
    Exp_unary(unaryOp, exp) {
      const [op, operand] = [unaryOp.sourceString, exp.rep()];
      return `${op}(${gen(operand)})`;
    },
    Exp_ternary(exp, exp1, exp2) {
      return `((${gen(exp)}) ? (${gen(exp1)}) : (${gen(exp2)}))`;
    },
    Exp1_binary(exp, exp1) {
      return `(${gen(exp)} | ${gen(exp1)})`;
    },
    Exp2_binary(exp, exp1) {
      return `(${gen(exp)} & ${gen(exp1)})`;
    },
    Exp3_binary(exp, relop, exp1) {
      return `(${gen(exp)} ${relop} ${gen(exp1)})`;
    },
    Exp4_binary(exp, addOp, exp1) {
      return `(${gen(exp)} ${addOp} ${gen(exp1)})`;
    },
    Exp5_binary(exp, mulOp, exp1) {
      return `(${gen(exp)} ${mulOp} ${gen(exp1)})`;
    },
    Exp6_binary(exp, exp1) {
      return `(${gen(exp)} ** ${gen(exp1)})`;
    },
    Exp7_parens(exp) {
      return `(${gen(exp)})`;
    },
    Exp7_id(id) {
      return `${id.sourceString}`;
    },
    //True and False unsure if correct
    true() {
      return "true";
    },
    false() {
      return "false";
    },
    OpAss(id, op, exp) {
      output.push(`${gen(id)} ${op} ${gen(exp)};`);
    },
    Method(c){
      output.push(
        `${targetName(c.name)}(${gen(c.name.parameters).join(", ")}) {`
      );
      gen(c.body);
      output.push("}");
    },
    Array(e){
      return `[${gen(e.elements).join(",")}]`;
    },
    Call(c){
      const targetCode = `${gen(c.callee)}(${gen(c.args).join(", ")})`;
      // Calls in expressions vs in statements are handled differently
      if (c.callee instanceof Type || c.callee.type.returnType !== Type.NONE) {
        return targetCode;
      }
      output.push(`${targetCode};`);
    },
    Path(c){
      let targetCode = `${targetName(c.object)}.${targetName(
        c.member.callee.name
      )}()`;
      if (
        c.member.callee instanceof Type ||
        c.member.callee.name.returnType !== Type.NONE
      ) {
        return targetCode;
      }
      output.push(`${targetCode};`);
    },
    Wait(n){
      sleep(n)
    },
    Index(id, exp){
      return `${gen(id)}[${gen(exp)}]`;
    },
    Print(e){
      const argument = gen(e.argument);
      output.push(`console.log(${argument});`);
    },
    //Unsure how to implement
    Dictionary(exps){
      return `{${gen(exps).join(", ")}}`;
    },
    Dictionary_format(exp1, exp2){
      return `${gen(exp1)}: ${gen(exp2)}`
    },
    num_float(e){
      return e
    },
    num_int(e){
      return e
    },
    string(e){
      return e
    },
  };

  gen(program);
  return output.join("\n");
}
