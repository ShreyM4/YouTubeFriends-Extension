// =============================================================
// YTF Background Service Worker
// =============================================================
// Network Hub and Auth Manager for the extension.
//
// CRITICAL MV3 CONSTRAINT: This service worker is EPHEMERAL.
// It spins down after ~30 seconds of inactivity. ALL persistent
// state MUST be read from chrome.storage.local. Never assume
// in-memory variables survive between activations.
// =============================================================

importScripts('config.js');

// =============================================================
// AuthManager — Discord OAuth2 identity and token lifecycle
// =============================================================

class AuthManager {
  /**
   * Launch Discord OAuth2 login flow.
   * Uses chrome.identity.launchWebAuthFlow to open the Discord
   * authorization page. The user approves, and we get a code
   * which is exchanged server-side for an access token.
   */
  async login() {
    try {
      const redirectUri = chrome.identity.getRedirectURL();
      const scope = 'identify';

      const authUrl = new URL('https://discord.com/api/oauth2/authorize');
      authUrl.searchParams.set('client_id', CONFIG.DISCORD_CLIENT_ID);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', scope);

      console.log('[AUTH] Launching Discord OAuth flow...');
      console.log('[AUTH] Redirect URI:', redirectUri);

      // Launch the OAuth popup
      const responseUrl = await chrome.identity.launchWebAuthFlow({
        url: authUrl.toString(),
        interactive: true,
      });

      // Extract the authorization code from the redirect URL
      const url = new URL(responseUrl);
      const code = url.searchParams.get('code');

      if (!code) {
        throw new Error('No authorization code received from Discord');
      }

      console.log('[AUTH] Got authorization code, exchanging on server...');

      // Exchange the code server-side (Client Secret stays on server)
      const response = await fetch(`${CONFIG.SERVER_URL}/api/auth/discord`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          redirectUri,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `Server returned ${response.status}`);
      }

      const data = await response.json();
      const { user, accessToken } = data;

      // Persist to chrome.storage.local IMMEDIATELY
      // Never store auth state only in memory — it dies with the service worker
      await chrome.storage.local.set({
        ytf_user: user,
        ytf_token: accessToken,
      });

      console.log(`[AUTH] Login successful: ${user.username} (${user.id})`);

      // Connect SSE and start heartbeat
      await networkManager.connectSSE();
      networkManager.startHeartbeat();

      // Notify any open content scripts about the login
      this._notifyContentScripts('AUTH_STATE_CHANGED', { loggedIn: true, user });

      return user;
    } catch (err) {
      console.error('[AUTH] Login failed:', err.message);
      throw err;
    }
  }

  /**
   * Read the auth token from chrome.storage.local.
   * Returns null if not present — callers MUST handle this.
   */
  async getToken() {
    const result = await chrome.storage.local.get('ytf_token');
    return result.ytf_token || null;
  }

  /**
   * Read the user profile from chrome.storage.local.
   */
  async getUser() {
    const result = await chrome.storage.local.get('ytf_user');
    return result.ytf_user || null;
  }

  /**
   * Check if the user is logged in.
   */
  async isLoggedIn() {
    const token = await this.getToken();
    return token !== null;
  }

  /**
   * Log out — clear storage, close SSE, notify server.
   */
  async logout() {
    const user = await this.getUser();

    // Close SSE connection
    networkManager.disconnectSSE();

    // Stop heartbeat
    await chrome.alarms.clear('ytf_heartbeat');

    // Clear all stored auth state
    await chrome.storage.local.remove(['ytf_user', 'ytf_token']);

    console.log('[AUTH] Logged out');

    // Notify content scripts
    this._notifyContentScripts('AUTH_STATE_CHANGED', { loggedIn: false, user: null });
  }

  /**
   * Broadcast a message to all YouTube tabs.
   */
  async _notifyContentScripts(action, data) {
    try {
      const tabs = await chrome.tabs.query({ url: '*://*.youtube.com/*' });
      for (const tab of tabs) {
        chrome.tabs.sendMessage(tab.id, { action, ...data }).catch(() => {
          // Tab may not have content script loaded yet — ignore
        });
      }
    } catch (err) {
      // No tabs found — that's fine
    }
  }
}

// =============================================================
// NetworkManager — All communication with the Node.js server
// =============================================================

