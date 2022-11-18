import { makeMap } from "./makeMap";

export { makeMap };
export * from "./shapeFlags";

export const isObject = (val: unknown): val is Record<any, any> => {
  return val !== null && typeof val === "object";
};
export const isString = (val: unknown): val is string => typeof val === "string";
export const isSymbol = (val: unknown): val is symbol => typeof val == "symbol";
export const isFunction = (val: unknown): val is Function => typeof val === "function";
export const isArray = Array.isArray;

// 给对象定义属性
export const def = (obj: object, key: string | symbol, value: any) => {
  Object.defineProperty(obj, key, {
    configurable: true,
    // 直接打印这个对象不会显示。但是可以.出来使用。
    enumerable: false,
    value,
  });
};

export const objectToString = Object.prototype.toString;
// 返回这个value的类型. [object RawType]
export const toTypeString = (value: unknown): string => objectToString.call(value);
//  再取出后面的RawType.
export const toRawType = (value: unknown): string => {
  return toTypeString(value).slice(8, -1);
};

const hasOwnProperty = Object.prototype.hasOwnProperty;
// (key is keyof typeof val) 传入的key是val(一个对象)的其中一个key
export const hasOwn = (val: object, key: string | symbol): key is keyof typeof val => hasOwnProperty.call(val, key);

// 是否是一个整数
export const isIntegerKey = (key: unknown) =>
  // key是一个字符串 && 不是"NaN" && 第一个字符不是"-" && 保留10位整数后还等于key
  isString(key) && key !== "NaN" && key[0] !== "-" && "" + parseInt(key, 10) === key;

export const hasChange = (newVal: any, oldVal: any) => !Object.is(newVal, oldVal);

export const extend = Object.assign;
