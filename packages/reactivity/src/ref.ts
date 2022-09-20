/* 10-html */
import { isArray, isObject } from "@vue/shared";
import { toReactive } from "./reactive";
import { trackEffects, triggerEffects } from "./effect";

class RefImpl<T> {
  private _value: T;
  private __v_isRef = true;
  public dep = new Set();
  constructor(public rawValue: T) {
    this._value = toReactive(rawValue);
  }

  get value() {
    trackEffects(this.dep);
    return this._value;
  }

  set value(newValue) {
    if (newValue === this.rawValue) return;

    this._value = toReactive(newValue);
    this.rawValue = newValue;
    triggerEffects(this.dep);
  }
}

export function ref<T = any>(value: T) {
  // 返回的是一个RefImpl实例，这就是为什么ref的值需要.value
  return new RefImpl(value);
}

/* -------------------------------toRefs---------------------------- */
class ObjectRefImpl {
  constructor(public object: any, public key: any) {}
  get value() {
    return this.object[this.key];
  }

  set value(newValue) {
    this.object[this.key] = newValue;
  }
}

export function toRef(object: any, key: any) {
  // 返回的是一个ObjectRefImpl实例. 
  return new ObjectRefImpl(object, key);
}

export function toRefs(object: any) {
  // 判断是不是数组,是数组就创建一个有相同长度的空数组.
  const result: any = isArray(object) ? new Array(object.length) : {};

  for (let key in object) {
    // 将原来的对象 {key : ObjectRefImpl实例} .  以后使用这个值需要.value
    result[key] = toRef(object, key);
  }

  return result;
}

/* -------------------------------proxyRefs---------------------------- */
// 将ref的值变为reactive. 从.value使用变为 states.xx使用.
export function proxyRefs(object: any) {
  return new Proxy(object, {
    get(target, key, receiver) {
      let r = Reflect.get(target, key, receiver);
      // 判断是不是ref, 是ref就给他点一下value.
      return r.__v_isRef ? r.value : r;
    },
    set(target, key, value, receiver) {
      let oldValue = target[key];
      // 判断是不是ref, 是ref对象需要.value进行设置
      if (oldValue.__v_isRef) {
        oldValue.value = value;
        return true;
      } else {
        return Reflect.set(target, key, value, receiver);
      }
    },
  });
}
