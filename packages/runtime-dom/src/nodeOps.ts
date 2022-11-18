/* 操作node节点方法 */
export const svgNS = "http://www.w3.org/2000/svg";
const doc = document;

export interface NodeOps {
  insert(child: any, parent: any, anchor?: any): void;
  remove(child: any): void;
  createElement(tag: any, is?: any, props?: any): void;
  createText(text: any): void;
  createComment(text: any): void;
  setText(nodeText: any, text: any): void;
  setElementText(elElement: any, text: any): void;
  parentNode(node: Element): void;
  nextSibling(node: any): void;
  querySelector(selector: any): void;
  setScopeId(elElement: any, id: any): void;
}

export const nodeOps = {
  // 插入node
  insert: (child: any, parent: any, anchor?: any) => {
    parent.insertBefore(child, anchor || null);
  },

  // 删除元素
  remove: (child: any) => {
    const parent = child.parentNode;
    // html元素没有父亲
    if (parent) {
      parent.removeChild(child);
    }
  },

  // 创建元素
  createElement: (tag: any, is: any, props: any) => {
    const el = doc.createElement(tag, is ? { is } : undefined);

    // if (tag === 'select' && props && )
    return el;
  },

  // 创建文本节点
  createText: (text: any) => doc.createTextNode(text),

  // 创建注释节点
  createComment: (text: any) => doc.createComment(text),

  // 改变文本节点的nodeValue
  setText: (node: Text, text: any) => {
    node.nodeValue = text;
  },

  // 改变元素的text
  setElementText: (el: Element, text: any) => {
    el.textContent = text;
  },

  // 获取这个节点的父节点
  parentNode: (node: Element) => node.parentNode as Element | null,

  // 获取这个节点的下一个节点
  nextSibling: (node: any) => node.nextSibling,

  // 元素选择器
  querySelector: (selector: any) => doc.querySelector(selector),

  // 设置id
  setScopeId(el: Element, id: any) {
    el.setAttribute(id, "");
  },
};
