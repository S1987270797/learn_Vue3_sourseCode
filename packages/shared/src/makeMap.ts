/**
 * Make a map and return a function for checking if a key
 * is in that map.
 * IMPORTANT: all calls of this function must be prefixed with
 * \/\*#\_\_PURE\_\_\*\/
 * So that rollup can tree-shake them if necessary.
 */
// 传入一串字符串, 返回一个函数, 执行这个函数传入一个string, 可以判断这个string是否在这个传入的字符串里面.
export function makeMap(str: string, expectsLowerCase?: boolean): (key: string) => boolean {
  // 创建一个map, key为string, value为boolean.
  const map: Record<string, boolean> = Object.create(null);
  // 将传入的字符串分割组成一个数组
  const list: Array<string> = str.split(",");
  // map = {'str1' : true, ... }
  for (let i = 0; i < list.length; i++) {
    map[list[i]] = true;
  }

  return expectsLowerCase ? val => !!map[val.toLocaleLowerCase()] : val => !!map[val];
}
