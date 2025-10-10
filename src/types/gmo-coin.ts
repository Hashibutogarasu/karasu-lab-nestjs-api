import { z } from 'zod';

// 外国為替FXステータス
export const GmoCoinStatusSchema = z.object({
  status: z.number(),
  data: z.object({
    status: z.enum(['OPEN', 'CLOSE', 'MAINTENANCE']),
  }),
  responsetime: z.string().datetime(),
});

export type GmoCoinStatus = z.infer<typeof GmoCoinStatusSchema>;

// 最新レート - 個別銘柄
export const GmoCoinTickerItemSchema = z.object({
  symbol: z.string(),
  ask: z.string(),
  bid: z.string(),
  timestamp: z.string().datetime(),
  status: z.enum(['OPEN', 'CLOSE', 'MAINTENANCE']),
});

export type GmoCoinTickerItem = z.infer<typeof GmoCoinTickerItemSchema>;

// 最新レート - レスポンス
export const GmoCoinTickerSchema = z.object({
  status: z.number(),
  data: z.array(GmoCoinTickerItemSchema),
  responsetime: z.string().datetime(),
});

export type GmoCoinTicker = z.infer<typeof GmoCoinTickerSchema>;

// KLine情報 - 個別データ
export const GmoCoinKlineItemSchema = z.object({
  openTime: z.string(),
  open: z.string(),
  high: z.string(),
  low: z.string(),
  close: z.string(),
});

export type GmoCoinKlineItem = z.infer<typeof GmoCoinKlineItemSchema>;

// KLine情報 - レスポンス
export const GmoCoinKlineSchema = z.object({
  status: z.number(),
  data: z.array(GmoCoinKlineItemSchema),
  responsetime: z.string().datetime(),
});

export type GmoCoinKline = z.infer<typeof GmoCoinKlineSchema>;

// 取引ルール - 個別銘柄 (Postmanのレスポンス例に基づく実際のフィールド名)
export const GmoCoinSymbolRuleSchema = z.object({
  symbol: z.string(),
  tickSize: z.string(),
  minOpenOrderSize: z.string(),
  maxOrderSize: z.string(),
  sizeStep: z.string(),
});

export type GmoCoinSymbolRule = z.infer<typeof GmoCoinSymbolRuleSchema>;

// 取引ルール - レスポンス
export const GmoCoinRulesSchema = z.object({
  status: z.number(),
  data: z.array(GmoCoinSymbolRuleSchema),
  responsetime: z.string().datetime(),
});

export type GmoCoinRules = z.infer<typeof GmoCoinRulesSchema>;
