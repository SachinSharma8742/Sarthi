# Database Schema - MongoDB Collections

## Tourist Collection Structure

\`\`\`json
{
  "_id": "ObjectId (auto-generated)",
  "name": "string",
  "email": "string (unique)",
  "proofType": "string (Aadhaar or Passport)",
  "proofNumber": "string",
  "password": "string (bcrypt hashed)",
  "createdAt": "Date",
  "lat": "number (optional)",
  "lng": "number (optional)",
  "timestamp": "Date (optional)",
  "sos": "boolean (default: false)"
}
\`\`\`

## Indexes
- `email` (unique)
- `sos` (for emergency queries)
- `createdAt` (for sorting)

## Environment Variables Required
- `MONGODB_URI` - MongoDB Atlas connection string
- `JWT_SECRET` - Secret key for JWT token signing
