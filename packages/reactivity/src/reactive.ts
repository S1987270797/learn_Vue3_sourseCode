import { sum, isObject } from "@vue/shared";
import { ReactiveFlags, mutableHandlers } from "./baseHandler";

export interface Target {
  [ReactiveFlags.IS_REACTIVE]?: boolean;
  [ReactiveFlags.RAW]?: any;
}

function createReactiveObject(
  target: Target,
  isReadonly: boolean,
  baseHandlers: ProxyHandler<any>
) {
  // 是否是对象
  if (!isObject(target)) return;
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

// 将一个变为响应式对象
export function reactive(target: any) {
  // 是否是对象
  if (!isObject(target)) return;
  // 是否是已经代理过的对象
  let existingProxy = reactiveMap.get(target);
  if (existingProxy) return existingProxy;
  // 是否已经将代理对象再拿来代理
  // target[ReactiveFlags.IS_REACTIVE]，会触发代理对象的get。如果没有代理过的对象不会走到get,在get里面有一个判断
  if (target[ReactiveFlags.IS_REACTIVE]) return target;

  const proxy = new Proxy(target, mutableHandlers);

  // 缓存已代理的对象
  reactiveMap.set(target, proxy);
  return proxy;
}

// 1.代理多次同一个对象,不需要重新new Proxy.使用weakMap(reactiveMap)储存已经代理的对象
/* 2.被代理的对象又代理一遍
    const states = reactive(data)
    const states1 = reactive(states)
  使用标识符(ReactiveFlags.IS_REACTIVE)标识这个对象已经代理过

  做到:
    const states = reactive(data)
    const states1 = reactive(data)
    const states2 = reactive(states1)
    console.log(states);
    console.log(states1);
    console.log(states2);
    console.log(states === states1); // true
    console.log(states1 === states2); // true
 */

export function readonly<T extends object>(target: T) {}

// 将对象转为响应式对象。普通数据类型不用转。
export const toReactive = <T extends unknown>(value: T): T =>
  isObject(value) ? reactive(value) : value;

// 将响应式对象转为普通对象
export function toRaw<T>(observed: T): T {
  const raw = observed && (observed as Target)[ReactiveFlags.RAW];
  return raw ? toRaw(raw) : observed;
}
