/* // Scenario 1. 同样在main script中执行。 微任务 比 宏任务先执行
const resolvePromise = Promise.resolve();

setTimeout(() => {
  console.log("setTimeout invoke");
});

resolvePromise.then(() => {
  console.log("then invoke");
});

console.log(resolvePromise);
 */

// Scenario 2. 在宏任务中加入微任务。执行完整个宏任务才会执行微任务
const resolvePromise = Promise.resolve();

setTimeout(() => {
  resolvePromise.then(() => {
    console.log("then invoke");
  });

  console.log("setTimeout invoke end");
});

console.log(resolvePromise);
