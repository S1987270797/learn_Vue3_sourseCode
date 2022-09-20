import { isObject } from "@vue/shared";
import { reactive, reactiveMap } from "./reactive";
import { track, trigger } from "./effect";

export enum ReactiveFlags {
  IS_REACTIVE = "__v_isReactive",
  RAW = "__v_raw",
}

export const mutableHandlers: ProxyHandler<object> = {
  get(target, key, receiver) {
    // 能进入get，代表已经这个对象已经被代理过，
    if (key === ReactiveFlags.IS_REACTIVE) {
      return true;
    }
    // target被proxy代理的源对象. receiver是代理target的Proxy对象. // receiver就是被.或[]的那个对象
    else if (key === ReactiveFlags.RAW && receiver === reactiveMap.get(target)) {
      return target;
    }

    track(target, 0, key);

    const res = Reflect.get(target, key, receiver);

    // 深度代理。如果是一个对象再代理一遍。
    // 为什么要return。reactive()执行返回的是一个proxy, 像states.friend这样取的就是一个对象.对象就是要return一个proxy给他用。
    if (isObject(res)) return reactive(res);

    return res;
  },

  set(target, key, value, receiver) {
    let oldValue = (target as any)[key];
    if (oldValue === value) return false;
    // 修改数据, 已经修改。
    let result = Reflect.set(target, key, value, receiver);
    // 触发effect
    trigger(target, 0, key, value, oldValue);
    return result;
  },
};
