-- CreateTable
CREATE TABLE "gmo_coin_statuses" (
    "id" TEXT NOT NULL,
    "status" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "responsetime" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gmo_coin_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gmo_coin_ticker_items" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "ask" TEXT NOT NULL,
    "bid" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "ticker_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gmo_coin_ticker_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gmo_coin_tickers" (
    "id" TEXT NOT NULL,
    "status" INTEGER NOT NULL,
    "responsetime" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gmo_coin_tickers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gmo_coin_kline_items" (
    "id" TEXT NOT NULL,
    "openTime" TIMESTAMP(3) NOT NULL,
    "open" TEXT NOT NULL,
    "high" TEXT NOT NULL,
    "low" TEXT NOT NULL,
    "close" TEXT NOT NULL,
    "kline_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gmo_coin_kline_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gmo_coin_klines" (
    "id" TEXT NOT NULL,
    "status" INTEGER NOT NULL,
    "responsetime" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gmo_coin_klines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gmo_coin_symbol_rules" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "tickSize" TEXT NOT NULL,
    "minOpenOrderSize" TEXT NOT NULL,
    "maxOrderSize" TEXT NOT NULL,
    "sizeStep" TEXT NOT NULL,
    "rules_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gmo_coin_symbol_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gmo_coin_rules" (
    "id" TEXT NOT NULL,
    "status" INTEGER NOT NULL,
    "responsetime" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gmo_coin_rules_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "gmo_coin_ticker_items" ADD CONSTRAINT "gmo_coin_ticker_items_ticker_id_fkey" FOREIGN KEY ("ticker_id") REFERENCES "gmo_coin_tickers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gmo_coin_kline_items" ADD CONSTRAINT "gmo_coin_kline_items_kline_id_fkey" FOREIGN KEY ("kline_id") REFERENCES "gmo_coin_klines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gmo_coin_symbol_rules" ADD CONSTRAINT "gmo_coin_symbol_rules_rules_id_fkey" FOREIGN KEY ("rules_id") REFERENCES "gmo_coin_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
