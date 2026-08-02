/**
 * Gateway API: Connects to Discord's internal WebSocket Gateway for fast member scraping.
 */
import { SimpleEventBus } from '@/lib/eventbus';
import { logger } from '@/lib/logger';

export enum GatewayOpcodes {
  DISPATCH = 0,
  HEARTBEAT = 1,
  IDENTIFY = 2,
  STATUS_UPDATE = 3,
  VOICE_STATE_UPDATE = 4,
  VOICE_GUILD_PING = 5,
  RESUME = 6,
  RECONNECT = 7,
  REQUEST_GUILD_MEMBERS = 8,
  INVALID_SESSION = 9,
  HELLO = 10,
  HEARTBEAT_ACK = 11,
  GUILD_SYNC = 12,
  DM_UPDATE = 13,
  LAZY_REQUEST = 14,
  LOBBY_CONNECT = 15,
  LOBBY_DISCONNECT = 16,
  LOBBY_VOICE_STATE_UPDATE = 17,
  STREAM_CREATE = 18,
  STREAM_DELETE = 19,
  STREAM_WATCH = 20,
  STREAM_PING = 21,
  STREAM_SET_PAUSED = 22,
  REQUEST_APPLICATION_COMMANDS = 24,
}

export type GatewayEventType = 'READY' | 'GUILD_MEMBERS_CHUNK' | 'GUILD_MEMBER_LIST_UPDATE' | string;

export interface GatewayPayload {
  op: GatewayOpcodes;
  d: unknown;
  t?: GatewayEventType;
  s?: number;
}

export interface ReadyUser {
  id: string;
  username: string;
  discriminator: string;
  global_name?: string | null;
  display_name?: string | null;
  avatar?: string | null;
  bot?: boolean;
}

export interface ReadyData {
  user: ReadyUser;
  session_id?: string;
  guilds?: Array<{
    id: string;
    roles?: Array<{ id: string; name: string }>;
  }>;
}

export interface GuildMembersChunkData {
  guild_id: string;
  members: any[];
  chunk_index?: number;
  chunk_count?: number;
}

/**
 * Logic to fetch members restored from old bundle (Fb/Ob), connecting directly to Discord Gateway via native WebSocket,
 * handles HELLO / IDENTIFY / heartbeat / DISPATCH itself, and emits the member list through the event bus.
 */

export interface DiscordMemberInfo {
  id: string;
  username: string;
  discriminator: string;
  nickname?: string | null;
  global_name?: string | null;
  display_name?: string | null;
  avatar?: string | null;
  bot?: boolean;
  roles: string[];
  joined_at: string;
  activity?: string;
  status?: string;
}

export interface MemberEvents {
  START: { server_id: string; channel_id: string; is_admin: boolean };
  STOP: object;
  PROGRESS: { page: number };
  ADD_MEMBER: DiscordMemberInfo[];
  DONE: object;
}

/**
 * Low-level Discord Gateway client, specifically used for scraping server member lists.
 * Corresponds to Fb/Ob in the old code.
 */
export class DiscordMemberGateway {
  private ws: WebSocket | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | undefined;
  private fetchTimeoutId: ReturnType<typeof setTimeout> | undefined;
  private sequence = -1;
  private stopped = false;

  private readonly token: string;
  private readonly guildId: string;
  private readonly channelId: string;
  private readonly isAdmin: boolean;
  private readonly limit: number;
  private readonly bus: SimpleEventBus<MemberEvents>;

  private page = 0;
  private after: string = '0';
  private rolesMap: Record<string, string> = {};

  private readonly onStop = (): void => {
    console.log('[DiscordMemberGateway] onStop');
    this.close();
  };

  constructor(options: {
    token: string;
    guildId: string;
    channelId: string;
    isAdmin: boolean;
    bus: SimpleEventBus<MemberEvents>;
    limit: number;
  }) {
    this.token = options.token;
    this.guildId = options.guildId;
    this.channelId = options.channelId;
    this.isAdmin = options.isAdmin;
    this.bus = options.bus;
    this.limit = options.limit;
    this.bus.on('STOP', this.onStop);
    logger.log('[DiscordMemberGateway] created', {
      guildId: this.guildId,
      channelId: this.channelId,
      isAdmin: this.isAdmin,
      limit: this.limit,
    });
  }

  connect(): void {
    this.close();
    this.stopped = false;
    this.sequence = -1;
    this.page = 0;
    this.after = '0';

    // Do not use compression, avoid handling zlib manually in the content-script.
    this.ws = new WebSocket('wss://gateway.discord.gg/?encoding=json&v=9');
    logger.log('[DiscordMemberGateway] connecting...');

    this.ws.addEventListener('open', () => {
      logger.log('[DiscordMemberGateway] ws open');
    });

    this.ws.addEventListener('message', (event: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(event.data) as GatewayPayload & { s?: number };
        this.handlePayload(payload);
      } catch (err) {
        logger.error('[DiscordMemberGateway] Failed to parse gateway payload', err);
      }
    });

