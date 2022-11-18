import { isObject, def, toRawType } from "@vue/shared";
import { ReactiveFlags, mutableHandlers, readonlyHandlers, shallowReactiveHandlers } from "./baseHandler";

export interface Target {
  [ReactiveFlags.IS_REACTIVE]?: boolean;
  [ReactiveFlags.RAW]?: any;
  [ReactiveFlags.IS_SHALLOW]?: boolean;
  [ReactiveFlags.IS_READONLY]?: boolean;
  [ReactiveFlags.SKIP]?: boolean;
}

const enum TargetType {
  INVALID = 0,
  COMMON = 1,
  COLLECTION = 2,
}

function targetTypeMap(rawType: string) {
  switch (rawType) {
    case "Object":
    case "Array":
      return TargetType.COMMON; // return直接退出这个函数. break也是直接退出, return会给这个函数返回一个值.
    case "Map":
    case "Set":
    case "WeakMap":
    case "WeakSet":
      return TargetType.COLLECTION;
    default:
      return TargetType.INVALID;
  }
}

function getTargetType(value: Target) {
  return value[ReactiveFlags.SKIP] || !Object.isExtensible(value)
    ? // 上面这两个条件只要一个是true就返回INVALID
      TargetType.INVALID
    : // 否则返回它的类型
      targetTypeMap(toRawType(value));
}

// 已代理的对象. 经过reactive的对象.
export const reactiveMap = new WeakMap();

// 创建每个代理对象的函数。reactive, readonly等函数真正执行的是这个函数。
function createReactiveObject(target: Target, isReadonly: boolean, baseHandlers: ProxyHandler<any>) {
  // 是否是对象
  if (!isObject(target)) return;

  // 是否将一个readonly对象再拿来代理. 返回源target.
  // 已经是一个代理对象 && !(传给这个的isReadonly是false/true && target[ReactiveFlags.IS_REACTIVE]返回的是false)
  if (target[ReactiveFlags.RAW] && !(isReadonly && target[ReactiveFlags.IS_REACTIVE])) return target;

  // 是否是已经代理过的对象
  let existingProxy = reactiveMap.get(target);
  if (existingProxy) return existingProxy;

  // 是否已经将代理对象再拿来代理
  // target[ReactiveFlags.IS_REACTIVE]，会触发代理对象的get。如果没有代理过的对象不会走到get,在get里面有一个判断.
  if (target[ReactiveFlags.IS_REACTIVE]) return target;

  // 是否是被markRaw的对象或是...(目前还没碰到)...
  const targetType = getTargetType(target);
  if (targetType === TargetType.INVALID) return target;

  const proxy = new Proxy(target, baseHandlers);

  // 缓存已代理的对象
  reactiveMap.set(target, proxy);
  return proxy;
}

// 判断是不是一个响应式对象
export function isReactive(value: unknown) {
  // !取反。！！将其转化为boolean。
  return !!(value && (value as Target)[ReactiveFlags.IS_REACTIVE]);
}

// 判断是不是一个只读对象
export function isReadonly(value: unknown): boolean {
  return !!(value && (value as Target)[ReactiveFlags.IS_READONLY]);
}

// 判断是不是一个shallowReactive对象
export function isShallow(value: unknown): boolean {
  return !!(value && (value as Target)[ReactiveFlags.IS_SHALLOW]);
}

// 将一个变为响应式对象
export function reactive(target: any) {
  // 如果已经是readonly的代理对象不能再被reactive代理
  if (isReadonly(target)) return target;

  return createReactiveObject(target, false, mutableHandlers);
}

// 变为一个readonly对象
export function readonly<T extends object>(target: T) {
  return createReactiveObject(target, true, readonlyHandlers);
}

// 变为shallowReactive
export function shallowReactive(target: any) {
  return createReactiveObject(target, false, shallowReactiveHandlers);
}

// 将对象转为响应式对象。普通数据类型不用转。
export const toReactive = <T extends unknown>(value: T): T => (isObject(value) ? reactive(value) : value);

// 将响应式对象转为普通对象
export function toRaw<T>(observed: T): T {
  // Target[ReactiveFlags.RAW]返回的是一个对象
  const raw = observed && (observed as Target)[ReactiveFlags.RAW];
  return raw ? toRaw(raw) : observed;
}

// 标记为raw，不能转为代理对象（reactive， readonly等）.
export function markRaw<T extends object>(value: T): T {
  def(value, ReactiveFlags.SKIP, true);
  return value;
}
