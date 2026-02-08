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
  getApiErrorDetails: jest.fn(() => ({} as any)),
}));

// Mock mapping utilities
jest.mock('../../../utils/potaMapping', () => ({
  mapAccessMethodsWithBothLangs: jest.fn((access) => access),
  mapActivationMethodsWithBothLangs: jest.fn((activation) => activation),
  REVERSE_ACCESS_METHODS_MAP: {
    '汽车': 'Automobile',
    '步行': 'Foot',
    '船只': 'Boat',
    '水上飞机/空中出租车': 'Seaplane/Airtaxi',
    '其他': 'Other'
  },
  REVERSE_ACTIVATION_METHODS_MAP: {
    '步行': 'Pedestrian',
    '车载': 'Automobile',
    '固定建筑': 'Cabin',
    '露营地': 'Campground',
    '庇护所': 'Shelter',
    '其他': 'Other'
  }
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
      accessMethods: ['汽车'],
      activationMethods: ['步行'],
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
      accessMethods: ['汽车'],
      activationMethods: ['步行'],
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
      accessMethods: ['汽车'],
      activationMethods: ['步行'],
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
      accessMethods: ['汽车'],
      activationMethods: ['步行'],
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
      accessMethods: ['汽车'],
      activationMethods: ['步行'],
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
