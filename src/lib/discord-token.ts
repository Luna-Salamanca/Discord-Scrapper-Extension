/**
 * Utility: Extracts the Discord authentication token from the browser's local storage/memory.
 */
import { UserStore } from '@/store/user';

// for test 1061828774016065596
export class DiscordToken {
  private getLocalStoragePropertyDescriptor() {
    const iframe = document.createElement('iframe');
    document.head.append(iframe);
    const pd = Object.getOwnPropertyDescriptor(iframe.contentWindow, 'localStorage');
    iframe.remove();
    return pd;
  }

  private getToken(): string {
    // We have several options for how to use the property descriptor
    // once we have it. The simplest is to just redefine it:
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    Object.defineProperty(window, 'localStorage', this.getLocalStoragePropertyDescriptor());

    // You can also use any function application tool, like `bind` or `call`
    // or `apply`. If you hold onto a reference to the object somehow, it
    // won’t matter if the global property gets deleted again, either.
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    const localStorage = this.getLocalStoragePropertyDescriptor().get.call(window);

    let token = localStorage.getItem('token');
    if (token !== null && typeof token !== 'undefined' && token.startsWith('"') && token.endsWith('"')) {
      token = token.replaceAll('"', '');
    }
    return token;
  }

  loadToken(tryMaxTimes: number, interval: number, success: (token: string) => void, failure: () => void) {
    let maxTimes: number = 0;
    const intervalID = setInterval(() => {
      if (maxTimes === tryMaxTimes) {
        clearInterval(intervalID);
        failure();
        return;
      }
      maxTimes++;
      let token: string = '';
      try {
        token = this.getToken();
      } catch (e) {
        console.error(e);
      }
      console.log('[discord-token.js] Token:', token);
      if (token !== '') {
        clearInterval(intervalID);
        success(token);
      }
    }, interval);
  }
}

const discordToken = new DiscordToken();

const success = async (token: string): Promise<void> => {
  console.log('[content.js] Discord token:', token);
  const userStore = new UserStore();
  await userStore.updateDiscordInfo(token);
};

const failure = (): void => {
  setup();
};

const setup = (): void => {
  discordToken.loadToken(5, 1000, success, failure);
};

export function getDiscordToken(): void {
  setup();
}
