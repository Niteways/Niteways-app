# Running Niteways on Android Emulator with Metro

## Prerequisites

- **Android Studio** with an AVD (Android Virtual Device) created
- **Node.js** ≥ 18
- **Android SDK** and `ANDROID_HOME` set (Android Studio usually sets this)

## Option A: One command (Metro + Android together)

From the `mobile-app` folder:

```bash
cd mobile-app
npm install
npm run dev:android
```

This starts Metro, waits until it is ready, then builds and launches the app on the emulator. Both run in the same terminal.

## Option B: Two terminals (recommended for development)

**Terminal 1 – start Metro:**

```bash
cd mobile-app
npm start
```

Leave this running. Wait until you see “Welcome to Metro” and the bundler is ready.

**Terminal 2 – run the app on the emulator:**

```bash
cd mobile-app
npm run android
```

This builds the Android app, installs it on the emulator, and connects to Metro. The app will load the JS bundle from Metro.

## Make sure the emulator is running

- Open **Android Studio → Device Manager** and start an AVD, or  
- From CLI: `emulator -avd <your_avd_name>`

Then use Option A or B above.

## If the app can’t connect to Metro

- Shake the device / press `Ctrl+M` (or `Cmd+M` on Mac) in the emulator → **Settings → Debug server host** and set it to `10.0.2.2:8081` (Android emulator’s alias for your machine’s localhost).
- Ensure nothing else is using port **8081** (only one Metro instance).

## Useful commands

| Command           | Description                          |
|------------------|--------------------------------------|
| `npm start`      | Start Metro only                     |
| `npm run android`| Build & run app (Metro must be up)   |
| `npm run dev:android` | Start Metro and run Android in one go |