    this.ws.addEventListener('close', (e) => {
      logger.log('[DiscordMemberGateway] ws close', { code: e.code, reason: e.reason });
      this.ws = null;
      this.stopHeartbeat();
    });

    this.ws.addEventListener('error', (e) => {
      logger.error('[DiscordMemberGateway] ws error', e);
    });
  }

  close(): void {
    logger.log('[DiscordMemberGateway] close()');
    this.stopped = true;
    if (this.fetchTimeoutId !== undefined) {
      clearTimeout(this.fetchTimeoutId);
      this.fetchTimeoutId = undefined;
    }
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.bus.off('STOP', this.onStop);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }

  private handlePayload(payload: GatewayPayload & { s?: number }): void {
    const { op, d, t } = payload as { op: GatewayOpcodes; d: unknown; t?: GatewayEventType };

    if (typeof payload.s === 'number' && payload.s > this.sequence) {
      this.sequence = payload.s;
    }

    if (op !== GatewayOpcodes.HEARTBEAT && op !== GatewayOpcodes.HEARTBEAT_ACK) {
      logger.log('[DiscordMemberGateway] payload', { op, t, s: payload.s });
    }

    switch (op) {
      case GatewayOpcodes.HELLO: {
        const hello = d as { heartbeat_interval?: number };
        const interval = hello.heartbeat_interval ?? 44_000;
        logger.log('[DiscordMemberGateway] HELLO', { heartbeat_interval: interval });
        this.startHeartbeat(interval);
        this.identify();
        break;
      }
      case GatewayOpcodes.HEARTBEAT: {
        this.send(GatewayOpcodes.HEARTBEAT_ACK);
        break;
      }
      case GatewayOpcodes.INVALID_SESSION: {
        logger.log('[DiscordMemberGateway] INVALID_SESSION, re-identify');
        this.identify();
        break;
      }
      case GatewayOpcodes.DISPATCH: {
        this.handleDispatch(t as GatewayEventType, d);
        break;
      }
      default:
        break;
    }
  }

  private handleDispatch(eventType: GatewayEventType | undefined, data: unknown): void {
    if (!eventType) return;

    switch (eventType) {
      case 'READY': {
        const ready = data as ReadyData & {
          guilds?: Array<{ id: string; roles?: Array<{ id: string; name: string }> }>;
        };
        logger.log('[DiscordMemberGateway] READY', {
          user: (ready as ReadyData).user?.username,
          guildsCount: (ready.guilds ?? []).length,
        });

        const guild = (ready.guilds ?? []).find((g: { id: string }) => g.id === this.guildId) as
          | { id: string; roles?: Array<{ id: string; name: string }> }
          | undefined;
        if (guild && Array.isArray(guild.roles)) {
          this.rolesMap = (guild.roles ?? []).reduce<Record<string, string>>((map, role) => {
            map[role.id] = role.name;
            return map;
          }, {});
        }

        this.after = '0';
        this.page = 0;
        logger.log(
          '[DiscordMemberGateway] READY done, rolesMap size:',
          Object.keys(this.rolesMap).length,
          '-> fetch()',
        );
        this.fetch();
        break;
      }

      case 'GUILD_MEMBERS_CHUNK': {
        const chunk = data as GuildMembersChunkData & {
          chunk_index?: number;
          chunk_count?: number;
        };
        logger.log('[DiscordMemberGateway] GUILD_MEMBERS_CHUNK', JSON.stringify(chunk.members));
        const members = (chunk.members ?? []).map<DiscordMemberInfo>((m: any) => ({
          id: m.user.id,
          username: m.user.username,
          discriminator: m.user.discriminator,
          nickname: m.nick,
          global_name: m.user.global_name,
          display_name: m.user.display_name,
          avatar: m.user.avatar,
          bot: m.user.bot,
          roles: (m.roles ?? []).map((r: string) => this.rolesMap[r] ?? r),
          joined_at: m.joined_at,
          activity: '',
          status: '',
        }));

        if (members.length > 0) {
          // after = max id, keeps consistency with old implementation
          this.after = members.reduce((max, item) => (item.id > max ? item.id : max), this.after);
        }

        const hasMore =
          members.length >= 1000 &&
          typeof chunk.chunk_index === 'number' &&
          typeof chunk.chunk_count === 'number' &&
          chunk.chunk_index < chunk.chunk_count - 1;

        logger.log('[DiscordMemberGateway] GUILD_MEMBERS_CHUNK', {
          members: members.length,
          chunk_index: chunk.chunk_index,
          chunk_count: chunk.chunk_count,
          hasMore,
          after: this.after,
        });
        this.next(members, hasMore);
        break;
      }

      case 'GUILD_MEMBER_LIST_UPDATE': {
        const payload = data as {
          ops?: Array<{
            op: string;
            items?: Array<{ member?: any }>;
          }>;
        };
        if (!payload.ops) return;

        let needUpdate = false;
        const collected: DiscordMemberInfo[] = [];
        let hasItems = false;

        for (const op of payload.ops) {
          if (op.op === 'SYNC' && op.items) {
            needUpdate = true;
            op.items.forEach((item) => {
              logger.log('[DiscordMemberGateway] GUILD_MEMBER_LIST_UPDATE item', JSON.stringify(item));
              const member = item.member;
              if (!member) return;
              const user = member.user;
              const presence = member.presence ?? { activities: [], status: '' };

              collected.push({
                id: user.id,
                username: user.username,
                discriminator: user.discriminator,
                nickname: member.nick,
                global_name: user.global_name,
                display_name: user.display_name,
                avatar: user.avatar,
                bot: user.bot,
                roles: (member.roles ?? []).map((r: string) => this.rolesMap[r] ?? r),
                joined_at: member.joined_at,
                activity:
                  Array.isArray(presence.activities) && presence.activities.length > 0
                    ? (presence.activities[0].state ?? '')
                    : '',
                status: presence.status ?? '',
              });
            });
            hasItems = op.items.length > 0;
          }
        }

        if (needUpdate) {
          logger.log('[DiscordMemberGateway] GUILD_MEMBER_LIST_UPDATE', {
            ops: payload.ops?.length,
            collected: collected.length,
            hasItems,
          });
          this.next(collected, hasItems);
        }
        break;
      }
      default:
        break;
    }
  }

  private startHeartbeat(intervalMs: number): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.send(GatewayOpcodes.HEARTBEAT, this.sequence);
    }, intervalMs);
  }

  private identify(): void {
    logger.log('[DiscordMemberGateway] identify()');
    this.send(GatewayOpcodes.IDENTIFY, {
      token: this.token,
      large_threshold: 250,
      properties: {
        browser: 'Chrome',
        device: '',
        system_locale: navigator.language || 'en',
        browser_user_agent: navigator.userAgent,
        browser_version: '89.0.4389.90',
        os_version: '10',
        referrer: window.location.href,
        referring_domain: 'discord.com',
        referrer_current: '',
        referring_domain_current: '',
        release_channel: 'stable',
        client_build_number: 81972,
        client_event_source: null,
      },
      presence: { status: 'online', since: 0, activities: [], afk: false },
      compress: false,
      client_state: {
        guild_hashes: {},
        highest_last_message_id: '0',
        read_state_version: 0,
        user_guild_settings_version: -1,
      },
    });
  }

  private send(op: GatewayOpcodes | number, d: unknown = {}): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ op, d }));
  }

  private fetch(): void {
    if (this.stopped) return;
    const delay = 1000;
    logger.log('[DiscordMemberGateway] fetch() scheduled in', delay, 'ms', {
      page: this.page,
      after: this.after,
      isAdmin: this.isAdmin,
    });
    this.fetchTimeoutId = setTimeout(() => {
      this.fetchTimeoutId = undefined;
      if (this.stopped) return;
      if (this.isAdmin) {
        this.fetchAdminMembers();
      } else {
        this.fetchMemberList();
      }
    }, delay);
  }

  private fetchAdminMembers(): void {
    logger.log('[DiscordMemberGateway] fetchAdminMembers()', { after: this.after });
    this.send(GatewayOpcodes.REQUEST_GUILD_MEMBERS, {
      guild_id: this.guildId,
      query: '',
      limit: 0,
      after: this.after,
      presences: false,
    });
  }

  /**
   * For non-admins, fetch member lists via LAZY_REQUEST.
   * Directly uses value 14 here, corresponding to li.LAZY_REQUEST in the old bundle.
   */
  private fetchMemberList(): void {
    const ranges: Array<[number, number]> = [[0, 99]];
    if (this.page > 0) {
      ranges.push([this.page, this.page + 99]);
    }

    let payload: any = {
      guild_id: this.guildId,
      channels: {
        [this.channelId]: ranges,
      },
    };

    if (this.page <= 0) {
      payload = {
        ...payload,
        typing: true,
        threads: true,
        activities: true,
        members: [],
      };
    }

    this.page += 100;
    logger.log('[DiscordMemberGateway] fetchMemberList() LAZY_REQUEST', { page: this.page, ranges });
    this.send(14 /* LAZY_REQUEST */, payload);
  }

  private next(members: DiscordMemberInfo[], hasMore: boolean): void {
    if (this.stopped) return;
    logger.log('[DiscordMemberGateway] next()', { members: members.length, hasMore, limit: this.limit });
    if (members.length > 0) {
      this.bus.emit('ADD_MEMBER', members);
    }

    if (hasMore && this.limit === -1) {
      this.bus.emit('PROGRESS', { page: this.page });
      const delay = Math.floor(500 * Math.random()) + 800;
      logger.log('[DiscordMemberGateway] next() hasMore, fetch again in', delay, 'ms');
      this.fetchTimeoutId = setTimeout(() => {
        this.fetchTimeoutId = undefined;
        if (!this.stopped) this.fetch();
      }, delay);
    } else {
      logger.log('[DiscordMemberGateway] next() DONE');
      this.close();
      this.bus.emit('DONE', {});
    }
  }
}
