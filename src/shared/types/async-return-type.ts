type Unpack<T> = T extends PromiseLike<infer U>
  ? U
  : T extends (...args: unknown[]) => PromiseLike<infer V>
  ? V
  : T;

/**
 * Extends ReturnType https://www.typescriptlang.org/docs/handbook/utility-types.html?#returntypetype
 * To return the return type inside a Promise
 */
export type AsyncReturnType<T extends (...args: unknown[]) => unknown> = Unpack<
  ReturnType<T>
>;
