import { IsString, IsEnum, IsOptional, Matches } from 'class-validator';

export enum PriceType {
  ASK = 'ASK',
  BID = 'BID',
}

export enum Interval {
  ONE_MIN = '1min',
  FIVE_MIN = '5min',
  FIFTEEN_MIN = '15min',
  THIRTY_MIN = '30min',
  ONE_HOUR = '1hour',
  FOUR_HOUR = '4hour',
  EIGHT_HOUR = '8hour',
  ONE_DAY = '1day',
  ONE_WEEK = '1week',
  ONE_MONTH = '1month',
}

export class GetKlineDto {
  @IsString()
  symbol: string;

  @IsEnum(PriceType)
  priceType: PriceType;

  @IsEnum(Interval)
  interval: Interval;

  @IsString()
  @Matches(/^\d{8}$/, { message: 'date must be in YYYYMMDD format' })
  date: string;
}
