/*
watch也是基于effect的
与普通的effect响应式不同的是watch在创建ReactiveEffect时会传入scheduler，
执行顺序是：
调用watch函数传入需要监听的数据，再传入属于watch的schduler。
立刻调用一次effect.run获得旧值，同时收集依赖使用到数据的依赖。(将传给watch第一个函数使用到数据与这个函数绑定起来)
一秒钟后修改states.course.score，经过mutableHandler后执行job(schduler)，此时states.course.score已经被修改，重新执行传给watch的第一个函数得到最新的值，再将得到newVal与oldValue传给用于传入的第二个函数。最后将oldVal = newVal，提供给下次使用。
*/
import { isObject, isFunction } from "@vue/shared";
import { effect, ReactiveEffect } from "./effect";
import { isReactive } from "./reactive";

function traversal(value: unknown, set = new Set()) {
  // 不是对象的出去
  if (!isObject(value)) return value;
  // 已经遍历过的对象出去
  if (set.has(value)) return value;
  // 将对象储存起来
  set.add(value);
  // 遍历这个对象
  for (let key in value) {
    traversal(value[key], set);
  }
  // 最后将原始的对象原模原样的返回
  return value;
}

export type WatchCallback<V = any, OV = any> = (
  value: V,
  oldValue: OV,
  onCleanup: OnCleanup
) => any;

type OnCleanup = (cleanupFn: () => void) => void;

// 用户传入需要监听的值与 值改变后需要执行的回调函数. 即这个函数会在改变后执行.
export function watch<T = any>(source: T, cb: WatchCallback) {
  let getter: any;
  // 判断用户传入的内容：
  // 传入的是一个响应式对象
  if (isReactive(source)) {
    traversal(source);
    getter = () => traversal(source);
  }
  // 是一个函数,函数返回需要watch的值
  else if (isFunction(source)) {
    getter = source;
  }
  // 什么都没有
  else {
    return;
  }

  let oldValue: any;
  let cleanup: () => void;
  const onCleanup: OnCleanup = fn => {
    cleanup = fn;
  };
  // 这个函数作为scheduler, 修改watch监听的值会执行job. 我们需要拿到新值旧值传给用户的处理函数。
  // 每修改一次就执行一次这个函数。
  const job = () => {
    console.log(cleanup);
    if (cleanup) cleanup();
    // 修改值后, 重新执行这个函数就是得到最新的值
    const newValue = effect.run();
    // 执行用户的处理函数.
    // 第三个参数传给他的是一个函数, 用户执行这个函数需要传入一个函数. 传入的函数将会在下一次执行job时执行。
    cb(newValue, oldValue, onCleanup);
    // 新值变成旧值, 给下次用.
    oldValue = newValue;
  };

  const effect = new ReactiveEffect(getter, job);
  // 进入watch函数会立刻执行. effect.run() 是直接执行传给watch的第一个值, 得到oldValue.
  oldValue = effect.run();
}
