export enum MESSAGE_TYPES {}

export type Theme = 'dark' | 'light';

export interface Message {
  type: MESSAGE_TYPES;
  data?: unknown;
}

export const GENERAL_SETTINGS_KEY = 'generalSettings';

export interface GeneralSettings {
  theme: Theme;
  hide_sidebar_button: boolean;
}

export interface MemberData {
  members: Set<string>;
}

export interface ServerInfo {
  server_id: string;
  server_name?: string;
  server_icon?: string;
  channel_id: string;
  channel_name?: string;
}
