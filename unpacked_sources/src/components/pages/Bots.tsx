import { useState, useEffect, useRef } from 'react';
import { Download, AlertCircle, XCircle, Loader2, RefreshCw, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserStore } from '@/store/user';
import browser from 'webextension-polyfill';
import { onMessage, sendMessage } from 'webext-bridge/popup';
import { APP_ID, EVENT_ID } from '@/lib/constants';
import { ServerInfo } from '@/lib/types';
import { isDiscordChannelUrl, parseDiscordUrl } from '@/lib/utils';
import { checkUserPlan, isProPlan } from '@/lib/wk-api';
import { exportMembersOfAPI, exportMembersOfSimulate } from '@/lib/exporter';
import { DiscordMemberInfo } from '@/lib/discord-gateway';
import { logger } from '@/lib/logger';

interface BotsPageProps {
  onNavigate?: (page: 'plan') => void;
}

type ExportType = 'Simulate' | 'API';

export default function BotsPage({ onNavigate }: BotsPageProps = {}) {
  const [fileFormat, setFileFormat] = useState('excel');
  const [exportType, setExportType] = useState<ExportType>('Simulate');
  const [isValidUrl, setIsValidUrl] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [isCheckingToken, setIsCheckingToken] = useState(false);
  const [hasToken, setHasToken] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverChannelInfo, setServerChannelInfo] = useState<ServerInfo | null>(null);
  const [serverIconError, setServerIconError] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPro, setIsPro] = useState<boolean>(false);
  /** Synchronized with members, used to get the latest value during export (EXPORT message might arrive before setState re-renders) */
  const membersRef = useRef<DiscordMemberInfo[]>([]);
  const [members, setMembers] = useState<number>(0);
  const fileFormatOptions = [
    { value: 'excel', label: 'excel' },
    { value: 'csv', label: 'csv' },
    { value: 'json', label: 'json' },
    { value: 'txt', label: 'txt(only scrap id)' },
  ];

  const exportTypeOptions: Array<{ value: ExportType; label: string }> = [
    { value: 'Simulate', label: 'Simulate Behavior' },
    { value: 'API', label: 'Request API' },
  ];

  // Convert ExportType to number
  const exportTypeToNumber = (type: ExportType): number => {
    return type === 'Simulate' ? 0 : 1;
  };

  // Convert number to ExportType
  const numberToExportType = (num: number): ExportType => {
    return num === 0 ? 'Simulate' : 'API';
  };

  // Load selectedType from storage
  useEffect(() => {
    const loadSelectedType = async () => {
      try {
        const userStore = new UserStore();
        const user = await userStore.get();
        if (user.selectedType !== undefined) {
          setExportType(numberToExportType(user.selectedType));
        }
      } catch (err) {
        console.error('[Bots] Failed to load selectedType:', err);
      }
    };

    loadSelectedType();
  }, []);

  // Check if user is PRO
  useEffect(() => {
    const checkPlan = async () => {
      const userStore = new UserStore();
      const user = await userStore.get();
      const plan = await checkUserPlan({ app_id: APP_ID, token: user.token });
      if (plan.success && plan.data) {
        setIsPro(isProPlan(plan.data.plan));
      }
    };
    checkPlan();
  }, []);

  // Handle Export Type change
  const handleExportTypeChange = async (newType: ExportType) => {
    setExportType(newType);
    if (newType === 'Simulate') {
      setIsAdmin(false);
    }
    try {
      const userStore = new UserStore();
      await userStore.updateSelectedType(exportTypeToNumber(newType));
    } catch (err) {
      console.error('[Bots] Failed to save selectedType:', err);
    }
  };

  onMessage(EVENT_ID.EXPORT, async (message) => {
    logger.log('[Bots] onMessage export', JSON.stringify(message));
    const toExport = membersRef.current;
    setMembers(toExport.length);
    if (exportType === 'Simulate') {
      exportMembersOfSimulate(fileFormat, toExport);
    } else {
      const serverId = serverChannelInfo?.server_id ?? '';
      await exportMembersOfAPI(serverId, fileFormat, toExport);
    }
    setIsLoading(false);
    setError(null);
  });

  onMessage(EVENT_ID.ADD_MEMBER, async (message) => {
    logger.log('[Bots] onMessage add-member', JSON.stringify(message));
    const data = message.data as { members: string } | undefined;
    const membersString = data?.members ?? '[]';
    const membersArray = JSON.parse(membersString) as unknown as DiscordMemberInfo[];

    membersRef.current = [...membersRef.current, ...membersArray];
    setMembers(membersRef.current.length);
  });

  const handleStopAndExport = async () => {
    setError(null);
    try {
      const tabs = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tabs || tabs.length === 0 || !tabs[0].url || !tabs[0].id || !isDiscordChannelUrl(tabs[0].url)) {
        setError('Invalid Discord channel URL');
        setIsLoading(false);
        return;
      }
      const tabId = tabs[0].id;
      const message = { exportType: exportType };
      sendMessage(EVENT_ID.STOP, message, `content-script@${tabId}`);
    } catch (err) {
      setIsLoading(false);
      console.error('[Bots] handleStopAndExport failed:', err);
      setError(err instanceof Error ? err.message : 'handleStopAndExport failed. Please try again.');
    }
  };

  const handleDownload = async () => {
    setIsLoading(true);
    setError(null);
    membersRef.current = [];
    setMembers(0);
    try {
      const tabs = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tabs || tabs.length === 0 || !tabs[0].url || !tabs[0].id || !isDiscordChannelUrl(tabs[0].url)) {
        setError('Invalid Discord channel URL');
        setIsLoading(false);
        return;
      }
      const tabId = tabs[0].id;
      const serverId = serverChannelInfo?.server_id ?? '';
      const channelId = serverChannelInfo?.channel_id ?? '';
      const message = {
        exportType: exportType,
        limit: -1,
        isAdmin: isAdmin,
        serverId: serverId,
        channelId: channelId,
      };
      sendMessage(EVENT_ID.START, message, `content-script@${tabId}`);
    } catch (err) {
      setIsLoading(false);
      membersRef.current = [];
      setMembers(0);
      console.error('[Bots] Download failed:', err);
      setError(err instanceof Error ? err.message : 'Download failed. Please try again.');
    }
  };

  useEffect(() => {
    let cancelled = false;

    const withTimeout = <T,>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
      return Promise.race([
        promise,
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`${label} timeout after ${ms}ms`)), ms)),
      ]);
    };

    // Check if the current tab's URL is a valid Discord channel URL
    const checkUrl = async () => {
      try {
        if (!browser?.tabs) {
          if (!cancelled) {
            setIsValidUrl(true);
            setIsChecking(false);
          }
          return;
        }

        const tabs = await withTimeout(browser.tabs.query({ active: true, currentWindow: true }), 8000, 'tabs.query');

        if (cancelled) return;

        if (tabs && tabs.length > 0 && tabs[0].url && isDiscordChannelUrl(tabs[0].url)) {
          setIsValidUrl(true);
          const { server_id, channel_id } = parseDiscordUrl(tabs[0].url);
          setIsCheckingToken(true);
          const tokenExists = await checkToken();
          if (cancelled) return;
          if (tokenExists && tabs[0].id !== null) {
            const tabId = tabs[0].id;
            logger.log('[Bots] Sending channel-info to content-script@' + tabId);
            try {
              const channelInfo = await withTimeout(
                sendMessage(
                  EVENT_ID.CHANNEL_INFO,
                  { serverId: server_id, channelId: channel_id },
                  `content-script@${tabId}`,
                ),
                5000,
                'CHANNEL_INFO',
              );
              if (!cancelled) {
                logger.log('[Bots] Channel info:', channelInfo);
                setServerChannelInfo(channelInfo as unknown as ServerInfo);
              }
            } catch (channelErr) {
              if (!cancelled) {
                console.warn('[Bots] Channel info failed (content script may not be ready):', channelErr);
                setServerChannelInfo({
                  server_id,
                  channel_id,
                  server_name: undefined,
                  server_icon: undefined,
                  channel_name: undefined,
                });
              }
            }
          }
        } else {
          setIsValidUrl(false);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('[Bots] URL check failed:', error);
          setIsValidUrl(false);
        }
      } finally {
        if (!cancelled) {
          setIsChecking(false);
        }
      }
    };

    checkUrl();
    return () => {
      cancelled = true;
    };
  }, []);

  // Check if token exists
  const checkToken = async (): Promise<boolean> => {
    try {
      const userStore = new UserStore();
      const user = await userStore.get();
      const tokenExists = !!user.discordToken;

      setHasToken(tokenExists);
      return tokenExists;
    } catch (error) {
      console.error('[Bots] Token check failed:', error);
      setHasToken(false);
      return false;
    } finally {
      setIsCheckingToken(false);
    }
  };

  // Refresh current page and close extension
  const handleRefreshPage = async () => {
    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]?.id !== undefined) {
        await browser.tabs.reload(tabs[0].id);
        // Recheck token after refresh
        setTimeout(() => {
          window.close();
        }, 1000);
      }
    } catch (error) {
      console.error('[Bots] Failed to refresh page:', error);
      setError('Failed to refresh the page. Please refresh manually.');
    }
  };

  // If checking, show loading state
  if (isChecking || isCheckingToken) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-white min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-500 mb-2" />
        <div className="text-gray-500">{isChecking ? 'Checking URL...' : 'Checking token...'}</div>
      </div>
    );
  }

  // If URL is invalid, show error page
  if (isValidUrl === false) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-white min-h-[400px] gap-4">
        <XCircle className="w-16 h-16 text-red-500" />
        <h2 className="text-xl font-semibold text-gray-900">Invalid Discord channel URL</h2>
        <p className="text-sm text-gray-600 text-center max-w-md">
          Please make sure your current tab is a Discord channel page.
          <br />
          URL format should be:{' '}
          <code className="text-xs bg-gray-100 px-2 py-1 rounded">https://discord.com/channels/xxx/xxx</code>
        </p>
      </div>
    );
  }

  // If URL is valid but token not fetched, show error message and refresh button
  if (isValidUrl === true && hasToken === false) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-white min-h-[400px] gap-4">
        <XCircle className="w-16 h-16 text-red-500" />
        <h2 className="text-xl font-semibold text-gray-900">Discord token not found</h2>
        <p className="text-sm text-gray-600 text-center max-w-md">
          Unable to get your Discord token. Please make sure:
          <br />
          1. You are logged in to Discord Web
          <br />
          2. The current tab is a Discord page
          <br />
          3. Refresh the page and try again
        </p>
        <Button
          onClick={handleRefreshPage}
          className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh Page</span>
        </Button>
      </div>
    );
  }

  // URL is valid, show normal Bots page
  return (
    <div className="flex flex-col gap-4 p-4 bg-white">
      {/* Server/channel info box */}
      <div className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg">
        <div
          className="w-12 h-12 rounded-sm bg-gray-200 flex-shrink-0 overflow-hidden relative"
          style={{ borderRadius: '3px' }}
        >
          {serverChannelInfo?.server_icon && !serverIconError ? (
            <img
              src={serverChannelInfo.server_icon as string}
              alt="Server Avatar"
              className="w-full h-full object-cover"
              onError={() => {
                setServerIconError(true);
              }}
            />
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400 text-xs">
              {serverChannelInfo?.server_name?.charAt(0).toUpperCase() || '?'}
            </div>
          )}
        </div>
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-lg text-gray-900 truncate">
              {serverChannelInfo?.server_name || 'Loading...'}
            </h3>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Channel:{' '}
            <span className="font-bold text-gray-900 truncate font-medium">
              {serverChannelInfo?.channel_name || 'Loading...'}
            </span>
          </p>
        </div>
      </div>
      {/* Export options */}
      <div className="flex flex-col gap-2 mt-1">
        <label className="text-sm font-semibold text-gray-900">Export Type</label>
        <div className="flex gap-4 mt-1">
          {exportTypeOptions.map((option) => (
            <label key={option.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="exportType"
                value={option.value}
                checked={exportType === option.value}
                onChange={(e) => handleExportTypeChange(e.target.value as ExportType)}
                className="w-4 h-4 text-blue-600 border-gray-300 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
              />
              <span className="text-sm text-gray-700">{option.label}</span>
            </label>
          ))}
        </div>
        {exportType === 'Simulate' && (
          <div className="mt-2 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-900">
            Scroll member list to get user id and nickname. It may be slower, but most secure.
          </div>
        )}
        {exportType === 'API' && (
          <>
            <div className="mt-2 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-900">
              Get full user info. It maybe fail due to Discord verification service during the process.
            </div>
            {/* Admin permission prompt and checkbox */}
            <div className="mt-2 flex flex-col gap-2">
              <label className="flex items-center gap-2 cursor-pointer relative">
                <input
                  type="checkbox"
                  checked={isAdmin}
                  onChange={(e) => setIsAdmin(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
                />
                <span className="text-sm text-gray-700">I am admin</span>
                <div className="relative group">
                  <HelpCircle size={14} className="text-gray-400 cursor-help" />
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 bg-gray-700 text-white text-xs px-3 py-2 rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none z-10">
                    For larger servers requiring admin permission to view all members, only check if you have admin
                    privileges.
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                      <div className="w-2 h-2 bg-gray-700 rotate-45"></div>
                    </div>
                  </div>
                </div>
              </label>
            </div>
          </>
        )}
      </div>

      {/* Export format */}
      <div className="flex flex-col gap-2 mt-2">
        <label className="text-sm font-semibold text-gray-900">Export Format</label>
        <div className="flex gap-4">
          {fileFormatOptions.map((option) => (
            <label key={option.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="fileFormat"
                value={option.value}
                checked={fileFormat === option.value}
                onChange={(e) => setFileFormat(e.target.value)}
                className="w-4 h-4 text-blue-600 border-gray-300 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
              />
              <span className="text-sm text-gray-700">{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Filter */}
      <div className="flex flex-col gap-2 mt-2">
        <label className="text-sm font-semibold text-gray-900">Filter NITRO Users</label>
        <div className="flex gap-4">
          <p className="text-xm text-start text-gray-700 w-full">
            If you need to filter users who had NITRO.{' '}
            <a
              href="https://bot.wkeasy.com/checkout"
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 font-medium underline hover:text-blue-700 inline"
            >
              Contact me.
            </a>
          </p>
        </div>
      </div>

      {/* Error prompt */}
      {error && (
        <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Download button */}
      <Button
        onClick={isLoading ? handleStopAndExport : handleDownload}
        className={`w-full text-white font-medium py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2 ${
          isLoading ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
        }`}
        size="lg"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>
              Fetching data...
              {members > 0 && <span className="ml-1 opacity-90">({members} members)</span>}
            </span>
          </>
        ) : (
          <>
            <div className="w-4 h-4 border-2 border-white rounded-sm flex items-center justify-center">
              <Download size={12} className="text-white" />
            </div>
            <span>Download Now</span>
          </>
        )}
      </Button>

    </div>
  );
}
