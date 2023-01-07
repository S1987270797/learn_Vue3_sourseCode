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
  patchFlag: number;
  component?: ComponentInternalInstance; // 只有组件才有这个属性
  dynamicChildren?: any; // 动态节点，给靶向更新用的配置
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
export function createVNode(type: any, props?: any, children?: any, patchFlag: number = 0): VNode {
  // 是字符串创建元素。是对象创建组件。
  let shapeFlag = isString(type) ? ShapeFlags.ELEMENT : isObject(type) ? ShapeFlags.STATEFUL_COMPONENT : 0;

  // 要创建的虚拟节点
  const vnode: VNode = {
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
    shapeFlag, // 描述这个VNode的形状，是Element还是一个Component
    patchFlag, // 描述这个VNode哪些元素是动态的，方便patch，为了靶向更新做准备
  };

  // 根据children，增加children的shape。
  if (children) {
    let type = 0;
    // children是一个数组，代表有子元素
    if (isArray(children)) {
      type = ShapeFlags.ARRAY_CHILDREN;
    }
    // 是对象代表有这个组件有插槽
    else if (isObject(children)) {
      type = ShapeFlags.SLOTS_CHILDREN;
    }
    // 不是数组,儿子是一个文本节点
    else {
      children = String(children);
      type = ShapeFlags.TEXT_CHILDREN;
    }

    vnode.shapeFlag |= type;
  }

  if (currentBlock && vnode.patchFlag > 0) {
    currentBlock.push(vnode);
  }

  return vnode;
}

// 靶向更新
let currentBlock: any = null;

// 每开启一个block都有一个dynamicChildren。
export function openBlock() {
  // 用一个数组来收集多个动态节点
  currentBlock = [];
}

export function setupBlock(vnode: VNode) {
  // 将currentBlock设置到对应的vnode 上面
  vnode.dynamicChildren = currentBlock;
  currentBlock = null;
  return vnode;
}

export function createElementBlock(type: any, props?: any, children?: any, patchFlag?: number) {
  return setupBlock(createVNode(type, props, children, patchFlag));
}

export { createVNode as createElementVNode };
// export function _createElementVNode() {} // 暂时不需要这个方法

// 将val转为string
export function toDisplayString(val: any) {
  // 是string直接返回，是null转为空字符串， 是对象使用转为字符串， 是数字转为字符串
  return isString(val) ? val : val == null ? "" : isObject(val) ? JSON.stringify(val) : String(val);
}
