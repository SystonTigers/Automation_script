# Admin Endpoints Usage Guide

Admin endpoints for tenant management, feature flags, and OAuth token storage.

## Authentication

All admin endpoints require JWT with "admin" role:

```json
{
  "iss": "syston.app",
  "aud": "syston-mobile",
  "sub": "admin-user",
  "tenant_id": "system",
  "user_id": "admin-123",
  "roles": ["admin"],
  "exp": 1735689600
}
```

## Endpoints

### 1. Get Tenant Configuration

```bash
curl -H "Authorization: Bearer <ADMIN_JWT>" \
  https://syston-postbus.YOUR_SUBDOMAIN.workers.dev/api/v1/admin/tenants/syston-tigers
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "syston-tigers",
    "plan": "BYO",
    "makeWebhookUrl": "https://hook.make.com/...",
    "flags": {
      "use_make": true,
      "direct_yt": false,
      "direct_fb": false,
      "direct_ig": false
    },
    "limits": {
      "posts_per_day": 200
    },
    "updatedAt": 1696089600000
  }
}
```

### 2. Update Tenant Configuration

```bash
curl -X PUT \
  -H "Authorization: Bearer <ADMIN_JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "plan": "MANAGED",
    "makeWebhookUrl": "https://hook.make.com/new-webhook",
    "limits": {
      "posts_per_day": 500
    }
  }' \
  https://syston-postbus.YOUR_SUBDOMAIN.workers.dev/api/v1/admin/tenants/syston-tigers
```

### 3. Toggle Feature Flags

```bash
curl -X PATCH \
  -H "Authorization: Bearer <ADMIN_JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "direct_yt": true,
    "use_make": true
  }' \
  https://syston-postbus.YOUR_SUBDOMAIN.workers.dev/api/v1/admin/tenants/syston-tigers/flags
```

Response:
```json
{
  "success": true,
  "data": {
    "flags": {
      "use_make": true,
      "direct_yt": true,
      "direct_fb": false,
      "direct_ig": false
    }
  }
}
```

### 4. Store YouTube OAuth Token

```bash
curl -X POST \
  -H "Authorization: Bearer <ADMIN_JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com",
    "client_secret": "YOUR_CLIENT_SECRET",
    "refresh_token": "1//YOUR_REFRESH_TOKEN",
    "channel_id": "UCxxxxxxxxxxxxxxxxxx"
  }' \
  https://syston-postbus.YOUR_SUBDOMAIN.workers.dev/api/v1/admin/tenants/syston-tigers/youtube-token
```

Response:
```json
{
  "success": true,
  "data": {
    "stored": true,
    "provider": "youtube",
    "tenant": "syston-tigers"
  }
}
```

**Note:** Token is stored in KV as `yt:syston-tigers`

### 5. Delete OAuth Token

```bash
curl -X DELETE \
  -H "Authorization: Bearer <ADMIN_JWT>" \
  https://syston-postbus.YOUR_SUBDOMAIN.workers.dev/api/v1/admin/tenants/syston-tigers/tokens/youtube
```

Supported providers: `youtube`, `facebook`, `instagram`, `tiktok`

Response:
```json
{
  "success": true,
  "data": {
    "deleted": true,
    "provider": "youtube",
    "tenant": "syston-tigers"
  }
}
```

## Error Responses

### 403 Forbidden (Non-admin user)

```json
{
  "success": false,
  "error": "Admin role required"
}
```

### 400 Bad Request

```json
{
  "success": false,
  "error": "Invalid JSON body"
}
```

### 404 Not Found

```json
{
  "success": false,
  "error": "Admin endpoint not found"
}
```

## Testing

Create admin JWT at jwt.io:

1. Algorithm: HS256
2. Secret: Your JWT_SECRET
3. Payload (as shown above)
4. Set expiration far in future for testing

Use in Authorization header:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

**Last Updated:** 2025-09-30
