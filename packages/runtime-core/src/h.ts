/* h函数的用法

h( 'div' )

h( 'div', 'hello' )
h( 'div', h('span') )
h( 'div', { style: {"color": "red"} } )
h( 'div', [ h('span'), h('span') ] )

h( 'div', { style: {"color": "red"} }, 'hello' )
h( 'div', null, h('span') )
h( 'div', null, [ h('span') ] )

h( 'div', null, 'hello', 'world' )
h( 'div', { class: 'container' }, 'hello', 'world' )
 */

import { isArray, isObject } from "@vue/shared";
import { createVNode, isVNode } from "./vnode";

// h函数是创建vnode的
// createVNode是创建单个vnode，必须有明确的参数。h函数会判断如何创建
export function h(type: any, propsOrChildren?: any, children?: any) {
  const l = arguments.length;

  // debugger
  // 两个个参数
  if (l === 2) {
    // 是对象不是数组
    if (isObject(propsOrChildren) && !isArray(propsOrChildren)) {
      // h( 'div', h('span') )
      // 如果是vnode，包装成数组，传给createVnode.
      // 包装成数组的原因是，到时候可以循环创建vnode。方便
      if (isVNode(propsOrChildren)) {
        return createVNode(type, null, [propsOrChildren]);
      } else {
        // 只有属性，没有子元素
        // h( 'div', { style: { color: "red" } } ) // 渲染元素
        // h( VueComponent, { someone: "余芷慧" } ) // 渲染组件
        return createVNode(type, propsOrChildren);
      }
    } else {
      // h( 'div', 'hello' )
      // 只有子元素， 没有属性
      return createVNode(type, null, propsOrChildren);
    }
  }
  // 三个以上参数
  else {
    // h( 'div', { class: 'container' }, 'hello', 'world' )
    if (l > 3) {
      // 从第三个开始取出后面参数，这些都是子元素
      children = Array.prototype.slice.call(arguments, 2);
    }
    // h( 'div', { class: 'container' } , h('span') )
    else if (l === 3 && isVNode(children)) {
      children = [children];
    }

    return createVNode(type, propsOrChildren, children);
  }
}
