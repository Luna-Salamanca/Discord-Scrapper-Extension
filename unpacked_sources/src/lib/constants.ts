export const ROOT_CONTAINER_ID = '__extRoot__';

// Current application's app_id (Discord Member Scraper)
export const APP_ID = 58;

export enum SEND_TO {
  POPUP = 'popup',
  OPTIONS = 'options',
  BACKGROUND = 'background',
  CONTENT_SCRIPT = 'content-script',
}

export enum EVENT_ID {
  CHANNEL_INFO = 'channel-info',
  START = 'start',
  STOP = 'stop',
  EXPORT = 'export',
  ADD_MEMBER = 'add-member',
}
