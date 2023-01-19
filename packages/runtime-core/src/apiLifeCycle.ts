import { ComponentInternalInstance, currentInstance, setCurrentInstance } from "./component";

export const enum LifecycleHooks {
  BEFORE_MOUNT = "bm",
  MOUNTED = "m",
  BEFORE_UPDATE = "bu",
  UPDATED = "u",
}

function createHook(type: LifecycleHooks) {
  // hook就是用户传入的函数。target是组件实例，如果没有设置那么就是用使用当前组件instance。
  return (hook: Function, target: ComponentInternalInstance | null = currentInstance) => {
    // 有活跃的组件的时候才收集回调函数. 只支持在setup中使用生命周期函数. setup一定有instance实例.
    if (target) {
      // type是一个个生命周期函数名字，对应是一个数组，允许在同一个setup中使用多次同一个生命周期函数，将每个生命周期函数都保存到组件的instance上面
      const hooks = target[type] || (target[type] = []);

      // 将hook包裹, 绑定当前instance，为的是在生命周期中获取到正确的instance. 这里使用到闭包引用target定义函数。
      // 为了在生命周期函数里面获取到正确的组件实例. 执行生命周期函数时能获取到正确的组件实例。每个组件的生命周期函数获取到各自的组件实例
      const wrapHook = () => {
        // 闭包。外面是一个函数，调用外面函数的时候会传入target，这里有再引用target，外面函数再执行完成时不会被回收，还会保留传入的参数，以供这个函数使用
        setCurrentInstance(target);
        hook();
        setCurrentInstance(null);
      };

      // 将这次传入的函数储存起来，这里使用的是复杂数据类型的引用
      hooks.push(wrapHook);
    }
    // 不在setup中使用
    else {
      console.warn(
        "onBeforeMount is called when there is no active component instance to be associated with. Lifecycle injection APIs can only be used during execution of setup(). If you are using async setup(), make sure to register lifecycle hooks before the first await statement."
      );
    }
  };
}

export const onBeforeMount = createHook(LifecycleHooks.BEFORE_MOUNT);
export const onMounted = createHook(LifecycleHooks.MOUNTED);
export const onBeforeUpdate = createHook(LifecycleHooks.BEFORE_UPDATE);
export const onUpdated = createHook(LifecycleHooks.UPDATED);
