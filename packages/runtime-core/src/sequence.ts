/*  求最长递增子序列的个数

3 2 8 9 5 6 7 11 15 ->  暂时只找到对应个数找到个数

找更有潜力的. 
  有比我所有数字的大的往后加,
  比我已有数字小的替换最后一个比它小的后面一个数数字。
 - 3
 - 2
 - 2 8
 - 2 8 9
 - 2 5 9
 - 2 5 6
 - 2 5 6 7 11 15


//  找出最长递增子序列
2 3 1 5 6 8 7 9 4

最长递增子序列(雏形): 1 3 4 6 7 9
2
2 3
1 3
1 3 5
1 3 5 6
1 3 5 6 8
1 3 5 6 7
1 3 5 6 7 9
1 3 4 6 7 9

记录每个放入result元素的前溯 (记录其前溯的数组中的index): undefine 0 1 3 4 6
2                 undefine
2 3               undefine 0 
1 3               undefine 0 
1 3 5             undefine 0 1
1 3 5 6           undefine 0 1 3
1 3 5 6 8         undefine 0 1 3 4
1 3 5 6 7         undefine 0 1 3 4
1 3 5 6 7 9       undefine 0 1 3 4 6
1 3 4 6 7 9       undefine 0 1 3 4 6

从最后一个开始往前追溯: 
1 3 4 6 7 9
9 的 index 是 7
9 的 前溯 是 6
6 的 前溯 是 4
4 的 前溯 是 3
3 的 前溯 是 1
0 的 前溯 是 undefined

得到index数列: 7 6 4 3 1 0
换成value:     9 7 6 5 3 2
最终得到正真的最长递增子序列: 2 3 5 6 7 9
 */

export function getSequence(arr: any[]) {
  const len = arr.length;

  // 储存的是index. 默认第一项是最小的。
  const result = [0];
  // 储存的是数组每个元素的前溯
  const p = new Array(len).fill(0);

  let start;
  let end;

  let resultLastIndex;
  // 必须遍历完整个数组
  for (let i = 0; i < len; i++) {
    // debugger;
    let arrI = arr[i];
    // 在diff算法中的newIndexToOldIndexMap 0 代表没有这个元素。
    if (arrI !== 0) {
      // 取出结果的最后一个数字的index
      resultLastIndex = result[result.length - 1];
      // 当前数字比result最后一个(index)数字大
      if (arrI > arr[resultLastIndex]) {
        // 直接将这个元素index放在后面,
        result.push(i);

        // 每个元素记录上一个元素的index
        p[i] = resultLastIndex; // result记录的就是index
        // 下面的代码不再执行(这次for循环).
        continue;
      }
      // 如果当前数字不比最后一项大。（ 又可能 = > 最后一项 ）
      // 这里使用二分查找 是最快的
      start = 0;
      end = result.length - 1;
      // 找到比我小的那一项, 但是这一项后面一项又比我大的那项.
      // start == end 时停止
      while (start < end) {
        // 相除后取余
        let middle: number = ((start + end) / 2) | 0;
        // 如果当前大于中间的元素, 代表middle左边的都比我小, 我要找的值不在左边
        // 目的是找到比我大的那个数
        // arrI是暂时不变的.
        if (arrI > arr[result[middle]]) {
          // +1因为middle这项已经比当前项大
          start = middle + 1;
        } else {
          // arrI比middle小, 右边的值都比arrI大,要找的值在左边
          end = middle;
          /* 
          最后一项的情况 插入4
          arr = [3, 2, 8, 9, 5, 6, 7, 11, 15]
          result = [2, 3, 6, 7, 11, 15]

          middle = 2
          4 < 6
          end = middle  end = 2

          middle = 1
          4 > 3
          start = middle + 1  start = 2

          start === end. 退出while循环.
           */
        }
      }
      // 定位到当前元素. 此时start与end是相同的.
      // 找到比arrI大的数,将它替换掉.
      if (arrI < arr[result[end]]) {
        result[end] = i;

        // [end - 1]就是上一个元素的index
        p[i] = result[end - 1];
      }
    }
  }

  // 得到result与p后
  // console.log(p);
  // console.log(result);

  let i = result.length;
  // 取出最后一项（index）
  let last = result[i - 1];

  // 倒叙插入
  while (i-- > 0) {
    result[i] = last; // 最后一项是确定的，直接插入
    last = p[last]; // p对应的是，这个元素的前溯的index
  }

  return result;
}
