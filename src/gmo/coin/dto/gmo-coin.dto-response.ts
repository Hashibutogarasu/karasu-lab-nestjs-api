import z from 'zod';
import {
  GmoCoinStatus,
  GmoCoinTicker,
  GmoCoinKline,
  GmoCoinRules,
} from '../../../types/gmo-coin';
import { createZodDto } from 'nestjs-zod';

export const gmoCoinStatusSchema = z.object({
  status: z.number(),
  data: z.object({
    status: z.enum(['OPEN', 'CLOSE', 'MAINTENANCE']),
  }),
  responsetime: z.string(),
});

export class GmoCoinStatusResponseDto
  extends createZodDto(gmoCoinStatusSchema)
  implements GmoCoinStatus {}

export const gmoCoinTickerSchema = z.object({
  status: z.number(),
  data: z.array(
    z.object({
      symbol: z.string(),
      ask: z.string(),
      bid: z.string(),
      timestamp: z.string(),
      status: z.enum(['OPEN', 'CLOSE', 'MAINTENANCE']),
    }),
  ),
  responsetime: z.string(),
});

export class GmoCoinTickerResponseDto
  extends createZodDto(gmoCoinTickerSchema)
  implements GmoCoinTicker {}

export const gmoCoinKlineSchema = z.object({
  status: z.number(),
  data: z.array(
    z.object({
      openTime: z.string(),
      open: z.string(),
      high: z.string(),
      low: z.string(),
      close: z.string(),
    }),
  ),
  responsetime: z.string(),
});

export class GmoCoinKlineResponseDto
  extends createZodDto(gmoCoinKlineSchema)
  implements GmoCoinKline {}

export const gmoCoinRulesSchema = z.object({
  status: z.number(),
  data: z.array(
    z.object({
      symbol: z.string(),
      tickSize: z.string(),
      minOpenOrderSize: z.string(),
      maxOrderSize: z.string(),
      sizeStep: z.string(),
    }),
  ),
  responsetime: z.string(),
});

export class GmoCoinRulesResponseDto
  extends createZodDto(gmoCoinRulesSchema)
  implements GmoCoinRules {}
