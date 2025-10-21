import { Test, TestingModule } from '@nestjs/testing';
import { WorkflowService } from './workflow.service';
import { mock } from 'jest-mock-extended';
import { UserService } from '../../../data-base/query/user/user.service';

describe('WorkflowService', () => {
  let service: WorkflowService;

  beforeEach(async () => {
    const mockUserService = mock<UserService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowService,
        { provide: UserService, useValue: mockUserService },
      ],
    }).compile();

    service = module.get<WorkflowService>(WorkflowService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
