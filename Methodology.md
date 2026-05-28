# Methodology & Engineering Process

# Introduction

The objective of this project was to build a scalable real-time monitoring platform capable of handling multiple simultaneous webcam and screen-sharing streams from different users and displaying them inside a centralized admin dashboard.

The primary focus was:

* real-time communication,
* low latency streaming,
* participant management,
* scalability,
* and reliable track handling.

---

# Architecture Choice

## Why WebRTC?

The application uses WebRTC as the core streaming protocol because it is specifically designed for:

* low-latency real-time communication,
* peer-to-peer media transport,
* adaptive streaming,
* and live audio/video delivery.

Compared to traditional HTTP streaming protocols, WebRTC provides significantly lower latency, making it suitable for real-time monitoring systems.

---

# Why LiveKit?

LiveKit was selected because it provides:

* a scalable SFU (Selective Forwarding Unit) architecture,
* simplified WebRTC management,
* track subscription handling,
* participant events,
* reconnection support,
* and production-ready media infrastructure.

Instead of manually implementing raw WebRTC signaling and media routing, LiveKit abstracts the complex networking layer while still allowing fine-grained control over tracks and participants.

---

# Backend Architecture Choice

The backend was designed as a dedicated token-generation server using Node.js and Express.

## Reason for Separate Backend

A separate backend was necessary because:

* LiveKit API secrets must never be exposed to the frontend,
* token generation requires secure server-side authentication,
* participant permissions must be controlled centrally.

The backend is responsible for:

* generating access tokens,
* assigning client/admin roles,
* controlling publish/subscribe permissions,
* and securely connecting users to LiveKit rooms.

---

# Frontend Architecture Choice

Next.js was selected because it provides:

* efficient React-based rendering,
* scalable project structure,
* routing support,
* component modularity,
* and easy deployment.

The frontend was separated into:

* `/client` for publishers,
* `/admin` for monitoring subscribers.

This separation simplified permission handling and UI management.

---

# Streaming Architecture

The project follows a:

* many-to-one streaming architecture.

## Workflow

1. Clients publish:

   * webcam,
   * microphone,
   * screen-share tracks.

2. Admin joins as a subscriber-only participant.

3. LiveKit SFU forwards media streams to the admin dashboard.

This architecture reduces unnecessary upstream bandwidth usage compared to full mesh peer-to-peer systems.

---

# Challenges Faced

## 1. Remote Tracks Not Rendering

### Problem

Initially, video streams were not appearing correctly on the admin dashboard even though participants successfully joined the room.

### Cause

Remote tracks were not being explicitly subscribed and attached to video elements.

### Solution

Explicit track subscription listeners were implemented using LiveKit participant and track events. Video tracks were manually attached to corresponding HTML video elements.

---

# 2. Screen Share Lifecycle Handling

### Problem

When users stopped screen sharing directly from the browser popup, stale tracks remained visible on the admin dashboard.

### Solution

Track cleanup logic and screen-share stop detection were implemented to:

* remove inactive tracks,
* update participant states,
* and notify users appropriately.

---

# 3. Managing Multiple Participants

### Problem

As more participants joined, dynamically rendering streams became difficult due to layout scaling and participant state synchronization.

### Solution

A responsive grid system was implemented along with centralized participant state management for:

* join timestamps,
* media states,
* and active track tracking.

---

# 4. Role-Based Access Control

### Problem

Admin users should only subscribe to streams while clients should only publish streams.

### Solution

The backend token server was modified to generate different permissions:

* Clients:

  * publish allowed
  * subscribe restricted
* Admin:

  * subscribe allowed
  * publish restricted

This ensured secure role separation.

---

# 5. Realtime Stability Issues

### Problem

Network interruptions occasionally caused frozen tracks and disconnected participants.

### Solution

LiveKit reconnection handling and participant cleanup logic were implemented to improve session reliability.

---

# Engineering Decisions

## Why SFU Instead of Mesh?

A mesh architecture becomes inefficient as participant count increases because each participant must send streams directly to every other participant.

Using LiveKit’s SFU architecture:

* clients publish streams only once,
* the server distributes streams efficiently,
* bandwidth usage scales significantly better.

---

# Optimization Strategies

The following optimizations were added:

* adaptive streaming,
* responsive layouts,
* explicit track cleanup,
* selective subscriptions,
* screen-share lifecycle management.

Future optimizations may include:

* virtualization,
* stream pagination,
* recording pipelines,
* and dynamic quality adaptation.

---

# Conclusion

The project successfully demonstrates a scalable real-time streaming architecture capable of handling multiple simultaneous webcam and screen-sharing streams using modern WebRTC infrastructure.

The implementation focuses on:

* scalability,
* low latency,
* secure backend design,
* and responsive realtime monitoring.
