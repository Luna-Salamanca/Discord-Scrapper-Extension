/**
 * DOM Utility: Contains the logic to simulate scrolling the Discord member list 
 * and programmatically read members from the UI.
 */
import { DiscordMemberInfo, MemberEvents } from './discord-gateway.ts';
import { SimpleEventBus } from './eventbus.ts';
import type { MemberData } from './types.ts';
import { logger } from '@/lib/logger';

/**
 * Simulates scrolling the Discord member list and collects member data
 * Logic derived from `MemberListScroller` in crx.dc-members
 */
export class MemberListScroller {
  private scrollingSpeed = 40; // Pixels to scroll each time
  private timeout = 200;
  private stopInterval = false;
  private interval: ReturnType<typeof setInterval> | undefined;
  private bottomReachedCount = 0; // Number of consecutive times bottom is detected
  private readonly BOTTOM_THRESHOLD = 3; // Threshold for consecutive bottom detections (prevents false positives from dynamic loading)
  private readonly SCROLL_TOLERANCE = 5; // Scroll tolerance (pixels), used to handle float precision and rendering delays
  /** Force stop if no new members are fetched for this many ms (fallback when unable to determine if scrolled to bottom) */
  private readonly IDLE_STOP_MS = 30_000;
  private lastScrollHeight = 0; // Previous scrollHeight, used to check if content is still growing

  // Container element for Discord member list
  private memberListContainer: HTMLDivElement | undefined;
  private roleListContainer: HTMLDivElement | undefined;

  private data: MemberData;
  /** resolve for simulateScrolling, only allowed to complete once */
  private resolveScroll: ((data: MemberData) => void) | null = null;
  private avatarRegex = /avatars\/(\d+)\//;
  private userRegex = /users\/(\d+)\//;

  private readonly bus: SimpleEventBus<MemberEvents>;

  private extractMemberIdFromImg(src: string): string | null {
    if (src.startsWith('https://cdn.discordapp.com/avatars/')) {
      const match = src.match(this.avatarRegex);
      return match ? match[1].toString() : null;
    }
    if (src.startsWith('https://cdn.discordapp.com/guilds/')) {
      const match = src.match(this.userRegex);
      return match ? match[1].toString() : null;
    }
    return null;
  }

  constructor(bus: SimpleEventBus<MemberEvents>) {
    this.data = {
      members: new Set(),
    };
    this.bus = bus;
  }

  /**
   * Reset internal state (data and scroll detection variables)
   * Also clear cached DOM references to avoid using the old page's member list container after switching servers/channels
   */
  reset(): void {
    this.data = {
      members: new Set(),
    };
    this.memberListContainer = undefined;
    this.roleListContainer = undefined;
    this.bottomReachedCount = 0;
    this.lastScrollHeight = 0;
    this.stopInterval = false;
  }

  /**
   * Get currently collected member data (shallow copy to prevent external direct modification of internal Set)
   */
  getData(): MemberData {
    return {
      members: new Set(this.data.members),
    };
  }

  private getRenderedMembers = (limit: number, stopScroller: () => void): void => {
    if (this.memberListContainer) {
      const listSpan = this.memberListContainer.querySelectorAll(
        `div[role='listitem'] span[class*='name'][class*='username']`,
      ) as NodeListOf<HTMLSpanElement>;

      const names: string[] = [];
      listSpan.forEach((span) => {
        names.push(span.innerText);
      });

      const listImg = this.memberListContainer.querySelectorAll(
        `div[role='listitem'] img[class*='avatar'][src^='https://cdn.discordapp.com/avatars/']`,
      ) as NodeListOf<HTMLImageElement>;

      listImg.forEach((img, key) => {
        const id = this.extractMemberIdFromImg(img.src) || '';

        if (this.data.members.size >= limit && limit !== -1) {
          stopScroller();
          return;
        }
        if (id && names[key]) {
          this.data.members.add(id);
          this.bus.emit('ADD_MEMBER', [
            {
              id: id,
              username: '',
              discriminator: '',
              nickname: '',
              global_name: '',
              display_name: '',
              avatar: '',
              bot: false,
              roles: [],
              joined_at: '',
              activity: '',
              status: '',
            } as DiscordMemberInfo,
          ]);
        }
      });
    }
  };

