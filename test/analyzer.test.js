import assert from "assert"
import analyze from "../src/analyzer.js"
// Programs that are semantically correct
describe('Context', () => {
    it('initializes with default values', () => {
      const ctx = new Context({});
      assert.strictEqual(ctx.parent, null);
      assert.deepStrictEqual(ctx.locals, new Map());
      assert.strictEqual(ctx.inLoop, false);
      assert.strictEqual(ctx.function, null);
    });
    it('initializes with a specified parent context', () => {
      const parentContext = new Context({});
      const ctx = new Context({ parent: parentContext });
      assert.strictEqual(ctx.parent, parentContext);
    });
    it('initializes with specified locals', () => {
      const locals = new Map([['x', 10]]);
      const ctx = new Context({ locals });
      assert.deepStrictEqual(ctx.locals, locals);
    });
    it('initializes with inLoop set to true', () => {
      const ctx = new Context({ inLoop: true });
      assert.strictEqual(ctx.inLoop, true);
    });
    it('initializes with a specified function', () => {
      const func = () => {};
      const ctx = new Context({ function: func });
      assert.strictEqual(ctx.function, func);
    });
    it('handles combination of parameters', () => {
      const parentContext = new Context({});
      const locals = new Map([['y', 20]]);
      const func = () => {};
      const ctx = new Context({ parent: parentContext, locals, inLoop: true, function: func });
      assert.strictEqual(ctx.parent, parentContext);
      assert.deepStrictEqual(ctx.locals, locals);
      assert.strictEqual(ctx.inLoop, true);
      assert.strictEqual(ctx.function, func);
    });
  });