# OAuth Implementation Documentation

## Overview

This document describes the OAuth implementation for connecting social media accounts (Instagram, TikTok, YouTube) to the Social Media Creative Manager platform.

## Architecture

### Components

1. **OAuthService** (`src/services/oauthService.js`)
   - Handles OAuth flow for all platforms
   - Token encryption/decryption
   - State parameter generation and verification
   - Platform-specific API integrations

2. **ConnectedAccountService** (`src/services/connectedAccountService.js`)
   - Manages connected accounts in the database
   - Token refresh mechanisms
   - Account verification and permissions

3. **Platform Clients** (`src/services/platformClients/`)
   - Instagram Client
   - TikTok Client
   - YouTube Client

4. **Social Controller** (`src/controllers/socialController.js`)
   - OAuth endpoints
   - Account management endpoints

## OAuth Flow

### 1. Authorization URL Generation

```
GET /api/social/auth/:platform
```

**Parameters:**
- `platform`: instagram, tiktok, or youtube

**Response:**
```json
{
  "success": true,
  "data": {
    "authUrl": "https://api.instagram.com/oauth/authorize?...",
    "platform": "instagram",
    "state": "base64_encoded_state"
  }
}
```

### 2. Account Connection

```
POST /api/social/connect-account
```

**Body:**
```json
{
  "platform": "instagram",
  "code": "authorization_code_from_oauth",
  "state": "state_parameter_from_step_1"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "platform": "instagram",
    "accountId": "account_id",
    "username": "username",
    "isActive": true
  }
}
```

## API Endpoints

### OAuth Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/social/auth/:platform` | Get OAuth authorization URL |
| POST | `/api/social/connect-account` | Connect account using OAuth code |
| GET | `/api/social/connected-accounts` | Get user's connected accounts |
| DELETE | `/api/social/disconnect-account` | Disconnect an account |
| POST | `/api/social/verify-account` | Verify account permissions |
| GET | `/api/social/user-analytics` | Get account analytics |
| POST | `/api/social/sync-account` | Sync account data |

### Account Management

#### Get Connected Accounts
```
GET /api/social/connected-accounts?platform=instagram
```

#### Disconnect Account
```
DELETE /api/social/disconnect-account
Body: { "platform": "instagram", "accountId": "account123" }
```

#### Verify Account
```
POST /api/social/verify-account
Body: { "platform": "instagram", "accountId": "account123" }
```

#### Get Analytics
```
GET /api/social/user-analytics?platform=instagram&accountId=account123
```

#### Sync Account Data
```
POST /api/social/sync-account
Body: { "platform": "instagram", "accountId": "account123" }
```

## Platform-Specific Implementation

### Instagram

**OAuth Scopes:** `user_profile,user_media`

**Features:**
- User profile information
- Media retrieval
- Basic insights (requires business account)
- Hashtag information

**Limitations:**
- No token refresh (users must re-authenticate)
- Limited insights for personal accounts

### TikTok

**OAuth Scopes:** `user.info.basic,video.list`

**Features:**
- User profile information
- Video list retrieval
- User statistics
- Token refresh support

**Token Refresh:** Supported

### YouTube

**OAuth Scopes:** `youtube.readonly,youtube.upload`

**Features:**
- Channel information
- Video statistics
- Channel analytics
- Video upload capability
- Token refresh support

**Token Refresh:** Supported

## Security Features

### Token Encryption

All access tokens and refresh tokens are encrypted before storage using AES-256-CBC encryption.

```javascript
// Encryption
const encrypted = oauthService.encryptToken(accessToken);

// Decryption
const decrypted = oauthService.decryptToken(encrypted);
```

### State Parameter Validation

OAuth state parameters include:
- User ID
- Platform
- Timestamp
- Random bytes

State parameters expire after 10 minutes.

### Token Refresh

Automatic token refresh for supported platforms (TikTok, YouTube):

```javascript
// Automatic refresh when token expires
const client = await connectedAccountService.getPlatformClient(userId, platform);
```

## Environment Variables

Required environment variables:

