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
    // console.log('node', node)
    return generators[node.kind]?.(node) ?? node;
  }

  const generators = {
    // Key idea: when generating an expression, just return the JS string; when
    // generating a statement, write lines of translated JS to the output array.
    Program(p) {
      // console.log('program', p)
      // p.statements.forEach(gen);
      p.statements.forEach(n => {
        gen(n);
      });
    },
    VariableDeclaration(v) {
      // console.log('vardec', v)
      // console.log('init', v.initializer)
      output.push(`let ${gen(v.variable)} = ${gen(v.initializer)};`);
    },
    Variable(v) {
      return targetName(v);
    },
    Block(b) {
      b.statements.forEach(gen);
    },

    // // TODO
    // EnumBlock(e) {
    //   e.statements.forEach(gen);
    // },

    Assignment(a) {
      output.push(`${gen(a.target)} = ${gen(a.source)};`);
    },

    //TODO
    // FunctionCall(c) {
    //   const targetCode = `${gen(c.callee)}(${gen(c.args).join(", ")})`;
    //   if (c.callee instanceof Type || c.callee.type.returnType !== Type.NONE) {
    //     return targetCode;
    //   }
    //   output.push(`${targetCode};`);
    // },

    // ForRangeStatement(e) {
    //   output.push(`for(let ${gen(e.iterator.variable)} = ${gen(e.iterator.initializer)}; ${gen(e.high)}; ${gen(e.iterator.variable)}++) {`);
    //   gen(e.body);
    //   output.push("}");
    // },

    //TODO
    // ForStatement(e) {
    //   output.push(`for (${gen(e.iterator)} of ${gen(e.collection)}) {`);
    //   gen(e.body);
    //   output.push("}");
    // },

    //TODO
    // ReturnStatement(e) {
    //   output.push(`return ${e.exp};`);
    // },
    //TODO
    // ShortReturnStatement(){
    //   output.push(`return;`);
    // },

    //TODO -- return not working + params getting extra chars when concatenating???
    // FunctionDeclaration(f) {
    //   console.log('fun', f.fun);
    //   console.log('params', f.params);
    //   f.fun = gen(f.fun);
    //   f.params.forEach(
    //     p => { p = gen(p); }
    //   );
    //   const paramsString = f.params.map(p => p.name).join(', ');     
    //   console.log('paramsString', paramsString)
      
    //   output.push(`function ${f.fun.name}(${paramsString}) {`);
    //   gen(f.body);
    //   output.push("}");
    // },
    BinaryExpression(b) {
      return `${gen(b.left)} ${b.op} ${gen(b.right)}`;
    },
    UnaryExpression(o) {
      return `${o.op}${gen(o.operand)}`;
    },
    //TODO
    // ArrayExpression(e){
    //   return `[${gen(e.elements).join(",")}]`;
    // },
    //TODO
    // Path(c){
    //   let targetCode = `${targetName(c.object)}.${targetName(
    //     c.member.callee.name
    //   )}()`;
    //   if (
    //     c.member.callee instanceof Type ||
    //     c.member.callee.name.returnType !== Type.NONE
    //   ) {
    //     return targetCode;
    //   }
    //   output.push(`${targetCode};`);
    // },

    // Wait(n){
    //   output.push(`sleep(${gen(n.count)});`);
    // },
    Print(e){
      output.push(`console.log(${e.print.map(gen).join(", ")});`);
    },
    // DictExpression(e){
    //   return `{${gen(e.elements).join(", ")}}`;
    // },
  };
  gen(program);
  return output.join("\n");
}
