export const sum = (p1: number, p2: number) => {
  return p1 + p2;
};

export const isObject = (val: unknown): val is Record<any, any> => {
  return val !== null && typeof val === "object";
};
export const isFunction = (val: unknown): val is Function => typeof val === "function";
export const isArray = Array.isArray