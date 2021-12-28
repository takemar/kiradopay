export type TypedEvent<T extends string> = Event & { type: T };

export type TypedEventConstructor = (
  Omit<typeof Event, "new">
  & {
    new<T extends string>(
      type: T,
      ...rest: ConstructorParameters<(typeof Event)> extends [any, ...infer U] ? U : []
    ): TypedEvent<T>;
  }
);

export interface TypedEventTarget<T extends string> extends EventTarget {

  addEventListener(
    type: T,
    ...rest: Parameters<EventTarget["addEventListener"]> extends [any, ...infer U] ? U : []
  ): ReturnType<EventTarget["addEventListener"]>;

  removeEventListener(
    type: T,
    ...rest: Parameters<EventTarget["removeEventListener"]> extends [any, ...infer U] ? U : []
  ): ReturnType<EventTarget["removeEventListener"]>;

  dispatchEvent(
    event: TypedEvent<T>,
    ...rest: Parameters<EventTarget["dispatchEvent"]> extends [any, ...infer U] ? U : []
  ): ReturnType<EventTarget["dispatchEvent"]>;
}