  simulateScrolling = (limit: number): Promise<MemberData> => {
    if (!this.memberListContainer || !this.roleListContainer) {
      this.roleListContainer = document.querySelectorAll(`aside div[role='list']`).item(0) as HTMLDivElement;
      this.memberListContainer = this.roleListContainer?.parentElement as HTMLDivElement;
    }
    if (!this.memberListContainer) {
      return Promise.reject(new Error('Member list container not found'));
    }

    this.memberListContainer.scrollTop = 0;
    this.bottomReachedCount = 0; // Reset bottom detection count
    this.lastScrollHeight = 0; // Reset scrollHeight record
    let itemCount = 0;
    let itemId = '';

    // Return data
    return new Promise<MemberData>((resolve, reject) => {
      const complete = (d: MemberData) => {
        if (!this.resolveScroll) return;
        this.stopInterval = true;
        if (this.interval) {
          clearInterval(this.interval);
          this.interval = undefined;
        }
        this.bus.emit('DONE', {});
        const r = this.resolveScroll;
        this.resolveScroll = null;
        r(d);
      };
      this.resolveScroll = resolve;
      // Execute first time when there are few members
      this.getRenderedMembers(limit, () => {
        complete(this.data);
      });

      let lastMemberCount = this.data.members.size;
      let lastNewMemberTime = Date.now();

      this.interval = setInterval(() => {
        if (this.stopInterval) {
          clearInterval(this.interval);
          return;
        }
        if (this.memberListContainer && this.roleListContainer) {
          const currentCount = this.data.members.size;
          if (currentCount > lastMemberCount) {
            lastNewMemberTime = Date.now();
            lastMemberCount = currentCount;
          } else if (Date.now() - lastNewMemberTime >= this.IDLE_STOP_MS) {
            logger.log('No new members for 30s, forcing stop');
            complete(this.data);
            return;
          }

          const listItems = this.roleListContainer.querySelectorAll(`div[data-list-item-id^=members-]`);
          const listItemId = listItems.item(listItems.length - 1).getAttribute('data-list-item-id') as string;
          // Quantity changed or data refreshed
          if (listItems.length !== itemCount || itemId !== listItemId) {
            itemCount = listItems.length;
            itemId = listItemId;
            this.getRenderedMembers(limit, () => {
              complete(this.data);
            });
          }
          // Check if reached bottom (using more precise logic)
          const scrollTop = this.memberListContainer.scrollTop;
          const scrollHeight = this.memberListContainer.scrollHeight;
          const clientHeight = this.memberListContainer.clientHeight;
          const maxScrollTop = scrollHeight - clientHeight;

          // Handle edge case: content height <= container height
          if (maxScrollTop <= 0) {
            complete(this.data);
            return;
          }

          // Calculate remaining distance to bottom
          const distanceToBottom = maxScrollTop - scrollTop;

          // Check if content is still growing (Discord uses virtual scrolling, content might load dynamically)
          const isContentGrowing = scrollHeight > this.lastScrollHeight;
          if (isContentGrowing) {
            this.lastScrollHeight = scrollHeight;
            this.bottomReachedCount = 0; // Content still growing, reset count
          }

          // Use tolerance to determine if reached bottom (handle float precision and rendering delay)
          const isAtBottom = distanceToBottom <= this.SCROLL_TOLERANCE;

          // Debug logging
          logger.log(
            `scrollHeight: ${scrollHeight}, clientHeight: ${clientHeight}, scrollTop: ${scrollTop.toFixed(
              2,
            )}, maxScrollTop: ${maxScrollTop.toFixed(2)}, distanceToBottom: ${distanceToBottom.toFixed(
              2,
            )}, isAtBottom: ${isAtBottom}, count: ${this.bottomReachedCount}`,
          );

          if (isAtBottom) {
            this.bottomReachedCount++;
            // Truly stop only after multiple consecutive bottom detections and content stops growing (prevent false positives from dynamic loading)
            if (this.bottomReachedCount >= this.BOTTOM_THRESHOLD && !isContentGrowing) {
              logger.log('Reached bottom, stopping scroll');
              complete(this.data);
              return;
            }
          } else {
            // Reset count if not yet at bottom
            this.bottomReachedCount = 0;
          }

          // If close to bottom but not quite there, reduce scroll step to improve precision
          if (distanceToBottom > 0 && distanceToBottom < this.scrollingSpeed) {
            // Scroll directly to bottom to avoid skipping
            this.memberListContainer.scrollTop = maxScrollTop;
          } else {
            this.memberListContainer.scrollTop += this.scrollingSpeed;
          }
        } else {
          this.stopInterval = true;
          reject(new Error('dom error'));
        }
      }, this.timeout);
    });
  };

  /**
   * Stop scrolling immediately, resolve simulateScrolling, and return currently collected data
   */
  stop = (): void => {
    if (!this.resolveScroll) return;
    this.stopInterval = true;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
    this.bus.emit('DONE', {});
    const r = this.resolveScroll;
    this.resolveScroll = null;
    r(this.data);
  };
}
