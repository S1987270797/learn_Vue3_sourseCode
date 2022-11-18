import { isString } from "@vue/shared";

type Style = string | Record<string, string | string[]> | null;

export function patchStyle(el: Element, prevVal: Style, nextVal: Style) {
  // 新属性是不是一个字符串
  const isCssString = isString(nextVal);
  const style = (el as any).style;

  // 遍历对象. 新样式覆盖旧样式。
  // 有新内容，并且不是字符串
  if (nextVal && !isCssString) {
    for (const key in nextVal) {
      style[key] = nextVal[key];
    }
  }

  // 将新样式中没有的样式清除
  if (prevVal && !isString(prevVal) && !isCssString) {
    for (const key in prevVal) {
      if ((nextVal as any)[key] == null) {
        style[key] = null;
      }
    }
  }
}
