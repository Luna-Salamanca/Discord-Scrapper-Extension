export class BaseStore {
  public key: string = '';

  public defaultVal<T>(): T | undefined {
    return undefined;
  }

  private async getFromStorage(key: string): Promise<Record<string, any>> {
    return await new Promise((resolve) => {
      chrome.storage.local.get(key, (items) => resolve(items));
    });
  }

  private async setToStorage(items: Record<string, any>): Promise<void> {
    await new Promise<void>((resolve) => {
      chrome.storage.local.set(items, () => resolve());
    });
  }

  private async removeFromStorage(key: string): Promise<void> {
    await new Promise<void>((resolve) => {
      chrome.storage.local.remove(key, () => resolve());
    });
  }

  async find<T>(): Promise<T> {
    const res = await this.getFromStorage(this.key);
    if (res[this.key]) {
      return JSON.parse(res[this.key]) as T;
    }
    return this.defaultVal()!;
  }

  async save<T>(data: T): Promise<void> {
    const val: Record<string, string> = Object.create({});
    val[this.key] = JSON.stringify(data);
    await this.setToStorage(val);
  }

  async clear(): Promise<void> {
    await this.removeFromStorage(this.key);
  }
}
