import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class DataBaseService {
  private _prisma: PrismaClient;

  constructor() {
    this._prisma = new PrismaClient();
  }

  prisma() {
    return this._prisma;
  }

  setPrisma(client: PrismaClient) {
    this._prisma = client;
  }
}
