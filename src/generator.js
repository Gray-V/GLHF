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
      console.log('program', p)
      // p.statements.forEach(gen);
      p.statements.forEach(n => {
        gen(n);
      });
    },
    VariableDeclaration(v) {
      console.log('vardec', v)
      console.log('init', v.initializer)
      output.push(`let ${gen(v.variable)} = ${gen(v.initializer)};`);
    },
    Variable(v) {
      return targetName(v);
    },
    Block(b) {
      b.statements.forEach(gen);
      // b.statements.forEach(n => {
      //   console.log(n);
      //   gen(n);
      // });
    },
    EnumBlock(e) {
      // TODO
    },
    //Unsure about .initializer and .variable for r and e
    Assignment(a) {
      output.push(`${gen(a.target)} = ${gen(a.source)};`);
    },
    Params(p) {
      for (s in p.statements) {
        gen(s);
      }
    },
    FunctionCall(f) {
      output.push(`${gen(f.callee)}(${gen(f.args).join(", ")});`);
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
    returnStatement(e) {
      output.push(`return ${e};`);
    },
    functionDeclaration(f) {
      output.push(`function ${gen(f.fun)}(${gen(f.params)}) {`);
      gen(f.body);
      output.push("}");
    },
    BinaryExpression(b) {
      return `${gen(b.left)} ${b.operator} ${gen(b.right)}`;
    },
    Exp_unary(o) {
      return `${o.operator}${gen(o.argument)}`;
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
    Index(i){
      return `${gen(i.id)}[${gen(i.exp)}]`;
    },
    Print(e){
      output.push(`console.log(${e.print.map(gen).join(", ")});`);
    },
    //Unsure how to implement
    dictExpression(e){
      return `{${gen(e.elements).join(", ")}}`;
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
    boolean(e){
      return e
    },
  };

  gen(program);
  return output.join("\n");
}
