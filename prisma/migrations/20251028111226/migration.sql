/*
  Warnings:

  - You are about to drop the column `tokenHint` on the `JWTState` table. All the data in the column will be lost.
  - You are about to drop the `gmo_coin_kline_items` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `gmo_coin_klines` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `gmo_coin_rules` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `gmo_coin_statuses` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `gmo_coin_symbol_rules` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `gmo_coin_ticker_items` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `gmo_coin_tickers` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."gmo_coin_kline_items" DROP CONSTRAINT "gmo_coin_kline_items_kline_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."gmo_coin_symbol_rules" DROP CONSTRAINT "gmo_coin_symbol_rules_rules_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."gmo_coin_ticker_items" DROP CONSTRAINT "gmo_coin_ticker_items_ticker_id_fkey";

-- AlterTable
ALTER TABLE "JWTState" DROP COLUMN "tokenHint",
ADD COLUMN     "expires_at" TIMESTAMP(3);

-- DropTable
DROP TABLE "public"."gmo_coin_kline_items";

-- DropTable
DROP TABLE "public"."gmo_coin_klines";

-- DropTable
DROP TABLE "public"."gmo_coin_rules";

-- DropTable
DROP TABLE "public"."gmo_coin_statuses";

-- DropTable
DROP TABLE "public"."gmo_coin_symbol_rules";

-- DropTable
DROP TABLE "public"."gmo_coin_ticker_items";

-- DropTable
DROP TABLE "public"."gmo_coin_tickers";
