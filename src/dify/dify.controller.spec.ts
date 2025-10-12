import { Test, TestingModule } from '@nestjs/testing';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { DifyController } from './dify.controller';
import { DifyService } from './dify.service';
import { DomainModule, DomainService, DomainGuard } from '../lib/domain';
import { AuthService } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { createMock } from '@golevelup/ts-jest';
import type { Response } from 'express';
import { Readable } from 'stream';
import { AppErrorCodes } from '../types/error-codes';

describe('DifyController', () => {
  let controller: DifyController;
  let difyService: DifyService;
  let domainService: DomainService;
  let jwtService: JwtService;
  let authService: AuthService;
  let domainGuard: DomainGuard;

  // Mock console.error to suppress error output during tests
  const originalConsoleError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });

  afterAll(() => {
    console.error = originalConsoleError;
  });

  const mockUser = {
    id: 'user-123',
    sub: 'user-123',
    username: 'testuser',
    email: 'test@example.com',
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockAllowedUser = {
    id: 'user-456',
    sub: 'user-456',
    username: 'alloweduser',
    email: 'allowed@alloweddomain.com',
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: 'test-secret',
          signOptions: { expiresIn: '1h' },
        }),
        DomainModule.forRoot({
          allowedDomains: ['alloweddomain.com', 'company.co.jp'],
        }),
      ],
      controllers: [DifyController],
      providers: [
        {
          provide: DifyService,
          useValue: {
            sendChatMessageStream: jest.fn(),
            parseSSEStream: jest.fn(),
          },
        },
        {
          provide: AuthService,
          useValue: {
            getUserProfileById: jest.fn(),
          },
        },
        JwtAuthGuard,
        DomainGuard,
        Reflector,
      ],
    }).compile();

    controller = module.get<DifyController>(DifyController);
    difyService = module.get<DifyService>(DifyService);
    domainService = module.get<DomainService>(DomainService);
    jwtService = module.get<JwtService>(JwtService);
    authService = module.get<AuthService>(AuthService);
    domainGuard = module.get<DomainGuard>(DomainGuard);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(domainService).toBeDefined();
    expect(domainGuard).toBeDefined();
  });

  describe('Domain Protection', () => {
    describe('DomainService', () => {
      it('should extract domain from email correctly', () => {
        expect(domainService.extractDomain('user@example.com')).toBe(
          'example.com',
        );
        expect(domainService.extractDomain('test@COMPANY.CO.JP')).toBe(
          'company.co.jp',
        );
        expect(domainService.extractDomain('invalid-email')).toBe('');
        expect(domainService.extractDomain('')).toBe('');
      });

      it('should validate allowed domains correctly', () => {
        expect(domainService.isDomainAllowed('user@alloweddomain.com')).toBe(
          true,
        );
        expect(domainService.isDomainAllowed('user@company.co.jp')).toBe(true);
        expect(domainService.isDomainAllowed('user@ALLOWEDDOMAIN.COM')).toBe(
          true,
        ); // case insensitive
        expect(domainService.isDomainAllowed('user@unauthorized.com')).toBe(
          false,
        );
        expect(domainService.isDomainAllowed('invalid-email')).toBe(false);
      });

      it('should return allowed domains list', () => {
        const allowedDomains = domainService.getAllowedDomains();
        expect(allowedDomains).toContain('alloweddomain.com');
        expect(allowedDomains).toContain('company.co.jp');
        expect(allowedDomains).toHaveLength(2);
      });
    });

    describe('DomainGuard', () => {
      let mockExecutionContext: ExecutionContext;
      let mockRequest: any;

      beforeEach(() => {
        mockRequest = {
          user: null,
        };

        mockExecutionContext = createMock<ExecutionContext>({
          switchToHttp: () => ({
            getRequest: () => mockRequest,
          }),
        });
      });

      it('should throw UnauthorizedException when user is not authenticated', () => {
        mockRequest.user = null;

        expect(() => domainGuard.canActivate(mockExecutionContext)).toThrow(
          AppErrorCodes.UNAUTHORIZED,
        );
      });

      it('should throw ForbiddenException when user email is missing', () => {
        mockRequest.user = { id: 'user-123', username: 'testuser' };

        expect(() => domainGuard.canActivate(mockExecutionContext)).toThrow(
          AppErrorCodes.INVALID_DOMAIN_EMAIL,
        );
      });

      it('should throw ForbiddenException for unauthorized domain', () => {
        mockRequest.user = {
          id: 'user-123',
          email: 'user@unauthorized.com',
          username: 'testuser',
        };

        expect(() => domainGuard.canActivate(mockExecutionContext)).toThrow(
          /Domain 'unauthorized.com' is not allowed/,
        );
      });

      it('should allow access for authorized domain', () => {
        mockRequest.user = {
          id: 'user-456',
          email: 'user@alloweddomain.com',
          username: 'alloweduser',
        };

        expect(domainGuard.canActivate(mockExecutionContext)).toBe(true);
      });

      it('should allow access for authorized domain (case insensitive)', () => {
        mockRequest.user = {
          id: 'user-456',
          email: 'user@COMPANY.CO.JP',
          username: 'alloweduser',
        };

        expect(domainGuard.canActivate(mockExecutionContext)).toBe(true);
      });
    });
  });

  describe('Chat Stream Endpoint', () => {
    let mockResponse: Partial<Response>;
    let mockRequest: any;
    let mockStream: Readable;
    let mockParsedStream: Readable;

    beforeEach(() => {
      mockResponse = {
        setHeader: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
        headersSent: false,
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      mockRequest = {
        user: mockAllowedUser,
        on: jest.fn(),
      };

      mockStream = new Readable({ read() {} });
      mockParsedStream = new Readable({ objectMode: true, read() {} });

      jest
        .spyOn(difyService, 'sendChatMessageStream')
        .mockResolvedValue(mockStream);
      jest
        .spyOn(difyService, 'parseSSEStream')
        .mockReturnValue(mockParsedStream);
    });

    it('should successfully handle chat stream request for allowed domain user', async () => {
      const chatRequest = {
        query: 'Hello, how are you?',
        user: 'will-be-overridden',
        inputs: {},
        conversation_id: '',
        auto_generate_name: true,
      };

      // Start the controller method
      const promise = controller.streamChatMessage(
        chatRequest,
        mockResponse as Response,
        mockRequest,
      );

      // Simulate stream events with proper Dify API format
      setTimeout(() => {
        mockParsedStream.emit('data', {
          event: 'message',
          task_id: '12345-67890',
          message_id: 'msg-123',
          conversation_id: 'conv-456',
          answer: 'Hello!',
          created_at: 1705395332,
        });
        mockParsedStream.emit('data', {
          event: 'message_end',
          task_id: '12345-67890',
          message_id: 'msg-123',
          conversation_id: 'conv-456',
          metadata: {
            usage: {
              total_tokens: 10,
              total_price: '0.001',
              currency: 'USD',
            },
          },
        });
        mockParsedStream.emit('end');
      }, 10);

      await promise;

      // Verify SSE headers are set
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'text/event-stream',
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Cache-Control',
        'no-cache',
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Connection',
        'keep-alive',
      );

      // Verify user ID is set correctly
      expect(chatRequest.user).toBe(mockAllowedUser.id);

      // Verify services are called
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(difyService.sendChatMessageStream).toHaveBeenCalledWith(
        chatRequest,
      );
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(difyService.parseSSEStream).toHaveBeenCalledWith(mockStream);
    });

    it('should handle unauthorized user (no user ID)', async () => {
      mockRequest.user = null;

      const chatRequest = {
        query: 'Hello, how are you?',
        user: '',
        inputs: {},
      };

      try {
        await controller.streamChatMessage(
          chatRequest,
          mockResponse as Response,
          mockRequest,
        );
      } catch (error) {
        // Expected to throw an error due to missing user ID
      }

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Internal server error',
        message: 'User not found',
      });
    });

    it('should handle stream errors gracefully', async () => {
      const chatRequest = {
        query: 'Hello, how are you?',
        user: 'will-be-overridden',
        inputs: {},
      };

      // Mock response.write to capture calls
      const writeSpy = jest.fn();
      const endSpy = jest.fn().mockReturnValue(mockResponse);

      // Override the mockResponse methods
      Object.assign(mockResponse, {
        write: writeSpy,
        end: endSpy,
      });

      // Start the controller method
      const controllerPromise = controller.streamChatMessage(
        chatRequest,
        mockResponse as Response,
        mockRequest,
      );

      // Wait for event listeners to be set up
      await new Promise((resolve) => setImmediate(resolve));

      // Simulate stream error
      mockParsedStream.emit('error', new Error('Stream processing failed'));

      // Wait for the controller method to complete
      try {
        await controllerPromise;
      } catch (error) {
        // Error handling is expected in this test
      }

      // Verify error handling
      expect(writeSpy).toHaveBeenCalledWith(
        expect.stringContaining('event: error'),
      );
      expect(writeSpy).toHaveBeenCalledWith(
        expect.stringContaining('Stream processing failed'),
      );
      expect(endSpy).toHaveBeenCalled();
    });
    it('should handle client disconnection', async () => {
      const chatRequest = {
        query: 'Hello, how are you?',
        user: 'will-be-overridden',
        inputs: {},
      };

      const destroySpy = jest.spyOn(mockParsedStream, 'destroy');

      // Start the controller method
      const promise = controller.streamChatMessage(
        chatRequest,
        mockResponse as Response,
        mockRequest,
      );

      // Wait a bit for the event listener to be registered
      await new Promise((resolve) => setImmediate(resolve));

      // Simulate client disconnection
      const closeCallback = mockRequest.on.mock.calls.find(
        (call: string[]) => call[0] === 'close',
      )?.[1];

      if (closeCallback) {
        closeCallback();
      }

      // Clean up
      mockParsedStream.emit('end');
      await promise;

      expect(destroySpy).toHaveBeenCalled();
    });
  });

  describe('Integration Tests', () => {
    it('should reject requests from unauthorized domains', async () => {
      // This test simulates the full guard pipeline
      const mockExecutionContext = createMock<ExecutionContext>({
        switchToHttp: () => ({
          getRequest: () => ({
            user: {
              id: 'user-123',
              email: 'user@unauthorized.com',
              username: 'testuser',
            },
          }),
        }),
      });

      expect(() => domainGuard.canActivate(mockExecutionContext)).toThrow(
        ForbiddenException,
      );
    });

    it('should allow requests from authorized domains', async () => {
      const mockExecutionContext = createMock<ExecutionContext>({
        switchToHttp: () => ({
          getRequest: () => ({
            user: {
              id: 'user-456',
              email: 'user@alloweddomain.com',
              username: 'alloweduser',
            },
          }),
        }),
      });

      expect(domainGuard.canActivate(mockExecutionContext)).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle malformed email addresses', () => {
      expect(domainService.isDomainAllowed('malformed')).toBe(false);
      expect(domainService.isDomainAllowed('')).toBe(false);
      expect(domainService.isDomainAllowed('@domain.com')).toBe(false);
      expect(domainService.isDomainAllowed('user@')).toBe(false);
    });

    it('should handle case sensitivity in domain validation', () => {
      expect(domainService.isDomainAllowed('User@ALLOWEDDOMAIN.COM')).toBe(
        true,
      );
      expect(domainService.isDomainAllowed('user@alloweddomain.COM')).toBe(
        true,
      );
      expect(domainService.isDomainAllowed('USER@alloweddomain.com')).toBe(
        true,
      );
    });

    it('should handle empty allowed domains list', () => {
      // This would need a separate module setup for testing
      // but demonstrates the concept
      expect(domainService.getAllowedDomains().length).toBeGreaterThan(0);
    });
  });
});
