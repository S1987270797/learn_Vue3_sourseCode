import { sum, isObject } from "@vue/shared";
import { ReactiveFlags, mutableHandlers, readonlyHandlers } from "./baseHandler";

export interface Target {
  [ReactiveFlags.IS_REACTIVE]?: boolean;
  [ReactiveFlags.RAW]?: any;
  [ReactiveFlags.IS_READONLY]?: boolean;
}

// 创建每个代理对象的函数。reactive, readonly等函数真正执行的是这个函数。
function createReactiveObject(
  target: Target,
  isReadonly: boolean,
  baseHandlers: ProxyHandler<any>
) {
  // 是否是对象
  if (!isObject(target)) return;

  // 将一个readonly对象拿来给reactive代理
  // 已经是一个代理对象 && !(传给这个的isReadonly是true && target[ReactiveFlags.IS_REACTIVE]返回的是false)
  if (target[ReactiveFlags.RAW] && !(isReadonly && target[ReactiveFlags.IS_REACTIVE]))
    return target;

  // 是否是已经代理过的对象
  let existingProxy = reactiveMap.get(target);
  if (existingProxy) return existingProxy;

  // 是否已经将代理对象再拿来代理
  // target[ReactiveFlags.IS_REACTIVE]，会触发代理对象的get。如果没有代理过的对象不会走到get,在get里面有一个判断
  if (target[ReactiveFlags.IS_REACTIVE]) return target;
  const proxy = new Proxy(target, baseHandlers);

  // 缓存已代理的对象
  reactiveMap.set(target, proxy);
  return proxy;
}

// 已代理的对象. 经过reactive的对象.
export const reactiveMap = new WeakMap();

// 判断是不是一个响应式对象
export function isReactive(value: unknown) {
  // !取反。！！将其转化为boolean。
  return !!(value && (value as Target)[ReactiveFlags.IS_REACTIVE]);
}

// 判断是不是一个只读对象
export function isReadonly(value: unknown): boolean {
  return !!(value && (value as Target)[ReactiveFlags.IS_READONLY]);
}

// 将一个变为响应式对象
export function reactive(target: any) {
  // 如果已经是readonly的代理对象不能再被reactive代理
  if (isReadonly(target)) return target;

  return createReactiveObject(target, false, mutableHandlers);
}

export function readonly<T extends object>(target: T) {
  return createReactiveObject(target, true, readonlyHandlers);
}

// 将对象转为响应式对象。普通数据类型不用转。
export const toReactive = <T extends unknown>(value: T): T =>
  isObject(value) ? reactive(value) : value;

// 将响应式对象转为普通对象
export function toRaw<T>(observed: T): T {
  // Target[ReactiveFlags.RAW]返回的是一个对象
  const raw = observed && (observed as Target)[ReactiveFlags.RAW];
  return raw ? toRaw(raw) : observed;
}