```env
# Encryption
ENCRYPTION_KEY=your-32-character-encryption-key

# Instagram OAuth
INSTAGRAM_CLIENT_ID=your-instagram-client-id
INSTAGRAM_CLIENT_SECRET=your-instagram-client-secret
INSTAGRAM_REDIRECT_URI=http://localhost:3000/api/social/callback/instagram

# TikTok OAuth
TIKTOK_CLIENT_KEY=your-tiktok-client-key
TIKTOK_CLIENT_SECRET=your-tiktok-client-secret
TIKTOK_REDIRECT_URI=http://localhost:3000/api/social/callback/tiktok

# YouTube OAuth
YOUTUBE_CLIENT_ID=your-youtube-client-id
YOUTUBE_CLIENT_SECRET=your-youtube-client-secret
YOUTUBE_REDIRECT_URI=http://localhost:3000/api/social/callback/youtube
```

## Database Schema

Connected accounts are stored in the User model:

```javascript
connectedAccounts: [{
  platform: String, // 'instagram', 'tiktok', 'youtube'
  accountId: String, // Platform-specific account ID
  username: String, // Display username
  accessToken: String, // Encrypted access token
  refreshToken: String, // Encrypted refresh token (if available)
  tokenExpiresAt: Date, // Token expiration date
  permissions: [String], // Granted permissions
  isActive: Boolean, // Account status
  lastSyncAt: Date // Last synchronization timestamp
}]
```

## Error Handling

### Common Error Codes

- `INVALID_PLATFORM`: Unsupported platform
- `INVALID_STATE`: State parameter validation failed
- `ACCOUNT_CONNECTION_ERROR`: Failed to connect account
- `ACCOUNT_VERIFICATION_FAILED`: Token verification failed
- `TOKEN_REFRESH_ERROR`: Failed to refresh token

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "User-friendly error message",
    "details": "Technical details for debugging"
  }
}
```

## Testing

### Unit Tests

- OAuth service functionality
- Token encryption/decryption
- State parameter validation
- Platform client operations

### Integration Tests

- OAuth endpoint testing
- Account connection flow
- Error handling scenarios

### Manual Testing

Run manual tests with:
```bash
node tests/manual/oauth-test.js
```

## Usage Examples

### Frontend Integration

```javascript
// 1. Get authorization URL
const authResponse = await fetch('/api/social/auth/instagram', {
  headers: { 'Authorization': `Bearer ${userToken}` }
});
const { authUrl, state } = authResponse.data;

// 2. Redirect user to authUrl
window.location.href = authUrl;

// 3. Handle callback (after user authorizes)
const connectResponse = await fetch('/api/social/connect-account', {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${userToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    platform: 'instagram',
    code: authorizationCode,
    state: state
  })
});
```

### Backend Usage

```javascript
// Get platform client for API calls
const client = await connectedAccountService.getPlatformClient(userId, 'instagram');

// Get user profile
const profile = await client.getUserProfile();

// Get user media
const media = await client.getUserMedia(25);
```

## Troubleshooting

### Common Issues

1. **Token Encryption Errors**
   - Ensure ENCRYPTION_KEY is exactly 32 characters
   - Check that the key is consistent across deployments

2. **OAuth Callback Issues**
   - Verify redirect URIs match exactly in platform settings
   - Check that callback URLs are accessible

3. **Token Refresh Failures**
   - Instagram doesn't support token refresh
   - Ensure refresh tokens are properly stored and encrypted

4. **Permission Errors**
   - Verify OAuth scopes are correctly configured
   - Check that users have granted necessary permissions

### Debug Mode

Enable debug logging by setting:
```env
LOG_LEVEL=debug
```

## Future Enhancements

1. **Additional Platforms**
   - Twitter/X integration
   - LinkedIn integration
   - Facebook integration

2. **Enhanced Analytics**
   - Real-time metrics
   - Historical data analysis
   - Performance comparisons

3. **Webhook Support**
   - Real-time updates from platforms
   - Automatic data synchronization

4. **Batch Operations**
   - Multiple account management
   - Bulk data retrieval