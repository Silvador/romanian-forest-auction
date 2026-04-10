# RoForest Mobile

React Native (Expo) app for the Romanian Forest Auction marketplace.
Connects to the same backend, Firebase project, and WebSocket server as
the web app — same user accounts work on both.

## Quick start

### 1. Install dependencies

```bash
npm install
```

### 2. Make sure the backend is running and reachable

```bash
# In a separate terminal, from the project root:
cd ..
npm run dev
```

The dev server listens on `:5000`. **It must be reachable from whatever
device you'll run the app on** — iOS simulator can hit `localhost`, but a
real phone needs your Mac's LAN IP.

### 3. Configure the API URL

```bash
cp .env.example .env.local
```

Edit `.env.local`:

- **iOS simulator**: leave as `http://localhost:5000`
- **Real iPhone or Android over Wi-Fi**: get your Mac's LAN IP with
  `ipconfig getifaddr en0` and set `EXPO_PUBLIC_API_URL=http://<LAN-IP>:5000`
- **Anywhere via Expo tunnel**: set after running `npx expo start --tunnel`

### 4. Run

```bash
npx expo start
# or for tunnel mode (slower but works on any network):
npx expo start --tunnel
```

Then:

- Press `i` to open the iOS simulator
- Press `a` to open an Android emulator
- Or scan the QR code with the **Expo Go** app on your phone

### 5. Log in with a test account

| Role | Email | Password |
|------|-------|----------|
| Buyer | `vlad.test2@silvador.ro` | `TestPass123!` |
| Forest Owner | `owner.test@silvador.ro` | `TestPass123!` |

## Build for distribution

```bash
# Internal preview build (TestFlight / APK)
eas build --profile preview --platform ios
eas build --profile preview --platform android

# Production
eas build --profile production --platform all
```

See `eas.json` for the build profile config.

Before the first build, run `npx eas init` to link the project to an
EAS project ID and replace the placeholder in `app.json`.

## Project structure

```
silvador-mobile/
├── app/                    # Expo Router screens (file-based routing)
│   ├── (auth)/            # Login, register, forgot-password
│   ├── (tabs)/            # 5 main tabs: Licitatii, Panou, Piata, Alerte, Profil
│   ├── auction/[id].tsx   # Auction detail with bidding
│   └── create-listing.tsx # 6-step listing creation
├── components/            # Shared UI components
├── hooks/                 # React Query + WebSocket hooks
├── lib/                   # API client, Firebase, formatters, config
├── constants/             # Colors, typography, species, regions
└── types/                 # Shared TypeScript types (mirror of web shared/schema.ts)
```

## Tech stack

- **React Native + Expo** (managed workflow, file-based routing via Expo Router)
- **TypeScript** strict mode
- **Firebase Auth + Firestore + Storage** — same project as web app
- **Socket.io** — real-time bid updates
- **React Query** — data fetching with AsyncStorage persistence (offline support)
- **react-native-svg** — custom charts and countdown rings
- **react-native-maps** — map view in feed (native only; web shows fallback)
- **expo-notifications** — push notifications
- **expo-haptics** — tactile feedback throughout

## Troubleshooting

**"Network request failed" on a real phone**
You're hitting `localhost` from a device that doesn't have your Mac as
localhost. Set `EXPO_PUBLIC_API_URL` to your LAN IP in `.env.local`, then
restart the dev server (`r` in the Expo CLI to reload).

**Login works but dashboards/feed are empty**
The Firebase Auth call succeeded but the API call failed. Check the Metro
logs for the actual fetch error, and confirm the backend is reachable at
the configured `EXPO_PUBLIC_API_URL`.

**WebSocket not connecting**
Same `EXPO_PUBLIC_API_URL` is used for the Socket.io connection. If the
backend uses HTTPS (production), the URL must start with `https://` so
Socket.io picks the right transport.

**Push notifications not arriving**
The backend `POST /api/users/push-token` endpoint and `expo-server-sdk`
sending logic are required for actual push delivery — the mobile app
registers tokens but the server hasn't been wired to send pushes yet.
The in-app real-time toasts (via WebSocket) work without that.
