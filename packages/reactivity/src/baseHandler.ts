import { extend, hasChange, hasOwn, isArray, isIntegerKey, isObject, isSymbol, makeMap } from "@vue/shared";
import { reactive, reactiveMap, readonly, Target, toRaw } from "./reactive";
import { track, trigger } from "./effect";
import { isRef } from "./ref";
import { TrackOpTypes, TriggerOpTypes } from "./operations";

export enum ReactiveFlags {
  IS_REACTIVE = "__v_isReactive",
  IS_READONLY = "__v_isReadonly",
  IS_SHALLOW = "__V_isShallow",
  RAW = "__v_raw",
  SKIP = "__v_skip",
}

export const ITERATE = Symbol(__DEV__ ? "iterate" : "");
export const MAP_KEY_ITERATE_KEY = Symbol(__DEV__ ? "Map key iterate" : "");

/* -------------------------------------------- 关于createGetter ---------------------------------------- */

const isNonTrackableKeys = /*#__PURE__*/ makeMap(`__proto__,__v_isRef,__isVue`);

const get = createGetter();
const readonlyGet = createGetter(true);
const shallowGet = createGetter(false, true);

// 将所有Symbol类型的值取出来
const builtInSymbols = new Set(
  Object.getOwnPropertyNames(Symbol)
    // 将'arguments'或'caller'这两个属性将其排除
    .filter(key => key !== "arguments" && key !== "caller")
    // 将值使用Symbol取出. Symbol[key]
    .map(Key => (Symbol as any)[Key])
    // 再将typeof === symbol的值取出
    .filter(isSymbol)
);

// 重写Array的一些方法
const arrayInstrumentations = createArrayInstrumentations();
function createArrayInstrumentations() {
  // 重写后的方法储存在一个对象里面 "includes", "indexof", "lastIndexOf" 'push', 'pop', 'shift', 'unshift', 'splice'
  const instrumentations: Record<string, Function> = {};

  // obj = { name: red } . arrProxy = reactive([obj]) . 理应 arrProxy.includes(arr) === true
  (["includes", "indexof", "lastIndexOf"] as const).forEach(key => {
    // 'includes', 'indexof', "lastIndexOf"分别对应一个函数.
    instrumentations[key] = function (this: unknown[], ...args: unknown[]) {
      // 将代理数组转为原数组
      const arr = toRaw(this) as any;
      // l = this.length; 因为this是一个代理对象,每次this.length都会触发this的get函数. 提前定义好是为了不必每次循环都要.length
      for (let i = 0, l = this.length; i < l; i++) {
        track(arr, TrackOpTypes.GET, i + "");
      }
      // arr[includes]( {name: 'red'} )
      const res = arr[key](...args);
      // 如果没有找到
      if (res === -1 || res === false) {
        // 再把传给includes的参数,拿去转为raw后再尝试找到.
        return arr[key](...args.map(toRaw));
      } else {
        return res;
      }
    };
  });

  // (["push", "pop", "shift", "unshift", "splice"] as const).forEach(key => {
  //   instrumentations[key] = function (this: unknown[], ...args: unknown[]) {
  //     // 执行push函数之前不要收集依赖.
  //     // 每次执行push会arr.length触发get
  //     // push会 arr[arr.length] = key, 触发setter,执行依赖length的effect, 这里将track关闭,
  //     pauseTracking();
  //     const res = (toRaw(this) as any)[key].apply(this, args);
  //     resetTracking();
  //     return res;
  //   };
  // });

  return instrumentations;
}

