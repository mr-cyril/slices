export function isFunction(x: any) {
  return typeof x === 'function';
}

export function isSymbol(x: any): x is symbol {
  return typeof x === 'symbol';
}

export function isObject(x: any) {
  return typeof x === 'object' && x !== null;
}

export function resolveFunction(v: any, ...args: any[]) {
  while (isFunction(v)) v = v.apply(undefined, args);
  return v;
}

export function error(msg: string): never {
  throw msg;
}
