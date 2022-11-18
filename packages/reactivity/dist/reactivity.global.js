"use strict";
var VueReactivity = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // packages/reactivity/src/index.ts
  var src_exports = {};
  __export(src_exports, {
    ReactiveEffect: () => ReactiveEffect,
    computed: () => computed,
    effect: () => effect,
    isReactive: () => isReactive,
    isReadonly: () => isReadonly,
    isShallow: () => isShallow,
    markRaw: () => markRaw,
    proxyRefs: () => proxyRefs,
    reactive: () => reactive,
    readonly: () => readonly,
    ref: () => ref,
    shallowReactive: () => shallowReactive,
    toRaw: () => toRaw,
    toRefs: () => toRefs,
    watch: () => watch
  });

  // packages/shared/src/makeMap.ts
  function makeMap(str, expectsLowerCase) {
    const map = /* @__PURE__ */ Object.create(null);
    const list = str.split(",");
    for (let i = 0; i < list.length; i++) {
      map[list[i]] = true;
    }
    return expectsLowerCase ? (val) => !!map[val.toLocaleLowerCase()] : (val) => !!map[val];
  }

  // packages/shared/src/index.ts
  var isObject = (val) => {
    return val !== null && typeof val === "object";
  };
  var isString = (val) => typeof val === "string";
  var isSymbol = (val) => typeof val == "symbol";
  var isFunction = (val) => typeof val === "function";
  var isArray = Array.isArray;
  var def = (obj, key, value) => {
    Object.defineProperty(obj, key, {
      configurable: true,
      enumerable: false,
      value
    });
  };
  var objectToString = Object.prototype.toString;
  var toTypeString = (value) => objectToString.call(value);
  var toRawType = (value) => {
    return toTypeString(value).slice(8, -1);
  };
  var hasOwnProperty = Object.prototype.hasOwnProperty;
  var hasOwn = (val, key) => hasOwnProperty.call(val, key);
  var isIntegerKey = (key) => isString(key) && key !== "NaN" && key[0] !== "-" && "" + parseInt(key, 10) === key;
  var hasChange = (newVal, oldVal) => !Object.is(newVal, oldVal);
  var extend = Object.assign;

  // packages/reactivity/src/effect.ts
  var targetMap = /* @__PURE__ */ new WeakMap();
  var activeEffect = void 0;
  function cleanUpEffect(effect3) {
    const { deps } = effect3;
    for (let i = 0; i < deps.length; i++) {
      deps[i].delete(effect3);
    }
    effect3.deps.length = 0;
  }
  var ReactiveEffect = class {
    constructor(fn, scheduler) {
      this.active = true;
      this.parent = null;
      this.deps = [];
      this.fn = fn;
      this.scheduler = scheduler;
    }
    run() {
      if (!this.active)
        return this.fn();
      try {
        this.parent = activeEffect;
        activeEffect = this;
        cleanUpEffect(this);
        return this.fn();
      } finally {
        activeEffect = this.parent;
        this.parent = null;
      }
    }
    stop() {
      if (this.active) {
        this.active = false;
        cleanUpEffect(this);
      }
    }
  };
  function effect(fn, options) {
    const _effect = new ReactiveEffect(fn, options == null ? void 0 : options.scheduler);
    _effect.run();
    const runner = _effect.run.bind(_effect);
    runner.effect = _effect;
    return runner;
  }
  function track(target, type, key) {
    if (activeEffect) {
      let depsMap = targetMap.get(target);
      if (!depsMap) {
        depsMap = /* @__PURE__ */ new Map();
        targetMap.set(target, depsMap);
      }
      let dep = depsMap.get(key);
      if (!dep) {
        dep = /* @__PURE__ */ new Set();
        depsMap.set(key, dep);
      }
      trackEffects(dep);
    }
  }
  function trackEffects(dep) {
    if (!activeEffect)
      return;
    if (!dep.has(activeEffect)) {
      dep.add(activeEffect);
      activeEffect.deps.push(dep);
    }
  }
  function trigger(target, type, key, newValue, oldValue) {
    const depsMap = targetMap.get(target);
    if (!depsMap)
      return;
    let deps = [];
    if (key === "length" && isArray(target)) {
      depsMap.forEach((dep, key2) => {
        if (key2 === "length" || key2 >= newValue) {
          deps.push(dep);
        }
      });
    } else {
      deps.push(depsMap.get(key));
      if (type === "add" /* ADD */) {
        if (isArray(target) && isIntegerKey(key)) {
          deps.push(depsMap.get("length"));
        }
      }
    }
    const effects = [];
    for (const dep of deps) {
      if (dep) {
        effects.push(...dep);
      }
    }
    triggerEffects(effects);
  }
  function triggerEffects(effects) {
    effects = new Set(effects);
    effects.forEach((effect3) => {
      if (effect3 !== activeEffect) {
        effect3.scheduler ? effect3.scheduler() : effect3.run();
      }
    });
  }

  // packages/reactivity/src/ref.ts
  var RefImpl = class {
    constructor(rawValue) {
      this.rawValue = rawValue;
      this.__v_isRef = true;
      this.dep = /* @__PURE__ */ new Set();
      this._value = toReactive(rawValue);
    }
    get value() {
      trackEffects(this.dep);
      return this._value;
    }
    set value(newValue) {
      if (hasChange(newValue, this.rawValue)) {
        this._value = toReactive(newValue);
        this.rawValue = newValue;
        triggerEffects(this.dep);
      }
    }
  };
  function ref(value) {
    return new RefImpl(value);
  }
  var ObjectRefImpl = class {
    constructor(object, key) {
      this.object = object;
      this.key = key;
    }
    get value() {
      return this.object[this.key];
    }
    set value(newValue) {
      this.object[this.key] = newValue;
    }
  };
  function toRef(object, key) {
    return new ObjectRefImpl(object, key);
  }
  function toRefs(object) {
    const result = isArray(object) ? new Array(object.length) : {};
    for (let key in object) {
      result[key] = toRef(object, key);
    }
    return result;
  }
  function isRef(r) {
    return !!(r && r.__v_isRef === true);
  }
  function proxyRefs(object) {
    return new Proxy(object, {
      get(target, key, receiver) {
        let r = Reflect.get(target, key, receiver);
        return r.__v_isRef ? r.value : r;
      },
      set(target, key, value, receiver) {
        let oldValue = target[key];
        if (oldValue.__v_isRef) {
          oldValue.value = value;
          return true;
        } else {
          return Reflect.set(target, key, value, receiver);
        }
      }
    });
  }

  // packages/reactivity/src/baseHandler.ts
  var ITERATE = Symbol(true ? "iterate" : "");
  var MAP_KEY_ITERATE_KEY = Symbol(true ? "Map key iterate" : "");
  var isNonTrackableKeys = /* @__PURE__ */ makeMap(`__proto__,__v_isRef,__isVue`);
  var get = createGetter();
  var readonlyGet = createGetter(true);
  var shallowGet = createGetter(false, true);
  var builtInSymbols = new Set(
    Object.getOwnPropertyNames(Symbol).filter((key) => key !== "arguments" && key !== "caller").map((Key) => Symbol[Key]).filter(isSymbol)
  );
  var arrayInstrumentations = createArrayInstrumentations();
  function createArrayInstrumentations() {
    const instrumentations = {};
    ["includes", "indexof", "lastIndexOf"].forEach((key) => {
      instrumentations[key] = function(...args) {
        const arr = toRaw(this);
        for (let i = 0, l = this.length; i < l; i++) {
          track(arr, "get" /* GET */, i + "");
        }
        const res = arr[key](...args);
        if (res === -1 || res === false) {
          return arr[key](...args.map(toRaw));
        } else {
          return res;
        }
      };
    });
    return instrumentations;
  }
  function createGetter(isReadonly2 = false, isShallow2 = false) {
    return function get2(target, key, receiver) {
      if (key === "__v_isReactive" /* IS_REACTIVE */) {
        return !isReadonly2;
      } else if (key === "__v_isReadonly" /* IS_READONLY */) {
        return isReadonly2;
      } else if (key === "__V_isShallow" /* IS_SHALLOW */) {
        return isShallow2;
      } else if (key === "__v_raw" /* RAW */ && receiver === reactiveMap.get(target)) {
        return target;
      }
      const targetIsArray = isArray(target);
      if (!isReadonly2 && targetIsArray && hasOwn(arrayInstrumentations, key)) {
        return Reflect.get(arrayInstrumentations, key, receiver);
      }
      const res = Reflect.get(target, key, receiver);
      if (isSymbol(key) ? builtInSymbols.has(key) : isNonTrackableKeys(key)) {
        return res;
      }
      if (!isReadonly2) {
        track(target, "get" /* GET */, key);
      }
      if (isShallow2) {
        return res;
      }
      if (isRef(res)) {
        return targetIsArray && isIntegerKey(key) ? res : res.value;
      }
      if (isObject(res)) {
        return isReadonly2 ? readonly(res) : reactive(res);
      }
      return res;
    };
  }
  function deleteProperty(target, key) {
    const hadKey = hasOwn(target, key);
    const oldValue = target[key];
    const result = Reflect.deleteProperty(target, key);
    if (result && hadKey)
      trigger(target, "delete" /* DELETE */, key, void 0, oldValue);
    return result;
  }
  function has(target, key) {
    const result = Reflect.has(target, key);
    if (!isSymbol(key) || !builtInSymbols.has(key)) {
      track(target, "has" /* HAS */, key);
    }
    return result;
  }
  function ownKeys(target) {
    track(target, "iterate" /* ITERATE */, isArray(target) ? "length" : ITERATE);
    return Reflect.ownKeys(target);
  }
  var mutableHandlers = {
    get,
    set(target, key, value, receiver) {
      let oldValue = target[key];
      const hadKey = isArray(target) && isIntegerKey(key) ? Number(key) < target.length : hasOwn(target, key);
      let result = Reflect.set(target, key, value, receiver);
      if (target === toRaw(receiver)) {
        if (!hadKey) {
          trigger(target, "add" /* ADD */, key, value);
        } else if (hasChange(value, oldValue)) {
          trigger(target, "set" /* SET */, key, value, oldValue);
        }
      }
      return result;
    },
    deleteProperty,
    has,
    ownKeys
  };
  var readonlyHandlers = {
    get: readonlyGet,
    set(target, key) {
      console.warn(`Set operation on key "${String(key)}" failed: target is readonly.`, target);
      return true;
    },
    deleteProperty(target, key) {
      console.warn(`Delete operation on key "${String(key)}" failed: target is readonly.`, target);
      return true;
    }
  };
  var shallowReactiveHandlers = extend({}, mutableHandlers, {
    get: shallowGet
  });

  // packages/reactivity/src/reactive.ts
  function targetTypeMap(rawType) {
    switch (rawType) {
      case "Object":
      case "Array":
        return 1 /* COMMON */;
      case "Map":
      case "Set":
      case "WeakMap":
      case "WeakSet":
        return 2 /* COLLECTION */;
      default:
        return 0 /* INVALID */;
    }
  }
  function getTargetType(value) {
    return value["__v_skip" /* SKIP */] || !Object.isExtensible(value) ? 0 /* INVALID */ : targetTypeMap(toRawType(value));
  }
  var reactiveMap = /* @__PURE__ */ new WeakMap();
  function createReactiveObject(target, isReadonly2, baseHandlers) {
    if (!isObject(target))
      return;
    if (target["__v_raw" /* RAW */] && !(isReadonly2 && target["__v_isReactive" /* IS_REACTIVE */]))
      return target;
    let existingProxy = reactiveMap.get(target);
    if (existingProxy)
      return existingProxy;
    if (target["__v_isReactive" /* IS_REACTIVE */])
      return target;
    const targetType = getTargetType(target);
    if (targetType === 0 /* INVALID */)
      return target;
    const proxy = new Proxy(target, baseHandlers);
    reactiveMap.set(target, proxy);
    return proxy;
  }
  function isReactive(value) {
    return !!(value && value["__v_isReactive" /* IS_REACTIVE */]);
  }
  function isReadonly(value) {
    return !!(value && value["__v_isReadonly" /* IS_READONLY */]);
  }
  function isShallow(value) {
    return !!(value && value["__V_isShallow" /* IS_SHALLOW */]);
  }
  function reactive(target) {
    if (isReadonly(target))
      return target;
    return createReactiveObject(target, false, mutableHandlers);
  }
  function readonly(target) {
    return createReactiveObject(target, true, readonlyHandlers);
  }
  function shallowReactive(target) {
    return createReactiveObject(target, false, shallowReactiveHandlers);
  }
  var toReactive = (value) => isObject(value) ? reactive(value) : value;
  function toRaw(observed) {
    const raw = observed && observed["__v_raw" /* RAW */];
    return raw ? toRaw(raw) : observed;
  }
  function markRaw(value) {
    def(value, "__v_skip" /* SKIP */, true);
    return value;
  }

  // packages/reactivity/src/computed.ts
  var ComputedRefImpl = class {
    constructor(getter, setter) {
      this.getter = getter;
      this.setter = setter;
      this._dirty = true;
      this.dep = /* @__PURE__ */ new Set();
      this.effect = new ReactiveEffect(
        getter,
        () => {
          if (!this._dirty) {
            this._dirty = true;
            triggerEffects(this.dep);
          }
        }
      );
    }
    get value() {
      trackEffects(this.dep || (this.dep = /* @__PURE__ */ new Set()));
      if (this._dirty) {
        this._value = this.effect.run();
        this._dirty = false;
      }
      return this._value;
    }
    set value(newValue) {
      this.setter(newValue);
    }
  };
  function computed(getterOrOptions) {
    const onlyGetter = isFunction(getterOrOptions);
    let getter;
    let setter;
    if (onlyGetter) {
      getter = getterOrOptions;
      setter = () => {
        console.warn("no set");
      };
    } else {
      getter = getterOrOptions.get;
      setter = getterOrOptions.set;
    }
    return new ComputedRefImpl(getter, setter);
  }

  // packages/reactivity/src/watch.ts
  function traversal(value, set = /* @__PURE__ */ new Set()) {
    if (!isObject(value))
      return value;
    if (set.has(value))
      return value;
    set.add(value);
    for (let key in value) {
      traversal(value[key], set);
    }
    return value;
  }
  function watch(source, cb) {
    let getter;
    if (isReactive(source)) {
      traversal(source);
      getter = () => traversal(source);
    } else if (isFunction(source)) {
      getter = source;
    } else {
      return;
    }
    let oldValue;
    let cleanup;
    const onCleanup = (fn) => {
      cleanup = fn;
    };
    const job = () => {
      console.log(cleanup);
      if (cleanup)
        cleanup();
      const newValue = effect3.run();
      cb(newValue, oldValue, onCleanup);
      oldValue = newValue;
    };
    const effect3 = new ReactiveEffect(getter, job);
    oldValue = effect3.run();
  }
  return __toCommonJS(src_exports);
})();
//# sourceMappingURL=reactivity.global.js.map
