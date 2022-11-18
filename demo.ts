interface Person {
  name: string;
  age: number;
}

type K = keyof Person; // type K = "name" | "age"

let var1: K = "age";
let var2: K = "name";
// let var3: K = "address"; // wrong!!!

/* ---------------------------------------------------------------------------------- */
type P2 = Person[keyof Person];
// Person[ 'name' | 'age']  即  Person[name] | Person[age]  得到  number | string . 可将鼠标悬停在P2查看
let var4: P2 = "abc";
let var5: P2 = 123;
// let var6: P2 = []; // wrong!!!

const obj = { name: "red", age: 20 };
type Key2 = typeof obj; // 将一个对象转化为一个接口
type Key3 = keyof Key2; // 将接口的key转为字面量类型联合类型

const obj2: Key2 = {
  name: "blue",
  age: 123,
};

const obj3: Key3 = "name";

console.log(typeof obj);

// let k: Key = "name";
// export {};
