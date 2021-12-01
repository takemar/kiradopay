export default class PromiseProperty<V> implements PromiseLike<V> {

  promise: Promise<V>;
  resolutionFunc?: (value: V | PromiseLike<V>) => void;

  constructor() {
    this.promise = new Promise<V>(resolutionFunc => {
      this.resolutionFunc = resolutionFunc;
    });
  }

  then<T, U>(
    onFulfilled?: ((value: V) => T | PromiseLike<T>) | undefined | null,
    onRejected?: ((reason: any) => U | PromiseLike<U>) | undefined | null
  ): Promise<T | U> {
    return this.promise.then(onFulfilled, onRejected);
  }

  resolve(value: V | PromiseLike<V>): this {
    this.resolutionFunc!(value);
    return this;
  }
}
