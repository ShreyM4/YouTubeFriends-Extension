// =============================================================
// YTF Content Script — Major Update Build
// =============================================================
// All 18 features implemented:
//  1.  Emoji-only messages send correctly
//  2.  Enter sends, Shift+Enter newline (textarea)
//  3.  Watch Together invite as popup notification
//  4.  Viewer blocked from play/pause/seek during sync
//  5.  Pause request system (viewer → host)
//  6.  Leave Watch Party button
//  7.  Fullscreen button deduplication
//  8.  Fullscreen emoji only during Watch Together
//  9.  Synced emoji reactions between users
//  10. Emoji rate limiting (1/sec cooldown)
//  11. Fullscreen chat button working
//  12. Username persistence (server returns unique_username)
//  13. Sidebar as floating overlay (no layout shift)
//  14. YTF Share button in YouTube action bar
//  15. YTF Share flow (sidebar → select friend)
//  16. Rich video share cards in chat
//  17. Soft navigation for shared videos
//  18. Shorts support
// =============================================================

(function () {
  'use strict';

  if (window.__ytfInitialized) return;
  window.__ytfInitialized = true;

  // =============================================================
  // Constants
  // =============================================================
  const REACTION_EMOJIS = ['❤️', '😂', '😮', '👍', '🎉', '😢'];
  const FULLSCREEN_EMOJIS = ['❤️', '😂', '😢', '😱', '👏', '😊'];
  const EMOJI_CATEGORIES = {
    '😀': ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','😉','😊','😇','🥰','😍','🤩','😘','😗','😋','😛','😜','🤪','😝','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','😮‍💨','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🥴','😵','🤯','🤠','🥳','🥸','😎','🤓','🧐'],
    '👋': ['👋','🤚','🖐️','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏'],
    '❤️': ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟'],
    '🐾': ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐔','🐧','🐦','🦅','🦆','🦉','🐺','🐗','🐴','🦄','🐝','🐛','🦋','🐌','🐞'],
    '🍕': ['🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🥑','🍕','🍔','🍟','🌭','🍿','🧁','🍩','🍪','🎂','🍰','🧇','🥞','🍫','🍬','🍭'],
    '⚽': ['⚽','🏀','🏈','⚾','🥎','🎾','🏐','🎮','🕹️','🎲','♟️','🎯','🎳','🎪','🎨','🎬','🎤','🎧','🎼','🎹','🎸','🎺','🥁','🎻','🏆','🥇','🥈','🥉','🏅','🎖️','🎗️'],
  };

  const DISCORD_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 127.14 96.36" fill="currentColor"><path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z"/></svg>`;
  const EMOJI_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><circle cx="8.5" cy="10" r="1" fill="white" stroke="none"/><circle cx="15.5" cy="10" r="1" fill="white" stroke="none"/><path d="M8 14.5c1 1.8 3 2.5 4 2.5s3-.7 4-2.5" stroke-linecap="round"/></svg>`;
  const CHAT_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.2L4 17.2V4h16v12z"/></svg>`;
  const YTF_SHARE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M21 12l-7-7v4C7 10 4 15 3 20c2.5-3.5 6-5.1 11-5.1V19l7-7z"/></svg>`;

  // =============================================================
  // Utility Functions
  // =============================================================
  function formatRelativeTime(iso) {
    if (!iso) return '';
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return 'now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    const d = new Date(iso), y = new Date(); y.setDate(y.getDate() - 1);
    if (d.toDateString() === y.toDateString()) return 'Yesterday';
    if (diff < 604800) return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  function formatMsgTime(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }
  function dateDividerNeeded(prev, curr) {
    if (!prev) return true;
    return new Date(prev).toDateString() !== new Date(curr).toDateString();
  }
  function formatDateDivider(iso) {
    const d = new Date(iso), t = new Date(), y = new Date(t); y.setDate(y.getDate() - 1);
    if (d.toDateString() === t.toDateString()) return 'Today';
    if (d.toDateString() === y.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  }
  function esc(text) {
    if (!text) return '';
    const d = document.createElement('div'); d.textContent = text; return d.innerHTML;
  }
  function isWatchPage() { return window.location.pathname === '/watch'; }
  function isShortsPage() { return window.location.pathname.startsWith('/shorts/'); }
  function getVideoId() {
    if (isShortsPage()) {
      const m = window.location.pathname.match(/\/shorts\/([^/?]+)/);
      return m ? m[1] : null;
    }
    return new URLSearchParams(window.location.search).get('v');
  }
  // Soft-navigate using YouTube's SPA router (#17)
  function ytNavigate(url) {
    try {
      const urlObj = new URL(url, window.location.origin);
      const relativeUrl = urlObj.pathname + urlObj.search + urlObj.hash;
      const a = document.createElement('a');
      a.className = 'yt-simple-endpoint';
      a.href = relativeUrl;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => a.remove(), 100);
      console.log(`[YTF] Initiated SPA soft-navigation to: ${relativeUrl}`);
    } catch (e) {
      console.error('[YTF] Soft navigation error, falling back to window.location.href:', e);
      window.location.href = url;
    }
  }

  // =============================================================
  // Styles — injected into Shadow DOM
  // =============================================================
  const STYLES = `
    :host {
      --bg: #0f0f0f; --bg-raised: #212121; --bg-menu: #282828;
      --bg-hover: #ffffff1a; --text: #f1f1f1; --text2: #aaaaaa;
      --text3: #717171; --blue: #3ea6ff; --red: #ff0000;
      --border: #ffffff1a; --font: 'Roboto', Arial, sans-serif;
      --radius-sm: 8px; --radius-md: 12px; --radius-pill: 50px;
      --radius-bubble: 18px; --sidebar-w: 360px;
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    /* === Floating Trigger === */
    .ytf-trigger {
      position: fixed; right: 0; width: 28px; height: 56px;
      background: var(--bg-raised); border: 1px solid var(--border);
      border-right: none; border-radius: 12px 0 0 12px;
      cursor: grab; z-index: 2147483646; display: flex;
      align-items: center; justify-content: center;
      transition: width 0.2s ease, background 0.15s ease;
      box-shadow: -2px 2px 8px rgba(0,0,0,0.4);
      user-select: none; -webkit-user-select: none;
    }
    .ytf-trigger:hover { width: 36px; background: var(--bg-menu); }
    .ytf-trigger.dragging { cursor: grabbing; transition: none; }
    .ytf-trigger-icon { font-size: 14px; color: var(--blue); pointer-events: none; }
    .ytf-trigger.has-notif::after {
      content: ''; position: absolute; top: 8px; left: 6px;
      width: 8px; height: 8px; border-radius: 50%;
      background: var(--red); border: 2px solid var(--bg-raised);
    }

    /* === Sidebar (floating overlay — NO layout shift) === */
    .ytf-sidebar {
      position: fixed; top: 0; right: 0; width: var(--sidebar-w);
      height: 100vh; background: var(--bg);
      border-left: 1px solid var(--border); z-index: 2147483647;
      display: flex; flex-direction: column; font-family: var(--font);
      color: var(--text); transform: translateX(var(--sidebar-w));
      transition: transform 220ms ease-out;
    }
    .ytf-sidebar.open { transform: translateX(0); }

    /* === Header === */
    .ytf-header {
      height: 48px; min-height: 48px; display: flex;
      align-items: center; padding: 0 12px;
      border-bottom: 1px solid var(--border); gap: 8px;
    }
    .ytf-header-avatar { width: 28px; height: 28px; border-radius: 50%; object-fit: cover; }
    .ytf-header-avatar.online { border: 2px solid #22c55e; }
    .ytf-header-title { font-size: 15px; font-weight: 500; flex: 1; }
    .ytf-hbtn {
      width: 36px; height: 36px; border-radius: 50%; border: none;
      background: transparent; color: var(--text2); cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      font-size: 16px; transition: background 0.1s; flex-shrink: 0;
    }
    .ytf-hbtn:hover { background: var(--bg-hover); }

    /* === Tabs === */
    .ytf-tabs { display: flex; border-bottom: 1px solid var(--border); min-height: 40px; }
    .ytf-tab {
      flex: 1; display: flex; align-items: center; justify-content: center;
      font-family: var(--font); font-size: 13px; font-weight: 500;
      color: var(--text2); background: none; border: none;
      border-bottom: 2px solid transparent; cursor: pointer;
      transition: color 0.15s, border-color 0.15s; padding: 0 4px; position: relative;
    }
    .ytf-tab.active { color: var(--text); border-bottom-color: var(--blue); }
    .ytf-tab:hover { color: var(--text); }
    .ytf-tab-badge { position: absolute; top: 4px; right: 12px; width: 8px; height: 8px; border-radius: 50%; background: var(--red); }

    /* === Content Area === */
    .ytf-content { flex: 1; overflow-y: auto; display: flex; flex-direction: column; }
    .ytf-content::-webkit-scrollbar { width: 4px; }
    .ytf-content::-webkit-scrollbar-thumb { background: var(--text3); border-radius: 4px; }

    /* === Login === */
    .ytf-login { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; text-align: center; gap: 14px; }
    .ytf-login-icon { font-size: 48px; }
    .ytf-login-title { font-size: 18px; font-weight: 500; }
    .ytf-login-sub { font-size: 13px; color: var(--text2); line-height: 1.5; max-width: 260px; }
    .ytf-login-btn { display: flex; align-items: center; gap: 8px; padding: 10px 22px; border: none; border-radius: var(--radius-pill); background: #5865F2; color: #fff; font-family: var(--font); font-size: 14px; font-weight: 500; cursor: pointer; transition: background 0.15s, transform 0.1s; }
    .ytf-login-btn:hover { background: #4752C4; }
    .ytf-login-btn:active { transform: scale(0.97); }
    .ytf-login-btn svg { width: 20px; height: 20px; }
    .ytf-login-btn.loading { opacity: 0.7; pointer-events: none; }
    .ytf-login-error { font-size: 12px; color: #f87171; max-width: 260px; }

    /* === Onboarding === */
    .ytf-onboard { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; text-align: center; gap: 12px; }
    .ytf-onboard-title { font-size: 18px; font-weight: 500; }
    .ytf-onboard-sub { font-size: 13px; color: var(--text2); line-height: 1.5; max-width: 260px; }
    .ytf-onboard-input-wrap { display: flex; align-items: center; gap: 4px; padding: 8px 14px; border: 1px solid var(--border); border-radius: var(--radius-pill); background: var(--bg-raised); width: 240px; transition: border-color 0.15s; }
    .ytf-onboard-input-wrap:focus-within { border-color: var(--blue); }
    .ytf-onboard-at { color: var(--text2); font-size: 14px; }
    .ytf-onboard-input { flex: 1; background: none; border: none; color: var(--text); font-family: var(--font); font-size: 14px; outline: none; }
    .ytf-onboard-status { font-size: 11px; height: 16px; }
    .ytf-onboard-status.ok { color: #22c55e; }
    .ytf-onboard-status.err { color: #f87171; }
    .ytf-onboard-btn { padding: 8px 28px; border: none; border-radius: var(--radius-pill); background: var(--blue); color: #0f0f0f; font-family: var(--font); font-size: 14px; font-weight: 500; cursor: pointer; transition: opacity 0.15s; }
    .ytf-onboard-btn:disabled { opacity: 0.4; cursor: default; }

    /* === Row === */
    .ytf-row { display: flex; align-items: center; padding: 10px 14px; gap: 10px; cursor: pointer; transition: background 0.1s; min-height: 64px; }
    .ytf-row:hover { background: var(--bg-hover); }
    .ytf-av-wrap { position: relative; flex-shrink: 0; }
    .ytf-av { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; }
    .ytf-av.off { opacity: 0.7; }
    .ytf-dot-on { position: absolute; bottom: 0; right: 0; width: 10px; height: 10px; border-radius: 50%; background: #22c55e; border: 2px solid var(--bg); }
    .ytf-row-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
    .ytf-row-top { display: flex; justify-content: space-between; align-items: center; }
    .ytf-row-name { font-size: 13px; font-weight: 400; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .ytf-row-name.unread { font-weight: 500; }
    .ytf-row-handle { font-size: 11px; color: var(--text3); }
    .ytf-row-time { font-size: 11px; color: var(--text3); flex-shrink: 0; margin-left: 6px; }
    .ytf-row-bottom { display: flex; align-items: center; }
    .ytf-row-preview { font-size: 12px; color: var(--text2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; }
    .ytf-row-preview.unread { color: var(--text); font-weight: 500; }
    .ytf-badge { width: 8px; height: 8px; border-radius: 50%; background: var(--blue); flex-shrink: 0; margin-left: 6px; }

    /* === Empty / Loading === */
    .ytf-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; text-align: center; gap: 10px; }
    .ytf-empty-icon { font-size: 36px; opacity: 0.6; }
    .ytf-empty-text { font-size: 13px; color: var(--text2); line-height: 1.5; }
    .ytf-loading { display: flex; align-items: center; justify-content: center; padding: 16px; color: var(--text3); font-size: 12px; }

    /* === Profile Bar === */
    .ytf-profile { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-top: 1px solid var(--border); }
    .ytf-profile-av { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 2px solid #22c55e; }
    .ytf-profile-info { flex: 1; min-width: 0; }
    .ytf-profile-name { font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .ytf-profile-handle { font-size: 11px; color: #22c55e; }
    .ytf-logout-btn { padding: 4px 12px; border: 1px solid var(--border); border-radius: var(--radius-pill); background: none; color: var(--text2); font-family: var(--font); font-size: 11px; cursor: pointer; transition: background 0.1s; }
    .ytf-logout-btn:hover { background: var(--bg-hover); color: var(--text); }

    /* === Search === */
    .ytf-search-wrap { padding: 8px 12px; border-bottom: 1px solid var(--border); }
    .ytf-search { width: 100%; padding: 7px 12px; border: 1px solid var(--border); border-radius: var(--radius-pill); background: var(--bg-raised); color: var(--text); font-family: var(--font); font-size: 13px; outline: none; }
    .ytf-search:focus { border-color: var(--blue); }
    .ytf-search::placeholder { color: var(--text3); }

    /* === Friend Buttons === */
    .ytf-fr-btn { padding: 4px 14px; border: none; border-radius: var(--radius-pill); font-family: var(--font); font-size: 11px; font-weight: 500; cursor: pointer; transition: opacity 0.15s; }
    .ytf-fr-btn.accept { background: var(--blue); color: #0f0f0f; }
    .ytf-fr-btn.reject { background: var(--bg-hover); color: var(--text2); margin-left: 4px; }
    .ytf-fr-btn.send { background: var(--blue); color: #0f0f0f; }
    .ytf-fr-btn.sent { background: var(--bg-hover); color: var(--text3); pointer-events: none; }

    /* === Chat Window === */
    .ytf-chat { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: var(--bg); display: flex; flex-direction: column; transform: translateX(100%); transition: transform 240ms ease-out; z-index: 10; }
    .ytf-chat.open { transform: translateX(0); }
    .ytf-chat-header { height: 52px; min-height: 52px; display: flex; align-items: center; padding: 0 6px; border-bottom: 1px solid var(--border); gap: 6px; background: var(--bg); flex-shrink: 0; }
    .ytf-chat-back { width: 32px; height: 32px; border-radius: 50%; border: none; background: none; color: var(--text2); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 18px; }
    .ytf-chat-back:hover { background: var(--bg-hover); }
    .ytf-chat-av { width: 28px; height: 28px; border-radius: 50%; object-fit: cover; }
    .ytf-chat-info { flex: 1; min-width: 0; }
    .ytf-chat-name { font-size: 13px; font-weight: 500; }
    .ytf-chat-status { font-size: 11px; color: var(--text3); }
    .ytf-chat-status.online { color: #22c55e; }
    .ytf-sync-btn { padding: 4px 10px; border: 1px solid var(--blue); border-radius: var(--radius-pill); background: none; color: var(--blue); font-family: var(--font); font-size: 11px; cursor: pointer; transition: background 0.15s; white-space: nowrap; }
    .ytf-sync-btn:hover { background: rgba(62,166,255,0.15); }
    .ytf-sync-btn.leave { border-color: var(--red); color: var(--red); }
    .ytf-sync-btn.leave:hover { background: rgba(255,0,0,0.15); }

    /* === Messages === */
    .ytf-msgs { flex: 1; overflow-y: auto; padding: 10px 12px; display: flex; flex-direction: column; gap: 3px; }
    .ytf-msgs::-webkit-scrollbar { width: 4px; }
    .ytf-msgs::-webkit-scrollbar-thumb { background: var(--text3); border-radius: 4px; }
    .ytf-msg-grp { display: flex; flex-direction: column; margin-bottom: 1px; }
    .ytf-msg-grp.sent { align-items: flex-end; }
    .ytf-msg-grp.recv { align-items: flex-start; }
    .ytf-bubble { padding: 7px 11px; max-width: 75%; word-wrap: break-word; white-space: pre-wrap; font-size: 13px; line-height: 1.4; animation: bubIn 150ms ease-out; position: relative; }
    .ytf-bubble.sent { background: var(--blue); color: #0f0f0f; border-radius: var(--radius-bubble); border-bottom-right-radius: 4px; }
    .ytf-bubble.recv { background: var(--bg-raised); color: var(--text); border-radius: var(--radius-bubble); border-bottom-left-radius: 4px; }
    .ytf-bubble:hover .ytf-react-trigger { opacity: 1; }
    .ytf-react-trigger { position: absolute; top: -4px; opacity: 0; width: 24px; height: 24px; border-radius: 50%; background: var(--bg-menu); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; font-size: 12px; cursor: pointer; transition: opacity 0.15s; }
    .ytf-bubble.sent .ytf-react-trigger { left: -28px; }
    .ytf-bubble.recv .ytf-react-trigger { right: -28px; }
    .ytf-reactions-bar { display: flex; gap: 2px; flex-wrap: wrap; margin-top: 2px; }
    .ytf-reaction-chip { display: flex; align-items: center; gap: 2px; padding: 1px 6px; border-radius: 10px; background: var(--bg-menu); border: 1px solid var(--border); font-size: 12px; cursor: pointer; transition: border-color 0.1s; }
    .ytf-reaction-chip.mine { border-color: var(--blue); }
    .ytf-msg-meta { font-size: 10px; color: var(--text3); padding: 1px 4px; }
    .ytf-msg-meta.sent { text-align: right; }
    .ytf-msg-divider { text-align: center; padding: 10px 0 6px; font-size: 10px; color: var(--text3); }

    /* === Video Share Card (#16) === */
    .ytf-video-card { background: var(--bg-menu); border: 1px solid var(--border); border-radius: var(--radius-md); overflow: hidden; max-width: 260px; cursor: pointer; transition: border-color 0.15s; }
    .ytf-video-card:hover { border-color: var(--blue); }
    .ytf-video-thumb-wrap { position: relative; width: 100%; }
    .ytf-video-thumb { width: 100%; height: 140px; object-fit: cover; background: #000; display: block; }
    .ytf-video-dur { position: absolute; bottom: 6px; right: 6px; background: rgba(0,0,0,0.8); color: #fff; font-size: 10px; padding: 1px 4px; border-radius: 3px; font-family: var(--font); }
    .ytf-video-info { padding: 8px 10px; }
    .ytf-video-title { font-size: 12px; font-weight: 500; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .ytf-video-channel { font-size: 10px; color: var(--text3); margin-top: 2px; }
    .ytf-video-shorts-badge { display: inline-block; background: var(--red); color: #fff; font-size: 9px; font-weight: 500; padding: 1px 5px; border-radius: 3px; margin-top: 3px; }

    /* === Sync Card === */
    .ytf-sync-card { background: var(--bg-menu); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 10px; margin: 6px 0; animation: bubIn 150ms ease-out; }
    .ytf-sync-card-title { font-size: 12px; font-weight: 500; margin-bottom: 4px; }
    .ytf-sync-card-sub { font-size: 11px; color: var(--text2); margin-bottom: 8px; }
    .ytf-sync-card-btns { display: flex; gap: 6px; }

    /* === Typing === */
    .ytf-typing { display: flex; align-items: center; gap: 4px; padding: 7px 11px; background: var(--bg-raised); border-radius: var(--radius-bubble); border-bottom-left-radius: 4px; align-self: flex-start; max-width: 60px; }
    .ytf-typing.hidden { display: none; }
    .ytf-typing-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--text2); animation: typBounce 1.2s infinite ease-in-out; }
    .ytf-typing-dot:nth-child(2) { animation-delay: 0.2s; }
    .ytf-typing-dot:nth-child(3) { animation-delay: 0.4s; }

    /* === Input Bar (textarea for Shift+Enter) === */
    .ytf-input-bar { display: flex; align-items: flex-end; padding: 6px 10px; border-top: 1px solid var(--border); gap: 6px; flex-shrink: 0; }
    .ytf-emoji-btn { width: 32px; height: 32px; border-radius: 50%; border: none; background: none; color: var(--text2); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 18px; transition: background 0.1s; flex-shrink: 0; }
    .ytf-emoji-btn:hover { background: var(--bg-hover); }
    .ytf-input { flex: 1; padding: 7px 12px; border: 1px solid var(--border); border-radius: 18px; background: var(--bg-raised); color: var(--text); font-family: var(--font); font-size: 13px; outline: none; resize: none; max-height: 100px; min-height: 34px; line-height: 1.4; overflow-y: auto; }
    .ytf-input:focus { border-color: var(--blue); }
    .ytf-input::placeholder { color: var(--text3); }
    .ytf-send { width: 32px; height: 32px; border-radius: 50%; border: none; background: var(--blue); color: #0f0f0f; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 16px; transition: opacity 0.1s; flex-shrink: 0; }
    .ytf-send:disabled { opacity: 0.3; cursor: default; }

    /* === Emoji Picker === */
    .ytf-picker { position: absolute; bottom: 52px; left: 8px; right: 8px; background: var(--bg-menu); border: 1px solid var(--border); border-radius: var(--radius-md); z-index: 20; max-height: 260px; display: flex; flex-direction: column; animation: bubIn 120ms ease-out; }
    .ytf-picker.hidden { display: none; }
    .ytf-picker-tabs { display: flex; border-bottom: 1px solid var(--border); overflow-x: auto; min-height: 36px; }
    .ytf-picker-tab { padding: 6px 0; background: none; border: none; border-bottom: 2px solid transparent; color: var(--text2); font-size: 18px; cursor: pointer; white-space: nowrap; font-family: var(--font); flex: 1; display: flex; align-items: center; justify-content: center; transition: border-color 0.15s; }
    .ytf-picker-tab.active { border-bottom-color: var(--blue); }
    .ytf-picker-tab:hover { background: var(--bg-hover); }
    .ytf-picker-grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 2px; padding: 6px; overflow-y: auto; max-height: 200px; }
    .ytf-picker-emoji { width: 100%; aspect-ratio: 1; display: flex; align-items: center; justify-content: center; font-size: 20px; cursor: pointer; border-radius: 6px; transition: background 0.1s; border: none; background: none; }
    .ytf-picker-emoji:hover { background: var(--bg-hover); }

    /* === Reaction Picker (mini) === */
    .ytf-react-picker { position: absolute; z-index: 30; background: var(--bg-menu); border: 1px solid var(--border); border-radius: var(--radius-pill); padding: 4px 6px; display: flex; gap: 2px; animation: bubIn 100ms ease-out; box-shadow: 0 4px 12px rgba(0,0,0,0.5); }
    .ytf-react-emoji { width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-size: 16px; cursor: pointer; border-radius: 50%; border: none; background: none; transition: background 0.1s; }
    .ytf-react-emoji:hover { background: var(--bg-hover); }

    /* === Spinner === */
    .ytf-spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite; }

    /* === Animations === */
    @keyframes bubIn { from { opacity: 0; transform: scale(0.85); } to { opacity: 1; transform: scale(1); } }
    @keyframes fadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes typBounce { 0%,60%,100% { transform: translateY(0); } 30% { transform: translateY(-5px); } }
    @keyframes slideDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
  `;

  // =============================================================
  // SidebarUI Class
  // =============================================================
  class SidebarUI {
    constructor() {
      this.host = null; this.shadowRoot = null; this.sidebar = null;
      this.trigger = null; this.isOpen = false; this.currentUser = null;
      this.conversations = []; this.friends = []; this.pendingRequests = [];
      this.activeConversation = null; this.chatMessages = [];
      this.chatWindow = null; this.activeTab = 'chats';
      this._typingDebounce = null; this._peerTypingTimeout = null;
      this._searchDebounce = null; this._pickerOpen = false;
      this._reactionPicker = null;
      this._dragState = null; this._triggerTop = 120;
      // Sync state
      this.syncSession = null; this.isHost = false;
      this._syncLock = false; this._videoListeners = null;
      this.hostState = null; // Track host's video state for viewer sync
      this._driftInterval = null; // Periodic drift correction for viewers
      // Fullscreen state
      this._fsChat = null; this._fsTray = null; this._fsCtrl = null;
      // Keyboard capture ref
      this._kbCapture = null;
      // Share state
      this._pendingShare = null;
      this._ytfShareBtn = null;
      this._ytfShareObserver = null;
      // Emoji cooldown (#10)
      this._lastEmojiSent = 0;
      this._emojiCooldown = false;
    }

    init() {
      this.host = document.createElement('div');
      this.host.id = 'yt-watch-party-host';
      document.body.appendChild(this.host);
      this.shadowRoot = this.host.attachShadow({ mode: 'closed' });

      const fontLink = document.createElement('link');
      fontLink.rel = 'stylesheet';
      fontLink.href = 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap';
      this.shadowRoot.appendChild(fontLink);

      const style = document.createElement('style');
      style.textContent = STYLES;
      this.shadowRoot.appendChild(style);

      // Create floating trigger
      this.trigger = document.createElement('div');
      this.trigger.classList.add('ytf-trigger');
      this.trigger.style.top = this._triggerTop + 'px';
      this.trigger.innerHTML = '<span class="ytf-trigger-icon">💬</span>';
      this.trigger.addEventListener('mousedown', (e) => this._onTriggerMouseDown(e));
      this.shadowRoot.appendChild(this.trigger);

      // Create sidebar
      this.sidebar = document.createElement('div');
      this.sidebar.classList.add('ytf-sidebar');
      this.shadowRoot.appendChild(this.sidebar);

      // Restore panel state if open
      if (this.isOpen) {
        this.sidebar.classList.add('open');
        this.trigger.style.display = 'none';
      }

      // Stop keyboard event propagation to prevent YouTube player shortcuts when typing in sidebar
      ['keydown', 'keyup', 'keypress'].forEach(type => {
        this.shadowRoot.addEventListener(type, (e) => {
          e.stopPropagation();
        });
      });

      this._setupFullscreenListener();
      this._setupYTFShareButton(); // #14: YTF Share button in action bar

      // If we already have a syncSession, hook the video sync!
      if (this.syncSession) {
        setTimeout(() => this._hookVideoSync(), 1500);
      }

      this._checkAuthAndRender();
    }

    // ==========================================================
    // Keyboard Capture — document-level capturing phase
    // ==========================================================
    _setupKeyboardCapture() {
      // Replaced by shadow root and _fsChat bubbling listeners
    }

    // ==========================================================
    // Trigger Drag
    // ==========================================================
    _onTriggerMouseDown(e) {
      if (e.button !== 0) return;
      const startY = e.clientY;
      const startTop = this._triggerTop;
      let dragged = false;
      const onMove = (me) => {
        const dy = me.clientY - startY;
        if (!dragged && Math.abs(dy) > 3) dragged = true;
        if (dragged) {
          const newTop = Math.max(10, Math.min(window.innerHeight - 66, startTop + dy));
          this._triggerTop = newTop;
          if (this.trigger) { this.trigger.style.top = newTop + 'px'; this.trigger.classList.add('dragging'); }
        }
      };
      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        if (this.trigger) this.trigger.classList.remove('dragging');
        if (!dragged) this._togglePanel();
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    }

    // ==========================================================
    // Panel Toggle — NO layout shift (#13)
    // ==========================================================
    _togglePanel() {
      if (!this.sidebar || !this.trigger) return;
      this.isOpen = !this.isOpen;
      this.sidebar.classList.toggle('open', this.isOpen);
      this.trigger.style.display = this.isOpen ? 'none' : '';
      // #13: NO _adjustYouTubeLayout — sidebar floats as overlay
    }

    // ==========================================================
    // Auth
    // ==========================================================
    async _checkAuthAndRender() {
      if (this.currentUser) {
        if (!this.syncSession) {
          try {
            const r = await this._msg({ action: 'GET_ACTIVE_SYNC' });
            if (r && r.session) {
              this.syncSession = r.session;
              this.isHost = r.isHost;
              setTimeout(() => {
                this._hookVideoSync();
                this._requestHostState();
              }, 1500);
            }
          } catch (e) {}
        }
        if (!this.currentUser.unique_username) this._renderOnboarding();
        else this._renderMain();
        return;
      }
      try {
        const r = await this._msg({ action: 'GET_AUTH_STATE' });
        if (r && r.loggedIn) {
          this.currentUser = r.user;
          try {
            const syncR = await this._msg({ action: 'GET_ACTIVE_SYNC' });
            if (syncR && syncR.session) {
              this.syncSession = syncR.session;
              this.isHost = syncR.isHost;
              setTimeout(() => {
                this._hookVideoSync();
                this._requestHostState();
              }, 1500);
            }
          } catch (e) {}
          if (!r.user.unique_username) this._renderOnboarding();
          else this._renderMain();
        } else {
          this._renderLogin();
        }
      } catch (e) { this._renderLogin(); }
    }

    // ==========================================================
    // Login
    // ==========================================================
    _renderLogin() {
      if (!this.sidebar) return;
      this.sidebar.innerHTML = `
        <div class="ytf-header"><span class="ytf-header-title">YTF</span>
          <button class="ytf-hbtn" id="ytf-close">✕</button></div>
        <div class="ytf-login">
          <div class="ytf-login-icon">🎬</div>
          <div class="ytf-login-title">YouTube Friends</div>
          <div class="ytf-login-sub">Watch together, chat, and sync videos with friends.</div>
          <button class="ytf-login-btn" id="ytf-login">${DISCORD_LOGO_SVG} Login with Discord</button>
          <div class="ytf-login-error" id="ytf-err" style="display:none"></div>
        </div>`;
      this.shadowRoot.getElementById('ytf-close').addEventListener('click', () => this._togglePanel());
      const btn = this.shadowRoot.getElementById('ytf-login');
      const err = this.shadowRoot.getElementById('ytf-err');
      btn.addEventListener('click', async () => {
        btn.classList.add('loading'); btn.innerHTML = `<div class="ytf-spinner"></div> Connecting...`; err.style.display = 'none';
        try {
          const r = await this._msg({ action: 'LOGIN' });
          if (r?.success) { this.currentUser = r.user; if (!r.user.unique_username) this._renderOnboarding(); else this._renderMain(); }
          else throw new Error(r?.error || 'Login failed');
        } catch (e) { err.textContent = e.message; err.style.display = 'block'; btn.classList.remove('loading'); btn.innerHTML = `${DISCORD_LOGO_SVG} Login with Discord`; }
      });
    }

    // ==========================================================
    // Onboarding
    // ==========================================================
    _renderOnboarding() {
      if (!this.sidebar) return;
      this.sidebar.innerHTML = `
        <div class="ytf-header"><span class="ytf-header-title">YTF</span></div>
        <div class="ytf-onboard">
          <div class="ytf-login-icon">👋</div>
          <div class="ytf-onboard-title">Choose your username</div>
          <div class="ytf-onboard-sub">Pick a unique @username. This is how friends will find you.</div>
          <div class="ytf-onboard-input-wrap">
            <span class="ytf-onboard-at">@</span>
            <input class="ytf-onboard-input" id="ytf-uname" placeholder="${esc(this.currentUser?.username || 'username')}" maxlength="30" autocomplete="off" />
          </div>
          <div class="ytf-onboard-status" id="ytf-uname-status"></div>
          <button class="ytf-onboard-btn" id="ytf-uname-btn" disabled>Continue</button>
        </div>`;
      const input = this.shadowRoot.getElementById('ytf-uname');
      const status = this.shadowRoot.getElementById('ytf-uname-status');
      const btn = this.shadowRoot.getElementById('ytf-uname-btn');
      let lastCheck = '';
      input.addEventListener('input', () => {
        const v = input.value.trim();
        btn.disabled = true;
        if (!v || v.length < 3) { status.textContent = v ? 'At least 3 characters' : ''; status.className = 'ytf-onboard-status err'; return; }
        if (!/^[a-zA-Z0-9_]+$/.test(v)) { status.textContent = 'Letters, numbers, underscores only'; status.className = 'ytf-onboard-status err'; return; }
        clearTimeout(this._searchDebounce);
        status.textContent = 'Checking...'; status.className = 'ytf-onboard-status';
        this._searchDebounce = setTimeout(async () => {
          const r = await this._msg({ action: 'CHECK_USERNAME', username: v });
          if (input.value.trim() !== v) return;
          if (r?.available) { status.textContent = '✓ Available'; status.className = 'ytf-onboard-status ok'; btn.disabled = false; lastCheck = v; }
          else { status.textContent = '✕ Already taken'; status.className = 'ytf-onboard-status err'; }
        }, 400);
      });
      btn.addEventListener('click', async () => {
        const v = input.value.trim();
        if (!v || v !== lastCheck) return;
        btn.disabled = true; btn.textContent = '...';
        try {
          const r = await this._msg({ action: 'SET_USERNAME', username: v });
          if (r?.success) { this.currentUser.unique_username = r.username; this._renderMain(); }
          else { status.textContent = 'Failed. Try another.'; status.className = 'ytf-onboard-status err'; btn.disabled = false; btn.textContent = 'Continue'; }
        } catch (e) { status.textContent = e.message; status.className = 'ytf-onboard-status err'; btn.disabled = false; btn.textContent = 'Continue'; }
      });
      setTimeout(() => input.focus(), 100);
    }

    // ==========================================================
    // Main UI
    // ==========================================================
    _renderMain() {
      if (!this.sidebar) return;
      const u = this.currentUser;
      this.sidebar.innerHTML = `
        <div class="ytf-header">
          <img class="ytf-header-avatar online" src="${esc(u.avatar_url)}" onerror="this.style.display='none'" />
          <span class="ytf-header-title">YTF</span>
          <button class="ytf-hbtn" id="ytf-close" title="Collapse">►</button>
        </div>
        <div class="ytf-tabs">
          <button class="ytf-tab active" data-tab="chats">Chats</button>
          <button class="ytf-tab" data-tab="friends">Friends</button>
          <button class="ytf-tab" data-tab="add">Add Friend<span class="ytf-tab-badge" id="ytf-req-badge" style="display:none"></span></button>
        </div>
        <div class="ytf-content" id="ytf-tab-content"><div class="ytf-loading">Loading...</div></div>
        <div class="ytf-profile">
          <img class="ytf-profile-av" src="${esc(u.avatar_url)}" onerror="this.style.display='none'" />
          <div class="ytf-profile-info">
            <div class="ytf-profile-name">${esc(u.username)}</div>
            <div class="ytf-profile-handle">@${esc(u.unique_username)}</div>
          </div>
          <button class="ytf-logout-btn" id="ytf-logout">Logout</button>
        </div>
        <div class="ytf-chat" id="ytf-chat"></div>`;
      this.chatWindow = this.shadowRoot.getElementById('ytf-chat');
      this.shadowRoot.getElementById('ytf-close').addEventListener('click', () => this._togglePanel());
      this.shadowRoot.getElementById('ytf-logout').addEventListener('click', async () => {
        await this._msg({ action: 'LOGOUT' }); this.currentUser = null; this._renderLogin();
      });
      this.shadowRoot.querySelectorAll('.ytf-tab').forEach(tab => {
        tab.addEventListener('click', () => {
          this.shadowRoot.querySelectorAll('.ytf-tab').forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          this.activeTab = tab.dataset.tab;
          this._renderTab();
        });
      });
      this._fetchAll();
    }

    async _fetchAll() {
      await Promise.all([this._fetchConversations(), this._fetchFriends(), this._fetchPending()]);
      this._renderTab();

      // Auto-reopen chat window if activeConversation was preserved across navigation/reloads
      if (this.activeConversation) {
        const conv = this.conversations.find(c => c.friend_id === this.activeConversation.friendId);
        if (conv) {
          this._openChat(conv);
        } else {
          this._renderChatWindow();
          if (this.activeConversation.id) this._loadMessages(this.activeConversation.id);
        }
      }
    }
    async _fetchConversations() { try { const r = await this._msg({ action: 'FETCH_CONVERSATIONS' }); if (r?.success) this.conversations = r.conversations || []; } catch (e) {} }
    async _fetchFriends() { try { const r = await this._msg({ action: 'FETCH_FRIENDS' }); if (r?.success) this.friends = r.friends || []; } catch (e) {} }
    async _fetchPending() { try { const r = await this._msg({ action: 'FETCH_PENDING_REQUESTS' }); if (r?.success) { this.pendingRequests = r.requests || []; this._updateReqBadge(); } } catch (e) {} }
    _updateReqBadge() { const b = this.shadowRoot?.getElementById('ytf-req-badge'); if (b) b.style.display = this.pendingRequests.length > 0 ? '' : 'none'; }

    // ==========================================================
    // Tab Rendering
    // ==========================================================
    _renderTab() {
      const c = this.shadowRoot?.getElementById('ytf-tab-content');
      if (!c) return;
      c.innerHTML = '';
      switch (this.activeTab) {
        case 'chats': this._renderChatsTab(c); break;
        case 'friends': this._renderFriendsTab(c); break;
        case 'add': this._renderAddTab(c); break;
      }
    }

    _renderChatsTab(c) {
      // Share banner (#15)
      if (this._pendingShare) {
        const banner = document.createElement('div');
        banner.style.cssText = 'padding:8px 14px;background:var(--bg-menu);border-bottom:1px solid var(--border);font-size:12px;color:var(--blue);display:flex;align-items:center;gap:6px;';
        banner.innerHTML = `<span>📤 Select a chat to share this video</span><button style="margin-left:auto;background:none;border:none;color:var(--text3);cursor:pointer;font-size:14px;" id="ytf-cancel-share">✕</button>`;
        c.appendChild(banner);
        banner.querySelector('#ytf-cancel-share').addEventListener('click', () => { this._pendingShare = null; this._renderTab(); });
      }
      if (!this.conversations.length && !this._pendingShare) {
        c.innerHTML = `<div class="ytf-empty"><div class="ytf-empty-icon">💬</div><div class="ytf-empty-text">No conversations yet.<br>Add friends to start chatting!</div></div>`;
        return;
      }
      for (const conv of this.conversations) {
        const unread = parseInt(conv.unread_count) || 0;
        const online = conv.friend_is_online;
        const preview = conv.last_sender_id === this.currentUser.id ? `You: ${conv.last_message || ''}` : (conv.last_message || '');
        const row = document.createElement('div');
        row.classList.add('ytf-row');
        row.dataset.friendId = conv.friend_id;
        row.innerHTML = `
          <div class="ytf-av-wrap"><img class="ytf-av ${online?'':'off'}" src="${esc(conv.friend_avatar_url)}" onerror="this.style.display='none'" />${online?'<div class="ytf-dot-on"></div>':''}</div>
          <div class="ytf-row-info">
            <div class="ytf-row-top"><span class="ytf-row-name ${unread?'unread':''}">${esc(conv.friend_username)}</span><span class="ytf-row-time">${formatRelativeTime(conv.last_message_at)}</span></div>
            <div class="ytf-row-bottom"><span class="ytf-row-preview ${unread?'unread':''}">${esc(preview)}</span>${unread?'<span class="ytf-badge"></span>':''}</div>
          </div>`;
        row.addEventListener('click', () => {
          if (this._pendingShare) {
            this._sendVideoShare(conv.friend_id);
          } else {
            this._openChat(conv);
          }
        });
        c.appendChild(row);
      }
    }

    _renderFriendsTab(c) {
      if (!this.friends.length) {
        c.innerHTML = `<div class="ytf-empty"><div class="ytf-empty-icon">👥</div><div class="ytf-empty-text">No friends yet.<br>Go to "Add Friend" to find people!</div></div>`;
        return;
      }
      for (const f of this.friends) {
        const row = document.createElement('div');
        row.classList.add('ytf-row');
        row.innerHTML = `
          <div class="ytf-av-wrap"><img class="ytf-av ${f.is_online?'':'off'}" src="${esc(f.avatar_url)}" onerror="this.style.display='none'" />${f.is_online?'<div class="ytf-dot-on"></div>':''}</div>
          <div class="ytf-row-info">
            <div class="ytf-row-top"><span class="ytf-row-name">${esc(f.username)}</span></div>
            <div class="ytf-row-bottom"><span class="ytf-row-handle">@${esc(f.unique_username)}</span><span class="ytf-row-time">${f.is_online?'Online':formatRelativeTime(f.last_seen)}</span></div>
          </div>`;
        row.addEventListener('click', () => {
          if (this._pendingShare) {
            this._sendVideoShare(f.id);
          } else {
            const conv = this.conversations.find(c => c.friend_id === f.id);
            this._openChat(conv || { id: null, friend_id: f.id, friend_username: f.username, friend_unique_username: f.unique_username, friend_avatar_url: f.avatar_url, friend_is_online: f.is_online });
          }
        });
        c.appendChild(row);
      }
    }

    _renderAddTab(c) {
      const wrap = document.createElement('div');
      wrap.classList.add('ytf-search-wrap');
      wrap.innerHTML = `<input class="ytf-search" id="ytf-add-search" placeholder="Search @username..." autocomplete="off" />`;
      c.appendChild(wrap);
      const results = document.createElement('div');
      results.id = 'ytf-add-results';
      c.appendChild(results);
      if (this.pendingRequests.length) {
        const label = document.createElement('div');
        label.style.cssText = 'padding:10px 14px 4px;font-size:11px;color:var(--text3);font-weight:500;';
        label.textContent = `PENDING REQUESTS (${this.pendingRequests.length})`;
        c.appendChild(label);
        for (const req of this.pendingRequests) {
          const row = document.createElement('div');
          row.classList.add('ytf-row');
          row.innerHTML = `
            <div class="ytf-av-wrap"><img class="ytf-av" src="${esc(req.avatar_url)}" onerror="this.style.display='none'" /></div>
            <div class="ytf-row-info"><div class="ytf-row-top"><span class="ytf-row-name">${esc(req.username)}</span></div><div class="ytf-row-bottom"><span class="ytf-row-handle">@${esc(req.unique_username)}</span></div></div>
            <button class="ytf-fr-btn accept" data-id="${req.friendship_id}">Accept</button>
            <button class="ytf-fr-btn reject" data-id="${req.friendship_id}">✕</button>`;
          row.querySelector('.accept').addEventListener('click', (e) => { e.stopPropagation(); this._respondFriend(req.friendship_id, 'accept'); });
          row.querySelector('.reject').addEventListener('click', (e) => { e.stopPropagation(); this._respondFriend(req.friendship_id, 'reject'); });
          c.appendChild(row);
        }
      }
      const input = this.shadowRoot.getElementById('ytf-add-search');
      if (!input) return;
      input.addEventListener('input', () => {
        clearTimeout(this._searchDebounce);
        const q = input.value.trim();
        if (!q) { results.innerHTML = ''; return; }
        this._searchDebounce = setTimeout(async () => {
          const r = await this._msg({ action: 'SEARCH_USERS', query: q });
          if (!r?.success) return;
          results.innerHTML = '';
          if (!r.users.length) { results.innerHTML = '<div class="ytf-loading">No users found</div>'; return; }
          for (const u of r.users) {
            const isFriend = this.friends.some(f => f.id === u.id);
            const row = document.createElement('div');
            row.classList.add('ytf-row');
            row.innerHTML = `
              <div class="ytf-av-wrap"><img class="ytf-av" src="${esc(u.avatar_url)}" onerror="this.style.display='none'" />${u.is_online?'<div class="ytf-dot-on"></div>':''}</div>
              <div class="ytf-row-info"><div class="ytf-row-top"><span class="ytf-row-name">${esc(u.username)}</span></div><div class="ytf-row-bottom"><span class="ytf-row-handle">@${esc(u.unique_username)}</span></div></div>
              ${isFriend ? '<span style="font-size:11px;color:var(--text3)">Friends</span>' : `<button class="ytf-fr-btn send" data-uid="${u.id}">Add</button>`}`;
            const addBtn = row.querySelector('.send');
            if (addBtn) addBtn.addEventListener('click', async (e) => {
              e.stopPropagation(); addBtn.textContent = '...'; addBtn.disabled = true;
              await this._msg({ action: 'SEND_FRIEND_REQUEST', addresseeId: u.id });
              addBtn.textContent = 'Sent'; addBtn.classList.remove('send'); addBtn.classList.add('sent');
            });
            results.appendChild(row);
          }
        }, 300);
      });
      setTimeout(() => input.focus(), 50);
    }

    async _respondFriend(id, action) {
      await this._msg({ action: 'RESPOND_FRIEND_REQUEST', friendshipId: id, responseAction: action });
      await Promise.all([this._fetchFriends(), this._fetchPending()]);
      this._renderTab();
    }

    // ==========================================================
    // Chat Window
    // ==========================================================
    async _openChat(conv) {
      this.activeConversation = {
        id: conv.id, friendId: conv.friend_id,
        friendUsername: conv.friend_username || '', friendAvatarUrl: conv.friend_avatar_url || '',
        friendIsOnline: conv.friend_is_online, friendUniqueUsername: conv.friend_unique_username || '',
      };
      this.chatMessages = [];
      this._renderChatWindow();
      if (conv.id) await this._loadMessages(conv.id);
    }

    _renderChatWindow() {
      if (!this.chatWindow) return;
      const c = this.activeConversation;
      const showSync = (isWatchPage() || isShortsPage()) && c.friendIsOnline;
      const inSync = !!this.syncSession;

      // #6: Show "Leave" button if in active sync session, otherwise "Watch Together"
      let syncBtnHtml = '';
      if (inSync) {
        syncBtnHtml = `<button class="ytf-sync-btn leave" id="ytf-leave-sync">✕ Leave</button>`;
      } else if (showSync) {
        syncBtnHtml = `<button class="ytf-sync-btn" id="ytf-sync-btn">▶ Watch Together</button>`;
      }

      this.chatWindow.innerHTML = `
        <div class="ytf-chat-header">
          <button class="ytf-chat-back" id="ytf-back">←</button>
          <img class="ytf-chat-av" src="${esc(c.friendAvatarUrl)}" onerror="this.style.display='none'" />
          <div class="ytf-chat-info">
            <div class="ytf-chat-name">${esc(c.friendUsername)}</div>
            <div class="ytf-chat-status ${c.friendIsOnline?'online':''}" id="ytf-cstatus">${c.friendIsOnline?'● Online':'Offline'}</div>
          </div>
          ${syncBtnHtml}
        </div>
        <div class="ytf-msgs" id="ytf-msgs"><div class="ytf-loading">Loading...</div></div>
        <div class="ytf-typing hidden" id="ytf-typing"><div class="ytf-typing-dot"></div><div class="ytf-typing-dot"></div><div class="ytf-typing-dot"></div></div>
        <div class="ytf-picker hidden" id="ytf-picker"></div>
        <div class="ytf-input-bar">
          <button class="ytf-emoji-btn" id="ytf-emoji-btn">😊</button>
          <textarea class="ytf-input" id="ytf-input" placeholder="Type a message..." rows="1" autocomplete="off"></textarea>
          <button class="ytf-send" id="ytf-send" disabled>➤</button>
        </div>`;
      this.chatWindow.classList.add('open');
      this.shadowRoot.getElementById('ytf-back').addEventListener('click', () => this._closeChat());

      const input = this.shadowRoot.getElementById('ytf-input');
      const send = this.shadowRoot.getElementById('ytf-send');

      // #1: Emoji-only validation — any non-whitespace content is valid
      const updateSendBtn = () => { send.disabled = !input.value.trim(); };
      input.addEventListener('input', () => {
        updateSendBtn();
        this._onTyping();
        // Auto-resize textarea
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 100) + 'px';
      });

      // #2: Enter sends, Shift+Enter newline
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          if (input.value.trim()) {
            this._sendChat(input.value.trim());
            input.value = '';
            input.style.height = 'auto';
            send.disabled = true;
          }
        }
      });
      send.addEventListener('click', () => {
        if (input.value.trim()) {
          this._sendChat(input.value.trim());
          input.value = '';
          input.style.height = 'auto';
          send.disabled = true;
        }
      });

      this.shadowRoot.getElementById('ytf-emoji-btn').addEventListener('click', () => this._toggleEmojiPicker());

      const syncBtn = this.shadowRoot.getElementById('ytf-sync-btn');
      if (syncBtn) syncBtn.addEventListener('click', () => this._sendSyncInvite());

      // #6: Leave button
      const leaveBtn = this.shadowRoot.getElementById('ytf-leave-sync');
      if (leaveBtn) leaveBtn.addEventListener('click', () => this._leaveSync());

      setTimeout(() => input.focus(), 250);
    }

    _closeChat() {
      if (this.chatWindow) this.chatWindow.classList.remove('open');
      this.activeConversation = null; this.chatMessages = [];
      clearTimeout(this._peerTypingTimeout);
      this._fetchConversations().then(() => this._renderTab());
    }

    async _loadMessages(convId, retries = 3) {
      for (let i = 0; i < retries; i++) {
        try {
          const r = await this._msg({ action: 'FETCH_MESSAGES', conversationId: convId });
          if (r?.success) {
            this.chatMessages = r.messages || [];
            this._renderMessages();
            return;
          }
          console.error(`[YTF] Load messages fail attempt ${i + 1}:`, r);
        } catch (e) {
          console.warn(`[YTF] Load messages error (attempt ${i + 1}):`, e.message || e);
          if (i < retries - 1) await new Promise(r => setTimeout(r, 500));
        }
      }
      const area = this.shadowRoot?.getElementById('ytf-msgs');
      if (area) area.innerHTML = `<div class="ytf-empty"><div class="ytf-empty-text">Could not load messages. Try going back and reopening.</div></div>`;
    }

    _renderMessages() {
      const area = this.shadowRoot?.getElementById('ytf-msgs');
      if (!area) return;
      if (!this.chatMessages.length) {
        area.innerHTML = `<div class="ytf-empty"><div class="ytf-empty-icon">👋</div><div class="ytf-empty-text">Say hi!</div></div>`;
        return;
      }
      area.innerHTML = '';
      let prev = null;
      for (const m of this.chatMessages) {
        if (dateDividerNeeded(prev, m.created_at)) {
          const d = document.createElement('div');
          d.classList.add('ytf-msg-divider');
          d.textContent = formatDateDivider(m.created_at);
          area.appendChild(d);
        }
        prev = m.created_at;
        area.appendChild(this._createMsgEl(m));
      }
      area.scrollTop = area.scrollHeight;
    }

    _createMsgEl(m) {
      const sent = m.sender_id === this.currentUser.id;
      const grp = document.createElement('div');
      grp.classList.add('ytf-msg-grp');
      if (sent) grp.classList.add('sent');
      else grp.classList.add('recv');
      grp.dataset.msgId = m.id;

      // #16: Rich video share cards
      if (m.message_type === 'video_share') {
        try {
          const vdata = JSON.parse(m.content);
          const card = document.createElement('div');
          card.classList.add('ytf-video-card');
          const isShorts = vdata.isShorts || (vdata.url && vdata.url.includes('/shorts/'));
          const thumb = vdata.thumbnail || `https://img.youtube.com/vi/${vdata.videoId}/mqdefault.jpg`;
          card.innerHTML = `
            <div class="ytf-video-thumb-wrap">
              <img class="ytf-video-thumb" src="${esc(thumb)}" onerror="this.style.background='#333'" />
              ${vdata.duration ? `<span class="ytf-video-dur">${esc(vdata.duration)}</span>` : ''}
            </div>
            <div class="ytf-video-info">
              <div class="ytf-video-title">${esc(vdata.title || 'YouTube Video')}</div>
              ${vdata.channel ? `<div class="ytf-video-channel">${esc(vdata.channel)}</div>` : ''}
              ${isShorts ? '<span class="ytf-video-shorts-badge">SHORTS</span>' : ''}
            </div>`;
          // #17: Soft navigation
          card.addEventListener('click', () => {
            const url = vdata.url || `https://www.youtube.com/watch?v=${vdata.videoId}`;
            ytNavigate(url);
          });
          grp.appendChild(card);
        } catch (e) {
          const bubble = document.createElement('div');
          bubble.classList.add('ytf-bubble');
          if (sent) bubble.classList.add('sent');
          else bubble.classList.add('recv');
          bubble.textContent = m.content;
          grp.appendChild(bubble);
        }
      } else {
        const bubble = document.createElement('div');
        bubble.classList.add('ytf-bubble');
        if (sent) bubble.classList.add('sent');
        else bubble.classList.add('recv');
        bubble.textContent = m.content;
        const reactBtn = document.createElement('button');
        reactBtn.classList.add('ytf-react-trigger');
        reactBtn.textContent = '+';
        reactBtn.addEventListener('click', (e) => { e.stopPropagation(); this._showReactionPicker(m.id, reactBtn); });
        bubble.appendChild(reactBtn);
        grp.appendChild(bubble);
      }

      // Reactions
      const reactions = Array.isArray(m.reactions) ? m.reactions : [];
      if (reactions.length) {
        const bar = document.createElement('div');
        bar.classList.add('ytf-reactions-bar');
        const grouped = {};
        reactions.forEach(r => { if (!grouped[r.emoji]) grouped[r.emoji] = { count: 0, mine: false }; grouped[r.emoji].count++; if (r.user_id === this.currentUser.id) grouped[r.emoji].mine = true; });
        for (const [emoji, data] of Object.entries(grouped)) {
          const chip = document.createElement('span');
          chip.classList.add('ytf-reaction-chip');
          if (data.mine) chip.classList.add('mine');
          chip.textContent = `${emoji}${data.count > 1 ? ' ' + data.count : ''}`;
          bar.appendChild(chip);
        }
        grp.appendChild(bar);
      }

      const meta = document.createElement('div');
      meta.classList.add('ytf-msg-meta');
      if (sent) meta.classList.add('sent');
      meta.textContent = `${formatMsgTime(m.created_at)}${sent ? ' ' + (m.delivered ? '✓✓' : '✓') : ''}`;
      grp.appendChild(meta);

      return grp;
    }

    _appendMessage(m) {
      const area = this.shadowRoot?.getElementById('ytf-msgs');
      if (!area) return;
      const empty = area.querySelector('.ytf-empty'); if (empty) empty.remove();
      const last = this.chatMessages[this.chatMessages.length - 1];
      if (dateDividerNeeded(last?.created_at, m.created_at)) {
        const d = document.createElement('div');
        d.classList.add('ytf-msg-divider');
        d.textContent = formatDateDivider(m.created_at);
        area.appendChild(d);
      }
      this.chatMessages.push(m);
      area.appendChild(this._createMsgEl(m));
      if (m.sender_id !== this.currentUser.id) {
        const ti = this.shadowRoot?.getElementById('ytf-typing');
        if (ti) ti.classList.add('hidden');
      }
      area.scrollTop = area.scrollHeight;

      // Also update fullscreen chat if open
      this._appendFsChatMessage(m);
    }

    // Append a message to the fullscreen chat overlay (if open)
    _appendFsChatMessage(m) {
      if (!this._fsChat) return;
      const msgsDiv = this._fsChat.querySelector('#ytf-fs-msgs');
      if (!msgsDiv) return;
      const sent = m.sender_id === this.currentUser.id;

      // Handle video_share messages with a card
      if (m.message_type === 'video_share') {
        try {
          const vdata = typeof m.content === 'string' ? JSON.parse(m.content) : m.content;
          const thumb = vdata.thumbnail || `https://img.youtube.com/vi/${vdata.videoId}/mqdefault.jpg`;
          const el = document.createElement('div');
          el.style.cssText = `align-self:${sent?'flex-end':'flex-start'};max-width:80%;margin:2px 0;cursor:pointer;border-radius:8px;overflow:hidden;background:#212121;border:1px solid rgba(255,255,255,0.1);`;
          el.innerHTML = `
            <img src="${esc(thumb)}" style="width:100%;height:90px;object-fit:cover;display:block;" onerror="this.style.background='#333'" />
            <div style="padding:6px 8px;">
              <div style="font-size:11px;font-weight:500;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${esc(vdata.title || 'YouTube Video')}</div>
              ${vdata.duration ? `<div style="font-size:10px;color:#aaa;margin-top:2px;">${esc(vdata.duration)}</div>` : ''}
            </div>`;
          el.addEventListener('click', () => {
            const url = vdata.url || `https://www.youtube.com/watch?v=${vdata.videoId}`;
            ytNavigate(url);
          });
          msgsDiv.appendChild(el);
        } catch (e) {
          const el = document.createElement('div');
          el.style.cssText = `align-self:${sent?'flex-end':'flex-start'};background:${sent?'#3ea6ff':'#212121'};color:${sent?'#0f0f0f':'#f1f1f1'};padding:6px 10px;border-radius:14px;font-size:12px;max-width:75%;margin:2px 0;word-wrap:break-word;white-space:pre-wrap;`;
          el.textContent = m.content;
          msgsDiv.appendChild(el);
        }
      } else {
        const el = document.createElement('div');
        el.style.cssText = `align-self:${sent?'flex-end':'flex-start'};background:${sent?'#3ea6ff':'#212121'};color:${sent?'#0f0f0f':'#f1f1f1'};padding:6px 10px;border-radius:14px;font-size:12px;max-width:75%;margin:2px 0;word-wrap:break-word;white-space:pre-wrap;`;
        el.textContent = m.content;
        msgsDiv.appendChild(el);
      }
      msgsDiv.scrollTop = msgsDiv.scrollHeight;
    }

    async _sendChat(text) {
      if (!this.activeConversation) return;
      const tmp = { id: 'tmp-' + Date.now(), sender_id: this.currentUser.id, receiver_id: this.activeConversation.friendId, content: text, message_type: 'text', delivered: false, created_at: new Date().toISOString(), reactions: [] };
      this._appendMessage(tmp);
      try { await this._msg({ action: 'HTTP_POST_MESSAGE', senderId: this.currentUser.id, receiverId: this.activeConversation.friendId, content: text }); } catch (e) {}
    }

    // #15: Send video share to a friend
    async _sendVideoShare(friendId) {
      if (!this._pendingShare) return;
      const shareData = JSON.stringify(this._pendingShare);
      this._msg({ action: 'HTTP_POST_MESSAGE', senderId: this.currentUser.id, receiverId: friendId, content: shareData, messageType: 'video_share' });
      this._pendingShare = null;
      this._renderTab();
    }

    // ==========================================================
    // Emoji Picker
    // ==========================================================
    _toggleEmojiPicker() {
      const picker = this.shadowRoot?.getElementById('ytf-picker');
      if (!picker) return;
      this._pickerOpen = !this._pickerOpen;
      picker.classList.toggle('hidden', !this._pickerOpen);
      if (this._pickerOpen) this._buildEmojiPicker(picker);
    }

    _buildEmojiPicker(picker) {
      const cats = Object.keys(EMOJI_CATEGORIES);
      picker.innerHTML = `
        <div class="ytf-picker-tabs">${cats.map((c, i) => `<button class="ytf-picker-tab ${i === 0 ? 'active' : ''}" data-cat="${c}">${c}</button>`).join('')}</div>
        <div class="ytf-picker-grid" id="ytf-picker-grid"></div>`;
      const grid = picker.querySelector('#ytf-picker-grid');
      const renderCat = (cat) => {
        grid.innerHTML = '';
        EMOJI_CATEGORIES[cat].forEach(e => {
          const btn = document.createElement('button');
          btn.classList.add('ytf-picker-emoji');
          btn.textContent = e;
          btn.addEventListener('click', () => {
            const input = this.shadowRoot?.getElementById('ytf-input');
            if (input) { input.value += e; input.focus(); input.dispatchEvent(new Event('input')); }
            this._pickerOpen = false; picker.classList.add('hidden');
          });
          grid.appendChild(btn);
        });
      };
      renderCat(cats[0]);
      picker.querySelectorAll('.ytf-picker-tab').forEach(tab => {
        tab.addEventListener('click', () => {
          picker.querySelectorAll('.ytf-picker-tab').forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          renderCat(tab.dataset.cat);
        });
      });
    }

    // ==========================================================
    // Reaction Picker
    // ==========================================================
    _showReactionPicker(msgId, anchor) {
      if (this._reactionPicker) this._reactionPicker.remove();
      const picker = document.createElement('div');
      picker.classList.add('ytf-react-picker');
      REACTION_EMOJIS.forEach(e => {
        const btn = document.createElement('button');
        btn.classList.add('ytf-react-emoji');
        btn.textContent = e;
        btn.addEventListener('click', () => { this._addReaction(msgId, e); picker.remove(); this._reactionPicker = null; });
        picker.appendChild(btn);
      });
      const grp = anchor.closest('.ytf-msg-grp');
      if (grp) { picker.style.top = '-30px'; grp.style.position = 'relative'; grp.appendChild(picker); }
      this._reactionPicker = picker;
      setTimeout(() => {
        const close = (ev) => { if (!picker.contains(ev.composedPath?.()[0] || ev.target)) { picker.remove(); this._reactionPicker = null; document.removeEventListener('click', close, true); } };
        document.addEventListener('click', close, true);
      }, 0);
    }
    async _addReaction(msgId, emoji) { try { await this._msg({ action: 'ADD_REACTION', messageId: msgId, emoji }); } catch (e) {} }

    // ==========================================================
    // Watch Together
    // ==========================================================
    async _sendSyncInvite() {
      if (!this.activeConversation || (!isWatchPage() && !isShortsPage())) return;
      const vid = getVideoId();
      const title = document.title.replace(' - YouTube', '');
      try {
        const r = await this._msg({ action: 'SEND_SYNC_INVITE', guestId: this.activeConversation.friendId, videoUrl: window.location.href, videoTitle: title });
        if (r?.success) {
          this.syncSession = r.result.session; this.isHost = true;
          this._hookVideoSync();
          this._appendSyncCard(`You invited ${esc(this.activeConversation.friendUsername)} to Watch Together. Waiting...`);
          // Re-render header to show Leave button
          this._renderChatWindow();
          if (this.activeConversation.id) this._loadMessages(this.activeConversation.id);
        }
      } catch (e) { console.error('[YTF] Sync invite error:', e); }
    }

    // #6: Leave sync session
    async _leaveSync() {
      if (!this.syncSession) return;
      try { await this._msg({ action: 'END_SYNC', sessionId: this.syncSession.id }); } catch (e) {}
      this.syncSession = null; this.isHost = false; this.hostState = null; this._unhookVideoSync();
      // Re-render header and reload messages so chat doesn't get stuck
      if (this.activeConversation) {
        this._renderChatWindow();
        if (this.activeConversation.id) this._loadMessages(this.activeConversation.id);
      }
    }

    async _requestHostState() {
      if (!this.syncSession || this.isHost) return;
      console.log('[YTF] Requesting latest state from host...');
      try {
        await this._msg({ action: 'REQUEST_SYNC_STATE', sessionId: this.syncSession.id });
      } catch (e) {
        console.error('[YTF] Failed to request host state:', e);
      }
    }

    _getHostTime() {
      if (!this.hostState) return 0;
      if (this.hostState.playing) {
        return this.hostState.time + (Date.now() - this.hostState.lastUpdated) / 1000;
      }
      return this.hostState.time;
    }

    _isBlockedKey(key) {
      const blocked = [
        ' ', 'k', 'K', 'j', 'J', 'l', 'L',
        'ArrowLeft', 'ArrowRight',
        '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
        'Home', 'End', '<', '>'
      ];
      return blocked.includes(key);
    }

    _isBlockedControl(target) {
      if (!target) return false;
      if (target.tagName === 'VIDEO') return true;
      if (target.closest('.ytp-play-button')) return true;
      if (target.closest('.ytp-progress-bar') || target.closest('.ytp-progress-bar-container')) return true;
      if (target.closest('.ytp-next-button') || target.closest('.ytp-prev-button')) return true;
      return false;
    }

    // #4: Hook video sync — block viewer controls
    _hookVideoSync() {
      if (this._videoListeners) return;
      const video = document.querySelector('video');
      if (!video) return;

      if (this.isHost) {
        // Host: send commands
        const onPlay = () => { if (!this._syncLock) this._sendSyncCmd('play', video.currentTime); };
        const onPause = () => { if (!this._syncLock) this._sendSyncCmd('pause', video.currentTime); };
        const onSeeked = () => { if (!this._syncLock) this._sendSyncCmd('seek', video.currentTime); };
        video.addEventListener('play', onPlay);
        video.addEventListener('pause', onPause);
        video.addEventListener('seeked', onSeeked);
        this._videoListeners = { video, onPlay, onPause, onSeeked };
      } else {
        // Initialize hostState from current video so blocking works immediately
        if (!this.hostState) {
          this.hostState = { playing: !video.paused, time: video.currentTime, lastUpdated: Date.now() };
        }

        // Enable visual controls disable CSS styling
        this._enableViewerCSS();

        // Viewer: intercept controls to block and request play/pause
        this._viewerBlocker = (e) => {
          if (this._syncLock) return; // Allow programmatic events to pass

          // Don't block keyboard when typing
          const activeEl = this.shadowRoot?.activeElement || document.activeElement;
          if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable)) {
            return;
          }

          const videoEl = document.querySelector('video');
          if (!videoEl) return;

          // Keyboard events
          if (['keydown', 'keyup', 'keypress'].includes(e.type)) {
            if (this._isBlockedKey(e.key)) {
              e.preventDefault();
              e.stopPropagation();
              e.stopImmediatePropagation();

              if (e.type === 'keydown') {
                if (e.key === ' ' || e.key === 'k' || e.key === 'K') {
                  const now = Date.now();
                  if (!this._lastRequestSentTime || now - this._lastRequestSentTime > 1500) {
                    this._lastRequestSentTime = now;
                    const reqType = videoEl.paused ? 'play' : 'pause';
                    this._msg({ action: 'SEND_PAUSE_REQUEST', sessionId: this.syncSession?.id, requestType: reqType }).catch(() => {});
                    this._appendSyncCard(`${reqType === 'play' ? '▶ Play' : '⏸ Pause'} request sent to host.`);
                  }
                }
              }
            }
          }

          // Mouse/Touch/Pointer events
          if (['mousedown', 'mouseup', 'click', 'touchstart', 'touchend', 'pointerdown', 'pointerup'].includes(e.type)) {
            if (this._isBlockedControl(e.target)) {
              e.preventDefault();
              e.stopPropagation();
              e.stopImmediatePropagation();

              // If it's a play/pause action (clicking video itself or play button)
              if (['pointerdown', 'mousedown', 'touchstart'].includes(e.type)) {
                if (e.target.tagName === 'VIDEO' || e.target.closest('.ytp-play-button')) {
                  // Throttle requests to avoid spamming
                  const now = Date.now();
                  if (!this._lastRequestSentTime || now - this._lastRequestSentTime > 1500) {
                    this._lastRequestSentTime = now;
                    const reqType = videoEl.paused ? 'play' : 'pause';
                    this._msg({ action: 'SEND_PAUSE_REQUEST', sessionId: this.syncSession?.id, requestType: reqType }).catch(() => {});
                    this._appendSyncCard(`${reqType === 'play' ? '▶ Play' : '⏸ Pause'} request sent to host.`);
                  }
                }
              }
            }
          }
        };

        // Attach capturing listeners on window for ultimate event interception
        const events = ['keydown', 'keyup', 'keypress', 'mousedown', 'mouseup', 'click', 'touchstart', 'touchend', 'pointerdown', 'pointerup'];
        events.forEach(evt => window.addEventListener(evt, this._viewerBlocker, true));

        // Block playback speed changes
        this._rateChangeBlocker = () => {
          if (this._syncLock) return;
          if (video.playbackRate !== 1) {
            this._syncLock = true;
            video.playbackRate = 1;
            setTimeout(() => { this._syncLock = false; }, 500);
          }
        };
        video.addEventListener('ratechange', this._rateChangeBlocker);

        // Revert programmatic changes to follow host
        const onViewerPause = () => {
          if (this._syncLock) return;
          this._syncLock = true;
          if (this.hostState && this.hostState.playing) {
            video.play();
          }
          setTimeout(() => { this._syncLock = false; }, 800);
        };
        const onViewerPlay = () => {
          if (this._syncLock) return;
          this._syncLock = true;
          if (this.hostState && !this.hostState.playing) {
            video.pause();
          }
          setTimeout(() => { this._syncLock = false; }, 800);
        };
        const onViewerSeeked = () => {
          if (this._syncLock) return;
          this._syncLock = true;
          const hostTime = this._getHostTime();
          video.currentTime = hostTime;
          setTimeout(() => { this._syncLock = false; }, 800);
        };

        // Listen to buffering/stalling and pull latest state from host
        let lastBufferRequest = 0;
        const onWaiting = () => {
          const now = Date.now();
          if (now - lastBufferRequest > 5000) {
            lastBufferRequest = now;
            console.log('[YTF] Guest buffering/waiting. Requesting host state...');
            this._requestHostState();
          }
        };

        video.addEventListener('pause', onViewerPause);
        video.addEventListener('play', onViewerPlay);
        video.addEventListener('seeked', onViewerSeeked);
        video.addEventListener('waiting', onWaiting);
        video.addEventListener('stalled', onWaiting);

        this._videoListeners = { video, onPlay: onViewerPlay, onPause: onViewerPause, onSeeked: onViewerSeeked, onWaiting };

        // Periodic drift correction: every 5s, resync if viewer drifted > 2s
        this._startDriftCorrection();

        // Polling state request: every 25s, request host state to correct any drift
        this._startStateRequestPolling();
      }
    }

    _startDriftCorrection() {
      if (this._driftInterval) clearInterval(this._driftInterval);
      this._driftInterval = setInterval(() => {
        if (!this.syncSession || this.isHost || !this.hostState) return;
        const video = document.querySelector('video');
        if (!video) return;
        const hostTime = this._getHostTime();
        const drift = Math.abs(video.currentTime - hostTime);
        if (drift > 2) {
          console.log(`[YTF] Drift correction: viewer=${video.currentTime.toFixed(1)}s, host=${hostTime.toFixed(1)}s, drift=${drift.toFixed(1)}s`);
          this._syncLock = true;
          video.currentTime = hostTime;
          setTimeout(() => { this._syncLock = false; }, 800);
        }
      }, 5000);
    }

    _startStateRequestPolling() {
      if (this._stateRequestInterval) clearInterval(this._stateRequestInterval);
      this._stateRequestInterval = setInterval(() => {
        if (this.syncSession && !this.isHost) {
          this._requestHostState();
        }
      }, 25000);
    }

    _injectViewerCSS() {
      if (document.getElementById('ytf-viewer-style')) return;
      const style = document.createElement('style');
      style.id = 'ytf-viewer-style';
      style.textContent = `
        #movie_player.ytf-viewer-syncing .ytp-play-button,
        #movie_player.ytf-viewer-syncing .ytp-progress-bar-container,
        #movie_player.ytf-viewer-syncing .ytp-next-button,
        #movie_player.ytf-viewer-syncing .ytp-prev-button {
          pointer-events: none !important;
          opacity: 0.5 !important;
          cursor: not-allowed !important;
        }
        #movie_player.ytf-viewer-syncing video {
          pointer-events: none !important;
        }
      `;
      document.head.appendChild(style);
    }

    _enableViewerCSS() {
      this._injectViewerCSS();
      const player = document.getElementById('movie_player');
      if (player) player.classList.add('ytf-viewer-syncing');
    }

    _disableViewerCSS() {
      const player = document.getElementById('movie_player');
      if (player) player.classList.remove('ytf-viewer-syncing');
      const style = document.getElementById('ytf-viewer-style');
      if (style) style.remove();
    }

    _unhookVideoSync() {
      this._disableViewerCSS();
      if (this._viewerBlocker) {
        const events = ['keydown', 'keyup', 'keypress', 'mousedown', 'mouseup', 'click', 'touchstart', 'touchend', 'pointerdown', 'pointerup'];
        events.forEach(evt => window.removeEventListener(evt, this._viewerBlocker, true));
        this._viewerBlocker = null;
      }
      if (this._driftInterval) { clearInterval(this._driftInterval); this._driftInterval = null; }
      if (this._stateRequestInterval) { clearInterval(this._stateRequestInterval); this._stateRequestInterval = null; }
      if (!this._videoListeners) return;
      const { video, onPlay, onPause, onSeeked, onWaiting } = this._videoListeners;
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('seeked', onSeeked);
      if (onWaiting) {
        video.removeEventListener('waiting', onWaiting);
        video.removeEventListener('stalled', onWaiting);
      }
      if (this._rateChangeBlocker) {
        video.removeEventListener('ratechange', this._rateChangeBlocker);
        this._rateChangeBlocker = null;
      }
      this._videoListeners = null;
    }

    async _sendSyncCmd(cmd, ts) {
      if (!this.syncSession) return;
      try { await this._msg({ action: 'SEND_SYNC_COMMAND', sessionId: this.syncSession.id, command: cmd, timestamp: ts }); } catch (e) {}
    }

    _applySyncCommand(cmd, ts) {
      const video = document.querySelector('video');
      if (!video) return;
      this._syncLock = true;
      if (ts >= 0) {
        video.currentTime = ts;
        this.hostState = { playing: cmd === 'play', time: ts, lastUpdated: Date.now() };
      } else {
        this.hostState = { playing: cmd === 'play', time: video.currentTime, lastUpdated: Date.now() };
      }
      if (cmd === 'play') video.play();
      if (cmd === 'pause') video.pause();
      setTimeout(() => { this._syncLock = false; }, 800);
    }

    _appendSyncCard(text, btns) {
      const area = this.shadowRoot?.getElementById('ytf-msgs');
      if (!area) return;
      const card = document.createElement('div');
      card.classList.add('ytf-sync-card');
      card.innerHTML = `<div class="ytf-sync-card-title">▶ Watch Together</div><div class="ytf-sync-card-sub">${text}</div>${btns || ''}`;
      area.appendChild(card);
      area.scrollTop = area.scrollHeight;
      return card;
    }

    // ==========================================================
    // Typing
    // ==========================================================
    _onTyping() {
      if (!this.activeConversation) return;
      clearTimeout(this._typingDebounce);
      this._typingDebounce = setTimeout(() => { this._msg({ action: 'SEND_TYPING', receiverId: this.activeConversation.friendId }).catch(() => {}); }, 500);
    }

    // ==========================================================
    // SSE Events
    // ==========================================================
    handleSSEEvent(type, payload) {
      switch (type) {
        case 'message': this._onMsg(payload); break;
        case 'message_sent': break;
        case 'presence': this._onPresence(payload); break;
        case 'typing': this._onTypingEvt(payload); break;
        case 'friend_request': this._fetchPending().then(() => { if (this.trigger) this.trigger.classList.add('has-notif'); if (this.activeTab === 'add') this._renderTab(); }); break;
        case 'friend_accepted': this._fetchFriends().then(() => { if (this.activeTab === 'friends') this._renderTab(); }); break;
        case 'reaction': this._onReaction(payload); break;
        case 'sync_invite': this._onSyncInvite(payload); break; // #3: popup notification
        case 'sync_response': this._onSyncResponse(payload); break;
        case 'sync_start': this._onSyncStart(payload); break;
        case 'sync_command': this._onSyncCommand(payload); break;
        case 'sync_end': this._onSyncEnd(payload); break;
        case 'sync_pause_request': this._onSyncPauseRequest(payload); break; // #5
        case 'sync_pause_response': this._onSyncPauseResponse(payload); break;
        case 'sync_emoji': this._onSyncEmoji(payload); break; // #9
        case 'sync_state_request': this._onSyncStateRequest(payload); break; // Initial sync
      }
    }

    _onMsg(p) {
      if (this.activeConversation?.friendId === p.senderId) {
        this._appendMessage({ id: p.id, sender_id: p.senderId, receiver_id: p.receiverId || this.currentUser.id, content: p.content, message_type: p.messageType || 'text', delivered: true, created_at: p.createdAt, reactions: [] });
      }
      this._fetchConversations().then(() => { if (this.activeTab === 'chats' && !this.activeConversation) this._renderTab(); });
    }

    _onPresence(p) {
      this.friends = this.friends.map(f => f.id === p.userId ? { ...f, is_online: p.status === 'online' } : f);
      this.conversations = this.conversations.map(c => c.friend_id === p.userId ? { ...c, friend_is_online: p.status === 'online' } : c);
      if (this.activeTab === 'chats' || this.activeTab === 'friends') this._renderTab();
      if (this.activeConversation?.friendId === p.userId) {
        this.activeConversation.friendIsOnline = p.status === 'online';
        const s = this.shadowRoot?.getElementById('ytf-cstatus');
        if (s) {
          s.textContent = p.status === 'online' ? '● Online' : 'Offline';
          s.classList.toggle('online', p.status === 'online');
        }
        
        // Dynamically add/remove Watch Together button in active chat header on presence change
        const inSync = !!this.syncSession;
        if (!inSync) {
          const showSync = (isWatchPage() || isShortsPage()) && p.status === 'online';
          const header = this.shadowRoot?.querySelector('.ytf-chat-header');
          if (header) {
            let syncBtn = this.shadowRoot.getElementById('ytf-sync-btn');
            if (showSync) {
              if (!syncBtn) {
                syncBtn = document.createElement('button');
                syncBtn.className = 'ytf-sync-btn';
                syncBtn.id = 'ytf-sync-btn';
                syncBtn.textContent = '▶ Watch Together';
                syncBtn.addEventListener('click', () => this._sendSyncInvite());
                header.appendChild(syncBtn);
              }
            } else {
              if (syncBtn) syncBtn.remove();
            }
          }
        }
      }
    }

    _onTypingEvt(p) {
      if (this.activeConversation?.friendId === p.senderId) {
        const ti = this.shadowRoot?.getElementById('ytf-typing');
        if (ti) ti.classList.remove('hidden');
        clearTimeout(this._peerTypingTimeout);
        this._peerTypingTimeout = setTimeout(() => { if (ti) ti.classList.add('hidden'); }, 3000);
      }
    }

    _onReaction(p) {
      const msg = this.chatMessages.find(m => m.id === p.messageId);
      if (msg) {
        if (p.action === 'add') { if (!msg.reactions) msg.reactions = []; msg.reactions.push({ id: p.reactionId, emoji: p.emoji, user_id: p.userId }); }
        else { msg.reactions = (msg.reactions || []).filter(r => r.id !== p.reactionId); }
        this._renderMessages();
      }
    }

    // #3: Watch Together invite as standalone popup notification (Discord-style)
    _onSyncInvite(p) {
      this._showSyncInvitePopup(p);
    }

    _showSyncInvitePopup(p) {
      // Remove existing popup if any
      const existing = document.getElementById('ytf-sync-invite-popup');
      if (existing) existing.remove();

      const popup = document.createElement('div');
      popup.id = 'ytf-sync-invite-popup';
      popup.style.cssText = `
        position: fixed; top: 20px; right: 20px; z-index: 2147483647;
        width: 340px; background: #1e1e2e; border: 1px solid rgba(255,255,255,0.1);
        border-radius: 12px; padding: 16px; font-family: Roboto, sans-serif; color: #f1f1f1;
        box-shadow: 0 8px 32px rgba(0,0,0,0.5); animation: slideDown 300ms ease-out;
        backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
      `;
      popup.innerHTML = `
        <style>@keyframes slideDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }</style>
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
          <img src="${esc(p.host.avatar_url)}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;" onerror="this.style.display='none'" />
          <div>
            <div style="font-size:14px;font-weight:500;">${esc(p.host.username)}</div>
            <div style="font-size:11px;color:#aaa;">@${esc(p.host.unique_username || '')}</div>
          </div>
        </div>
        <div style="font-size:13px;margin-bottom:4px;">wants to watch together:</div>
        <div style="font-size:12px;color:#3ea6ff;margin-bottom:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">"${esc(p.videoTitle)}"</div>
        <div style="display:flex;gap:8px;">
          <button id="ytf-popup-accept" style="flex:1;padding:8px;border:none;border-radius:50px;background:#3ea6ff;color:#0f0f0f;font-family:Roboto,sans-serif;font-size:13px;font-weight:500;cursor:pointer;">Accept</button>
          <button id="ytf-popup-decline" style="flex:1;padding:8px;border:none;border-radius:50px;background:rgba(255,255,255,0.1);color:#aaa;font-family:Roboto,sans-serif;font-size:13px;cursor:pointer;">Decline</button>
        </div>`;
      document.body.appendChild(popup);

      popup.querySelector('#ytf-popup-accept').addEventListener('click', async () => {
        await this._msg({ action: 'RESPOND_SYNC', sessionId: p.sessionId, responseAction: 'accept' });
        popup.remove();
      });
      popup.querySelector('#ytf-popup-decline').addEventListener('click', async () => {
        await this._msg({ action: 'RESPOND_SYNC', sessionId: p.sessionId, responseAction: 'decline' });
        popup.remove();
      });

      // Auto-dismiss after 30s
      setTimeout(() => { if (popup.parentNode) popup.remove(); }, 30000);
    }

    _onSyncResponse(p) {
      if (p.action === 'accept') {
        this._appendSyncCard(`${esc(this.activeConversation?.friendUsername)} accepted! Syncing...`);
      } else {
        this._appendSyncCard(`${esc(this.activeConversation?.friendUsername)} declined.`);
        this.syncSession = null; this.isHost = false; this.hostState = null; this._unhookVideoSync();
        // Re-render chat header to remove Leave button and restore normal UI
        if (this.activeConversation) {
          this._renderChatWindow();
          if (this.activeConversation.id) this._loadMessages(this.activeConversation.id);
        }
      }
    }

    _onSyncStart(p) {
      this.syncSession = { id: p.sessionId }; this.isHost = false;
      this.hostState = null; // Will be set by initial sync command
      // #17: Soft navigate to the video
      ytNavigate(p.videoUrl);
      // Wait for video to load, then hook sync and re-render chat to show Leave button
      setTimeout(() => {
        if (!this.host) return; // Destroyed (e.g. if page navigated and a new SidebarUI was built)
        this._hookVideoSync();
        this._requestHostState();
        if (this.activeConversation) {
          this._renderChatWindow();
          if (this.activeConversation.id) this._loadMessages(this.activeConversation.id);
        }
      }, 2000);
    }

    _onSyncCommand(p) { this._applySyncCommand(p.command, p.timestamp); }

    _onSyncEnd(p) {
      this.syncSession = null; this.isHost = false; this.hostState = null; this._unhookVideoSync();
      // Re-render and reload messages so chat doesn't get stuck on Loading
      if (this.activeConversation) {
        this._renderChatWindow();
        if (this.activeConversation.id) this._loadMessages(this.activeConversation.id);
      }
    }

    // Handle sync_state_request: host pushes its current video state to the guest
    _onSyncStateRequest(p) {
      if (!this.isHost || !this.syncSession) return;
      const video = document.querySelector('video');
      if (!video) return;
      // Send current state as a sync command
      const cmd = video.paused ? 'pause' : 'play';
      this._sendSyncCmd(cmd, video.currentTime);
      console.log(`[YTF] Pushed initial state to guest: ${cmd} @ ${video.currentTime.toFixed(1)}s`);
    }

    // #5: Pause/Play request from viewer — show notification to host
    _onSyncPauseRequest(p) {
      if (!this.isHost) return;
      const existing = document.getElementById('ytf-pause-request-popup');
      if (existing) existing.remove();

      const popup = document.createElement('div');
      popup.id = 'ytf-pause-request-popup';
      popup.style.cssText = `
        position: fixed; top: 20px; right: 20px; z-index: 2147483647;
        width: 320px; background: #1e1e2e; border: 1px solid rgba(255,255,255,0.1);
        border-radius: 12px; padding: 14px; font-family: Roboto, sans-serif; color: #f1f1f1;
        box-shadow: 0 8px 32px rgba(0,0,0,0.5); animation: slideDown 300ms ease-out;
      `;
      const verb = p.requestType === 'play' ? 'play' : 'pause';
      const actionBtnLabel = p.requestType === 'play' ? 'Play' : 'Pause';

      popup.innerHTML = `
        <style>@keyframes slideDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }</style>
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
          <img src="${esc(p.guestAvatar)}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;" onerror="this.style.display='none'" />
          <div style="font-size:13px;"><b>${esc(p.guestUsername)}</b> requested to ${verb}</div>
        </div>
        <div style="display:flex;gap:8px;">
          <button id="ytf-pause-accept" style="flex:1;padding:6px;border:none;border-radius:50px;background:#3ea6ff;color:#0f0f0f;font-size:12px;font-weight:500;cursor:pointer;">${actionBtnLabel}</button>
          <button id="ytf-pause-reject" style="flex:1;padding:6px;border:none;border-radius:50px;background:rgba(255,255,255,0.1);color:#aaa;font-size:12px;cursor:pointer;">Ignore</button>
        </div>`;
      document.body.appendChild(popup);

      popup.querySelector('#ytf-pause-accept').addEventListener('click', async () => {
        await this._msg({ action: 'RESPOND_PAUSE_REQUEST', sessionId: p.sessionId, responseAction: 'accept', requestType: p.requestType });
        const video = document.querySelector('video');
        if (video) {
          if (p.requestType === 'play') video.play();
          else video.pause();
        }
        popup.remove();
      });
      popup.querySelector('#ytf-pause-reject').addEventListener('click', async () => {
        await this._msg({ action: 'RESPOND_PAUSE_REQUEST', sessionId: p.sessionId, responseAction: 'reject', requestType: p.requestType });
        popup.remove();
      });
      setTimeout(() => { if (popup.parentNode) popup.remove(); }, 15000);
    }

    _onSyncPauseResponse(p) {
      const verb = p.requestType === 'play' ? 'play' : 'pause';
      if (p.action === 'accept') {
        this._appendSyncCard(`⏸ Host accepted your ${verb} request.`);
      } else {
        this._appendSyncCard(`Host ignored your ${verb} request.`);
      }
    }

    // #9: Synced emoji from other participant
    _onSyncEmoji(p) {
      this._floatEmoji(p.emoji);
    }

    // ==========================================================
    // Fullscreen
    // ==========================================================
    _setupFullscreenListener() {
      this._fsListener = () => {
        if (document.fullscreenElement) this._enterFullscreen();
        else this._exitFullscreen();
      };
      document.addEventListener('fullscreenchange', this._fsListener);
    }

    _enterFullscreen() {
      if (this.isOpen) this._togglePanel();
      if (this.trigger) this.trigger.style.display = 'none';

      // Remove any existing containers in the DOM to prevent duplication
      document.querySelectorAll('#ytf-fs-ctrl-container').forEach(el => el.remove());
      if (this._fsCtrl) { this._fsCtrl.remove(); this._fsCtrl = null; }

      const controls = document.querySelector('.ytp-right-controls');
      if (!controls) return;

      this._fsCtrl = document.createElement('div');
      this._fsCtrl.id = 'ytf-fs-ctrl-container';
      this._fsCtrl.style.cssText = 'display:inline-flex;align-items:center;gap:4px;vertical-align:middle;';

      // #8: Only show emoji button during Watch Together
      if (this.syncSession) {
        const emojiBtn = document.createElement('button');
        emojiBtn.className = 'ytp-button';
        emojiBtn.title = 'YTF Emojis';
        emojiBtn.style.cssText = 'width:36px;height:36px;display:inline-flex;align-items:center;justify-content:center;opacity:0.9;';
        emojiBtn.innerHTML = EMOJI_ICON_SVG;
        emojiBtn.querySelector('svg').style.cssText = 'width:22px;height:22px;';
        emojiBtn.addEventListener('click', () => this._toggleFsEmojiTray());
        this._fsCtrl.appendChild(emojiBtn);
      }

      // Chat button always available
      const chatBtn = document.createElement('button');
      chatBtn.className = 'ytp-button';
      chatBtn.title = 'YTF Chat';
      chatBtn.style.cssText = 'width:36px;height:36px;display:inline-flex;align-items:center;justify-content:center;opacity:0.9;';
      chatBtn.innerHTML = CHAT_ICON_SVG;
      chatBtn.querySelector('svg').style.cssText = 'width:22px;height:22px;';
      chatBtn.addEventListener('click', () => this._toggleFsChat());
      this._fsCtrl.appendChild(chatBtn);

      controls.prepend(this._fsCtrl);
    }

    _exitFullscreen() {
      if (this.trigger) this.trigger.style.display = '';
      if (this._fsCtrl) { this._fsCtrl.remove(); this._fsCtrl = null; }
      if (this._fsChat) { this._fsChat.remove(); this._fsChat = null; }
      if (this._fsTray) { this._fsTray.remove(); this._fsTray = null; }
    }

    _toggleFsEmojiTray() {
      if (this._fsTray) { this._fsTray.remove(); this._fsTray = null; return; }
      this._fsTray = document.createElement('div');
      this._fsTray.style.cssText = 'position:fixed;bottom:60px;left:50%;transform:translateX(-50%);z-index:99998;background:rgba(15,15,15,0.75);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.1);border-radius:50px;padding:6px 10px;display:flex;gap:4px;font-family:Roboto,sans-serif;';
      FULLSCREEN_EMOJIS.forEach(e => {
        const btn = document.createElement('button');
        btn.style.cssText = 'width:40px;height:40px;display:flex;align-items:center;justify-content:center;font-size:24px;cursor:pointer;border-radius:50%;border:none;background:none;transition:background 0.1s,opacity 0.1s;';
        btn.textContent = e;
        btn.addEventListener('mouseover', () => { if (!this._emojiCooldown) btn.style.background = 'rgba(255,255,255,0.15)'; });
        btn.addEventListener('mouseout', () => { btn.style.background = 'none'; });
        btn.addEventListener('click', () => {
          // #10: Rate limiting
          const now = Date.now();
          if (now - this._lastEmojiSent < 1000) return; // Already rate limited
          this._lastEmojiSent = now;
          this._emojiCooldown = true;

          // Visual cooldown on all buttons
          this._fsTray?.querySelectorAll('button').forEach(b => { b.style.opacity = '0.4'; b.style.pointerEvents = 'none'; });
          setTimeout(() => {
            this._emojiCooldown = false;
            this._fsTray?.querySelectorAll('button').forEach(b => { b.style.opacity = '1'; b.style.pointerEvents = ''; });
          }, 1000);

          this._floatEmoji(e);
          // #9: Send to other participant
          if (this.syncSession) {
            this._msg({ action: 'SEND_SYNC_EMOJI', sessionId: this.syncSession.id, emoji: e }).catch(() => {});
          }
        });
        this._fsTray.appendChild(btn);
      });
      document.body.appendChild(this._fsTray);
    }

    _floatEmoji(emoji) {
      const el = document.createElement('div');
      el.textContent = emoji;
      el.style.cssText = `position:fixed;z-index:999999;font-size:40px;pointer-events:none;bottom:100px;left:${40 + Math.random() * 20}%;`;
      document.body.appendChild(el);
      let y = 0, opacity = 1;
      const step = () => {
        y += 1.5; opacity -= 0.007;
        el.style.transform = `translateY(-${y}px) translateX(${Math.sin(y / 25) * 18}px)`;
        el.style.opacity = opacity;
        if (opacity > 0) requestAnimationFrame(step);
        else el.remove();
      };
      requestAnimationFrame(step);
    }

    // #11: Fullscreen chat — fully functional
    _toggleFsChat() {
      if (this._fsChat) { this._fsChat.remove(); this._fsChat = null; return; }
      if (!this.activeConversation) {
        // If no active conversation, show a friend list to pick from
        if (!this.friends.length && !this.conversations.length) return;
        // Default to first conversation
        const conv = this.conversations[0];
        if (conv) this._openChat(conv);
        return;
      }

      this._fsChat = document.createElement('div');
      this._fsChat.style.cssText = 'position:fixed;bottom:60px;right:20px;width:320px;height:420px;z-index:99999;background:rgba(15,15,15,0.75);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,0.1);border-radius:12px;display:flex;flex-direction:column;font-family:Roboto,sans-serif;color:#f1f1f1;';

      this._fsChat.innerHTML = `
        <div style="padding:8px 12px;border-bottom:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;gap:6px;">
          <span style="flex:1;font-size:13px;font-weight:500;">${esc(this.activeConversation.friendUsername)}</span>
          <button id="ytf-fs-close" style="width:24px;height:24px;border-radius:50%;border:none;background:rgba(255,255,255,0.1);color:#f1f1f1;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:14px;">✕</button>
        </div>
        <div id="ytf-fs-msgs" style="flex:1;overflow-y:auto;padding:8px 10px;display:flex;flex-direction:column;gap:3px;"></div>
        <div style="display:flex;align-items:center;padding:6px 8px;border-top:1px solid rgba(255,255,255,0.08);gap:6px;">
          <input id="ytf-fs-input" style="flex:1;padding:6px 10px;border:1px solid rgba(255,255,255,0.1);border-radius:50px;background:rgba(255,255,255,0.08);color:#f1f1f1;font-family:Roboto,sans-serif;font-size:12px;outline:none;" placeholder="Type..." autocomplete="off" />
          <button id="ytf-fs-send" style="width:28px;height:28px;border-radius:50%;border:none;background:#3ea6ff;color:#0f0f0f;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:14px;">➤</button>
        </div>`;
      document.body.appendChild(this._fsChat);

      // Populate messages including video share cards
      const msgsDiv = this._fsChat.querySelector('#ytf-fs-msgs');
      for (const m of this.chatMessages.slice(-20)) {
        this._appendFsChatMessage(m);
      }

      this._fsChat.querySelector('#ytf-fs-close').addEventListener('click', () => { this._fsChat.remove(); this._fsChat = null; });
      const fsInput = this._fsChat.querySelector('#ytf-fs-input');
      const fsSend = this._fsChat.querySelector('#ytf-fs-send');
      fsInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && fsInput.value.trim()) { this._sendChat(fsInput.value.trim()); fsInput.value = ''; }
      });
      fsSend.addEventListener('click', () => {
        if (fsInput.value.trim()) { this._sendChat(fsInput.value.trim()); fsInput.value = ''; }
      });

      // Stop keyboard event propagation to prevent YouTube player shortcuts when typing in fullscreen chat
      ['keydown', 'keyup', 'keypress'].forEach(type => {
        this._fsChat.addEventListener(type, (e) => {
          e.stopPropagation();
        });
      });

      if (msgsDiv) msgsDiv.scrollTop = msgsDiv.scrollHeight;
    }

    // ==========================================================
    // #14: YTF Share Button (injected into YouTube action bar)
    // ==========================================================
    _setupYTFShareButton() {
      // Use MutationObserver to inject button when YouTube renders the action bar
      this._ytfShareObserver = new MutationObserver(() => this._tryInjectShareButton());
      this._ytfShareObserver.observe(document.body, { childList: true, subtree: true });
      // Also try immediately
      setTimeout(() => this._tryInjectShareButton(), 1000);
    }

    _tryInjectShareButton() {
      // Only on watch/shorts pages
      if (!isWatchPage() && !isShortsPage()) {
        // Remove button if it exists on non-video pages
        if (this._ytfShareBtn?.parentNode) this._ytfShareBtn.remove();
        return;
      }

      // Find YouTube's active watch page action buttons container
      let actionsOuter = document.querySelector('ytd-watch-flexy[is-active] ytd-watch-metadata #actions');
      if (!actionsOuter) {
        // Fallback to other selectors but make sure they are visible
        const candidates = document.querySelectorAll('ytd-watch-metadata #actions, ytd-watch-metadata ytd-menu-renderer, #top-level-buttons-computed');
        for (const cand of candidates) {
          if (cand.offsetWidth > 0 || cand.offsetHeight > 0) {
            actionsOuter = cand;
            break;
          }
        }
      }
      if (!actionsOuter) return;

      // Check if already injected in this active container
      if (actionsOuter.querySelector('#ytf-share-btn')) return;

      const btn = document.createElement('button');
      btn.id = 'ytf-share-btn';
      btn.style.cssText = `
        display: inline-flex; align-items: center; gap: 6px;
        padding: 0 16px; height: 36px; border-radius: 18px;
        background: rgba(255,255,255,0.1); border: none;
        color: #f1f1f1; font-family: Roboto, sans-serif;
        font-size: 14px; font-weight: 500; cursor: pointer;
        transition: background 0.15s; margin-left: 8px;
        vertical-align: middle;
      `;
      btn.innerHTML = `${YTF_SHARE_SVG} <span>YTF</span>`;
      btn.addEventListener('mouseover', () => { btn.style.background = 'rgba(255,255,255,0.2)'; });
      btn.addEventListener('mouseout', () => { btn.style.background = 'rgba(255,255,255,0.1)'; });
      btn.addEventListener('click', () => this._onYTFShareClick());

      actionsOuter.appendChild(btn);
      this._ytfShareBtn = btn;
    }

    _onYTFShareClick() {
      const vid = getVideoId();
      if (!vid) return;
      const title = document.title.replace(' - YouTube', '');
      const thumb = `https://img.youtube.com/vi/${vid}/mqdefault.jpg`;
      const isShorts = isShortsPage();
      const url = window.location.href;

      // Try to get channel name
      let channel = '';
      const channelEl = document.querySelector('#owner #channel-name a, ytd-channel-name a');
      if (channelEl) channel = channelEl.textContent?.trim() || '';

      // Try to get duration
      let duration = '';
      const durEl = document.querySelector('.ytp-time-duration');
      if (durEl) duration = durEl.textContent?.trim() || '';

      this._pendingShare = { videoId: vid, title, thumbnail: thumb, url, channel, duration, isShorts };

      // #15: Open sidebar and switch to chats tab
      if (!this.isOpen) this._togglePanel();
      this.activeTab = 'chats';
      this.shadowRoot?.querySelectorAll('.ytf-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === 'chats'));
      // Close any open chat
      if (this.chatWindow) this.chatWindow.classList.remove('open');
      this.activeConversation = null;
      this._renderTab();
    }

    // ==========================================================
    // Utility
    // ==========================================================
    toggle() { this._togglePanel(); }

    onAuthStateChanged(loggedIn, user) {
      if (loggedIn) { this.currentUser = user; if (!user.unique_username) this._renderOnboarding(); else this._renderMain(); }
      else { this.currentUser = null; this._renderLogin(); }
    }

    _msg(m) {
      return new Promise((resolve, reject) => {
        try {
          chrome.runtime.sendMessage(m, (r) => {
            if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
            else resolve(r);
          });
        } catch (e) {
          reject(e);
        }
      });
    }

    destroy() {
      clearTimeout(this._typingDebounce);
      clearTimeout(this._peerTypingTimeout);
      clearTimeout(this._searchDebounce);
      this._unhookVideoSync();
      if (this._ytfShareObserver) this._ytfShareObserver.disconnect();
      if (this._ytfShareBtn?.parentNode) this._ytfShareBtn.remove();
      if (this._fsChat) this._fsChat.remove();
      if (this._fsTray) this._fsTray.remove();
      if (this._fsCtrl) this._fsCtrl.remove();
      if (this._fsListener) {
        document.removeEventListener('fullscreenchange', this._fsListener);
        this._fsListener = null;
      }
      // Remove popups
      document.getElementById('ytf-sync-invite-popup')?.remove();
      document.getElementById('ytf-pause-request-popup')?.remove();
      if (this._kbCapture) {
        document.removeEventListener('keydown', this._kbCapture, true);
        document.removeEventListener('keyup', this._kbCapture, true);
        document.removeEventListener('keypress', this._kbCapture, true);
      }
      if (this.host?.parentNode) this.host.parentNode.removeChild(this.host);
      this.host = null; this.shadowRoot = null; this.sidebar = null; this.chatWindow = null;
    }
  }

  // =============================================================
  // Initialization
  // =============================================================
  let sidebarUI = null;

  function initializeExtension(preserved) {
    if (!document.body) return;
    sidebarUI = new SidebarUI();
    if (preserved) {
      sidebarUI.currentUser = preserved.currentUser;
      sidebarUI.syncSession = preserved.syncSession;
      sidebarUI.isHost = preserved.isHost;
      sidebarUI.hostState = preserved.hostState;
      sidebarUI.activeConversation = preserved.activeConversation;
      sidebarUI.chatMessages = preserved.chatMessages;
      sidebarUI.isOpen = preserved.isOpen;
      sidebarUI.activeTab = preserved.activeTab;
      sidebarUI._triggerTop = preserved.triggerTop;
    }
    sidebarUI.init();
    window.__sidebarUI = sidebarUI;
  }

  // YouTube SPA navigation: destroy and reinitialize
  document.addEventListener('yt-navigate-finish', () => {
    let preserved = null;
    if (window.__sidebarUI) {
      // Preserve state across navigation
      preserved = {
        currentUser: window.__sidebarUI.currentUser,
        syncSession: window.__sidebarUI.syncSession,
        isHost: window.__sidebarUI.isHost,
        hostState: window.__sidebarUI.hostState,
        activeConversation: window.__sidebarUI.activeConversation,
        chatMessages: window.__sidebarUI.chatMessages,
        isOpen: window.__sidebarUI.isOpen,
        activeTab: window.__sidebarUI.activeTab,
        triggerTop: window.__sidebarUI._triggerTop
      };
      window.__sidebarUI.destroy();
      window.__sidebarUI = null;
    }
    window.__ytfInitialized = false;
    initializeExtension(preserved);
    window.__ytfInitialized = true;
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.action) {
      case 'TOGGLE_SIDEBAR': if (sidebarUI) sidebarUI.toggle(); break;
      case 'AUTH_STATE_CHANGED': if (sidebarUI) sidebarUI.onAuthStateChanged(message.loggedIn, message.user); break;
      case 'SSE_EVENT': if (sidebarUI) sidebarUI.handleSSEEvent(message.eventType, message.payload); break;
    }
    sendResponse({ received: true });
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initializeExtension);
  else initializeExtension();
})();
