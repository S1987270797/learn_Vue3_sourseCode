// 修改普通属性
export function patchAttrs(el: Element, key: string, nextValue: any) {
  // 有则直接加
  if (nextValue) {
    el.setAttribute(key, nextValue);
  }
  // 没有新值则直接删除
  else {
    el.removeAttribute(key);
  }
}
