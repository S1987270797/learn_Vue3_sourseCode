import { isArray, isObject, isString, ShapeFlags } from "@vue/shared";
import { ComponentInternalInstance } from "./component";

export const Text = Symbol("Text");
export const Fragment = Symbol("Fragment");

export interface VNode {
  __v_isVNode: boolean;
  type: any;
  props: Record<string, any>;
  children: any;
  el: any;
  key: any;
  shapeFlag: ShapeFlags;
  component?: ComponentInternalInstance; // 只有组件才有这个属性
}
// 是否是vnode
export function isVNode(value: any): value is VNode {
  return value ? value.__v_isVNode === true : false;
}

// 是否两个VNode的type相同
export function isSameVNodeType(n1: VNode, n2: VNode) {
  return n1.type === n2.type && n1.key === n2.key;
}

// 创建一个vnode
// 为什么创建vnode的第一个参数要叫type。为了区别dom元素节点，文本节点等
// type：传入字符串代表要创建元素或组件，传入Text类型代表只是要创建一个文本节点
export function createVNode(type: any, props?: any, children?: any): VNode {
  // 是字符串创建元素。是对象创建组件。
  let shapeFlag = isString(type) ? ShapeFlags.ELEMENT : isObject(type) ? ShapeFlags.STATEFUL_COMPONENT : 0;

  // 要创建的虚拟节点
  const vnode = {
    __v_isVNode: true,
    // h1, div, span, Text, Fragment, VueComponent ...
    // type 是 VueComponent时, VueComponent里面还有一个props，这个props是组件的props，用来接收父亲的数据。
    type,
    // 这个props是元素的基本属性 class、color、background、自定义属性等. <div class="container">helloworld</div>
    // type 是 VueComponent时，这个props是传给这个组件的props。父组件传递给子组件的props。
    props,
    children,
    el: null, // 储存自己对应的真实元素
    key: props?.key, // 为了diff算法的key， v-for绑定的key
    shapeFlag,
  };

  // 根据children，增加children的shape。
  if (children) {
    let type = 0;
    // children是一个数组，代表有子元素
    if (isArray(children)) {
      type = ShapeFlags.ARRAY_CHILDREN;
    }
    // 不是数组,儿子是一个文本节点
    else {
      children = String(children);
      type = ShapeFlags.TEXT_CHILDREN;
    }

    vnode.shapeFlag |= type;
  }

  return vnode;
}
