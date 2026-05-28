# StreamGrid

A real-time multi-user monitoring platform built using Next.js, Node.js, and LiveKit.
The system allows multiple clients to stream their webcam, microphone, and screen simultaneously to a centralized admin dashboard.

---

## Features

### Client Side

* Unique participant joining
* Webcam and microphone streaming
* Screen sharing support
* Device selection controls
* Local media preview
* Mic activity meter
* Media status indicators

### Admin Dashboard

* Live monitoring of all connected clients
* Webcam + screen stream viewing
* Join timestamps and elapsed session tracking
* Camera/mic/screen activity badges
* Responsive multi-user grid layout
* Dynamic participant management

---

# Tech Stack

## Frontend

* Next.js
* React
* TypeScript
* Tailwind CSS
* LiveKit React SDK

## Backend

* Node.js
* Express.js
* LiveKit Server SDK

## Streaming Infrastructure

* LiveKit Cloud
* WebRTC

---

# Project Structure

```bash
/project-root
│
├── frontend/
│   ├── app/
│   ├── components/
│   └── ...
│
├── backend/
│   ├── server.js
│   └── ...
│
└── README.md
```

---

# Environment Variables

## Frontend (.env.local)

```env
NEXT_PUBLIC_LIVEKIT_URL=wss://your-livekit-url
NEXT_PUBLIC_TOKEN_SERVER=https://your-token-server-url
```

---

## Backend (.env)

```env
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret
LIVEKIT_URL=wss://your-livekit-url
PORT=5000
```

---

# Installation & Local Setup

## 1. Clone Repository

```bash
git clone <your-repo-url>
cd <repo-name>
```

---

# Backend Setup

## 2. Navigate to Backend

```bash
cd backend
```

## 3. Install Dependencies

```bash
npm install
```

## 4. Start Backend Server

```bash
npm run dev
```

Backend runs on:

```bash
http://localhost:5000
```

---

# Frontend Setup

## 5. Open New Terminal

```bash
cd frontend
```

## 6. Install Dependencies

```bash
npm install
```

## 7. Run Frontend

```bash
npm run dev
```

Frontend runs on:

```bash
http://localhost:3000
```

---

# Production Deployment

Deployed using:

* Render

---

# Streaming Workflow

```text
Clients
   ↓
Frontend (Next.js)
   ↓
Token Server (Node.js)
   ↓
LiveKit Cloud
   ↓
Admin Dashboard
```

---

# Future Improvements

* Session recording
* AI-based analytics
* Remote admin controls
* Adaptive quality optimization
* Authentication system
* Database integration
* Chat and data channels

---

# License

MIT License
