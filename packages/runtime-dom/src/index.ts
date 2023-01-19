import { createRenderer } from "@vue/runtime-core";
import { NodeOps, nodeOps } from "./nodeOps";
import { patchProps } from "./patchProp";

export * from "@vue/runtime-core";
export * from "@vue/reactivity";

// RenderOptions有所有NodeOps所有方法
export interface RendererOptions extends NodeOps {
  patchProps(el: any, key: any, prevValue: any, nextValue: any): void;
}

// domAPI
// 铸造rendererOptions
const rendererOptions: RendererOptions = Object.assign(nodeOps, { patchProps });

// runtime-dom提供默认的render方法，用于渲染dom元素.
export function render(vnode: any, container: any) {
  return createRenderer(rendererOptions).render(vnode, container);
}

// console.log(render);

// console.log(rendererOptions);

// 这个对象就是传给createRenderer函数的, 传给它这些api告诉它我们需要生成的dom节点. 返回render函数, 执行render函数传入需要生成的元素信息, 生成真实dom.
// createRenderer(renderOptions)
