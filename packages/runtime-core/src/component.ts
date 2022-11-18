/* 渲染组件的操作 */
import { reactive } from "@vue/reactivity";
import { hasOwn, isFunction } from "@vue/shared";
import { initProps } from "./componentProps";
import { VNode } from "./vnode";

export type Data = Record<string, unknown>;

export interface ComponentInternalInstance {
  data: Data | null;
  vnode: VNode;
  subTree: VNode | null;
  isMounted: boolean;
  update: any;
  propsOptions: any;
  props: Data;
  attrs: Data;
  proxy: any;
  render: any;
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
};

const publicInstanceProxy: ProxyHandler<any> = {
  get(target, key) {
    const { data, props } = target;

    // 只获取state与props的值
    if (data && hasOwn(data, key)) {
      return data[key];
    } else if (props && hasOwn(props, key)) {
      return props[key];
    }

    // 获取$attrs $等属性
    let getter = publicPropertyMap[key];
    if (getter) return getter(target);
  },
  set(target, key, value) {
    const { data, props } = target;

    // 只修改state的值
    if (data && hasOwn(data, key)) {
      data[key] = value;
      return true;
    } else if (props && hasOwn(props, key)) {
      console.warn("attempting to mutate prop " + key);
    }
    return false;
  },
};

export function setupComponent(instance: ComponentInternalInstance) {
  // vnode.props是组件使用者传给这个组件的属性
  // vnode.type.props是组件内部定义的props
  let { props, type } = instance.vnode;

  // 1.处理data
  // 将data绑定this
  let data = type.data;

  if (data) {
    // 组件的data只能是函数.
    if (!isFunction(data)) return console.warn("data option must be a function");

    instance.data = reactive(data.call(instance.proxy));
  }

  // 2.处理props。
  // 分别传入的是   组件里定义的props  父亲传给这个组件的props。
  // 这个函数区别出props与attrs，并且将props进行shallowReactive
  initProps(instance, props);

  // 将组件的instance实例代理一层。即用户在组件使用this
  instance.proxy = new Proxy(instance, publicInstanceProxy);

  // 给实例加上render
  instance.render = type.render;
}
