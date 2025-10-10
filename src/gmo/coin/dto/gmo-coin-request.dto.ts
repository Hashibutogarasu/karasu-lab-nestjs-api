import { z } from 'zod';

// Runtime-friendly enums (so existing code using PriceType.ASK and Interval.ONE_MIN still works)
export const PriceType = {
  ASK: 'ASK',
  BID: 'BID',
} as const;
export type PriceType = (typeof PriceType)[keyof typeof PriceType];
export const PriceTypeSchema = z.enum([PriceType.ASK, PriceType.BID]);

export const Interval = {
  ONE_MIN: '1min',
  FIVE_MIN: '5min',
  FIFTEEN_MIN: '15min',
  THIRTY_MIN: '30min',
  ONE_HOUR: '1hour',
  FOUR_HOUR: '4hour',
  EIGHT_HOUR: '8hour',
  ONE_DAY: '1day',
  ONE_WEEK: '1week',
  ONE_MONTH: '1month',
} as const;
export type Interval = (typeof Interval)[keyof typeof Interval];
export const IntervalSchema = z.enum([
  Interval.ONE_MIN,
  Interval.FIVE_MIN,
  Interval.FIFTEEN_MIN,
  Interval.THIRTY_MIN,
  Interval.ONE_HOUR,
  Interval.FOUR_HOUR,
  Interval.EIGHT_HOUR,
  Interval.ONE_DAY,
  Interval.ONE_WEEK,
  Interval.ONE_MONTH,
]);

export const GetKlineSchema = z.object({
  symbol: z.string(),
  priceType: PriceTypeSchema,
  interval: IntervalSchema,
  date: z.string().regex(/^\d{8}$/, 'date must be in YYYYMMDD format'),
});

// Export both a runtime value (schema) and a TypeScript type with the same name.
// This lets decorated parameters still reference `GetKlineDto` (as a value) while
// providing the inferred type for static typing.
export const GetKlineDto = GetKlineSchema;
export type GetKlineDto = z.infer<typeof GetKlineSchema>;
