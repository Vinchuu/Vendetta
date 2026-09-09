# Vendetta Realtime Backend

A lightweight, standalone backend service built with Node.js, Express, Socket.IO, and MongoDB Atlas (with local JSON fallback).

---

## 🚀 Deploying to Railway

You can deploy this backend to [Railway](https://railway.app) in two ways:

### Method 1: Deploy from this Repository (Recommended)

1. Log in to [Railway](https://railway.app) and click **"New Project"**.
2. Select **"Deploy from GitHub repo"** and choose your Vendetta repository.
3. Click on the newly created service in your Railway project canvas and go to **Settings**:
   - **Root Directory**: Set to `/server`
   - **Healthcheck Path**: `/api/health`
4. Go to the **Variables** tab and set your environment variables (see below).
5. Go to the **Settings** tab -> **Networking** -> click **"Generate Domain"** to get your public URL (e.g., `https://vendetta-backend-production.up.railway.app`).

### Method 2: Deploy from Root directly

If you don't change the Root Directory, the root `railway.json` is automatically detected by Railway and will run:
```bash
node server/index.js
```

---

## 🔑 Environment Variables on Railway

In your Railway project service -> **Variables**, configure the following:

| Variable | Required | Description | Example |
| :--- | :--- | :--- | :--- |
| `PORT` | Auto | Assigned automatically by Railway | `5000` |
| `MONGODB_URI` | Recommended | MongoDB Atlas connection string | `mongodb+srv://user:pass@cluster.mongodb.net/vendetta?retryWrites=true&w=majority` |
| `ADMIN_PASSWORD` | Optional | Leader / Admin passcode | `YK789` |
| `MEMBER_PASSWORD`| Optional | Member passcode | `takla` |
| `ADMIN_DISCORD_IDS` | Optional | Comma-separated Discord IDs with admin rights | `879604109366394880` |
| `MEMBER_DISCORD_IDS`| Optional | Comma-separated Discord IDs with member access | `879604109366394880` |
| `CLIENT_URL` | Optional | Restrict CORS to specific frontend URL (leave blank to allow all) | `https://my-frontend.vercel.app` |

> 💡 **Note on Persistence**: If `MONGODB_URI` is omitted, the server uses the local `server/data/db.json` file. For production on Railway, MongoDB Atlas is recommended because containers can have ephemeral storage across redeploys unless a persistent Railway volume is mounted.

---

## 🌐 Connecting Clients

### 1. Web Frontend (Vite / React)
In your web app's `.env` (or Vercel / Netlify environment settings), set:
```env
VITE_API_URL=https://vendetta-backend-production.up.railway.app
```

### 2. React Native (RN) / Mobile App
If you have a React Native app connecting to this backend:

```typescript
import { io } from 'socket.io-client';

const BACKEND_URL = 'https://vendetta-backend-production.up.railway.app';

// REST API Request Example
export async function fetchMembers() {
  const response = await fetch(`${BACKEND_URL}/api/members`);
  return await response.json();
}

// Realtime Socket.IO Connection
export const socket = io(BACKEND_URL, {
  transports: ['websocket', 'polling'],
});

socket.on('connect', () => {
  console.log('Connected to Vendetta Railway backend:', socket.id);
});

socket.on('members', (members) => {
  console.log('Realtime members updated:', members);
});
```

---

## 🩺 Health Check & API Status

- **Status & Info**: `GET /`
- **Health Check**: `GET /api/health`

Sample response:
```json
{
  "ok": true,
  "realtime": "socket.io",
  "persistence": "mongodb-atlas"
}
```

---

## 💻 Local Development

To run the backend standalone:
```bash
cd server
npm install
npm run dev
```
Server runs at `http://localhost:5000`.
