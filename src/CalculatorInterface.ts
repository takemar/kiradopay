import type { Event, Item } from "@prisma/client";

export default interface CalculatorInterface {
  exec(numbers: Map<number, number>): number;
}

export interface CalculatorFactory {
  (params: { event: Event, items: Item[]}): CalculatorInterface;
}
