type NonFunctionPropertyNames<T> = {
  [K in keyof T]-?: T[K] extends (...args: any[]) => any ? never : K;
}[keyof T];

export type OmitFunctions<T> = Pick<T, NonFunctionPropertyNames<T>>;
