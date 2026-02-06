# Backend API: User Sync Endpoint

## Overview
This endpoint syncs Clerk-authenticated users from the mobile app to your backend database. It's automatically called when users sign in to the mobile app.

---

## Endpoint Specification

### `POST /api/auth/sync`

**Base URL:** `http://164.92.212.186:8000`

**Full URL:** `http://164.92.212.186:8000/api/auth/sync`

**Purpose:** Create or update user records in your backend database based on Clerk authentication data.

---

## Request

### Headers
```
Content-Type: application/json
```

### Body (JSON)
```json
{
  "clerk_user_id": "user_2abc123xyz456def",
  "email": "user@example.com",
  "name": "John Doe"
}
```

### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `clerk_user_id` | string | Yes | Unique identifier from Clerk authentication |
| `email` | string | Yes | User's email address |
| `name` | string | No | User's full name (may be null) |

---

## Response

### Success Response (200 OK)

```json
{
  "id": 123,
  "clerk_user_id": "user_2abc123xyz456def",
  "email": "user@example.com",
  "name": "John Doe",
  "created_at": "2026-02-06T07:51:00Z",
  "updated_at": "2026-02-06T07:51:00Z"
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Database ID of the user |
| `clerk_user_id` | string | Clerk user identifier |
| `email` | string | User's email |
| `name` | string | User's full name |
| `created_at` | string (ISO 8601) | When the user was first created |
| `updated_at` | string (ISO 8601) | Last update timestamp |

### Error Responses

#### 400 Bad Request
```json
{
  "error": "Missing required fields: clerk_user_id and email are required"
}
```

#### 500 Internal Server Error
```json
{
  "error": "Database error occurred"
}
```

---

## Expected Behavior

1. **Check if user exists** by `clerk_user_id`
2. **If user exists:**
   - Update `email` and `name` fields
   - Update `updated_at` timestamp
   - Return updated user data
3. **If user doesn't exist:**
   - Create new user record
   - Set `created_at` and `updated_at` timestamps
   - Return new user data

**Important:** This is an **upsert** operation (create or update).

---

## Database Schema

### Recommended Table Structure

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    clerk_user_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Index for fast lookups
CREATE INDEX idx_clerk_user_id ON users(clerk_user_id);
CREATE INDEX idx_email ON users(email);
```

### Alternative (PostgreSQL with auto-update)
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    clerk_user_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
```

---

## Implementation Examples

### Python (FastAPI)

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional

app = FastAPI()

class UserSyncRequest(BaseModel):
    clerk_user_id: str
    email: str
    name: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    clerk_user_id: str
    email: str
    name: Optional[str]
    created_at: datetime
    updated_at: datetime

@app.post("/api/auth/sync", response_model=UserResponse)
async def sync_user(user_data: UserSyncRequest, db: Session = Depends(get_db)):
    """
    Sync Clerk user to database (upsert operation)
    """
    try:
        # Try to find existing user
        user = db.query(User).filter(
            User.clerk_user_id == user_data.clerk_user_id
        ).first()
        
        if user:
            # Update existing user
            user.email = user_data.email
            user.name = user_data.name
            user.updated_at = datetime.utcnow()
        else:
            # Create new user
            user = User(
                clerk_user_id=user_data.clerk_user_id,
                email=user_data.email,
                name=user_data.name
            )
            db.add(user)
        
        db.commit()
        db.refresh(user)
        
        return user
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
```

### Node.js (Express + Prisma)

```javascript
const express = require('express');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();

app.use(express.json());

app.post('/api/auth/sync', async (req, res) => {
  try {
    const { clerk_user_id, email, name } = req.body;

    if (!clerk_user_id || !email) {
      return res.status(400).json({
        error: 'Missing required fields: clerk_user_id and email are required'
      });
    }

    // Upsert: create or update
    const user = await prisma.user.upsert({
      where: { clerk_user_id },
      update: {
        email,
        name,
        updated_at: new Date()
      },
      create: {
        clerk_user_id,
        email,
        name
      }
    });

    res.status(200).json(user);
  } catch (error) {
    console.error('Error syncing user:', error);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

app.listen(8000, () => {
  console.log('Server running on port 8000');
});
```

### Node.js (Express + PostgreSQL)

