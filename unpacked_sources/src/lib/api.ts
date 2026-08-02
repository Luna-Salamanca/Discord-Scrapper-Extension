/**
 * Generic API request module
 */
import { logger } from '@/lib/logger';

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  status?: number;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public response?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Generic API request function
 */
export async function apiRequest<T = unknown>(
  endpoint: string,
  baseUrl: string,
  options: ApiRequestOptions = {},
): Promise<ApiResponse<T>> {
  const { method = 'GET', headers = {}, body, timeout = 30000 } = options;

  try {
    // Build request URL
    const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;

    // Build request configuration
    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    // Add request body
    if (body && method !== 'GET') {
      fetchOptions.body = JSON.stringify(body);
    }

    // Create request with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    fetchOptions.signal = controller.signal;

    // Send request
    const response = await fetch(url, fetchOptions);
    clearTimeout(timeoutId);

    // Parse response
    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json');

    let rawData: unknown;
    if (isJson) {
      rawData = await response.json();
    } else {
      rawData = await response.text();
    }

    // Check response status
    if (!response.ok) {
      const errorMessage =
        typeof rawData === 'object' && rawData !== null && 'message' in rawData
          ? String((rawData as { message: string }).message)
          : response.statusText || `HTTP ${response.status}`;

      throw new ApiError(`API request failed: ${errorMessage} (${response.status})`, response.status, rawData);
    }

    // Handle unified backend response format: { code: 0, message: "success", data: {...} }
    let data: T;
    if (typeof rawData === 'object' && rawData !== null && 'code' in rawData && 'data' in rawData) {
      const wrappedResponse = rawData as { code: number; message?: string; data: unknown };
      // If code is not 0, consider it an error
      if (wrappedResponse.code !== 0) {
        const errorMessage = wrappedResponse.message || `API returned error code: ${wrappedResponse.code}`;
        throw new ApiError(`API request failed: ${errorMessage}`, response.status, rawData);
      }
      // Extract data field
      data = wrappedResponse.data as T;
    } else {
      // If there is no wrapper format, use the raw data directly
      data = rawData as T;
    }

    return {
      success: true,
      data,
      status: response.status,
    };
  } catch (error) {
    logger.error('[API] Request failed:', error);
    logger.error('[API] Request URL:', endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`);
    logger.error('[API] Request options:', options);

    if (error instanceof ApiError) {
      return {
        success: false,
        error: error.message,
        status: error.status,
      };
    }

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: 'Request timeout',
        };
      }
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Unknown error',
    };
  }
}

/**
 * GET request
 */
export async function get<T = unknown>(
  endpoint: string,
  baseUrl: string,
  options?: Omit<ApiRequestOptions, 'method' | 'body'>,
): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, baseUrl, { ...options, method: 'GET' });
}

/**
 * POST request
 */
export async function post<T = unknown>(
  endpoint: string,
  baseUrl: string,
  body?: unknown,
  options?: Omit<ApiRequestOptions, 'method' | 'body'>,
): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, baseUrl, { ...options, method: 'POST', body });
}

/**
 * PUT request
 */
export async function put<T = unknown>(
  endpoint: string,
  baseUrl: string,
  body?: unknown,
  options?: Omit<ApiRequestOptions, 'method' | 'body'>,
): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, baseUrl, { ...options, method: 'PUT', body });
}

/**
 * PATCH request
 */
export async function patch<T = unknown>(
  endpoint: string,
  baseUrl: string,
  body?: unknown,
  options?: Omit<ApiRequestOptions, 'method' | 'body'>,
): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, baseUrl, { ...options, method: 'PATCH', body });
}

/**
 * DELETE request
 */
export async function del<T = unknown>(
  endpoint: string,
  baseUrl: string,
  options?: Omit<ApiRequestOptions, 'method' | 'body'>,
): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, baseUrl, { ...options, method: 'DELETE' });
}
