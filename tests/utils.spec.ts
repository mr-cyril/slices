import { isFunction, isObject, isSymbol, resolveFunction, error } from "../src/utils";

const _function = () => null;
const _number = 1;
const _object = {};
const _symbol = Symbol();
const _boolean = false;

describe(isFunction.name, () => {
  it("true if function", () => {
    expect(isFunction(_function)).toBe(true);
  });
  it("false if not function", () => {
    expect(isFunction(_number)).toBe(false);
    expect(isFunction(_object)).toBe(false);
    expect(isFunction(_symbol)).toBe(false);
    expect(isFunction(_boolean)).toBe(false);
  });
});

describe(isSymbol.name, () => {
  it("true if symbol", () => {
    expect(isSymbol(_symbol)).toBe(true);
  });
  it("false if not symbol", () => {
    expect(isSymbol(_number)).toBe(false);
    expect(isSymbol(_object)).toBe(false);
    expect(isSymbol(_function)).toBe(false);
    expect(isSymbol(_boolean)).toBe(false);
  });
});

describe(isObject.name, () => {
  it("true if object", () => {
    expect(isObject(_object)).toBe(true);
  });
  it("false if not object", () => {
    expect(isObject(_number)).toBe(false);
    expect(isObject(_symbol)).toBe(false);
    expect(isObject(_function)).toBe(false);
    expect(isObject(_boolean)).toBe(false);
  });
});

describe(resolveFunction.name, () => {
  it("returns non-function as is", () => {
    expect(resolveFunction(_object)).toStrictEqual(_object);
    expect(resolveFunction(_number)).toStrictEqual(_number);
    expect(resolveFunction(_symbol)).toStrictEqual(_symbol);
    expect(resolveFunction(_boolean)).toStrictEqual(_boolean);
  });
  it("calls function until the result is non-function and returns that result", () => {
    expect(resolveFunction(() => 1)).toBe(1);
    expect(resolveFunction(() => () => 1)).toBe(1);
  });
  it("applies passed parameters", () => {
    expect(resolveFunction(() => 1)).toBe(1);
    expect(resolveFunction((x:number) => (y:number) => x + y, 1)).toBe(2);
  });
});

describe(error.name, () => {
  it("throws always", () => {
    expect(()=>error("message")).toThrow("message");
  });
});