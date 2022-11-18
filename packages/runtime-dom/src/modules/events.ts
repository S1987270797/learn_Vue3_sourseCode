/* 一个元素的一个监听事件只能绑定一个函数, click, mouseover, mouseleave...等事件 */

// Invoker继承EventListener.(多加了两个属性)
interface Invoker extends EventListener {
  value: EventValue;
  attached?: number;
}

type EventValue = Function | Function[];

// 一个Invoker就是一个事件监听的对应的回调函数。
// 为了避免频繁addEventListener并且removeEventListener并且方便替换回调函数，采取.value的方式替换回调函数
function createInvoker(callback: any) {
  // 定义一个invoker是一个函数，执行这个函数返回invoker.value(e)的执行结果。
  // 执行事件监听函数默认会传事件对象Event
  const invoker = (e: Event) => invoker.value(e);
  invoker.value = callback;
  return invoker;
}

export function patchEvents(
  // vei: vue events invoke;
  // 给el多加了一个私有属性_vei,是一个对象
  el: Element & { _vei?: Record<string, Invoker | undefined> },
  eventName: string,
  nextValue: any
) {
  // invokers是绑定给el一系列事件的对应的监听函数。{ click : fn, mouseover: fn ... }
  let invokers = el._vei || (el._vei = {});

  // 取出这个监听事件（EventName）的回调函数。
  const existingInvoker = invokers[eventName];

  // 这个事件是否之前已经绑定过函数 并且 有新函数传入
  if (existingInvoker && nextValue) {
    // 替换existingInvoker.value就是替换回调函数
    existingInvoker.value = nextValue;
  }
  // 这个事件没有被绑定过函数
  else {
    // 拿到原始事件名，用于绑定dom事件
    let event = eventName.slice(2).toLowerCase();

    // 如果有新函数传递，监听该事件，传入监听的回调函数
    if (nextValue) {
      const invoker = (invokers[eventName] = createInvoker(nextValue));

      el.addEventListener(event, invoker);
    }
    // 只有existingInvoker时，没有新函数传递进来，代表要取消监听该事件
    else if (existingInvoker) {
      el.removeEventListener(event, existingInvoker);
      invokers[eventName] = undefined;
    }
  }
}
