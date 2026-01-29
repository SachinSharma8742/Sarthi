# Tourist Tracker - Globe Explorer

A full-stack tourist tracking and emergency response system with an interactive 3D globe interface.

## Features

### Tourist Features
- **User Registration & Authentication**: Secure signup/signin with JWT tokens
- **Interactive Globe**: 3D globe interface for location exploration
- **Real-time Location Tracking**: Automatic GPS location updates
- **SOS Emergency System**: One-click emergency alert system
- **Proof Verification**: Support for Aadhaar and Passport verification

### Authority Features
- **Dashboard Access**: Direct access to authority dashboard (no login required for prototype)
- **Real-time Monitoring**: Live tracking of all registered tourists
- **Interactive Map**: Mapbox integration showing tourist locations
- **Emergency Alerts**: Visual highlighting of SOS alerts
- **Tourist Management**: Complete tourist information and status tracking

## Technology Stack

- **Frontend**: Next.js 14, React 19, TypeScript
- **Backend**: Next.js API Routes, MongoDB Atlas
- **Authentication**: JWT tokens, bcryptjs password hashing
- **Maps**: Mapbox GL JS, Globe.gl for 3D globe
- **UI**: Tailwind CSS, Radix UI components
- **Database**: MongoDB with tourist collection

## Environment Variables

Create a `.env.local` file with the following variables:

\`\`\`env
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_secure_jwt_secret_key
\`\`\`

## Database Schema

### Tourists Collection
\`\`\`javascript
{
  "_id": "ObjectId",
  "name": "string",
  "email": "string (unique)",
  "proofType": "string (Aadhaar or Passport)",
  "proofNumber": "string",
  "password": "string (hashed)",
  "createdAt": "Date",
  "lat": "number (nullable)",
  "lng": "number (nullable)",
  "timestamp": "Date (nullable)",
  "sos": "boolean (default false)"
}
\`\`\`

## API Endpoints

- `POST /api/auth/signup` - Tourist registration
- `POST /api/auth/signin` - Tourist login
- `GET /api/auth/verify` - Token verification
- `POST /api/location` - Update tourist location
- `POST /api/sos` - Toggle SOS status
- `GET /api/tourists` - Get all tourists (for authority dashboard)

## Routes

- `/` - Main globe interface (requires authentication)
- `/dashboard` - Authority dashboard (no authentication required)

## Getting Started

1. Install dependencies:
\`\`\`bash
npm install
\`\`\`

2. Set up environment variables in `.env.local`

3. Run the development server:
\`\`\`bash
npm run dev
\`\`\`

4. Open [http://localhost:3000](http://localhost:3000) to view the application

## Usage

### For Tourists
1. Register with name, email, proof type, and proof number
2. Login to access the interactive globe
3. Allow location permissions for tracking
4. Use SOS button in emergency situations
5. Explore locations by clicking on the globe

### For Authorities
1. Access `/dashboard` directly (no login required)
2. Monitor all registered tourists in real-time
3. View tourist locations on the interactive map
4. Respond to SOS alerts highlighted in red
5. Access complete tourist information and status

## Security Features

- Password hashing with bcryptjs
- JWT token-based authentication
- Input validation and sanitization
- Secure API endpoints with authentication middleware
- Environment variable protection for sensitive data
