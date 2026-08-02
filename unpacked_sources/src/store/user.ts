/**
 * User Store: Manages persistent storage of user state, such as tokens and app settings.
 */
import { BaseStore } from '@/store/index';
import { v4 } from 'uuid';
import { UserInfo } from './types';

export class UserStore extends BaseStore {
  public key: string = 'user';

  defaultVal<T>(): T | undefined {
    return {
      token: '',
      discordToken: '',
      selectedType: 1,
    } as T;
  }

  async get(): Promise<UserInfo> {
    const user: UserInfo = await this.find<UserInfo>();
    if (user.token === '') {
      user.token = v4();
      await this.save<UserInfo>(user);
    }
    return user;
  }

  async updateDiscordInfo(discordToken: string): Promise<void> {
    const user: UserInfo = await this.find<UserInfo>();
    user.discordToken = discordToken;
    await this.save<UserInfo>(user);
  }

  async updateSelectedType(selectedType: number): Promise<void> {
    const user: UserInfo = await this.find<UserInfo>();
    user.selectedType = selectedType;
    await this.save<UserInfo>(user);
  }
}
