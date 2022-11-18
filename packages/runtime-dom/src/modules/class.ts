export function patchClass(el: Element, value: any) {
  // 空的，清除class
  if (value == null) {
    el.removeAttribute("class");
  }
  // 设置className，采取直接覆盖
  else {
    el.className = value;
  }
}
