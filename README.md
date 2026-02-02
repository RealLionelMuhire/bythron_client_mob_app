# BYThron GPS Tracking Mobile App

A premium GPS tracking application built with React Native (Expo) for monitoring vehicles and devices in real-time.

## Features

- **Live Tracking**: Real-time device location updates every 5 seconds
- **Dark Map Theme**: Mapbox integration with cyberpunk/dark aesthetic
- **Historical Routes**: View past routes with date selection and route playback
- **Device Management**: Monitor multiple GPS devices with online/offline status
- **Authentication**: Secure login with Clerk, synced to backend

## Tech Stack

### Mobile App
- **Framework**: React Native (Expo)
- **Maps**: Mapbox Maps SDK for Mobile (`@rnmapbox/maps`)
- **State Management**: Zustand
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **Authentication**: Clerk
- **HTTP Client**: Fetch API
- **Package Manager**: Bun

### Backend (Separate Repository)
- **API Framework**: Python/FastAPI
- **Database**: PostgreSQL with PostGIS extension
- **Authentication**: Synced with Clerk
- **Location Data**: GeoJSON format for routes

## Prerequisites

- Node.js 18+ or Bun
- Expo CLI
- Mapbox account and access token
- Backend API running (default: `http://164.92.212.186:8000`)

## Setup

1. **Clone and install dependencies**:
```bash
git clone <repository-url>
cd bythron_client_mob_app
bun install
```

2. **Configure environment variables**:

Create/update `.env` file:
```bash
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_key
EXPO_PUBLIC_API_BASE_URL=http://164.92.212.186:8000
EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.your_mapbox_token
```

3. **Update Mapbox token in `app.json`**:
```json
{
  "expo": {
    "plugins": [
      ["@rnmapbox/maps", {
        "RNMapboxMapsDownloadToken": "pk.your_mapbox_token",
        "RNMapboxMapsImpl": "mapbox"
      }]
    ]
  }
}
```

## Running the App

**Development**:
```bash
bun run android  # Android
bun run ios      # iOS
```

**Start Expo**:
```bash
bun start
```

## Project Structure

```
├── app/
│   ├── (api)/              # Backend API proxy routes
│   ├── (auth)/             # Authentication screens
│   └── (root)/(tabs)/      # Main app screens (Home, Profile)
├── components/
│   ├── Map.tsx             # Mapbox map component
│   ├── DeviceCard.tsx      # Device list item
│   └── HistorySheet.tsx    # Historical route picker
├── lib/
│   └── liveTracking.ts     # Location polling utilities
├── store/
│   └── index.ts            # Zustand state management
└── types/
    └── type.d.ts           # TypeScript definitions
```

## Backend API Endpoints

The app expects the following endpoints from your FastAPI backend:

### Device Management
- `GET /api/devices` - List user's GPS devices
  ```json
  Response: [
    {
      "id": 1,
      "name": "Vehicle 1",
      "vehicle_info": "Toyota Camry",
      "status": "online",
      "last_seen": "2026-02-02T12:00:00Z",
      "imei": "123456789012345"
    }
  ]
  ```

### Location Tracking
- `GET /api/locations/{id}/latest` - Get latest device location
  ```json
  Response: {
    "id": 123,
    "device_id": 1,
    "latitude": 40.7128,
    "longitude": -74.0060,
    "altitude": 10.5,
    "speed": 45.2,
    "course": 180.0,
    "accuracy": 5.0,
    "timestamp": "2026-02-02T12:00:00Z"
  }
  ```

- `GET /api/locations/{id}/route?start_time=X&end_time=Y` - Get historical route (GeoJSON)
  ```json
  Response: {
    "type": "FeatureCollection",
    "features": [{
      "type": "Feature",
      "geometry": {
        "type": "LineString",
        "coordinates": [[-74.0060, 40.7128], [-74.0070, 40.7138]]
      },
      "properties": {
        "device_id": 1,
        "start_time": "2026-02-02T10:00:00Z",
        "end_time": "2026-02-02T12:00:00Z"
      }
    }]
  }
  ```

### Authentication
- `POST /api/auth/sync` - Sync Clerk user to database
  ```json
  Request: {
    "userId": "user_abc123",
    "email": "user@example.com",
    "name": "John Doe"
  }
  Response: { "success": true }
  ```

## Database Schema

The backend uses **PostgreSQL with PostGIS** extension for spatial data:

### Tables
- **users**: Stores user information synced from Clerk
- **devices**: GPS tracking devices associated with users
- **locations**: GPS location points with PostGIS geometry
- **routes**: Historical route data (optional, can be computed from locations)

### Key Fields
- Location data uses PostGIS `POINT` geometry type
- Routes use PostGIS `LINESTRING` geometry type
- Timestamps are stored in UTC
- `course` field represents heading/bearing in degrees (0-360)

## Mapbox Configuration

This app uses **Maps SDKs for Mobile** pricing tier:
- Free tier: 25,000 monthly active users
- Get your token: https://account.mapbox.com/access-tokens/
- Use the default public token (starts with `pk.`)

## License

Proprietary - BYThron
