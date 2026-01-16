import { renderHook, act } from '@testing-library/react';
import { useSubmit } from '../useSubmit';

// Mock api client
jest.mock('../../../services/apiClient', () => ({
  apiClient: {
    post: jest.fn(),
  },
  requestWithSchema: jest.fn(),
}));

// Mock error utility
jest.mock('../../../utils/error', () => ({
  getApiErrorMessage: jest.fn((_err: unknown, defaultMessage: string) => {
    return defaultMessage;
  }),
}));

// Mock mapping utilities
jest.mock('../../../utils/potaMapping', () => ({
  mapAccessMethodsWithBothLangs: jest.fn((access) => access),
  mapActivationMethodsWithBothLangs: jest.fn((activation) => activation),
}));

describe('useSubmit Hook', () => {
  const { apiClient, requestWithSchema } = jest.requireMock('../../../services/apiClient');
  const mockPost = apiClient.post;
  const mockRequestWithSchema = requestWithSchema;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should validate URL format and throw error for invalid URL', async () => {
    const { result } = renderHook(() => useSubmit());

    const invalidParams = {
      parkName: 'Test Park',
      parkType: 'National Park',
      province: 'CN-BJ',
      provinces: ['CN-BJ'],
      latitude: '39.9042',
      longitude: '116.4074',
      website: 'not-a-valid-url', // Invalid URL
      accessMethods: ['Car'],
      activationMethods: ['Foot'],
      confirmed: true,
    };

    let errorOccurred = false;
    let errorMessage = '';

    await act(async () => {
      try {
        await result.current.handleSubmit(invalidParams);
      } catch (err) {
        errorOccurred = true;
        errorMessage = (err as Error).message;
      }
    });

    expect(errorOccurred).toBe(true);
    expect(errorMessage).toBe('公园网址格式不对');
  });

  it('should accept valid URL with https protocol', async () => {
    const { result } = renderHook(() => useSubmit());

    const validParams = {
      parkName: 'Test Park',
      parkType: 'National Park',
      province: 'CN-BJ',
      provinces: ['CN-BJ'],
      latitude: '39.9042',
      longitude: '116.4074',
      website: 'https://example.com',
      accessMethods: ['Car'],
      activationMethods: ['Foot'],
      confirmed: true,
    };

    mockPost.mockResolvedValue({ data: {} });
    mockRequestWithSchema.mockResolvedValue({ application: null });

    let errorOccurred = false;

    await act(async () => {
      try {
        await result.current.handleSubmit(validParams);
      } catch {
        errorOccurred = true;
      }
    });

    expect(errorOccurred).toBe(false);
    expect(mockPost).toHaveBeenCalled();
  });

  it('should accept valid URL without protocol (will be normalized)', async () => {
    const { result } = renderHook(() => useSubmit());

    const validParams = {
      parkName: 'Test Park',
      parkType: 'National Park',
      province: 'CN-BJ',
      provinces: ['CN-BJ'],
      latitude: '39.9042',
      longitude: '116.4074',
      website: 'example.com', // Valid URL without protocol
      accessMethods: ['Car'],
      activationMethods: ['Foot'],
      confirmed: true,
    };

    mockPost.mockResolvedValue({ data: {} });
    mockRequestWithSchema.mockResolvedValue({ application: null });

    let errorOccurred = false;

    await act(async () => {
      try {
        await result.current.handleSubmit(validParams);
      } catch {
        errorOccurred = true;
      }
    });

    expect(errorOccurred).toBe(false);
    expect(mockPost).toHaveBeenCalled();
  });

  it('should accept empty website field', async () => {
    const { result } = renderHook(() => useSubmit());

    const validParams = {
      parkName: 'Test Park',
      parkType: 'National Park',
      province: 'CN-BJ',
      provinces: ['CN-BJ'],
      latitude: '39.9042',
      longitude: '116.4074',
      website: '', // Empty website is valid
      accessMethods: ['Car'],
      activationMethods: ['Foot'],
      confirmed: true,
    };

    mockPost.mockResolvedValue({ data: {} });
    mockRequestWithSchema.mockResolvedValue({ application: null });

    let errorOccurred = false;

    await act(async () => {
      try {
        await result.current.handleSubmit(validParams);
      } catch {
        errorOccurred = true;
      }
    });

    expect(errorOccurred).toBe(false);
    expect(mockPost).toHaveBeenCalled();
  });

  it('should reject other invalid URLs', async () => {
    const { result } = renderHook(() => useSubmit());

    const invalidParams = {
      parkName: 'Test Park',
      parkType: 'National Park',
      province: 'CN-BJ',
      provinces: ['CN-BJ'],
      latitude: '39.9042',
      longitude: '116.4074',
      website: 'javascript:alert("xss")', // Dangerous URL
      accessMethods: ['Car'],
      activationMethods: ['Foot'],
      confirmed: true,
    };

    let errorOccurred = false;
    let errorMessage = '';

    await act(async () => {
      try {
        await result.current.handleSubmit(invalidParams);
      } catch (err) {
        errorOccurred = true;
        errorMessage = (err as Error).message;
      }
    });

    expect(errorOccurred).toBe(true);
    expect(errorMessage).toBe('公园网址格式不对');
  });
});
