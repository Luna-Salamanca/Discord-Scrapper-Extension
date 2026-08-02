/**
 * Exporter: Handles taking scraped members and exporting them to Excel, CSV, JSON, or TXT.
 */
import { DiscordMemberInfo } from './discord-gateway';
import * as XLSX from 'xlsx';
import { Parser, type ParserOptions } from '@json2csv/plainjs';
import { getGuildRoles } from './discord-api';
import { UserStore } from '@/store/user';
import { logger } from '@/lib/logger';

function downloadCsv(data: object[], filename: string, options?: ParserOptions) {
  try {
    const parser = new Parser({ header: true, includeEmptyRows: false, ...options });
    const csv = parser.parse(data);

    // Create a Blob and trigger download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.setAttribute('download', filename);
    link.click();

    // Cleanup
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Download failed', err);
  }
}

function downloadTxt(data: any, filename: string) {
  const txtString = data.map((item: any) => item.id).join('\n');
  const blob = new Blob([txtString], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}`;
  link.click();
  URL.revokeObjectURL(url);
}
/**
 * Export JSON file (native implementation, zero dependencies)
 * @param data JSON data to export (can be array/object)
 * @param filename File name to export (without .json extension)
 * @param pretty Whether to format it (2 spaces indentation, default true)
 */
function downloadJson(data: any, filename: string, pretty: boolean = true) {
  // Process JSON string (format/minify)
  const jsonString = pretty
    ? JSON.stringify(data, null, 2) // formatted (readable)
    : JSON.stringify(data); // minified (small size)

  // Create Blob (specify JSON MIME type)
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });

  // Create download link and trigger download
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.json`; // automatically add .json extension
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();

  // Clean up resources
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function downloadFile(data: any, fileFormat: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  switch (fileFormat) {
    case 'excel': {
      const filename = `discord-members-${timestamp}.xlsx`;
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Discord Users'); // Sheet name
      XLSX.writeFile(workbook, filename);
      break;
    }
    case 'csv': {
      const filename = `discord-members-${timestamp}.csv`;
      downloadCsv(data, filename);
      break;
    }
    case 'json': {
      const filename = `discord-members-${timestamp}.json`;
      downloadJson(data, filename, true);
      break;
    }
    case 'txt': {
      const filename = `discord-members-${timestamp}.txt`;
      downloadTxt(data, filename);
      break;
    }
  }
}

export function exportMembersOfSimulate(fileFormat: string, members: DiscordMemberInfo[]) {
  logger.log('[exporter] Exporting members of simulate:', members);

  if (!Array.isArray(members) || members.length === 0) {
    console.warn('[exporter] No members to export.');
    return;
  }

  const data = members.map((member) => ({
    id: member.id,
  }));
  downloadFile(data, fileFormat);
}

export async function exportMembersOfAPI(serverId: string, fileFormat: string, members: DiscordMemberInfo[]) {
  logger.log('[exporter] Exporting members of API:', members);

  if (!Array.isArray(members) || members.length === 0) {
    console.warn('[exporter] No members to export.');
    return;
  }

  const rolesMap = new Map<string, string>();
  if (serverId) {
    logger.warn('[exporter] No server ID to export.');
    const userStore = new UserStore();
    const user = await userStore.get();
    const token = user.discordToken;
    const roles = await getGuildRoles(serverId, { token: token });
    if (roles.success && roles.data) {
      logger.log('[exporter] Guild roles:', roles.data);
      roles.data.forEach((role) => {
        rolesMap.set(role.id, role.name);
      });
    }
  } else {
    console.warn('[exporter] No server ID to export.');
  }

  const data = members.map((member) => ({
    id: member.id,
    username: member.username,
    discriminator: member.discriminator,
    nickname: member.nickname,
    global_name: member.global_name,
    display_name: member.display_name,
    avatar: member.avatar,
    bot: member.bot,
    roles: member.roles.map((roleId) => rolesMap.get(roleId) ?? roleId).join(','),
    joined_at: member.joined_at,
    activity: member.activity,
    status: member.status,
  }));
  downloadFile(data, fileFormat);
}
