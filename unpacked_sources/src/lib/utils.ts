// Added by https://ui.shadcn.com/
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Checks if the given URL is a Discord channel page URL
 */
export function isDiscordUrl(url: string): boolean {
  const DISCORD_CHANNEL_URL_RE = /^https:\/\/discord\.com\/channels\/(@me|\d+)\/\d+$/;
  return typeof url === 'string' && DISCORD_CHANNEL_URL_RE.test(url);
}

export function isDiscordChannelUrl(url: string): boolean {
  const DISCORD_CHANNEL_URL_RE = /^https:\/\/discord\.com\/channels\/(\d+)\/\d+$/;
  return typeof url === 'string' && DISCORD_CHANNEL_URL_RE.test(url);
}

/**
 * Parses server_id / channel_id from a channel URL
 * e.g. https://discord.com/channels/123/456 -> { server_id: "123", channel_id: "456" }
 *      https://discord.com/channels/@me/789 -> { server_id: "me", channel_id: "789" }
 */
export function parseDiscordUrl(url: string) {
  const parts = url.split('/');
  let serverId = parts[4];
  if (serverId === '@me') serverId = 'me';
  return { server_id: serverId, channel_id: parts[5] };
}

/**
 * Generates Discord CDN avatar URL based on userId and avatar hash
 * Prefix a_ indicates a gif, otherwise a png
 */
export function getAvatarUrl(userId: string, avatarHash: string): string {
  if (!avatarHash) return 'https://discord.com/assets/6debd47ed13483642cf09e832ed0bc1b.png';
  const ext = avatarHash.indexOf('a_') === 0 ? 'gif' : 'png';
  return 'https://cdn.discordapp.com/avatars/' + userId + '/' + avatarHash + '.' + ext;
}

/**
 * Gets channel information from the current page URL (if it is a valid channel page)
 */
export function getCurrentChannelInfo(): { server_id: string; channel_id: string } | null {
  const url = typeof location !== 'undefined' ? location.href : '';
  if (!isDiscordUrl(url)) return null;
  return parseDiscordUrl(url);
}
