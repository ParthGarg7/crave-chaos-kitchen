# CRAVE Frontend

> React 18 + TypeScript single-page application for the CRAVE food delivery platform, featuring role-based dashboards, developer tools for failure injection, chaos engineering controls, and real-time observation logs.

---

## Overview

The frontend is a full-featured food delivery SPA that also serves as the **control plane** for the self-healing cloud simulator. Regular users interact with a polished food ordering experience, while developers access a comprehensive suite of failure injection and monitoring tools.

---

## Tech Stack

| Technology | Purpose |
|-----------|---------|
| **React 18** | UI framework |
| **TypeScript** | Type safety |
| **Vite** | Build tool & dev server |
| **TailwindCSS** | Utility-first styling |
| **Zustand** | State management (persisted to localStorage) |
| **Axios** | HTTP client with auth interceptors |
| **Framer Motion** | Animations & transitions |
| **React Router v6** | Client-side routing |

---

## Project Structure

```
frontend/
├── src/
│   ├── components/          # Reusable UI components
│   ├── pages/               # Route-level page components
│   ├── services/            # API service layer (Axios)
│   ├── stores/              # Zustand state stores
│   ├── types/               # TypeScript type definitions
│   ├── App.tsx              # Root component with routing
│   ├── main.tsx             # Entry point
│   └── index.css            # Global styles (dark theme)
├── index.html               # HTML entry point
├── package.json             # Dependencies & scripts
├── tailwind.config.js       # TailwindCSS configuration
├── tsconfig.json            # TypeScript configuration
├── vite.config.ts           # Vite configuration with API proxy
├── Dockerfile               # Container image definition
└── .env.example             # Environment variable template
```

---

## Route Map

### Public Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | HeroPage | Landing page |
| `/browse` | BrowsePage | Restaurant listing |
| `/menu/:id` | MenuPage | Restaurant menu & cart |
| `/login` | LoginPage | Authentication |
| `/register` | RegisterPage | User registration |

### Authenticated Routes

| Route | Component | Role | Description |
|-------|-----------|------|-------------|
| `/tracking` | TrackingPage | Auth | Order tracking |
| `/restaurant-dashboard` | RestaurantDashboard | Owner | Kitchen management |
| `/setup-restaurant` | SetupRestaurantPage | Owner | Restaurant onboarding |
| `/driver-dashboard` | DriverDashboard | Driver | Delivery management |
| `/admin` | AdminPanel | Admin | User & restaurant admin |

### Developer Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/developer` | DeveloperDashboard | Dev tools hub |
| `/developer/failure-simulator` | FailureSimulatorPage | 9 scenario control panel |
| `/developer/chaos-engineer` | ChaosEngineer | 23 experiment toggles |
| `/developer/dual-view` | DualView | Side-by-side customer + observation |
| `/developer/observation-logs` | ObservationLogsPage | Live log stream |
| `/developer/analysis` | AnalysisPage | Metrics & analytics |
| `/developer/injector-control` | InjectorControlPage | Injector + traffic + RabbitMQ control |

---

## Setup

### Development

```bash
npm install
npm run dev
# Opens at http://localhost:3000
```

The Vite dev server proxies `/api/*` requests to `http://localhost:8000` (the backend).

### Production build

```bash
npm run build
npm run preview
```

### Docker

```bash
docker build -t crave-frontend .
docker run -p 3001:3000 crave-frontend
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | (empty, uses proxy) | Backend API base URL |
