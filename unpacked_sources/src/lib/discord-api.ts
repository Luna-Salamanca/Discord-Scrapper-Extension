/**
 * Discord API Wrapper: Facilitates authenticated HTTP GET/POST requests to Discord's API.
 *
 * Discord API request module
 */

import { UserStore } from '@/store/user.ts';
import { apiRequest, type ApiRequestOptions, type ApiResponse } from './api.ts';
import { GuildRole } from '@/store/types.ts';

const DISCORD_API_BASE_URL = 'https://discord.com/api/v9';

export type { ApiRequestOptions, ApiResponse };
export { ApiError } from './api.ts';

/**
 * Discord API request wrapper function (adds token authentication)
 */
async function discordApiRequest<T = unknown>(
  endpoint: string,
  options: ApiRequestOptions & { token?: string } = {},
): Promise<ApiResponse<T>> {
  const { token, ...restOptions } = options;

  const userStore = new UserStore();
  // Get token
  const authToken = token || (await userStore.get()).discordToken;

  if (!authToken) {
    return {
      success: false,
      error: 'Discord token not configured',
      status: 401,
    };
  }

  // Add authentication header
  // The token obtained from the web page is a user token, it can be used directly
  // Bot token format is "Bot <token>", user token format is "<token>"
  // If the token already contains the "Bot " prefix, use it directly; otherwise use it as a user token
  const authHeader = authToken.startsWith('Bot ') || authToken.startsWith('Bearer ') ? authToken : authToken; // User token is used directly, no prefix needed

  const headers = {
    Authorization: authHeader,
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ...restOptions.headers,
  };

  return apiRequest<T>(endpoint, DISCORD_API_BASE_URL, {
    ...restOptions,
    headers,
  });
}

/**
 * Discord GET request
 */
async function discordGet<T = unknown>(
  endpoint: string,
  options?: Omit<ApiRequestOptions, 'method' | 'body'> & { token?: string },
): Promise<ApiResponse<T>> {
  return discordApiRequest<T>(endpoint, { ...options, method: 'GET' });
}

// ==================== Discord API specific methods ====================

/**
 * Get server roles list
 * Used to parse member roles (array of ids) into role names
 * @see https://discord.com/developers/docs/resources/guild#get-guild-roles
 */
export async function getGuildRoles(guildId: string, options?: { token?: string }): Promise<ApiResponse<GuildRole[]>> {
  return discordGet<GuildRole[]>(`/guilds/${encodeURIComponent(guildId)}/roles`, options);
}
