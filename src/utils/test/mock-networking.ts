import { Request, Response } from 'express';
import { mockJsonFn, mockStatusFn } from './mock-fuctions';

const mockRequest = {
  headers: {},
  ip: '127.0.0.1',
} as unknown as Request;

const mockResponse = {
  status: mockStatusFn.mockReturnThis(),
  json: mockJsonFn.mockReturnThis(),
} as unknown as Response;

export { mockRequest, mockResponse };
