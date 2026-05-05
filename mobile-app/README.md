# Nightclub App - Mobile Application

React Native mobile app for discovering nightclubs and events.

## 📱 Features

- ✅ User sign-up with mock SMS verification
- ✅ Browse nightclubs
- ✅ View club events
- ✅ Push notifications
- ✅ Modern, responsive UI

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- React Native CLI
- Android Studio (for Android)
- Xcode (for iOS - Mac only)

### Installation

```bash
# Install dependencies
npm install

# Install iOS pods (Mac only)
cd ios && pod install && cd ..
```

### Running the App

**Android:**
```bash
npm run android
```

**iOS:**
```bash
npm run ios
```

**Metro Bundler:**
```bash
npm start
```

## 📁 Project Structure

```
src/
├── screens/
│   ├── SplashScreen.tsx      # App splash/loading screen
│   ├── SignUpScreen.tsx      # User registration
│   ├── VerificationScreen.tsx # SMS verification
│   ├── MainScreen.tsx         # Home/dashboard
│   ├── NightclubsListScreen.tsx # Browse clubs
│   └── ClubEventsScreen.tsx   # View events
├── components/
│   ├── Button.tsx             # Reusable button
│   ├── Input.tsx              # Text input component
│   └── NightclubCard.tsx      # Club list item
├── navigation/
│   └── AppNavigator.tsx       # Navigation setup
├── services/
│   ├── api.ts                 # API client
│   ├── auth.ts                # Auth service
│   └── notifications.ts       # FCM service
├── types/
│   └── index.ts               # TypeScript types
└── App.tsx                    # Root component
```

## 🔧 Configuration

### API Endpoint
Update the API base URL in `src/services/api.ts`:
```typescript
const API_BASE_URL = 'http://10.0.2.2:3000'; // Android emulator
// or
const API_BASE_URL = 'http://localhost:3000'; // iOS simulator
```

### Firebase Setup

1. Create a Firebase project
2. Add Android app and download `google-services.json`
3. Place `google-services.json` in `android/app/`
4. Add iOS app and download `GoogleService-Info.plist` (iOS only)
5. Place `GoogleService-Info.plist` in `ios/` folder

## 📦 Building for Production

### Android APK
```bash
npm run build:android
# APK: android/app/build/outputs/apk/release/app-release.apk
```

### Android AAB (for Play Store)
```bash
npm run build:android:bundle
# AAB: android/app/build/outputs/bundle/release/app-release.aab
```

### iOS (Xcode required)
1. Open `ios/NightclubApp.xcworkspace` in Xcode
2. Select "Product" → "Archive"
3. Follow distribution steps

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run with coverage
npm test -- --coverage
```

## 🎨 UI Screens

1. **Splash Screen** - App loading with branding
2. **Sign Up** - Name and mobile number input
3. **Verification** - 6-digit code entry (mock)
4. **Main Screen** - Welcome message, browse button
5. **Nightclubs List** - Grid/list of clubs
6. **Club Events** - Events for selected club

## 🔐 Authentication

- Mock SMS verification (accepts any 6-digit code)
- JWT token storage in AsyncStorage
- Automatic token refresh
- Logout functionality

## 📲 Push Notifications

- Firebase Cloud Messaging (FCM)
- Background & foreground handling
- Custom notification UI
- Deep linking support

## 🛠️ Troubleshooting

### Metro Bundler Issues
```bash
npm start -- --reset-cache
```

### Android Build Errors
```bash
cd android && ./gradlew clean && cd ..
```

### iOS Build Errors
```bash
cd ios && pod deintegrate && pod install && cd ..
```

## 📚 Tech Stack

- React Native 0.73
- TypeScript
- React Navigation 6
- Axios (HTTP client)
- AsyncStorage (local storage)
- Firebase Messaging (push notifications)
- React Native Vector Icons