class NetworkManager {
  constructor() {
    /** @type {EventSource|null} */
    this.eventSource = null;

    /** @type {number|null} */
    this.sseRetryTimeout = null;
  }

  /**
   * Open an SSE connection to the server.
   * Must be re-called every time the service worker wakes up
   * if the user is logged in.
   */
  async connectSSE() {
    // Close any existing connection first
    this.disconnectSSE();

    const user = await authManager.getUser();
    if (!user) {
      console.log('[SSE] Cannot connect — no user in storage');
      return;
    }

    const url = `${CONFIG.SERVER_URL}/api/stream?userId=${encodeURIComponent(user.id)}`;
    console.log(`[SSE] Connecting: ${url}`);

    this.eventSource = new EventSource(url);

    this.eventSource.addEventListener('connected', (event) => {
      console.log('[SSE] Stream established');
    });

    this.eventSource.addEventListener('message', (event) => {
      this._handleServerEvent('message', event);
    });

    this.eventSource.addEventListener('message_sent', (event) => {
      this._handleServerEvent('message_sent', event);
    });

    this.eventSource.addEventListener('presence', (event) => {
      this._handleServerEvent('presence', event);
    });

    this.eventSource.addEventListener('signaling', (event) => {
      this._handleServerEvent('signaling', event);
    });

    this.eventSource.addEventListener('typing', (event) => {
      this._handleServerEvent('typing', event);
    });

    this.eventSource.addEventListener('friend_request', (event) => {
      this._handleServerEvent('friend_request', event);
    });

    this.eventSource.addEventListener('friend_accepted', (event) => {
      this._handleServerEvent('friend_accepted', event);
    });

    this.eventSource.addEventListener('reaction', (event) => {
      this._handleServerEvent('reaction', event);
    });

    this.eventSource.addEventListener('sync_invite', (event) => {
      this._handleServerEvent('sync_invite', event);
    });

    this.eventSource.addEventListener('sync_response', (event) => {
      this._handleServerEvent('sync_response', event);
    });

    this.eventSource.addEventListener('sync_start', (event) => {
      this._handleServerEvent('sync_start', event);
    });

    this.eventSource.addEventListener('sync_command', (event) => {
      this._handleServerEvent('sync_command', event);
    });

    this.eventSource.addEventListener('sync_end', (event) => {
      this._handleServerEvent('sync_end', event);
    });

    this.eventSource.addEventListener('sync_pause_request', (event) => {
      this._handleServerEvent('sync_pause_request', event);
    });

    this.eventSource.addEventListener('sync_pause_response', (event) => {
      this._handleServerEvent('sync_pause_response', event);
    });

    this.eventSource.addEventListener('sync_emoji', (event) => {
      this._handleServerEvent('sync_emoji', event);
    });

    this.eventSource.addEventListener('sync_state_request', (event) => {
      this._handleServerEvent('sync_state_request', event);
    });

    this.eventSource.onerror = (err) => {
      console.error('[SSE] Connection error — retrying in 5s');
      this.disconnectSSE();

      // Retry after 5 seconds — do NOT retry immediately
      // or you will hammer the server
      this.sseRetryTimeout = setTimeout(() => {
        this.connectSSE();
      }, 5000);
    };
  }

