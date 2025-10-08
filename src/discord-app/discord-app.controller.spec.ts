import { Test, TestingModule } from '@nestjs/testing';
import { DiscordAppController } from './discord-app.controller';
import { DiscordAppService } from './discord-app.service';

describe('DiscordAppController', () => {
  let controller: DiscordAppController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DiscordAppController],
      providers: [DiscordAppService],
    }).compile();

    controller = module.get<DiscordAppController>(DiscordAppController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
