import { DataBaseMiddleware } from './data-base.middleware';
import { AppConfigService } from '../app-config/app-config.service';
import { DataBaseService } from './data-base.service';
import { mock } from 'jest-mock-extended';

describe('DataBaseMiddleware', () => {
  it('should be defined', () => {
    const mockConfig = mock<AppConfigService>({
      get: jest
        .fn()
        .mockResolvedValue('postgresql://user:password@localhost:5432/dbname'),
    });
    const mockDb = mock<DataBaseService>({
      prisma: jest
        .fn()
        .mockReturnValue({ $connect: jest.fn().mockResolvedValue(undefined) }),
    });
    expect(new DataBaseMiddleware(mockDb, mockConfig)).toBeDefined();
  });
});
