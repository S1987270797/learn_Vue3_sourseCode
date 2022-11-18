// 组件的异步更新
let queue: any[] = [];
let isFlushing = false;
const resolvePromise = Promise.resolve();

export function queueJob(job: any) {
  // 不放重复的job
  if (!queue.includes(job)) {
    queue.push(job);
  }
  // 当前不在更新
  if (!isFlushing) {
    isFlushing = true;
    // 同样在main script定义 微任务会在宏任务之前执行.
    // 在宏任务中定义微任务，会先执行完整个宏任务再执行微任务。不会说中断宏任务再执行微任务。
    // 下面这个函数会在setTimeout执行完立刻执行,做到异步更新组件。

    resolvePromise.then(() => {
      // console.log("resolvePromise.then invoking");
      isFlushing = false;

      // 防止执行遍历执行queue的job时，job同时又往queue里面增加job，无限循环
      let copy = queue.slice(0);
      // 复制完立刻清除。而不是在执行完for循环后再清除。job又可能在执行中会往queue里面放新job，for循环全部执行完后，把下次要执行的job都给清楚了
      queue.length = 0;

      for (let i = 0; i < copy.length; i++) {
        let job = copy[i];
        job();
      }
      copy.length = 0;
    });
  }
}
