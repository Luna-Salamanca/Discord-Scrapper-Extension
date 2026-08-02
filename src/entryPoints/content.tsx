/**
 * Content Script: Injected into the Discord web page.
 * Handles DOM scraping, token extraction, and Discord API Gateway connection for member fetching.
 */
import { onMessage as onContentMessage, sendMessage } from 'webext-bridge/content-script';
import { EVENT_ID, SEND_TO } from '@/lib/constants';
import { getChannelContext } from '@/lib/dom';
import { getDiscordToken } from '@/lib/discord-token';
import { ServerInfo } from '@/lib/types';
import { SimpleEventBus } from '@/lib/eventbus';
import { DiscordMemberGateway, type MemberEvents, type DiscordMemberInfo } from '@/lib/discord-gateway';
import { UserStore } from '@/store/user';
import { logger } from '@/lib/logger';
import { MemberListScroller } from '@/lib/discord-dom';

// Log for content script is only visible in the Console of the "currently injected page" (e.g., Discord page F12), not in popup/background console
console.log('[content.js] Discord Member Scraper content script loaded');
// get token from discord
getDiscordToken();

// Create event bus
const memberBus = new SimpleEventBus<MemberEvents>();
// Listen to member addition events
memberBus.on('ADD_MEMBER', (members: DiscordMemberInfo[]) => {
  logger.log('[content] Received member batch:', members.length);
  const membersJsonString = JSON.stringify(members);
  sendMessage(EVENT_ID.ADD_MEMBER, { members: membersJsonString }, SEND_TO.POPUP);
});

// Listen to progress and completion events
memberBus.on('PROGRESS', ({ page }) => {
  logger.log('[content] Scrape progress, page =', page);
});

memberBus.on('DONE', () => {
  logger.log('[content] Member scraping complete');
  sendMessage(EVENT_ID.EXPORT, { members: {} }, SEND_TO.POPUP);
});

const memberListScroller = new MemberListScroller(memberBus);

/** Current API mode gateway reference, used to close directly on STOP (does not rely on bus subscription) */
let currentGateway: DiscordMemberGateway | null = null;

// 4. Create and start Gateway connection
export async function startFetchMembers(params: {
  token: string;
  guildId: string;
  channelId: string;
  isAdmin: boolean;
  limit: number;
}) {
  const { token, guildId, channelId, isAdmin, limit } = params;

  const gateway = new DiscordMemberGateway({
    token,
    guildId,
    channelId,
    isAdmin,
    bus: memberBus,
    limit: limit,
  });

  currentGateway = gateway;
  gateway.connect();

  return gateway;
}

onContentMessage(EVENT_ID.CHANNEL_INFO, async (message) => {
  logger.log('[content.js] onMessage channel-info', JSON.stringify(message));
  const data = message.data as { serverId?: string; channelId?: string } | undefined;
  const serverId = data?.serverId ?? '';
  const channelId = data?.channelId ?? '';
  const channelInfo = getChannelContext();
  const serverInfo: ServerInfo = {
    server_id: serverId,
    channel_id: channelId,
    server_name: channelInfo.server,
    server_icon: channelInfo.icon,
    channel_name: channelInfo.channel,
  };
  logger.log('[content.js] Server info:', JSON.stringify(serverInfo));
  return serverInfo;
});

onContentMessage(EVENT_ID.START, async (message) => {
  logger.log('[content.js] onMessage start', JSON.stringify(message));
  const data = message.data as
    | { exportType?: string; limit?: number; isAdmin?: boolean; serverId?: string; channelId?: string }
    | undefined;
  const limit = data?.limit ?? 20;
  const isAdmin = data?.isAdmin ?? false;
  const serverId = data?.serverId ?? '';
  const channelId = data?.channelId ?? '';
  const exportType = data?.exportType ?? 'Simulate';
  if (exportType === 'Simulate') {
    memberListScroller.reset();
    await memberListScroller.simulateScrolling(limit);
  } else {
    const userStore = new UserStore();
    const user = await userStore.get();
    const token = user.discordToken;
    await startFetchMembers({
      token: token,
      guildId: serverId,
      channelId: channelId,
      isAdmin: isAdmin,
      limit: limit,
    });
  }
});

onContentMessage(EVENT_ID.STOP, async (message) => {
  logger.log('[content.js] onMessage stop', JSON.stringify(message));
  const data = message.data as { exportType?: string } | undefined;
  const exportType = data?.exportType ?? 'Simulate';
  if (exportType === 'Simulate') {
    memberListScroller.stop();
  } else {
    if (currentGateway) {
      currentGateway.close();
      currentGateway = null;
    } else {
      memberBus.emit('STOP', {});
    }
  }
  memberBus.emit('DONE', {});
});
