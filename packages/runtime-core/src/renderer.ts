import { hasOwn, invokeArrayFns, isString, ShapeFlags } from "@vue/shared";
import { RendererOptions } from "@vue/runtime-dom";
import { createVNode, Fragment, isSameVNodeType, isVNode, Text, VNode } from "./vnode";
import { getSequence } from "./sequence";
import { reactive, ReactiveEffect } from "@vue/reactivity";
import { queueJob } from "./scheduler";
import { hasPropsChange, initProps, updateProps } from "./componentProps";
import { createComponentInstance, ComponentInternalInstance, setupComponent } from "./component";
import { LifecycleHooks } from "./apiLifeCycle";

/* 创建一个render（渲染器），允许你使用不同平台的api */
export interface Renderer {
  render: (vnode: VNode, container: any) => void;
}

// 创建一个renderer，返回一个render函数，将vnode与container交给render函数，render函数会创建真实dom并挂载到container上面
export function createRenderer(renderOptions: RendererOptions): Renderer {
  let {
    insert: hostInsert,
    remove: hostRemove,
    setElementText: hostSetElementText,
    setText: hostSetText,
    parentNode: hostParentNode,
    nextSibling: hostNextSibling,
    createElement: hostCreateElement,
    createText: hostCreateText,
    patchProps: hostPatchProps,
  } = renderOptions;

  const normalize = (children: any, i: any) => {
    const child = children[i];
    // 是字符串或数字创建文本节点
    if (isString(child) || !isNaN(child)) {
      children[i] = createVNode(Text, null, children[i]);
    }

    return children[i];
  };

  // 拿出children，逐个创建挂载元素
  const mountChildren = (children: any, container: any) => {
    // 将children一个一个挂载，有一个就patch一个，逐个append到dom上。
    for (let i = 0; i < children.length; i++) {
      // 将每个child格式化（转为vnode）, 区分不同类型的儿子,采用不同的渲染
      let child = normalize(children, i);

      // patch接受的是两个vnode,一个元素有很多children, 有文本,dom元素,组件等...  patch会进行比较,再进行挂载 diff算法等
      // 这里只是需要将元素挂载，第一个vnode为null
      patch(null, child, container);
    }
  };

  // 挂载元素
  // 这个方法只有在path()第一个参数为none时才会调用.
  const mountElement = (vnode: VNode, container: any, anchor = null) => {
    let { type, props, children, shapeFlag } = vnode;
    // 根据type创建出一个真实dom元素。将真实元素附在属于他的vnode上。即el是根据vnode创建出来的。
    let el = (vnode.el = hostCreateElement(type));
    // 有props挂载props
    if (props) {
      for (let key in props) {
        hostPatchProps(el, key, null, props[key]);
      }
    }
    // 孩子是文本
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      hostSetElementText(el, children);
    }
    // 孩子是一个数组, 直接挂载元素
    else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren(children, el);
    }

    hostInsert(el, container, anchor);
  };

  // 处理文本节点
  const processText = (n1: VNode | null, n2: VNode, container: any) => {
    if (n1 == null) {
      hostInsert((n2.el = hostCreateText(n2.children)), container);
    } else {
      // 只是文本变化,可以复用老节点
      const el = (n2.el = n1.el);
      // 两个文本不同
      if (n1.children !== n2.children) {
        hostSetText(el, n2.children);
      }
    }
  };

  // 比较补丁Props
  const patchProps = (oldProps: any, newProps: any, el: any) => {
    // 遍历新的. 旧的里面有就直接覆盖, 没有就创建
    for (let key in newProps) {
      hostPatchProps(el, key, oldProps[key], newProps[key]);
    }

    // 遍历旧的, 删除新的里面没有的
    for (let key in oldProps) {
      if (newProps[key] == null) {
        hostPatchProps(el, key, oldProps[key], null);
      }
    }
  };

  // 删除卸载所有的子元素,
  const unmountChildren = (children: any) => {
    for (let i = 0; i < children.length; i++) {
      unmount(children[i]);
    }
  };

  // 比较补丁两个数组的元素
  /* 儿子比较的情况
  新儿子  旧儿子
  1.
  文本    数组    删除老儿子，设置文本
  文本    文本    更新文本
  文本    空      更新文本

  2.
  数组    数组    diff算法
  数组    文本    清空文本，进行元素挂载
  数组    空      进行元素挂载

  3.
  空      数组    删除所有儿子
  空      文本    清空文本
  空      空      无需操作
   */
  const patchKeyedChildren = (c1: string | any[], c2: string | any[], el: any) => {
    // debugger;
    let i = 0;
    let e1 = c1.length - 1;
    let e2 = c2.length - 1;

    // 任何一边走完了
    // 判断出是否是sync from start。 前面相同，往后添加修改元素。
    // sync from start
    while (i <= e1 && i <= e2) {
      // 从头取出两个vnode
      const n1 = c1[i];
      // const n2 = c2[i];
      // 有可能Fragment的children是原生数据类型如Number, String等.我们的patch是必须传入vnode的. 将新的Fragment的children全部变为vnode. 具体实例在 packages\runtime-dom\html\10-setup函数实现.html. 可覆盖这里的代码
      const n2 = normalize(c2, i);

      // 两个元素相同比较他们的儿子
      if (isSameVNodeType(n1, n2)) {
        patch(n1, n2, el);
      }
      // 从头开始找 找到不同就跳出while
      else {
        break;
      }
      i++;
      // 这个while得到的是 i。i是两个数组（从头）开始不同的位置
    }

    // sync from end
    while (i <= e1 && i <= e2) {
      // 从尾开始取出vnode
      const n1 = c1[e1];
      const n2 = c2[e2];
      if (isSameVNodeType(n1, n2)) {
        patch(n1, n2, el);
      }
      // 找到不同就跳出while
      else {
        break;
      }
      e1--;
      e2--;
      // 这个while得到的是 从各自的尾部开始找到两个数组不同的地方
    }
    /* ------------------------------------优化&处理特殊情况 start------------------------------------ */
    // 头部挂载 还是 尾部挂载
    // common sequence + mount
    /* 
      a b c
      a b c d e
      经过第1个while后：i = 3
      经过第2个while后：e1 = 3, e2 = 4
      此时 i > e1, 说明可能有新增。i 至 e2 是新增的元素，拿到 c2[3-4] appendChild到c2
      
      a b c
      d e a b c
      经过第1个while后：i = 0
      经过第2个while后：e1 = -1, e2 = 1
      此时 i > e1, 说明可能有新增。i 至 e2 是新增的元素，拿到 c2[0-1] insertBefore到c2

      a b c
      d e f a b c
      经过第1个while后：i = 0
      经过第2个while后：e1 = -1, e2 = 2
      此时 i > e1, 说明可能有新增。i 至 e2 是新增的元素，拿到 c2[0-2] insertBefore到c2
       */
    // i 走出了c1的有效长度，也就是有可能e2比e1长，说明可能有新增
    if (i > e1) {
      // i <= e2 说明c2[i]有元素，代表确实有新增
      if (i <= e2) {
        // 将新增的元素逐个拼接/插入到后面
        while (i <= e2) {
          // 查看e2是否有下一个元素 ? 如果有说明是往数组的头部插入数据 : 没有说明是往尾部append内容.
          // anchor插入的参照物
          const nextPos = e2 + 1;
          const anchor = nextPos < c2.length ? c2[nextPos].el : null;
          patch(null, c2[i], el, anchor);
          i++;
        }
      }
    }
    // 头部删除 还是 尾部的删除
    // common sequence + mount
    /* 
      a b c d e
      a b c
      经过第1个while后：i = 3
      经过第2个while后：e1 = 4, e2 = 2
      此时 i > e2, 说明可能有删除。i 至 e1 是需要删除的元素，拿到 c1[3-4] 删除元素

      a b c d e
      c d e
      经过第1个while后：i = 0
      经过第2个while后：e1 = 1, e2 = -1
      此时 i > e2, 说明可能有删除。i 至 e1 是需要删除的元素，拿到 c1[0-1] 删除元素
     */
    // i比e2大 说明走出了e2的有效长度，也就是有可能e2比e1短
    else if (i > e2) {
      // i <= e1 说明c1[i]没有元素，代表需要删除
      while (i <= e1) {
        unmount(c1[i]);
        i++;
      }
    }

    /* 
      
     */

    /* ------------------------------------优化&处理特殊情况 end------------------------------------ */

    /* 乱序对比
      a b c d e j f g
      a b e c d h f g
      经过第1个while后：i = 2
      经过第2个while后：e1 = 5, e2 = 5
       i > e1, 说明可能有新增, 无。
       i > e2, 说明可能有删除， 无。
       s1 = 2
       s2 = 2
       toBePatched == 4。有四个元素需要patch
       keyToNewIndexMap = { 'e' => 2, 'c' => 3, 'd' => 4, 'h' => 5 }. 新数组的不同部分的key在新数组中的各自index
       newIndexToOldIndexMap = [5, 3, 4, 0] . 新元素在旧数组中的位置, 0代表在旧数组中没有这个key。


      1.遍历新数组的不同部分，形成一个key与index的映射表。得到keyToNewIndexMap。
      2.遍历旧数组的不同部分，用旧数组元素的key去keyToNewIndexMap找相同的key，得到的是老key在新数组中的index。
      找不到代表这个元素在新数组中不存在，将这个元素卸载; 找到则将两个元素patch，再将位置记录, 两个相同key的元素分别在两个数组中的位置, 形成newIndexToOldIndexMap。index: 新数组(不同部分的)元素的index；value: 在旧数组中的位置。 
      3.遍历新数组的不同部分，判断新元素在旧数组中是否有位置（key相同），采用从后往前插入的方式进行插入，有的话插入，没有的话创建插入。
     */
    let s1 = i;
    let s2 = i;
    // 新数组不同部分的key与index的映射表
    const keyToNewIndexMap = new Map();
    // 新数组不同部分key与index的映射表。掐头去尾后，拿出新数组中间的不同的部分，形成一个key与index的映射表 keyToNewIndexMap。
    for (let i = s2; i <= e2; i++) {
      keyToNewIndexMap.set(c2[i].key, i);
    }

    // 新数组相对旧数组不同的个数
    const toBePatched = e2 - s2 + 1; // 有四个元素需要patch
    // 两个相同key的元素分别在两个数组中的位置。index:（不同部分）新数组，value:老数组。 index：新数组不同部分开始算的index。 value：在旧数组的位置，0代表在旧数组中没有这个key，也代表没有patch过
    const newIndexToOldIndexMap = new Array(toBePatched).fill(0);

    // 循环掐头去尾后的老数组不同的部分
    // 有key相同的元素进行patch，没有相同key的元素直接将这个元素从老数组卸载
    for (let i = s1; i <= e1; i++) {
      const oldChild = c1[i];
      // 在新数组中找到与老数组相同key的元素。拿到对应的index。旧元素在新数组中的位置
      let newIndex = keyToNewIndexMap.get(oldChild.key);
      // 如果有，那么就将这个元素patch（更新，mount）
      if (newIndex) {
        // 将新数组与老数组相同的节点的位置进行对应。i + 1是为了避免index为0的情况
        // newIndex - s2 在新数组(不同部分)的index，i 在旧数组的index + 1。
        newIndexToOldIndexMap[newIndex - s2] = i + 1;
        patch(oldChild, c2[newIndex], el);
      } else {
        // 如果新数组中没有与旧数组相同key的元素, 则将这个元素卸载
        unmount(oldChild);
      }
    }

    // 获取最长递增子序列
    let increment = getSequence(newIndexToOldIndexMap);
    // newIndexToOldIndexMap [5, 3, 4, 0]
    // increment [1, 2]
    let j = increment.length - 1;

    // 循环新数组，移动位置，从后面开始处理。将新数组插入到旧数组中
    for (let i = toBePatched - 1; i >= 0; i--) {
      // 拿到在这个元素在c2的真实index
      let index = i + s2;
      // 当前元素
      let current = c2[index];
      // 还是查看这个元素是否有后面的元素，用后面一个元素来作为标记进行插入。
      let anchor = index + 1 < c2.length ? c2[index + 1].el : null;
      // newIndexToOldIndexMap[i] = 0, 说明这个元素是新增的，在旧数组中找不到这个key相同的元素。
      if (newIndexToOldIndexMap[i] === 0) {
        patch(null, current, el, anchor);
      }
      // 不是0，说明已经patch过（比较过props与children），插入到对应位置即可
      else {
        // 利用最长子序列进行优化
        if (i !== increment[j]) {
          hostInsert(current.el, el, anchor);
        } else {
          // 执行到子序列的元素时，不用插入。即跳过。
          j--;
        }
      }
    }
  };

  const patchChildren = (n1: VNode, n2: VNode, el: any) => {
    let oldChildren = n1 && n1.children;
    let newChildren = n2 && n2.children;
    let oldShapeFlag = n1.shapeFlag;
    let newShapeFlag = n2.shapeFlag;

    // 新儿子为空在 render 里面处理过
    // 旧儿子为空在 processElement 里面处理过

    // 1.新儿子是文本
    if (newShapeFlag & ShapeFlags.TEXT_CHILDREN) {
      // 1.1 旧儿子是数组
      if (oldShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        // 循环删除卸载所有子节点
        unmountChildren(oldChildren);
      }
      // 1.2 旧儿子是文本
      // 两个文本不同的时候替换旧文本
      if (oldChildren !== newChildren) {
        hostSetElementText(el, newChildren);
      }
    }
    // 2.新儿子是数组
    else {
      // 2.1 旧儿子也是数组
      if (oldShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        // diff算法. path(Fragment必走这个方法.
        patchKeyedChildren(oldChildren, newChildren, el);
      }
      // 2.2 旧儿子是文本
      else {
        // 将文本清空
        hostSetElementText(el, "");
        // 挂载元素
        mountChildren(newChildren, el);
      }
    }
  };

  // 比较补丁两个元素
  const patchElement = (n1: VNode, n2: VNode) => {
    // type相同复用元素
    let el = (n2.el = n1.el);
    let oldProps = n1.props || {};
    let newProps = n2.props || {};

    // 先patchProps
    patchProps(oldProps, newProps, el);
    // 再patchChildren
    patchChildren(n1, n2, el);
  };

  // 处理元素节点
  const processElement = (n1: VNode | null, n2: VNode, container: any, anchor = null) => {
    // 初次渲染
    // n1是旧节点，没有n1就代表是第一次渲染, 直接挂载就完了
    if (n1 == null) {
      // 元素渲染, 只是渲染
      mountElement(n2, container, anchor);
    }
    // 更新流程
    else {
      // 比对元素
      patchElement(n1, n2);
    }
  };

  const processFragment = (n1: VNode | null, n2: VNode, container: any) => {
    if (n1 == null) {
      mountChildren(n2.children, container);
    } else {
      patchChildren(n1, n2, container);
    }
  };

  const mountComponent = (vnode: VNode, container: any, anchor: null) => {
    // 大致逻辑就是将VueComponent的date变成reactive，将render变成ReactiveEffect

    // 1). 根据vnode，创建一个组件实例instance
    const instance = (vnode.component = createComponentInstance(vnode));

    // 2). 给实例赋值。
    // 收集生命周期函数，绑定各自生命周期函数的组件实例。
    setupComponent(instance);

    // 3). 挂载组件
    setupRenderEffect(instance, container, anchor);
  };

  const updateComponentPreRender = (instance: ComponentInternalInstance, next: VNode) => {
    instance.next = null; // next清空
    instance.vnode = next; // 更新组件最新的vnode

    // 更新组件的props
    updateProps(instance.props, next.props);
  };

  const setupRenderEffect = (instance: ComponentInternalInstance, container: any, anchor: any) => {
    const { render } = instance;

    const componentUpdateFn = () => {
      // 还没有挂载，需要初始化
      if (!instance.isMounted) {
        // 0.钩子函数beforeMounted
        const bm = instance[LifecycleHooks.BEFORE_MOUNT];
        if (bm) {
          invokeArrayFns(bm as any);
        }

        // 1。拿到vnode
        // 执行render函数得到的是vnode。得到的是组件的子元素。传入this
        const subTree = render.call(instance.proxy);

        // 2。将vnode挂载到dom上
        // 挂载子元素
        patch(null, subTree, container, anchor);
        // 放在组件的实例上，这个组件的子元素
        instance.subTree = subTree;
        instance.isMounted = true;

        // 声明周期mounted
        const m = instance[LifecycleHooks.MOUNTED];
        if (m) {
          invokeArrayFns(m as any);
        }
      }
      // 组件内部更新
      else {
        // 0.声明周期函数beforeUpdate
        const bu = instance[LifecycleHooks.BEFORE_UPDATE];
        if (bu) {
          invokeArrayFns(bu as any);
        }

        // 有next代表这个组件的props有更新。父亲传给自己的props有变化。要重新更新属于我这个组件的元素。
        // 没有next代表没有经过updateComponent函数。仅仅是被响应式触发。
        // next会在updateComponent内被赋值，在updateComponentPreRender中被清除。
        let { next } = instance;
        if (next) {
          // processComponent -> updateComponent -> instance.update()到达本函数
          // 更新前 拿到父亲最新传过来的props进行更新
          // 这里有一个细节：
          // 正常：在updateProps函数中会修改组件的props，然后会触发set，执行组件的render()函数
          // 在进来这个函数之前, 即在updateComponent中会调用instance.update()进入这个函数. 执行update()就是执行ReactiveEffect的run函数,run函数会清除依赖这个effect的函数,也就将组件的render函数清除了.
          // 这里updateComponentPreRender -> updateProps 还会触发依赖,可是依赖已经清除了, 所有这个props更新不会再执行这个ReactiveEffect.
          // 但是数值已经被修改了,再次执行组件的render函数会获得新的vnode与重新收集依赖.
          updateComponentPreRender(instance, next);
        }

        // 再次执行render得到新的vnode， subTree就是组件的内容
        const subTree = render.call(instance.proxy);
        // 对比patch两次的内容，会重新挂载
        patch(instance.subTree, subTree, container, anchor);
        // 储存起来
        instance.subTree = subTree;

        // 生命周期函数updated
        const u = instance[LifecycleHooks.UPDATED];
        if (u) {
          invokeArrayFns(u as any);
        }
      }
    };
    // 为了区分是初次挂载组件，还是更新组件内容。将componentUpdateFn作为ReactiveEffect第一个参数，本质是执行组件的render函数，相当于给effect函数传入的函数，
    // 传入scheduler实现组件的异步更新。避免每有一个数据变化就执行一次run
    const effect = new ReactiveEffect(componentUpdateFn, () => queueJob(instance.update));

    // 将组件强制更新的逻辑保存到了组件的实例上，后续需要强制更新时使用。让组件强制渲染。
    let update = (instance.update = effect.run.bind(effect));

    // 默认执行一次，mounted，将组件挂载
    update();
  };

  const shouldUpdateComponent = (n1: VNode, n2: VNode) => {
    // 改变props就会触发组件更新
    // 这里是将props解构出来了. children是插槽.
    const { props: prevProps, children: prevChildren } = n1;
    const { props: nextProps, children: nextChildren } = n2;

    // 相等没变化，不用更新组件
    if (prevProps === nextProps) return false;
    // 两个对象不相等并且任何一方不为空
    if (prevChildren || nextChildren) return true;
    return hasPropsChange(prevProps, nextProps);
  };

  const updateComponent = (n1: VNode, n2: VNode) => {
    // 这里直接将component替换，换成新的instance. 有利用引用替换
    const instance = (n2.component = n1.component);

    // 更新组件
    // 比较新旧vnode的props，即查看父亲是否给这个组件传递了新的props
    if (shouldUpdateComponent(n1, n2)) {
      // 赋值将新Vnode赋值给next, 在instance.update会使用到instance.next.
      instance!.next = n2;
      instance?.update();
    }
  };

  const processComponent = (n1: VNode | null, n2: VNode, container: any, anchor: null) => {
    if (n1 == null) {
      mountComponent(n2, container, anchor);
    } else {
      // 组件更新，靠的是props.
      updateComponent(n1, n2);
    }
  };

  // 传入旧新节点进行比较，
  const patch = (n1: VNode | null, n2: VNode, container: any, anchor = null) => {
    // 相等直接返回
    if (n1 == n2) return;

    // 比较两个元素
    // 两个vnode的Type都不同，直接删除替换原来的元素. type就是tagName/VueComponent
    if (n1 && !isSameVNodeType(n1, n2)) {
      // 卸载元素
      unmount(n1);
      // 清空vnode
      n1 = null;
    }

    // 准备创建新元素
    const { type, shapeFlag } = n2;
    // 区分不同的类型，处理不同的元素
    switch (type) {
      // 创建文本节点
      case Text:
        processText(n1, n2, container);
        break;
      case Fragment:
        processFragment(n1, n2, container);
        break;
      default:
        // 处理dom元素节点
        if (shapeFlag & ShapeFlags.ELEMENT) {
          processElement(n1, n2, container, anchor);
        }
        // 处理组件
        else if (shapeFlag & ShapeFlags.COMPONENT) {
          processComponent(n1, n2, container, anchor);
        }
    }
  };

  // 卸载元素, 传入的是vnode
  const unmount = (vnode: VNode) => {
    hostRemove(vnode.el);
  };

  // 传入vnode与container，渲染出真实dom, 挂载到container上
  const render = (vnode: VNode, container: any) => {
    // 新节点为空，代表要卸载，直接卸载
    if (vnode == null) {
      if (container._vnode) {
        unmount(container._vnode);
      }
    } else {
      // 这里既有初始化的逻辑, 又有更新的逻辑
      // 比较新旧vnode
      // 先传旧vnode 再传新vnode

      patch(container._vnode || null, vnode, container);
    }
    // 将这个元素的vnode储存在这个元素上
    // vnode.el 属于元素的vnode也会储存自己对应的元素
    container._vnode = vnode;
  };

  // 需要返回一个render来接受需要渲染的元素
  return { render };
}
