/* 渲染组件的操作 */
import { proxyRefs, reactive } from "@vue/reactivity";
import { hasOwn, isFunction, isObject, ShapeFlags } from "@vue/shared";
import { initProps } from "./componentProps";
import { VNode } from "./vnode";
import { LifecycleHooks } from "./apiLifeCycle";

export type Data = Record<string, unknown>;

// 记录当前活跃的instance
export let currentInstance: ComponentInternalInstance | null;
export const setCurrentInstance = (instance: ComponentInternalInstance | null) => (currentInstance = instance);
export const getCurrentInstance = () => currentInstance;

export interface ComponentInternalInstance {
  data: Data | null;
  vnode: VNode;
  subTree: VNode | null;
  isMounted: boolean;
  update: any; // 组件更新执行的函数
  propsOptions: any; // 组件接收的props
  props: Data; // 组件的props
  attrs: Data; // 组件的attrs
  proxy: any; // 组件的代理对象（在组件中使用this）
  render: any; // 组件的render函数（template渲染部分）
  next?: VNode | null; // 组件新的vnode
  setupState?: Data; // setup函数return的对象
  slots?: {}; // 插槽相关内容
  // 声明周期函数们
  [LifecycleHooks.BEFORE_MOUNT]?: Function[];
  [LifecycleHooks.MOUNTED]?: Function[];
  [LifecycleHooks.BEFORE_UPDATE]?: Function[];
  [LifecycleHooks.UPDATED]?: Function[];
}

export function createComponentInstance(vnode: VNode) {
  // 组件实例
  const instance: ComponentInternalInstance = {
    data: null, // 即在组件data里面定义的数据
    vnode, // 就是createVnode()创建的vnode. 也就是传入这个函数的vnode。是创建出instance的源对象
    subTree: null, // render执行后的结果（是一个vnode），是这个组件的的内容
    isMounted: false, // 是否已经被挂载
    update: null, // 更新组件的函数
    propsOptions: vnode.type.props, // 在组件里面定义的props，用来接收父亲传过来的数据
    props: {}, // 该组件真实接收到的属性
    attrs: {}, // 该组件没有接收的属性
    render: null,
    proxy: null,
  };

  return instance;
}

const publicPropertyMap: any = {
  $attrs: (i: any) => i.attrs,
  $slots: (i: any) => i.slots,
};

// instance的ProxyHandler
const publicInstanceProxy: ProxyHandler<any> = {
  get(target, key) {
    const { data, props, setupState } = target;

    // 给组件所有数据设置一个访问顺序. data -> setupState -> props
    if (data && hasOwn(data, key)) {
      return data[key];
    } else if (setupState && hasOwn(setupState, key)) {
      return setupState[key];
    } else if (props && hasOwn(props, key)) {
      return props[key];
    }

    // 获取$attrs $等属性
    let getter = publicPropertyMap[key];
    if (getter) return getter(target);
  },
  //
  set(target, key, value) {
    const { data, props, setupState } = target;

    // 只修改state的值
    if (data && hasOwn(data, key)) {
      data[key] = value;
    } else if (hasOwn(setupState, key)) {
      setupState[key] = value;
    } else if (props && hasOwn(props, key)) {
      console.warn("attempting to mutate prop " + key);
      return false;
    }
    return true;
  },
};

function initSlots(instance: ComponentInternalInstance, children: {}) {
  // 有插槽的组件
  if (instance.vnode.shapeFlag & ShapeFlags.SLOTS_CHILDREN) {
    instance.slots = children;
  }
}

export function setupComponent(instance: ComponentInternalInstance) {
  // vnode.props是组件使用者传给这个组件的属性
  let { props, type, children } = instance.vnode;
  // vnode.type.props是组件内部定义的props
  let { data, setup, render } = type;

  // 1.处理data
  // 将data绑定this
  if (data) {
    // 组件的data只能是函数.
    if (!isFunction(data)) return console.warn("data option must be a function");

    instance.data = reactive(data.call(instance.proxy));
  }

  // 2.处理setup
  if (setup) {
    const setupContext = {
      // 组件发送事件的函数
      emit: (event: String, ...args: any[]) => {
        const eventName = `on${event[0].toUpperCase() + event.slice(1)}`; // onClick
        // 找到父亲的回调函数. <son @Xxx="fn"></son>
        const handler = instance.vnode.props[eventName];
        handler && handler(...args);
      },
      attrs: instance.attrs,
      slots: instance.slots,
    };

    // 执行setup函数前设置一下当前活跃的实例。
    /* 目的
      1.为了保证每个setup函数获取到正确的对应的this
      2.为了保证每个setup中的生命周期函数获取到对应的实例
     */
    setCurrentInstance(instance);
    // 执行setup函数,传入props, context.
    const setupResult = setup(instance.props, setupContext);
    setCurrentInstance(null);

    // setup返回的是对象, 放在setupState里面. (与vue2的data兼容)
    if (isObject(setupResult)) {
      // 将ref转为reactive
      instance.setupState = proxyRefs(setupResult);
    }
    // 是函数, 作为render函数
    else if (isFunction(setupResult)) {
      instance.render = setupResult;
    }
  }

  // 如果setup函数返回的是一个函数，将有限使用setup函数返回的函数作为render函数。
  // 如果在setup中没有设置,给实例加上render.
  if (!instance.render) {
    instance.render = render;
  }

  // 3.处理props。
  // 分别传入的是   组件里定义的props  父亲传给这个组件的props。
  // 这个函数区别出props与attrs，并且将props进行shallowReactive
  initProps(instance, props);

  // 4.处理slots
  initSlots(instance, children);

  // 将组件的instance实例代理一层。即用户在组件使用this
  instance.proxy = new Proxy(instance, publicInstanceProxy);
}
