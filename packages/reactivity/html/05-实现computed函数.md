# 实现computed
## 05.html代码
```html
<body>
  <div id="app"></div>
  <script>
    const { reactive, effect, computed } = VueReactivity
    const states = reactive({ firstName: 'red', lastName: 'Swift' })

    debugger
    const fullName = computed(() => {
      console.log('run');
      return states.firstName + ' ' + states.lastName;
    })
    effect(() => {
      app.innerHTML = fullName.value;
    })

    setTimeout(() => {
      console.log('editted');
      states.firstName = 'blue'
    }, 1000)

    // fullName.value = '123'
  </script>
</body>
```
## 将需要代理的对象经过reactiveApi
## 调用computed函数传入一个函数,返回fullName
## 执行computed函数
- 判断传给computed的是对象还是函数
  - 是对象分别出去getter与setter
  - 是函数将这个函数作为getter, setter设置一个报warnning的函数
- return new ComputedRefImpl(用户传给computed的函数, setter)
  - constructor里this.effect = new ReactiveEffect(用户传给computed的函数, () => { scheduler: 修改computed依赖的states将会触发trigger函数时执行scheduler函数 })
  - ```js
    // 将用户传给computed的函数(或传入的getter)作为effect的fn. 第二个参数是scheduler，修改时触发。
    // 实例computedRefImpl储存的effect.fn是在05.html传给computed的函数。传入属于computed的scheduler.
    this.effect = new ReactiveEffect(
      getter,
      // 进入scheduler就代表已经修改了依赖的值.
      () => {
        // 当前是干净时触发。脏了说明被改过。脏了还收集干嘛。
        if (!this._dirty) {
          // 我们改过之后就脏了, 这句必须在triggerEffects()前面.
          this._dirty = true;
          // 触发更新, 触发的是依赖我的effect.( 05.html的effect函数)
          triggerEffects(this.dep);
        }
      }
    );
    ```
## 执行effect函数
- const _effect = new ReactiveEffect(fn `() => {app.innerHTML = fullName.value;}`, options.scheduler `null`);
-  _effect.run(); 执行传入的fn. 依赖了fullName.
   -  进入computedRefImpl实例的get()
   -  trackEffects(this.dep); 将依赖我fullName的函数收集到computedRefImpl实例中. `() => {app.innerHTML = fullName.value;}`
   -  判断是否是脏的, 第一次进来默认是脏的, 需要执行一下computedRefImpl实例的effect.fn一次. `computed(() => {      return states.firstName + ' ' + states.lastName;})`. 执行会重新收集依赖.
## 一秒钟之后...
- `states.firstName = 'blue'`
- 进入mutableHandlers的set中, 触发trigger函数
  - 从targetMap中取出依赖`firstName`的reactiveEffect执行他的.run(). - 执行.fn是`() => {return states.firstName + ' ' + states.lastName;}`的reactiveEffect实例.
  - 这个reactiveEffect实例我们再new的时候有传入scheduler, 触发依赖时执行scheduler.
  - 
    ```js
    // 传给computedRefImpl实例的effect的scheduler
      () => {
        // 当前是干净时触发。脏了说明被改过。脏了还收集干嘛。
        if (!this._dirty) {
          // 我们改过之后就脏了, 这句必须在triggerEffects()前面.
          this._dirty = true;
          // 触发更新, 触发的是依赖我的effect.( 05.html的effect函数)
          triggerEffects(this.dep);
        }
      }
    ```
  - 判断这个computed是否是干净的, 是干净的才需要触发依赖, 执行依赖fullName的函数;执行computedRefImpl实例的effect.
  - 重新执行`() => {app.innerHTML = fullName.value;}`
  - 重新进入computedRefImpl实例的get()函数
  -  
    ```js
      get value() {
        trackEffects(this.dep || (this.dep = new Set()));
        if (this._dirty) {
          this._value = this.effect.run();
          this._dirty = false;
        }
        return this._value;
      }
    ``` 
  - 重新收集依赖( effect.run()时会将上次依赖这个函数的属性给全部清除 ).
  - 是脏的重新执行用户传给computed的函数. 执行完就是干净的了. 返回最新的value.