  /**
   * Close the SSE connection.
   */
  disconnectSSE() {
    if (this.sseRetryTimeout) {
      clearTimeout(this.sseRetryTimeout);
      this.sseRetryTimeout = null;
    }
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
      console.log('[SSE] Disconnected');
    }
  }

  /**
   * Handle an incoming SSE event.
   * Routes events to the appropriate content script.
   *
   * - 'message' → forward to content script for display
   * - 'presence' → update local friend state in storage + forward
   * - 'signaling' → forward to content script for WebRTC
   */
  async _handleServerEvent(eventType, event) {
    try {
      const payload = JSON.parse(event.data);
      console.log(`[SSE] Event received: ${eventType}`, payload);

      // Route sync-specific events exclusively to the active sync tab to avoid multiple-tab reloads/navs
      if (eventType.startsWith('sync_') && eventType !== 'sync_invite') {
        const result = await chrome.storage.local.get('ytf_active_sync_tab_id');
        const syncTabId = result.ytf_active_sync_tab_id;

        if (syncTabId) {
          console.log(`[SSE] Routing sync event ${eventType} exclusively to tab ${syncTabId}`);
          chrome.tabs.sendMessage(syncTabId, {
            action: 'SSE_EVENT',
            eventType,
            payload,
          }).catch(async () => {
            console.warn(`[SSE] Tracked tab ${syncTabId} failed. Falling back to active tab.`);
            const activeTabs = await chrome.tabs.query({ active: true, url: '*://*.youtube.com/*' });
            if (activeTabs.length > 0) {
              chrome.tabs.sendMessage(activeTabs[0].id, {
                action: 'SSE_EVENT',
                eventType,
                payload,
              }).catch(() => {});
            }
          });

          if (eventType === 'sync_end') {
            await chrome.storage.local.remove('ytf_active_sync_tab_id');
          }
          return;
        }
      }

      // Default: Forward to ALL YouTube tabs (not just active one)
      // so conversation lists and presence updates stay up-to-date across tabs
      const tabs = await chrome.tabs.query({ url: '*://*.youtube.com/*' });
      for (const tab of tabs) {
        chrome.tabs.sendMessage(tab.id, {
          action: 'SSE_EVENT',
          eventType,
          payload,
        }).catch(() => {
          // Content script may not be ready — ignore
        });
      }

      // For presence events, also update local storage
      if (eventType === 'presence') {
        await this._updatePresenceInStorage(payload);
      }

      // Safe cleanup of tab tracker if sync ended
      if (eventType === 'sync_end') {
        await chrome.storage.local.remove('ytf_active_sync_tab_id');
      }
    } catch (err) {
      console.error(`[SSE] Error handling ${eventType} event:`, err.message);
    }
  }

  /**
   * Update friend presence state in chrome.storage.local.
   */
  async _updatePresenceInStorage(presenceData) {
    const result = await chrome.storage.local.get('ytf_friends');
    const friends = result.ytf_friends || {};
    friends[presenceData.userId] = {
      ...friends[presenceData.userId],
      status: presenceData.status,
      lastUpdated: presenceData.timestamp,
    };
    await chrome.storage.local.set({ ytf_friends: friends });
  }

  /**
   * Send a POST request to the server.
   * Reads auth token from storage before each call.
   */
  async sendPostRequest(endpoint, data) {
    const token = await authManager.getToken();
    const user = await authManager.getUser();

    const response = await fetch(`${CONFIG.SERVER_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `Server returned ${response.status}`);
    }

    return response.json();
  }

  /**
   * Start the presence heartbeat using chrome.alarms.
   * Fires every ~20 seconds (0.33 minutes).
   *
   * CRITICAL: setInterval MUST NOT be used here — it does not
   * survive service worker suspension. chrome.alarms does.
   */
  startHeartbeat() {
    chrome.alarms.create('ytf_heartbeat', {
      delayInMinutes: 0.33,
      periodInMinutes: 0.33,
    });
    console.log('[HEARTBEAT] Alarm created (every ~20s)');

    // Send an immediate first heartbeat
    this._sendHeartbeat();
  }

  /**
   * Send a single heartbeat POST to the server.
   */
  async _sendHeartbeat() {
    try {
      const user = await authManager.getUser();
      if (!user) return;

      // Only send heartbeat if at least one YouTube tab is open
      const tabs = await chrome.tabs.query({ url: '*://*.youtube.com/*' });
      if (tabs.length === 0) {
        console.log('[HEARTBEAT] No active YouTube tabs. Skipping heartbeat.');
        return;
      }

      await this.sendPostRequest('/api/heartbeat', { userId: user.id });
    } catch (err) {
      console.error('[HEARTBEAT] Failed:', err.message);
    }
  }
}

// =============================================================
// Singleton instances
// =============================================================

const authManager = new AuthManager();
const networkManager = new NetworkManager();

// =============================================================
// Service Worker Lifecycle
// =============================================================

// On install — skip waiting to activate immediately
self.addEventListener('install', () => {
  self.skipWaiting();
  console.log('[SW] Installed');
});

// On activation — check for existing session and reconnect
self.addEventListener('activate', async () => {
  console.log('[SW] Activated — checking for existing session...');
  const loggedIn = await authManager.isLoggedIn();
  if (loggedIn) {
    const user = await authManager.getUser();
    console.log(`[SW] Existing session found: ${user.username} — reconnecting SSE`);
    await networkManager.connectSSE();
    networkManager.startHeartbeat();
  } else {
    console.log('[SW] No existing session');
  }
});

// =============================================================
// chrome.alarms listener — handles heartbeat
// =============================================================

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'ytf_heartbeat') {
    await networkManager._sendHeartbeat();
  }
});

// Listen for tab closure to detect when all YouTube tabs are closed
chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
  try {
    const tabs = await chrome.tabs.query({ url: '*://*.youtube.com/*' });
    if (tabs.length === 0) {
      console.log('[TABS] All YouTube tabs closed. Closing SSE and stopping heartbeats.');
      const user = await authManager.getUser();
      if (user) {
        // Stop heartbeat alarm
        await chrome.alarms.clear('ytf_heartbeat');
        // Close SSE
        networkManager.disconnectSSE();
        // Clear active sync tab ID from storage
        await chrome.storage.local.remove('ytf_active_sync_tab_id');
        // Notify server to mark offline
        await fetch(`${CONFIG.SERVER_URL}/api/auth/offline`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id }),
        }).catch((err) => {
          console.error('[TABS] Failed to notify server of offline status:', err.message);
        });
      }
    }
  } catch (err) {
    console.error('[TABS] Error in onRemoved listener:', err.message);
  }
});

// =============================================================
// chrome.runtime.onMessage — handles messages from content scripts
// =============================================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // All handlers are async, so we return true to keep the message channel open
  (async () => {
    try {
      switch (message.action) {
        case 'LOGIN': {
          const user = await authManager.login();
          sendResponse({ success: true, user });
          break;
        }

        case 'LOGOUT': {
          await authManager.logout();
          sendResponse({ success: true });
          break;
        }

        case 'GET_AUTH_STATE': {
          const loggedIn = await authManager.isLoggedIn();
          const user = loggedIn ? await authManager.getUser() : null;
          sendResponse({ loggedIn, user });
          break;
        }

        // === Username ===
        case 'SET_USERNAME': {
          const user = await authManager.getUser();
          if (!user) { sendResponse({ error: 'Not logged in' }); break; }
          const resp = await networkManager.sendPostRequest('/api/users/set-username', {
            userId: user.id,
            username: message.username,
          });
          // Update local storage with the new username
          user.unique_username = resp.username;
          await chrome.storage.local.set({ ytf_user: user });
          sendResponse({ success: true, username: resp.username });
          break;
        }

        case 'CHECK_USERNAME': {
          const response = await fetch(
            `${CONFIG.SERVER_URL}/api/users/check-username?username=${encodeURIComponent(message.username)}`
          );
          const data = await response.json();
          sendResponse({ success: true, available: data.available });
          break;
        }

        // === Messages ===
        case 'HTTP_POST_MESSAGE': {
          const result = await networkManager.sendPostRequest('/api/messages', {
            senderId: message.senderId,
            receiverId: message.receiverId,
            content: message.content,
            messageType: message.messageType || 'text',
          });
          sendResponse({ success: true, result });
          break;
        }

        case 'FETCH_CONVERSATIONS': {
          const user = await authManager.getUser();
          if (!user) { sendResponse({ error: 'Not logged in' }); break; }
          const response = await fetch(
            `${CONFIG.SERVER_URL}/api/conversations?userId=${encodeURIComponent(user.id)}`
          );
          const data = await response.json();
          sendResponse({ success: true, conversations: data.conversations });
          break;
        }

        case 'FETCH_MESSAGES': {
          const user = await authManager.getUser();
          if (!user) { sendResponse({ error: 'Not logged in' }); break; }
          let url = `${CONFIG.SERVER_URL}/api/conversations/${message.conversationId}/messages?userId=${encodeURIComponent(user.id)}`;
          if (message.before) url += `&before=${encodeURIComponent(message.before)}`;
          const response = await fetch(url);
          const data = await response.json();
          sendResponse({ success: true, messages: data.messages, hasMore: data.hasMore });
          break;
        }

        case 'SEARCH_USERS': {
          const user = await authManager.getUser();
          if (!user) { sendResponse({ error: 'Not logged in' }); break; }
          const response = await fetch(
            `${CONFIG.SERVER_URL}/api/users/search?q=${encodeURIComponent(message.query)}&excludeId=${encodeURIComponent(user.id)}`
          );
          const data = await response.json();
          sendResponse({ success: true, users: data.users });
          break;
        }

        case 'SEND_TYPING': {
          const user = await authManager.getUser();
          if (!user) { sendResponse({ error: 'Not logged in' }); break; }
          await networkManager.sendPostRequest('/api/typing', {
            senderId: user.id,
            receiverId: message.receiverId,
          });
          sendResponse({ success: true });
          break;
        }

        case 'FETCH_MISSED_MESSAGES': {
          const user = await authManager.getUser();
          if (!user) { sendResponse({ error: 'Not logged in' }); break; }
          const response = await fetch(
            `${CONFIG.SERVER_URL}/api/messages/missed?userId=${encodeURIComponent(user.id)}`
          );
          const data = await response.json();
          sendResponse({ success: true, messages: data.messages });
          break;
        }

        // === Friends ===
        case 'SEND_FRIEND_REQUEST': {
          const user = await authManager.getUser();
          if (!user) { sendResponse({ error: 'Not logged in' }); break; }
          const result = await networkManager.sendPostRequest('/api/friends/request', {
            requesterId: user.id,
            addresseeId: message.addresseeId,
          });
          sendResponse({ success: true, result });
          break;
        }

        case 'RESPOND_FRIEND_REQUEST': {
          const result = await networkManager.sendPostRequest('/api/friends/respond', {
            friendshipId: message.friendshipId,
            action: message.responseAction,
          });
          sendResponse({ success: true, result });
          break;
        }

        case 'FETCH_FRIENDS': {
          const user = await authManager.getUser();
          if (!user) { sendResponse({ error: 'Not logged in' }); break; }
          const response = await fetch(
            `${CONFIG.SERVER_URL}/api/friends?userId=${encodeURIComponent(user.id)}`
          );
          const data = await response.json();
          sendResponse({ success: true, friends: data.friends });
          break;
        }

        case 'FETCH_PENDING_REQUESTS': {
          const user = await authManager.getUser();
          if (!user) { sendResponse({ error: 'Not logged in' }); break; }
          const response = await fetch(
            `${CONFIG.SERVER_URL}/api/friends/pending?userId=${encodeURIComponent(user.id)}`
          );
          const data = await response.json();
          sendResponse({ success: true, requests: data.requests });
          break;
        }

        // === Reactions ===
        case 'ADD_REACTION': {
          const user = await authManager.getUser();
          if (!user) { sendResponse({ error: 'Not logged in' }); break; }
          const result = await networkManager.sendPostRequest('/api/reactions', {
            messageId: message.messageId,
            userId: user.id,
            emoji: message.emoji,
          });
          sendResponse({ success: true, result });
          break;
        }

        case 'REMOVE_REACTION': {
          const user = await authManager.getUser();
          if (!user) { sendResponse({ error: 'Not logged in' }); break; }
          const response = await fetch(
            `${CONFIG.SERVER_URL}/api/reactions/${message.reactionId}?userId=${encodeURIComponent(user.id)}`,
            { method: 'DELETE' }
          );
          sendResponse({ success: true });
          break;
        }

        // === Video Sync ===
        case 'SEND_SYNC_INVITE': {
          const user = await authManager.getUser();
          if (!user) { sendResponse({ error: 'Not logged in' }); break; }
          if (sender.tab && sender.tab.id) {
            await chrome.storage.local.set({ ytf_active_sync_tab_id: sender.tab.id });
          }
          const result = await networkManager.sendPostRequest('/api/sync/invite', {
            hostId: user.id,
            guestId: message.guestId,
            videoUrl: message.videoUrl,
            videoTitle: message.videoTitle,
          });
          sendResponse({ success: true, result });
          break;
        }

        case 'RESPOND_SYNC': {
          if (message.responseAction === 'accept' && sender.tab && sender.tab.id) {
            await chrome.storage.local.set({ ytf_active_sync_tab_id: sender.tab.id });
          }
          const result = await networkManager.sendPostRequest('/api/sync/respond', {
            sessionId: message.sessionId,
            action: message.responseAction,
          });
          sendResponse({ success: true, result });
          break;
        }

        case 'REQUEST_SYNC_STATE': {
          const user = await authManager.getUser();
          if (!user) { sendResponse({ error: 'Not logged in' }); break; }
          const result = await networkManager.sendPostRequest('/api/sync/request-state', {
            sessionId: message.sessionId,
            userId: user.id,
          });
          sendResponse({ success: true, result });
          break;
        }

        case 'GET_ACTIVE_SYNC': {
          const user = await authManager.getUser();
          if (!user) { sendResponse({ session: null }); break; }
          const response = await fetch(
            `${CONFIG.SERVER_URL}/api/sync/active?userId=${encodeURIComponent(user.id)}`
          );
          const data = await response.json();
          sendResponse({ success: true, session: data.session, isHost: data.isHost });
          break;
        }

        case 'SEND_SYNC_COMMAND': {
          const user = await authManager.getUser();
          if (!user) { sendResponse({ error: 'Not logged in' }); break; }
          const result = await networkManager.sendPostRequest('/api/sync/command', {
            sessionId: message.sessionId,
            hostId: user.id,
            command: message.command,
            timestamp: message.timestamp,
          });
          sendResponse({ success: true, result });
          break;
        }

        case 'END_SYNC': {
          const user = await authManager.getUser();
          if (!user) { sendResponse({ error: 'Not logged in' }); break; }
          await chrome.storage.local.remove('ytf_active_sync_tab_id');
          const result = await networkManager.sendPostRequest('/api/sync/end', {
            sessionId: message.sessionId,
            userId: user.id,
          });
          sendResponse({ success: true, result });
          break;
        }

        // === Sync Pause Request ===
        case 'SEND_PAUSE_REQUEST': {
          const user = await authManager.getUser();
          if (!user) { sendResponse({ error: 'Not logged in' }); break; }
          const result = await networkManager.sendPostRequest('/api/sync/pause-request', {
            sessionId: message.sessionId,
            guestId: user.id,
            requestType: message.requestType,
          });
          sendResponse({ success: true, result });
          break;
        }

        case 'RESPOND_PAUSE_REQUEST': {
          const user = await authManager.getUser();
          if (!user) { sendResponse({ error: 'Not logged in' }); break; }
          const result = await networkManager.sendPostRequest('/api/sync/pause-respond', {
            sessionId: message.sessionId,
            hostId: user.id,
            action: message.responseAction,
            requestType: message.requestType,
          });
          sendResponse({ success: true, result });
          break;
        }

        // === Synced Emoji ===
        case 'SEND_SYNC_EMOJI': {
          const user = await authManager.getUser();
          if (!user) { sendResponse({ error: 'Not logged in' }); break; }
          const result = await networkManager.sendPostRequest('/api/sync/emoji', {
            sessionId: message.sessionId,
            userId: user.id,
            emoji: message.emoji,
          });
          sendResponse({ success: true, result });
          break;
        }

        // === Signaling ===
        case 'HTTP_POST_SIGNALING': {
          const result = await networkManager.sendPostRequest('/api/signaling', {
            senderId: message.senderId,
            targetId: message.targetId,
            payload: message.payload,
          });
          sendResponse({ success: true, result });
          break;
        }

        default:
          sendResponse({ error: `Unknown action: ${message.action}` });
      }
    } catch (err) {
      console.error(`[MSG] Error handling "${message.action}":`, err.message);
      sendResponse({ error: err.message });
    }
  })();

  // Return true to indicate async response
  return true;
});

// =============================================================
// chrome.action.onClicked — toggle sidebar via extension icon
// =============================================================

chrome.action.onClicked.addListener(async (tab) => {
  if (tab.url && tab.url.includes('youtube.com')) {
    chrome.tabs.sendMessage(tab.id, { action: 'TOGGLE_SIDEBAR' }).catch(() => {
      console.log('[ACTION] Content script not ready on this tab');
    });
  }
});

// =============================================================
// Service worker wake-up reconnection
// =============================================================
// The service worker can die and restart at any time.
// On every wake-up, we check if the user is logged in and
// reconnect SSE if needed. The 'activate' event only fires once,
// so we use a self-executing init for subsequent wake-ups.
// =============================================================

(async () => {
  const loggedIn = await authManager.isLoggedIn();
  if (loggedIn && !networkManager.eventSource) {
    const user = await authManager.getUser();
    console.log(`[SW] Wake-up reconnect: ${user?.username}`);
    await networkManager.connectSSE();
    // Heartbeat alarm persists across wake-ups, no need to recreate
  }
})();
