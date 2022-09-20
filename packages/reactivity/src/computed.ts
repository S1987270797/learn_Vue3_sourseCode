/*
const fullname = computed(() => ...)
fullName.value时进去computed的get。get判断是否是dirty，是dirty执行this._value = this.effect.run()，执行完dirty改为false. return this._value.
states.age = 100. 触发reactive的setter，执行schduler，判断是否干净，干净进去函数，dirty = true，触发执行引用fullName的effect函数，fullName.value重新执行get，get重新执行this.effect.run获得最新值。
 */
import { ReactiveEffect, trackEffects, triggerEffects } from "./effect";
import { isFunction } from "@vue/shared";

export type ComputedGetter<T> = (...args: any[]) => T;
export type ComputedSetter<T> = (val: T) => void;

class ComputedRefImpl<T> {
  public effect;
  public _dirty = true;
  private _value!: T;
  public dep = new Set();
  constructor(public getter: ComputedGetter<T>, public setter: ComputedSetter<T>) {
    // 将用户传给computed的函数(或传入的getter)作为effect的fn. 第二个参数是scheduler，修改时触发。
    // 实例computedRefImpl储存的effect.fn是在05.html传给computed的函数。传入属于computed的scheduler.
    this.effect = new ReactiveEffect(
      getter,
      // 进入scheduler就代表已经修改了依赖的值.
      () => {
        // 目前为止是干净时触发。
        if (!this._dirty) {
          // 我们改过之后就脏了, 这句必须在triggerEffects()前面.
          this._dirty = true;
          // 触发更新, 触发的是依赖我的effect.( 05.html的effect函数 )。执行函数重新获取fullName -> 进入get,判断dirty -> 是dirty -> computed实例的this.effect.run();
          triggerEffects(this.dep);
        }
      }
    );
  }
  // 直接给到《05-.html》fullName.value使用
  get value() {
    // 这里做一次依赖收集, 再判断当前computed的._value是不是脏的, 是脏的就执行computed的effect.fn(用户传给computed的函数)一次.
    // 哪个effect中的函数调用了我(fullName.value)，我就将哪个函数收集到我的this.dep里.
    trackEffects(this.dep || (this.dep = new Set()));
    // 如果是脏的(computed依赖的states改变了)就执行一次run再return, 这就是computed有缓存的原因.
    if (this._dirty) {
      // this.effect.run()执行的是用户传给computed的函数. 是脏的就需要重新执行此函数, 这个函数执行将会重新计算fullName;
      this._value = this.effect.run();
      // 重新执行传给computed的函数,就代表有states被修改了. 重新执行this.effect.run后此时这个computed就是干净的.
      this._dirty = false;
    }
    return this._value;
  }
  set value(newValue: T) {
    this.setter(newValue);
  }
}

export interface WritableComputedOptions<T> {
  get: ComputedGetter<T>;
  set: ComputedSetter<T>;
}

// 导出computed方法. 又可以传入一个函数或者一个对象中包含着getter与setter.
export function computed<T>(getter: ComputedGetter<T>): any;
export function computed<T>(options: WritableComputedOptions<T>): any;
export function computed<T>(getterOrOptions: ComputedGetter<T> | WritableComputedOptions<T>) {
  // 这里有一个函数重载的细节. 使用let定义onlyGetter时赋值getter与会报类型错误,原因是使用let定义时ts认为这个onlyGetter也会改变,那么getterOrOptions类型就不明确.
  const onlyGetter = isFunction(getterOrOptions);
  let getter: ComputedGetter<T>;
  let setter: ComputedSetter<T>;
  // 判断是否是函数
  if (onlyGetter) {
    getter = getterOrOptions;
    // 只传入了函数,没有传入set.
    setter = () => {
      console.warn("no set");
    };
  } else {
    getter = getterOrOptions.get;
    setter = getterOrOptions.set;
  }

  // 这个return返回到了《05-.html》
  return new ComputedRefImpl(getter, setter);
}
