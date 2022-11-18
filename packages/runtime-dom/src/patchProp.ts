/* 改变元素的props的方法 */
import { patchAttrs } from "./modules/attrs";
import { patchClass } from "./modules/class";
import { patchEvents } from "./modules/events";
import { patchStyle } from "./modules/style";

/**
 * patch元素的props
 * @param el 哪个元素
 * @param key 元素的哪个属性
 * @param prevValue 之前值是什么
 * @param nextValue 要改成什么
 */
export function patchProps(el: any, key: any, prevValue: any, nextValue: any) {
  // 修改类名 el.className
  if (key === "class") {
    patchClass(el, nextValue);
  }
  // 修改样式 el.style
  else if (key === "style") {
    patchStyle(el, prevValue, nextValue);
  }
  // 事件 events
  else if (/^on[^a-z]/.test(key)) {
    patchEvents(el, key, nextValue);
  }
  // 普通属性
  else {
    patchAttrs(el, key, nextValue);
  }
}
