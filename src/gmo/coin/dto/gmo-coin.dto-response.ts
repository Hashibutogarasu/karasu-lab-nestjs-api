import {
  GmoCoinStatus,
  GmoCoinTicker,
  GmoCoinKline,
  GmoCoinRules,
} from '../../../types/gmo-coin';

export class GmoCoinStatusResponseDto implements GmoCoinStatus {
  status: number;
  data: {
    status: 'OPEN' | 'CLOSE' | 'MAINTENANCE';
  };
  responsetime: string;
}

export class GmoCoinTickerResponseDto implements GmoCoinTicker {
  status: number;
  data: Array<{
    symbol: string;
    ask: string;
    bid: string;
    timestamp: string;
    status: 'OPEN' | 'CLOSE' | 'MAINTENANCE';
  }>;
  responsetime: string;
}

export class GmoCoinKlineResponseDto implements GmoCoinKline {
  status: number;
  data: Array<{
    openTime: string;
    open: string;
    high: string;
    low: string;
    close: string;
  }>;
  responsetime: string;
}

export class GmoCoinRulesResponseDto implements GmoCoinRules {
  status: number;
  data: Array<{
    symbol: string;
    tickSize: string;
    minOpenOrderSize: string;
    maxOrderSize: string;
    sizeStep: string;
  }>;
  responsetime: string;
}
