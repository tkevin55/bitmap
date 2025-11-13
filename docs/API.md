# API Documentation

Base URL: `http://localhost:5000/api` (development) or `https://api.yourdomain.com/api` (production)

## Authentication

Most endpoints require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### Authentication

#### POST /auth/register

Register a new user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe" // optional
}
```

**Response (201):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "isPro": false,
    "credits": 5,
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "token": "jwt-token"
}
```

#### POST /auth/login

Login existing user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "user": { ... },
  "token": "jwt-token"
}
```

#### GET /auth/me

Get current user information. Requires authentication.

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "isPro": false,
    "credits": 5,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### POST /auth/logout

Logout current user. Requires authentication.

**Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

### Image Conversion

#### POST /conversion/convert

Convert an uploaded image to pixelated format.

**Authentication:** Optional (but required to use credits)

**Request:** multipart/form-data

- `image` (file): Image file (PNG, JPG, WebP)
- `pixelSize` (number): Pixel size (1-50)
- `threshold` (number): Threshold for B&W mode (0-255)
- `mode` (string): 'bw' or 'color'
- `format` (string): 'svg', 'png', or 'jpg'
- `paletteSize` (number): Color palette size (2-64) - for color mode
- `dithering` (string): 'none', 'floyd-steinberg', 'atkinson', 'ordered' - for color mode

**Response (200):**
```json
{
  "id": "uuid",
  "fileData": "data:image/svg+xml;base64,...", // For small files
  "downloadUrl": "/api/conversion/download/uuid", // For large files
  "fileName": "output-uuid.svg",
  "fileSize": 12345,
  "processingTime": 1234,
  "creditsRemaining": 4 // Only for authenticated free users
}
```

**Error Responses:**
- 400: Invalid request (bad file type, size too large, invalid settings)
- 401: Authentication required
- 403: Insufficient credits or PRO required
- 429: Rate limit exceeded
- 500: Processing error

#### GET /conversion/download/:id

Download a converted file.

**Response:** File download

#### GET /conversion/history

Get conversion history for authenticated user.

**Authentication:** Required

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Results per page (default: 20)

**Response (200):**
```json
{
  "conversions": [
    {
      "id": "uuid",
      "originalName": "image.png",
      "format": "svg",
      "mode": "bw",
      "settings": { ... },
      "fileSize": 12345,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "pages": 3
  }
}
```

### Payment

#### GET /payment/plans

Get available pricing plans.

**Response (200):**
```json
{
  "plans": [
    {
      "id": "free",
      "name": "Free",
      "price": 0,
      "interval": "month",
      "features": ["5 downloads per month", "..."]
    },
    {
      "id": "pro-monthly",
      "name": "PRO Monthly",
      "price": 9.99,
      "interval": "month",
      "priceId": "price_...",
      "features": ["Unlimited downloads", "..."]
    }
  ]
}
```

#### POST /payment/create-checkout-session

Create Stripe checkout session for PRO upgrade.

**Authentication:** Required

**Request Body:**
```json
{
  "priceId": "price_...",
  "successUrl": "https://yourdomain.com/success",
  "cancelUrl": "https://yourdomain.com/cancel"
}
```

**Response (200):**
```json
{
  "sessionId": "cs_...",
  "url": "https://checkout.stripe.com/..."
}
```

#### POST /payment/create-billing-portal-session

Create Stripe billing portal session.

**Authentication:** Required

**Request Body:**
```json
{
  "returnUrl": "https://yourdomain.com/pricing"
}
```

**Response (200):**
```json
{
  "url": "https://billing.stripe.com/..."
}
```

#### POST /payment/cancel-subscription

Cancel user's subscription.

**Authentication:** Required

**Response (200):**
```json
{
  "message": "Subscription canceled successfully"
}
```

#### POST /payment/webhook

Stripe webhook endpoint (for internal use).

### User

#### GET /user/profile

Get user profile with statistics.

**Authentication:** Required

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "isPro": false,
    "credits": 5,
    "subscriptionStatus": "active",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "totalConversions": 42
  }
}
```

#### PUT /user/profile

Update user profile.

**Authentication:** Required

**Request Body:**
```json
{
  "name": "Jane Doe"
}
```

**Response (200):**
```json
{
  "user": { ... }
}
```

#### GET /user/statistics

Get user statistics.

**Authentication:** Required

**Response (200):**
```json
{
  "statistics": {
    "totalConversions": 42,
    "recentConversions": 15,
    "formatBreakdown": {
      "svg": 20,
      "png": 15,
      "jpg": 7
    }
  }
}
```

#### DELETE /user/account

Delete user account.

**Authentication:** Required

**Request Body:**
```json
{
  "password": "password123"
}
```

**Response (200):**
```json
{
  "message": "Account deleted successfully"
}
```

## Error Responses

All endpoints may return these error formats:

```json
{
  "message": "Error description",
  "code": "ERROR_CODE"
}
```

Common error codes:
- `INVALID_REQUEST`: Invalid request parameters
- `AUTH_REQUIRED`: Authentication required
- `INVALID_TOKEN`: Invalid or expired JWT token
- `PRO_REQUIRED`: PRO subscription required
- `INSUFFICIENT_CREDITS`: Not enough credits
- `FILE_TOO_LARGE`: File exceeds size limit
- `INVALID_FILE_TYPE`: Unsupported file type
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `CONVERSION_ERROR`: Image processing failed
- `NOT_FOUND`: Resource not found
- `INTERNAL_ERROR`: Server error

## Rate Limiting

- Free users: 10 requests per minute
- PRO users: 100 requests per minute
- Conversion endpoint: 5/hour (free), 50/hour (PRO)
- Auth endpoints: 5 requests per 15 minutes

Rate limit headers:
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1640000000
```

## File Size Limits

- Free tier: 10MB
- PRO tier: 50MB

## Supported Image Formats

- PNG (.png)
- JPEG (.jpg, .jpeg)
- WebP (.webp)

## Example Usage

### JavaScript/TypeScript

```typescript
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

// Register
const { data } = await axios.post(`${API_URL}/auth/register`, {
  email: 'user@example.com',
  password: 'password123',
});

const token = data.token;

// Convert image
const formData = new FormData();
formData.append('image', fileInput.files[0]);
formData.append('pixelSize', '10');
formData.append('threshold', '128');
formData.append('mode', 'bw');
formData.append('format', 'svg');

const response = await axios.post(`${API_URL}/conversion/convert`, formData, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'multipart/form-data',
  },
});

console.log(response.data.fileData); // SVG data URL
```

### cURL

```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Convert image
curl -X POST http://localhost:5000/api/conversion/convert \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "image=@/path/to/image.png" \
  -F "pixelSize=10" \
  -F "threshold=128" \
  -F "mode=bw" \
  -F "format=svg"
```

## Webhooks (Stripe)

Stripe sends webhooks to `/api/payment/webhook` for these events:

- `checkout.session.completed`: User completed checkout
- `customer.subscription.updated`: Subscription status changed
- `customer.subscription.deleted`: Subscription canceled
- `invoice.payment_failed`: Payment failed

Webhook verification is automatic using Stripe signature.
