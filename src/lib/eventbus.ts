/**
 * EventBus: A simple publish-subscribe system to facilitate communication between extension components.
 * 
 * Simple event bus implementation, corresponding to `Bv/aa()` in the old bundle.
 */
export type Listener<T> = (payload: T) => void;

export class SimpleEventBus<TEvents extends Record<string, any>> {
  private all = new Map<keyof TEvents | '*', Listener<any>[]>();

  on<K extends keyof TEvents>(event: K, handler: Listener<TEvents[K]>): void {
    const arr = this.all.get(event) ?? [];
    arr.push(handler as Listener<any>);
    this.all.set(event, arr);
  }

  off<K extends keyof TEvents>(event: K, handler?: Listener<TEvents[K]>): void {
    const arr = this.all.get(event);
    if (!arr) return;
    if (!handler) {
      this.all.set(event, []);
      return;
    }
    const idx = arr.indexOf(handler as Listener<any>);
    if (idx >= 0) {
      arr.splice(idx, 1);
    }
  }

  emit<K extends keyof TEvents>(event: K, payload: TEvents[K]): void {
    const arr = this.all.get(event);
    if (arr) {
      arr.slice().forEach((fn) => fn(payload));
    }
    // Only supports exact event names here, no longer implementing "*" wildcards, simplifying types.
  }
}
