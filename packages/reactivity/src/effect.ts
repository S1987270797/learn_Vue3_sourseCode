// effect就是ReactiveEffect构造函数new的实例
export let activeEffect: any = undefined;

type fn = () => any;

// 传入ReactiveEffect实例.
function cleanUpEffect(effect: ReactiveEffect) {
  const { deps } = effect; // deps是一个数组, 数组的每个元素是一个个Set
  // 将依赖这个effect的属性的deps中的这个effect删除. 将这个effect从目标属性移除. 目标属性改变将不会再触发这个effect
  for (let i = 0; i < deps.length; i++) {
    deps[i].delete(effect);
  }
  // 将数组清空
  effect.deps.length = 0;
}

export type EffectScheduler = (...args: any[]) => any;

export class ReactiveEffect {
  public active = true;
  public parent = null;
  // deps是一个数组, 数组里是一个个Set, 每个Set储存着依赖这个属性的effect
  public deps: Set<ReactiveEffect>[] = [];
  // 用户的逻辑代码
  public fn;
  // 用户的响应式处理逻辑
  public scheduler;
  constructor(fn: fn, scheduler?: EffectScheduler) {
    this.fn = fn;
    this.scheduler = scheduler;
  }

  // 每次执行effect函数都会将依赖这个effect的属性的deps中的这个effect删除，重新给他们收集依赖。(分支切换)
  run() {
    // 不是reactive对象,只需要执行,不要收集依赖
    if (!this.active) return this.fn();

    // 收集依赖, 将当前的effect和稍后渲染的属性关联起来.
    try {
      // 嵌套的effect。将之前父亲的effect储存起来
      this.parent = activeEffect;
      // 操作自己的effect
      activeEffect = this;

      // 执行之前, vars(依赖这个effect的属性们). 将vars属性中的deps的这个effect删除. 执行effect函数会重新收集依赖这个effect的属性.
      cleanUpEffect(this);

      // 执行函数就会触发proxy的get,间接传递activeEffect.
      return this.fn();
    } finally {
      activeEffect = this.parent;
      this.parent = null;
    }
  }
  // 停止对这个effect响应式
  stop() {
    if (this.active) {
      this.active = false;
      cleanUpEffect(this);
    }
  }
}

// 执行effect可传入的参数
export interface ReactiveEffectOptions {
  scheduler?: EffectScheduler;
}

// effect函数返回一个函数（也是对象）。执行函数返回any，还可以调用effect属性里面的方法。
export interface ReactiveEffectRunner<T = any> {
  (): T; // 返回一个run函数
  effect: ReactiveEffect; // 还有一个ReactiveEffect实例
}

/* ------------------effect----------------------- */
export function effect(fn: fn, options: ReactiveEffectOptions): ReactiveEffectRunner {
  const _effect = new ReactiveEffect(fn, options?.scheduler);
  // 传入的函数默认执行一次
  _effect.run();

  // 执行runner函数会执行一次effect函数。改变this指向, 否则runner()的this会指向window
  const runner = _effect.run.bind(_effect) as ReactiveEffectRunner;
  // runner.effect.stop()可以解除这个effect的依赖.
  runner.effect = _effect;

  return runner;
}

/* ------------------track 收集依赖----------------------- */
const targetMap = new WeakMap();
export function track(target: object, type: any, key: unknown) {
  // 没过effect函数不用track. 没有执行run。
  if (!activeEffect) return;

  // depsMap: map{ key : Set[所有依赖这个key的effect] }
  let depsMap = targetMap.get(target);
  // 这个对象是新的对象
  if (!depsMap) {
    depsMap = new Map();
    targetMap.set(target, depsMap);
  }

  // dep => Set[] 这个key所有的effect
  let dep = depsMap.get(key);
  // 这个key还没被effect过
  if (!dep) {
    dep = new Set();
    depsMap.set(key, dep);
  }

  // 收集这个key的effect。
  trackEffects(dep);
}
export function trackEffects(dep: any) {
  // 当前没有activeEffect就不执行下面操作
  if (!activeEffect) return;
  // 判断重复的effect 再 储存依赖
  if (!dep.has(activeEffect)) {
    dep.add(activeEffect);
    // 在effect.deps里面储存依赖这个effect的key的Set，这个Set也包含着这个effect。目的是后面可以清除依赖。
    // 如果要清除所有属性对这个effect的依赖只需要在这个effect.run执行时拿出自己的deps(this.deps)找到自己(effect)删除即可. 因为Set是复杂数据类型, 这边清除依赖, 在属性的.dep中这个属性也会被移除.
    activeEffect.deps.push(dep);
  }
}

/* ------------------trigger 触发依赖----------------------- */
export function trigger(target: any, type: any, key: any, value: any, oldValue: any) {
  const depsMap = targetMap.get(target);
  // 没有收集过这个对象的依赖.没有经过effect函数.
  if (!depsMap) return;

  let effects = depsMap.get(key);
  if (effects) {
    // 触发依赖
    triggerEffects(effects);
  }
}

export function triggerEffects(effects: any) {
  // 这些函数是这个属性依赖所有的effects，这个属性被修改这些effect需要重新执行。
  // 这次只需要执行这些effect, 后面添加进来的不需要再执行.
  // 因为我们会将原来的Set清除再重新收集依赖.
  // 如果不再赋值一个新变量, 会造成clearUpEffects()清除依赖, run()添加依赖, 无限循环.
  effects = new Set(effects);
  effects.forEach((effect: ReactiveEffect) => {
    // 执行effect又执行自己, 不能这样会无限执行.
    if (effect !== activeEffect) {
      // 有用户传进来的scheduler,优先执行scheduer.
      effect.scheduler ? effect.scheduler() : effect.run();
    }
  });
}

/* 1.effect()里面有嵌套的effect()
  解决方式: 1.使用栈数据结构. 2.使用树结构(父亲)
 */

/* 2.track函数
  weakMap{ 目标对象: map{ 对象key: Set[ effect, effect, ... ]} }
 */

/* 3.effect函数反向记录依赖自己的属性, 为了可以做到卸载的效果.
 */

/* 4.trigger函数,触发依赖的函数
    1.触发effect的值,在这个effect里面再次修改,造成无限循环. // states.age = Math.random();
    2.每次执行effect时清理一遍依赖,重新收集依赖。目的是提高性能，解除不再依赖这个effect的属性.vars(依赖这个effect的属性们). 将vars属性中的deps的这个effect删除. 执行effect函数会重新收集依赖这个effect的属性.
 */
