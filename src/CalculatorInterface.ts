import type { Event, Item } from "@prisma/client";

export default interface CalculatorInterface {
  /**
   * 
   * @param numbers itemIdをkey，数量をvalueとするMap
   * @returns 引数に対応する頒布価格
   */
  exec(numbers: Map<number, number>): number;
}

export interface CalculatorFactory {
  (params: { event: Event, items: Item[]}): CalculatorInterface;
}
