import { shallowReactive } from "@vue/reactivity";
import { hasOwn } from "@vue/shared";
import { ComponentInternalInstance, Data } from "./component";

// 处理组件的props
export function initProps(instance: ComponentInternalInstance, rawProps: any) {
  const props: any = {};
  const attrs: any = {};

  // 组件内定义的props
  const options = instance.propsOptions || {};

  // 遍历父亲传递的props, 组件有接收就是props, 组件没有接收就是attrs
  if (rawProps) {
    for (let key in rawProps) {
      const value = rawProps[key];
      if (hasOwn(options, key)) {
        props[key] = value;
      } else {
        attrs[key] = value;
      }
    }
  }

  // props使用shallowReactive，because 根据单项数据流原则, 只有父亲才能修改传给你的props. 因此只有props改变才需要触发响应式.即我给你的对象的key改变了才需要触发相应式，你组件内部的改变不需要响应式。
  instance.props = shallowReactive(props);
  instance.attrs = attrs;
}

export function hasPropsChange(prevProps: Data = {}, nextProps: Data = {}) {
  const prevKeys = Object.keys(prevProps);
  const nextKeys = Object.keys(nextProps);
  // 键的个数不同，肯定两个props不同
  if (prevKeys.length !== nextKeys.length) return true;
  // 键，值不同的情况
  for (let i = 0; i < nextKeys.length; i++) {
    const key = nextKeys[i];
    if (nextProps[key] !== prevProps[key]) return true;
  }

  return false;
}

export function updateProps(prevProps: Data, nextProps: Data) {
  // instance的props是响应式的(shallow)，而且可以改变的，属性的更新会导致页面重新渲染

  // 将新props的值全部赋给prevProps
  // 这里就是改变组件props的地方。给组件传递新的props将在这里被接收，触发set
  for (const key in nextProps) {
    // 改变组件的props就会触发依赖这个props的effect
    prevProps[key] = nextProps[key];
  }
  // 从prevProps中删除新props没有的key
  for (const key in prevProps) {
    if (!hasOwn(nextProps, key)) {
      delete prevProps[key];
    }
  }
}
