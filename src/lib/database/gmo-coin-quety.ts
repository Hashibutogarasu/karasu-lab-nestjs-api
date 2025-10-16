import prisma from './query';

/**
 * GMOコイン - ステータスを保存
 */
export async function saveGmoCoinStatus(payload: {
  status: number;
  data: any;
  responsetime: string;
}) {
  return prisma.gmoCoinStatus.create({
    data: {
      statusCode: payload.status,
      data: payload.data,
      responsetime: new Date(payload.responsetime),
    },
  });
}

/**
 * GMOコイン - ティッカー（親 + items）を保存
 */
export async function saveGmoCoinTicker(payload: {
  status: number;
  data: Array<{
    symbol: string;
    ask: string;
    bid: string;
    timestamp: string;
    status: string;
  }>;
  responsetime: string;
}) {
  return prisma.gmoCoinTicker.create({
    data: {
      statusCode: payload.status,
      responsetime: new Date(payload.responsetime),
      data: {
        create: payload.data.map((item) => ({
          symbol: item.symbol,
          ask: item.ask,
          bid: item.bid,
          timestamp: new Date(item.timestamp),
          status: item.status,
        })),
      },
    },
    include: { data: true },
  });
}

/**
 * GMOコイン - 最新のティッカーキャッシュを取得
 * Returns the most recent parent record including its child items ordered by responsetime desc
 */
export async function getLatestGmoCoinTicker() {
  return prisma.gmoCoinTicker.findFirst({
    orderBy: { responsetime: 'desc' },
    include: { data: true },
  });
}

/**
 * GMOコイン - 複数のティッカーキャッシュを取得
 * Returns the most recent parent records including their child items ordered by responsetime desc
 * @param limit optional number of parent records to return (default 10)
 */
export async function getGmoCoinTickers(limit: number = 10) {
  return prisma.gmoCoinTicker.findMany({
    orderBy: { responsetime: 'desc' },
    take: limit,
    include: { data: true },
  });
}

/**
 * GMOコイン - 最新のステータスキャッシュを取得
 */
export async function getLatestGmoCoinStatus() {
  return prisma.gmoCoinStatus.findFirst({
    orderBy: { responsetime: 'desc' },
  });
}

/**
 * GMOコイン - 最新のKLineキャッシュを取得
 */
export async function getLatestGmoCoinKline() {
  return prisma.gmoCoinKline.findFirst({
    orderBy: { responsetime: 'desc' },
    include: { data: true },
  });
}

/**
 * GMOコイン - 最新のルールキャッシュを取得
 */
export async function getLatestGmoCoinRules() {
  return prisma.gmoCoinRules.findFirst({
    orderBy: { responsetime: 'desc' },
    include: { data: true },
  });
}

/**
 * GMOコイン - KLine（親 + items）を保存
 */
export async function saveGmoCoinKline(payload: {
  status: number;
  data: Array<{
    openTime: string;
    open: string;
    high: string;
    low: string;
    close: string;
  }>;
  responsetime: string;
}) {
  return prisma.gmoCoinKline.create({
    data: {
      statusCode: payload.status,
      responsetime: new Date(payload.responsetime),
      data: {
        create: payload.data.map((item) => ({
          openTime: new Date(item.openTime),
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close,
        })),
      },
    },
    include: { data: true },
  });
}

/**
 * GMOコイン - 取引ルール（親 + items）を保存
 */
export async function saveGmoCoinRules(payload: {
  status: number;
  data: Array<{
    symbol: string;
    tickSize: string;
    minOpenOrderSize: string;
    maxOrderSize: string;
    sizeStep: string;
  }>;
  responsetime: string;
}) {
  return prisma.gmoCoinRules.create({
    data: {
      statusCode: payload.status,
      responsetime: new Date(payload.responsetime),
      data: {
        create: payload.data.map((item) => ({
          symbol: item.symbol,
          tickSize: item.tickSize,
          minOpenOrderSize: item.minOpenOrderSize,
          maxOrderSize: item.maxOrderSize,
          sizeStep: item.sizeStep,
        })),
      },
    },
    include: { data: true },
  });
}
