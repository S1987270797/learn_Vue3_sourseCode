const def = (obj, key, value) => {
  Object.defineProperty(obj, key, {
    configurable: true,
    enumerable: false,
    value,
  });
};

const obj = {};
def(obj, "name", "red");

console.log(obj);
console.log(obj.name);
