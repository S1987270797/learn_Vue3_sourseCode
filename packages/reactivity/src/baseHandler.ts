import { isObject } from "@vue/shared";
import { reactive, reactiveMap, readonly, Target } from "./reactive";
import { track, trigger } from "./effect";

export enum ReactiveFlags {
  IS_REACTIVE = "__v_isReactive",
  IS_READONLY = "__v_isReadonly",
  RAW = "__v_raw",
}

const get = createGetter();
const readonlyGet = createGetter(true);

//
function createGetter(isReadonly = false) {
  return function get(target: Target, key: string, receiver: object) {
    // 能进入get，代表已经这个对象已经被代理过，
    if (key === ReactiveFlags.IS_REACTIVE) {
      return !isReadonly;
    }
    // 
    else if (key === ReactiveFlags.IS_READONLY) {
      return isReadonly;
    }
    // target是被proxy代理的源对象. receiver是代理target的Proxy对象. // receiver就是被.或[]的那个对象
    // 如果取得值是ReactiveFlags.RAW 并且 在reactiveMap中还能找到这个代理对象的源对象。
    else if (key === ReactiveFlags.RAW && receiver === reactiveMap.get(target)) {
      return target; // 返回这个源对象
    }

    track(target, 0, key);

    const res = Reflect.get(target, key, receiver);

    // 深度代理。如果这次读到是一个对象把这个再代理一遍返回去。取代vue2的直接遍历循环对象所有的值. vue3是在使用的才给这个key加上响应式.
    // 为什么要return。reactive()执行返回的是一个proxy, 像states.friend这样取的就是一个对象.对象就是要return一个proxy给他用。
    if (isObject(res)) {
      return isReadonly ? readonly(res) : reactive(res);
    }

    return res;
  };
}
/* -------------------------------reactive handler-------------------------- */
export const mutableHandlers: ProxyHandler<object> = {
  get,
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

/* -------------------------------readonly handler-------------------------- */
export const readonlyHandlers: ProxyHandler<object> = {
  get: readonlyGet,
  set(target, key) {
    console.warn(`Set operation on key "${String(key)}" failed: target is readonly.`, target);
    return true;
  },
  deleteProperty(target, key) {
    console.warn(`Delete operation on key "${String(key)}" failed: target is readonly.`, target);
    return true;
  },
};
