# Nightclub App - Proof of Concept

A comprehensive nightlife discovery and booking application featuring a React Native mobile app, NestJS backend API, and Next.js admin dashboard.

## 📁 Project Structure

```
night_club_app/
├── backend/                 # NestJS API server
├── mobile-app/             # React Native application
├── admin-dashboard/        # Next.js admin panel
├── docker-compose.yml      # PostgreSQL database setup
└── README.md              # This file
```

## 🚀 Tech Stack

- **Mobile**: React Native with TypeScript
- **Backend**: Node.js, NestJS, TypeORM, PostgreSQL
- **Admin Dashboard**: Next.js 14, React, TypeScript
- **Database**: PostgreSQL 15
- **Authentication**: JWT
- **Push Notifications**: Firebase Cloud Messaging (FCM)

## 📋 Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose (for PostgreSQL)
- Android Studio (for Android development)
- Xcode (for iOS development - Mac only)
- Firebase project with FCM enabled

## 🛠️ Setup Instructions

### 1. Clone and Install Dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Install mobile app dependencies
cd ../mobile-app
npm install

# Install admin dashboard dependencies
cd ../admin-dashboard
npm install
```

### 2. Start PostgreSQL Database

```bash
# From root directory
docker-compose up -d
```

### 3. Configure Environment Variables

Create `.env` file in the `backend` directory (see `backend/.env.example`).

### 4. Run the Applications

**Backend API:**
```bash
cd backend
npm run start:dev
# Runs on http://localhost:3000
```

**Admin Dashboard:**
```bash
cd admin-dashboard
npm run dev
# Runs on http://localhost:3001
```

**Mobile App:**
```bash
cd mobile-app
npm start
# Then press 'a' for Android or 'i' for iOS
```

## 📱 POC Features

### Mobile App
- ✅ Splash screen
- ✅ User sign-up with mock SMS verification
- ✅ Browse nightclubs
- ✅ View club events
- ✅ Push notifications

### Admin Dashboard
- ✅ System stats (version, user count)
- ✅ User management
- ✅ Send push notifications

### Backend API
- ✅ User authentication (JWT)
- ✅ Nightclubs & events management
- ✅ Push notification service

## 📝 Development Timeline

**Total Time**: 40 hours (~5-7 days)

1. **Project Setup**: 4 hours
2. **Authentication**: 8 hours
3. **Mobile Features**: 8 hours
4. **Admin Dashboard**: 8 hours
5. **Push Notifications**: 8 hours
6. **Testing & Delivery**: 4 hours

## 🔗 API Documentation

Backend API runs on `http://localhost:3000`

Key endpoints:
- `POST /auth/signup` - Register new user
- `POST /auth/verify` - Verify mock SMS code
- `GET /nightclubs` - Get all nightclubs
- `GET /events/nightclub/:id` - Get events for a club
- `POST /notifications/send` - Send push notification

## 📦 Building for Production

**Android APK:**
```bash
cd mobile-app/android
./gradlew assembleRelease
# APK located at: android/app/build/outputs/apk/release/app-release.apk
```

**Android AAB:**
```bash
cd mobile-app/android
./gradlew bundleRelease
# AAB located at: android/app/build/outputs/bundle/release/app-release.aab
```

## 👥 Team

- **Harsh Ranpura** - Developer
- **Het Ranpura** - Developer

## 📄 License

POC Project - 2025
