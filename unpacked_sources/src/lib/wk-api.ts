/**
 * Backend API Client: Connects to a custom backend to check user plans and app lists.
 *
 * WK Backend (crx-api) request wrapper
 *
 * Currently used for:
 * - /api/crx/user/check Check if user has a plan
 * - /api/crx/apps Get application list
 */

import { apiRequest, type ApiRequestOptions, type ApiResponse } from './api.ts';

/**
 * Backend baseUrl:
 * - During development, can be injected via `VITE_CRX_API_BASE_URL` (e.g., http://127.0.0.1:8888)
 * - If not configured:
 *   - Development environment (dev): default http://localhost:8888
 *   - Production environment (production): default https://crx.wkeasy.com
 */
export function getCrxApiBaseUrl(): string {
  // Get from Vite environment variables
  const fromEnv = import.meta.env.VITE_CRX_API_BASE_URL as string | undefined;
  return fromEnv?.trim().replace(/\/$/, '') || '';
}

/**
 * Plan Type Definition
 * 0: Free user
 * 1: Pro user
 */
export type PlanType = 0 | 1;

/**
 * Plan constants
 */
export const PLAN = {
  FREE: 0 as const,
  PRO: 1 as const,
} as const;

export interface CheckUserPlanReq {
  token: string;
  app?: string;
  app_id?: number;
}

export interface CheckUserPlanResp {
  token: string;
  plan: PlanType;
  expired_at: number;
}

/**
 * Checks if user has a plan (backend: crx-api)
 * POST /api/crx/user/check
 */
export async function checkUserPlan(
  req: CheckUserPlanReq,
  options: ApiRequestOptions = {},
  baseUrl: string = getCrxApiBaseUrl(),
): Promise<ApiResponse<CheckUserPlanResp>> {
  return apiRequest<CheckUserPlanResp>('/api/crx/user/check', baseUrl, {
    ...options,
    method: 'POST',
    body: {
      token: req.token,
      app: req.app,
      app_id: req.app_id,
    },
  });
}

/**
 * Plan related helper functions
 */

/**
 * Checks if user is Pro
 */
export function isProPlan(plan: PlanType): boolean {
  return plan === PLAN.PRO;
}

/**
 * Checks if user is Free
 */
export function isFreePlan(plan: PlanType): boolean {
  return plan === PLAN.FREE;
}

/**
 * Checks if plan has expired
 * @param expiredAt Expiration timestamp (Unix timestamp, seconds)
 */
export function isPlanExpired(expiredAt: number): boolean {
  const now = Math.floor(Date.now() / 1000);
  return expiredAt < now;
}

/**
 * Checks if user has a valid Pro plan
 */
export function hasValidProPlan(planResp: CheckUserPlanResp): boolean {
  if (!isProPlan(planResp.plan)) {
    return false;
  }
  return !isPlanExpired(planResp.expired_at);
}

export interface App {
  id: number;
  name: string;
  description: string;
  icon: string;
  download_url: string;
}

export interface AppListReq {
  page_size: number;
  page_index?: number;
  sort?: string;
  name?: string;
}

export interface AppListResp {
  page_index: number;
  page_size: number;
  total: number;
  list: App[];
}

/**
 * Gets application list (backend: crx-api)
 * GET /api/crx/apps
 */
export async function getApps(
  id: number,
  options: ApiRequestOptions = {},
  baseUrl: string = getCrxApiBaseUrl(),
): Promise<ApiResponse<AppListResp>> {
  const params = new URLSearchParams();
  if (id !== null) {
    params.set('id', String(id));
  }
  const endpoint = `/api/crx/apps?${params.toString()}`;
  return apiRequest<AppListResp>(endpoint, baseUrl, {
    ...options,
    method: 'GET',
  });
}

export interface Plan {
  id: number;
  name: string;
  month: number;
  price: number;
  price_per_month: number;
  price_original: number;
  popular: boolean;
  features: string[];
}

export interface PlanListReq {
  id: number; // app_id
}

export interface PlanListResp {
  plans: Plan[];
}

/**
 * Gets plans list (backend: crx-api)
 * GET /api/crx/:id/plans
 */
export async function getPlans(
  req: PlanListReq,
  options: ApiRequestOptions = {},
  baseUrl: string = getCrxApiBaseUrl(),
): Promise<ApiResponse<PlanListResp>> {
  const endpoint = `/api/crx/${req.id}/plans`;
  return apiRequest<PlanListResp>(endpoint, baseUrl, {
    ...options,
    method: 'GET',
  });
}