```javascript
const express = require('express');
const { Pool } = require('pg');

const app = express();
const pool = new Pool({
  host: 'localhost',
  database: 'bythron',
  user: 'postgres',
  password: 'your_password',
  port: 5432
});

app.use(express.json());

app.post('/api/auth/sync', async (req, res) => {
  const { clerk_user_id, email, name } = req.body;

  if (!clerk_user_id || !email) {
    return res.status(400).json({
      error: 'Missing required fields: clerk_user_id and email are required'
    });
  }

  const client = await pool.connect();
  
  try {
    // Upsert using ON CONFLICT
    const result = await client.query(
      `INSERT INTO users (clerk_user_id, email, name, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       ON CONFLICT (clerk_user_id)
       DO UPDATE SET
         email = EXCLUDED.email,
         name = EXCLUDED.name,
         updated_at = NOW()
       RETURNING *`,
      [clerk_user_id, email, name]
    );

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error syncing user:', error);
    res.status(500).json({ error: 'Database error occurred' });
  } finally {
    client.release();
  }
});

app.listen(8000, () => {
  console.log('Server running on port 8000');
});
```

### PHP (Laravel)

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    public function sync(Request $request)
    {
        $validated = $request->validate([
            'clerk_user_id' => 'required|string',
            'email' => 'required|email',
            'name' => 'nullable|string',
        ]);

        $user = User::updateOrCreate(
            ['clerk_user_id' => $validated['clerk_user_id']],
            [
                'email' => $validated['email'],
                'name' => $validated['name'],
            ]
        );

        return response()->json($user, 200);
    }
}
```

---

## Testing the Endpoint

### Using cURL
```bash
curl -X POST http://164.92.212.186:8000/api/auth/sync \
  -H "Content-Type: application/json" \
  -d '{
    "clerk_user_id": "user_2abc123xyz456def",
    "email": "test@example.com",
    "name": "Test User"
  }'
```

### Using Postman
1. Method: `POST`
2. URL: `http://164.92.212.186:8000/api/auth/sync`
3. Headers: `Content-Type: application/json`
4. Body (raw JSON):
```json
{
  "clerk_user_id": "user_2abc123xyz456def",
  "email": "test@example.com",
  "name": "Test User"
}
```

### Using JavaScript (fetch)
```javascript
fetch('http://164.92.212.186:8000/api/auth/sync', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    clerk_user_id: 'user_2abc123xyz456def',
    email: 'test@example.com',
    name: 'Test User'
  })
})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));
```

---

## Important Notes

1. **Idempotency:** This endpoint should be idempotent - calling it multiple times with the same data should produce the same result.

2. **Performance:** Index the `clerk_user_id` column for fast lookups since it's used in the WHERE clause.

3. **Security Considerations:**
   - Consider adding authentication/API key validation
   - Validate email format
   - Sanitize input to prevent SQL injection
   - Consider rate limiting

4. **CORS:** If your backend and mobile app are on different domains, enable CORS:
```javascript
// Express example
app.use(cors({
  origin: '*', // Or specify your domain
  methods: ['POST'],
  allowedHeaders: ['Content-Type']
}));
```

5. **Error Handling:** Always return proper HTTP status codes and error messages for debugging.

---

## Integration Flow

```
Mobile App (Sign In)
    ↓
Clerk Authentication
    ↓
Get User Data (id, email, name)
    ↓
POST /api/auth/sync
    ↓
Backend Database (Create/Update User)
    ↓
Return User Data
    ↓
Mobile App Continues
```

---

## Related Endpoints

Once this endpoint is working, the mobile app will also call:

- `GET /api/devices` - Fetch user's devices
- `GET /api/locations/:deviceId/latest` - Get latest location for a device
- `GET /api/locations/:deviceId/route` - Get location history/route

Make sure all these endpoints return data filtered by the authenticated user's `clerk_user_id`.

---

## Troubleshooting

### Error: "Backend returned 404"
- Endpoint is not implemented yet
- URL path is incorrect (check: `/api/auth/sync`)
- Server is not running on port 8000

### Error: "Backend returned 500"
- Database connection issues
- Missing table or columns
- SQL syntax errors

### Solution: Check backend logs for detailed error messages

---

## Support

If you encounter issues implementing this endpoint:
1. Check backend server logs
2. Verify database connection
3. Test with cURL or Postman first
4. Ensure the `users` table exists with correct schema