//
function createGetter(isReadonly = false, isShallow = false) {
  return function get(target: Target, key: string, receiver: object) {
    // 能进入get，代表已经这个对象已经被代理过, 已经是一个Proxy对象，
    // 为什么返回!isReadonly. 有可能拿一个readonly对象来readonly[ReactiveFlags.IS_REACTIVE]. 这个时候如果一致返回true,就乱套了,返回!isReadonly是对的.
    if (key === ReactiveFlags.IS_REACTIVE) {
      return !isReadonly;
    }
    //
    else if (key === ReactiveFlags.IS_READONLY) {
      return isReadonly;
    }
    //
    else if (key === ReactiveFlags.IS_SHALLOW) {
      return isShallow;
    }
    // target是被proxy代理的源对象. receiver是代理target的Proxy对象. // receiver就是被.或[]的那个对象
    // 如果取得值是ReactiveFlags.RAW 并且 在reactiveMap中还能找到这个代理对象的源对象。
    else if (key === ReactiveFlags.RAW && receiver === reactiveMap.get(target)) {
      return target; // 返回这个源对象
    }

    // 判断target是不是一个数组
    const targetIsArray = isArray(target);
    // 是数组的话,判断key是不是arrayInstrumentations中的其中一个方法
    if (!isReadonly && targetIsArray && hasOwn(arrayInstrumentations, key)) {
      // 给(arr.includes)返回这个重写的函数. includes = 这个函数
      return Reflect.get(arrayInstrumentations, key, receiver);
    }

    const res = Reflect.get(target, key, receiver);

    // 将是自带Symbol值 与 不需要track的值 直接将值返回，获取这些值是不需要track的
    // 判断是不是Symbol值 ? 是不是原生自带的Symbol值 : 是不是不需要track的值
    if (isSymbol(key) ? builtInSymbols.has(key) : isNonTrackableKeys(key)) {
      return res;
    }

    // readonly默认是没有响应式的
    if (!isReadonly) {
      track(target, TrackOpTypes.GET, key);
    }

    /* ----------------------------获取到值后的判断与操作---------------------- */

    // shallow只获取对象的第一个层。后面不用再执行。
    if (isShallow) {
      return res;
    }

    if (isRef(res)) {
      // 解构ref - 跳过解构数组与整数的ref
      return targetIsArray && isIntegerKey(key) ? res : res.value;
    }

    // 深度代理。如果这次读到是一个对象把这个再代理一遍返回去。取代vue2的直接遍历循环对象所有的值. vue3是在使用的才给这个key加上响应式.
    // 为什么要return。reactive()执行返回的是一个proxy, 像states.friend这样取的就是一个对象.对象就是要return一个proxy给他用。
    if (isObject(res)) {
      return isReadonly ? readonly(res) : reactive(res);
    }

    return res;
  };
}

function deleteProperty(target: object, key: string | symbol): boolean {
  // 这个对象有这个key
  const hadKey = hasOwn(target, key);
  // 获取原来的值
  const oldValue = (target as any)[key];
  // 已经将该key删除了
  const result = Reflect.deleteProperty(target, key);
  // 触发
  if (result && hadKey) trigger(target, TriggerOpTypes.DELETE, key, undefined, oldValue);
  return result;
}

function has(target: object, key: string | symbol): boolean {
  const result = Reflect.has(target, key);
  if (!isSymbol(key) || !builtInSymbols.has(key)) {
    track(target, TrackOpTypes.HAS, key);
  }
  return result;
}

// 在for循环时会触发这个方法
function ownKeys(target: object): (string | symbol)[] {
  // 判断遍历的是不是数组, 是数组收集其的length。
  // 有地方在遍历响应式数组，将这个数组的length与当前active的effect绑定在一起。这个length改变将会再次执行关联的effect
  track(target, TrackOpTypes.ITERATE, isArray(target) ? "length" : ITERATE);
  return Reflect.ownKeys(target);
}

/* -------------------------------reactive()的handler-------------------------- */
export const mutableHandlers: ProxyHandler<object> = {
  get,
  set(target, key, value, receiver) {
    let oldValue = (target as any)[key];
    // 这个判断不严谨, 有可能这次是来设置值的.设置值时oldValue是undefined, obj.name = undefined, 那么就跳过了设置值.
    // if (oldValue === value) return false;

    const hadKey =
      //target是array && key是一个整数 ? arr[key],key是不是小于arr.length大 : 是不是ownerKey
      isArray(target) && isIntegerKey(key) ? Number(key) < target.length : hasOwn(target, key);

    // 修改数据, 已经修改。
    // 如果是修改数组的length, arr.length = 0. 过了这步就已经修改完了, 数组已经被清空了/.此时应该做的是重新执行依赖length的effect.
    let result = Reflect.set(target, key, value, receiver);

    // 判断是否有这个键 没有则添加，有则设置。
    // 如果目标在原型链中的某个位置，则不要触发
    if (target === toRaw(receiver)) {
      // 没有这个键或元素
      if (!hadKey) {
        trigger(target, TriggerOpTypes.ADD, key, value);
      }
      // 键或元素有改变
      else if (hasChange(value, oldValue)) {
        trigger(target, TriggerOpTypes.SET, key, value, oldValue);
      }
    }

    return result;
  },
  deleteProperty,
  has,
  ownKeys,
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

/* -------------------------------shallowReactive handler-------------------------- */
export const shallowReactiveHandlers = extend({}, mutableHandlers, {
  get: shallowGet,
});
