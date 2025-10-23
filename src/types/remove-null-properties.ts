export type RemoveNullProperties<T> = {
  [K in keyof T as null extends T[K] ? never : K]: T[K];
};
