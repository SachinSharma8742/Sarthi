# 🇮🇳 Saarthi (सारथी)
### *Your Digital Guardian for Safe & Smart Tourism*

[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/) [![React](https://img.shields.io/badge/React-19-blue)](https://react.dev/) [![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC)](https://tailwindcss.com/) [![Mapbox](https://img.shields.io/badge/Mapbox-Maps-blueviolet)](https://www.mapbox.com/)

---

## 🌟 Overview

**Saarthi** is a cutting-edge Tourist Monitoring and Emergency Response System designed to revolutionize travel safety in India. By bridging the gap between tourists and local authorities, Saarthi provides a seamless safety net using real-time geolocation, geofencing, and instant SOS protocols.

The platform serves two distinct user groups:
1.  **Tourists**: Empowering travelers with a 3D interactive guide, safety alerts, and a one-tap SOS lifeline.
2.  **Authorities**: Equipping law enforcement and tourism boards with a command-center dashboard for live monitoring and rapid incident response.

---

## 📱 Mobile Applications (Prototypes)

We have included two Android package (APK) files in the `mobile-app/` directory for testing and demonstration purposes:

| APK File | Description | Path |
|----------|-------------|------|
| **Saarthi.apk** | **Core Working Prototype**: The functional base of the application with working backend integration for location tracking and SOS. | [`mobile-app/Saarthi.apk`](./mobile-app/Saarthi.apk) |
| **app-release.apk** | **Frontend Experience Demo**: A polished UI prototype showcasing the intended design aesthetics and user flow. | [`mobile-app/app-release.apk`](./mobile-app/app-release.apk) |

> *Note: These are prototype builds. Ensure you allow installation from unknown sources on your Android device to test them.*

---

## 🚀 Key Features

### 🎒 For Tourists
*   **🌍 Interactive 3D Globe**: Explore destinations with an immersive, high-fidelity 3D globe interface.
*   **📍 Real-Time Tracking**: Secure, opt-in location sharing ensures authorities can assist you whenever needed.
*   **🚨 One-Tap SOS**: Instantly broadcast a distress signal to the nearest authorities with your precise location.
*   **🛡️ Zone Alerts**: Receive immediate notifications when entering high-risk or restricted zones (Geofencing).
*   **🆔 Identity Verification**: Seamless integration with Aadhaar and Passport for verified travel profiles.

### 👮‍♂️ For Authorities
*   **🖥️ Command Dashboard**: A centralized view of all active tourists in your jurisdiction.
*   **🗺️ Live Heatmaps**: Visualize tourist density and movement patterns on an interactive Mapbox map.
*   **⚠️ Incident Management**: Instant visual and audio alerts for SOS signals, categorized by severity.
*   **🏗️ Zone Management**: Draw and manage safety zones (Red/Yellow/Green) directly on the map to automate alerts.
*   **📊 Analytics**: Track detailed tourist statuses and historical data for safety audits.

---

## 🛠️ Technology Stack

*   **Frontend**: [Next.js 14](https://nextjs.org/) (App Router), React 19, TypeScript
*   **Styling**: Tailwind CSS, Shadcn/UI, Radix UI
*   **Maps & 3D**: Mapbox GL JS, Globe.gl, Three.js
*   **Backend**: Next.js API Routes (Serverless)
*   **Database**: MongoDB Atlas (Mongoose ODM)
*   **Authentication**: Custom JWT-based Auth with bcrypt encryption

---

## 🏗️ Getting Started

Follow these steps to set up the project locally:

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/saarthi.git
cd saarthi
```

### 2. Install Dependencies
```bash
npm install
# or
pnpm install
```

### 3. Configure Environment
Create a `.env.local` file in the root directory with the following variables:
```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secure_secret_key
```

### 4. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

*   **Tourist View**: Navigate to `/` (Requires login)
*   **Authority Dashboard**: Navigate to `/dashboard` (Open access for prototype)

---

## 📂 Project Structure

```bash
├── app/                  # Next.js App Router pages and API routes
├── components/           # Reusable UI components (Shadcn + Custom)
├── contexts/             # React Contexts (Auth, etc.)
├── lib/                  # Utilities, Database models, Helper functions
├── mobile-app/           # Android APK builds
├── public/               # Static assets
└── styles/               # Global styles and Tailwind config
```

---

## 🔒 Security & Privacy

*   **Data Encryption**: All sensitive user data is hashed and encrypted.
*   **Privacy First**: Location tracking is active only when permitted by the user.
*   **Secure API**: Middleware ensures only authorized requests access sensitive endpoints.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

*Built with ❤️ for a Safer India.*
