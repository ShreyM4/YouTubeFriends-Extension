
# YTF - YouTube Friends - Watch Together & Chat Extension

![YTF Logo](/placeholder/for/logo.png)

YTF is a powerful browser extension that transforms your YouTube experience into a social platform. It allows you to watch YouTube videos in perfect sync with your friends, chat in real-time, share reactions with emojis, and more! 

## ✨ Features

### 🎬 Watch Together (Perfect Sync)
- **Synchronized Playback**: The Host's video controls (Play, Pause, Seek) perfectly sync with all viewers in real-time.
- **Enforced Viewing**: Viewers' personal playback controls are disabled during a Watch Together session so everyone stays on the exact same frame!
- **Accept/Ignore Actions**: The Host has full control and receives prompts to accept or ignore playback actions from invited viewers.

### 💬 Real-time Chat
- **Overlay Chat Interface**: A sleek, intuitive chat window that overlays right on the YouTube page without disrupting the layout.
- **Chat Notification**: An integrated chat button that allows you to seamlessly open and close the active chat for the current video.

### 😄 Emoji Reactions
- Share live emoji reactions that elegantly float up the screen while you and your friends watch a video.
- Real-time interaction to let your friends know how you feel during the video.

### 👥 Friends & Social System
- **Discord Login**: Seamless authentication using Discord OAuth2. Link your Discord account with just a click.
- **Friend Management**: Add friends and see their online status.
- **Invite System**: Invite friends to watch the current video with you via simple push notifications.

### 🔗 Video Sharing & Shorts
- Easily share the currently playing video with your friends.
- Support for YouTube Shorts as well as standard videos.

### ⚙️ Enhanced UX/UI
- **Movable Overlay**: The chat interface can be moved or minimized.
- **Fullscreen Mode Compatibility**: Works flawlessly in fullscreen mode with an exclusive floating button for quick access.
- **Custom Aesthetic**: Follows a modern dark mode aesthetic with micro-animations and polished design elements.

---

## 🛠️ Technology Stack

This project was built from scratch with a robust, custom architecture to ensure real-time performance and low latency.

### Frontend (Browser Extension)
- **Vanilla JavaScript & DOM Manipulation**: Injected scripts running directly on YouTube pages, interacting seamlessly with the YouTube API.
- **CSS3**: Custom, rich aesthetics featuring glassmorphism, responsive floating buttons, and smooth CSS animations for emoji reactions.
- **Chrome Extension API**: Heavy usage of service workers (`background.js`), content scripts, message passing, and storage to manage extension state efficiently.

### Backend Server & Database
- **Node.js & Express**: A lightweight, highly performant RESTful API that powers user sessions, friends lists, and messaging.
- **Server-Sent Events (SSE)**: For ultra-low latency real-time communication between the host and viewers. Watch Together sync requests, chat messages, and emoji reactions are instantly pushed to clients.
- **PostgreSQL**: A robust relational database schema to manage users, friendships, chat history, and active sync sessions.
- **Discord OAuth2**: Secure user authentication.

### Infrastructure & Deployment
We turned an old laptop into a fully functional, publicly accessible server! 
- **Docker**: Containerized the Node.js backend and PostgreSQL database to run reliably and isolated on the laptop.
- **Tailscale Funnels**: Used Tailscale Funnels to securely expose the local Docker server to the public internet, providing a secure `https://` endpoint without the need for complex port forwarding or a static IP.

---

## 📸 Screenshots & Demos

### Login & Authentication
![Discord Login Placeholder](/placeholder/for/login.png)

### The Chat Interface
![Chat UI Placeholder](/placeholder/for/chat.png)

### Watch Together in Action
![Watch Together Placeholder](/placeholder/for/watch_together.gif)

### Emoji Reactions
![Emoji Reactions Placeholder](/placeholder/for/emojis.gif)

---

## 🚀 How to Install and Use

### Prerequisites
- Chrome or any Chromium-based browser (Edge, Brave, etc.).

### Installation Steps
1. **Download the Extension**: Get the latest extension folder from this repository.
2. **Open Extensions Page**: Navigate to `chrome://extensions/` in your browser.
3. **Enable Developer Mode**: Toggle the "Developer mode" switch in the top right corner.
4. **Load Unpacked**: Click on the "Load unpacked" button and select the extension folder.

### Usage Guide
1. **Login**: Click on the YTF extension icon in your toolbar and log in with your Discord account.
2. **Add Friends**: Go to the Friends tab in the extension popup and add your friends using their Discord ID or username.
3. **Start Watching**: Open any YouTube video. You will see the YTF floating chat icon on the page.
4. **Invite**: Click the icon, go to the active friends list, and invite them to Watch Together!

---
*Created by ShreyM4*
