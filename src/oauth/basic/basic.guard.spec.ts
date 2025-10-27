import { mock } from 'jest-mock-extended';
import { BasicOAuthGuard } from './basic.guard';
import { BasicAuthService } from './basic.service';

describe('BasicOAuthGuard', () => {
  it('should be defined', () => {
    const mockBasicService = mock<BasicAuthService>();

    expect(new BasicOAuthGuard(mockBasicService)).toBeDefined();
  });
});
