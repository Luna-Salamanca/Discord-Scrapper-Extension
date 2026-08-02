/**
 * DOM Helpers: Helper functions for reading Discord UI context (e.g., getting server/channel info).
 * 
 * Get direct text child nodes from an element (avoiding duplicated text from innerText of child elements)
 */
export function getTextContent(el: HTMLElement): string {
  if (!el) return '';
  return Array.from(el.childNodes)
    .filter(function (n) {
      return n.nodeType === 3;
    })
    .map(function (n) {
      return n.textContent?.trim() || '';
    })
    .join('');
}

/**
 * Gets "current server name, channel name, icon" from the current page DOM
 */
export function getChannelContext(): { icon: string; channel: string; server: string } {
  let icon = 'https://discord.com/assets/6f26ddd1bf59740c536d2274bb834a05.png';
  const pills = document.querySelectorAll('div[class*="pill"] > span');
  for (let i = 0; i < pills.length; i++) {
    const span = pills[i];
    if (span instanceof HTMLElement && span.style.height === '40px') {
      const parent = span.parentElement && span.parentElement.parentElement;
      const img = parent ? parent.querySelector('img') : null;
      if (img && img.src) {
        icon = img.src;
        break;
      }
    }
  }
  const header = document.querySelector('header');
  const rawServer = (header && header.firstChild && (header.firstChild as HTMLElement).innerText) || 'DM';
  const server = rawServer.split('\n')[0];
  const titleSection = document.querySelector('section[class*="title"]');
  let channel = '';
  if (titleSection && titleSection.children && titleSection.children.length > 0) {
    const first = titleSection.children[0];
    const h1 = first.querySelector ? first.querySelector('h1') : null;
    if (h1) channel = getTextContent(h1);
  }
  return { icon: icon, channel: channel, server: server };
}

/**
 * Gets server and channel info from the current Discord page DOM
 * Logic derived from crx.dc-members Discord.fetchChannelInServer
 */
export function getChannelContextByServerAndChannel(
  serverId: string,
  channelId: string,
): { icon: string; channel: string; server: string } {
  let data: { icon: string; channel: string; server: string } = { icon: '', channel: '', server: '' };

  document.querySelectorAll('header h2').forEach((h2) => {
    if (h2.textContent) {
      const serverName = h2.textContent as string;
      (
        document.querySelectorAll(
          `foreignObject img[src^="https://cdn.discordapp.com/icons/${serverId}/"]`,
        ) as NodeListOf<HTMLImageElement>
      ).forEach((img) => {
        if (img.src) {
          const serverIcon = img.src as string;
          document.querySelectorAll(`div a[href='/channels/${serverId}/${channelId}']`).forEach((a) => {
            if (a.textContent) {
              const channelName = a.textContent;
              data = {
                icon: serverIcon,
                channel: channelName,
                server: serverName,
              };
            }
          });
        }
      });
    }
  });

  return data;
}
