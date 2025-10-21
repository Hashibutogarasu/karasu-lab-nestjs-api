import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { DataBaseService } from '../../data-base.service';

@Injectable()
export class GmocoinService {
  private prisma: PrismaClient;

  constructor(private readonly databaseService: DataBaseService) {
    this.prisma = this.databaseService.prisma();
  }

  /**
   * GMOコイン - ステータスを保存
   */
  async saveGmoCoinStatus(payload: {
    status: number;
    data: any;
    responsetime: string;
  }) {
    return this.prisma.gmoCoinStatus.create({
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
  async saveGmoCoinTicker(payload: {
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
    return this.prisma.gmoCoinTicker.create({
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
  async getLatestGmoCoinTicker() {
    return this.prisma.gmoCoinTicker.findFirst({
      orderBy: { responsetime: 'desc' },
      include: { data: true },
    });
  }

  /**
   * GMOコイン - 複数のティッカーキャッシュを取得
   * Returns the most recent parent records including their child items ordered by responsetime desc
   * @param limit optional number of parent records to return (default 10)
   */
  async getGmoCoinTickers(limit: number = 10) {
    return this.prisma.gmoCoinTicker.findMany({
      orderBy: { responsetime: 'desc' },
      take: limit,
      include: { data: true },
    });
  }

  /**
   * GMOコイン - 最新のステータスキャッシュを取得
   */
  async getLatestGmoCoinStatus() {
    return this.prisma.gmoCoinStatus.findFirst({
      orderBy: { responsetime: 'desc' },
    });
  }

  /**
   * GMOコイン - 最新のKLineキャッシュを取得
   */
  async getLatestGmoCoinKline() {
    return this.prisma.gmoCoinKline.findFirst({
      orderBy: { responsetime: 'desc' },
      include: { data: true },
    });
  }

  /**
   * GMOコイン - 最新のルールキャッシュを取得
   */
  async getLatestGmoCoinRules() {
    return this.prisma.gmoCoinRules.findFirst({
      orderBy: { responsetime: 'desc' },
      include: { data: true },
    });
  }

  /**
   * GMOコイン - KLine（親 + items）を保存
   */
  async saveGmoCoinKline(payload: {
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
    return this.prisma.gmoCoinKline.create({
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
  async saveGmoCoinRules(payload: {
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
    return this.prisma.gmoCoinRules.create({
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
}
