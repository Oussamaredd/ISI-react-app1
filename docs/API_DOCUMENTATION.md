# Ticket Management API Documentation

## Overview

The Ticket Management System provides a comprehensive RESTful API for managing tickets, users, hotels, and administrative functions. This API follows REST conventions and uses JSON for all data exchange.

## Base URL

- **Development**: `http://localhost:3000/api`
- **Staging**: `https://staging.yourdomain.com/api`
- **Production**: `https://yourdomain.com/api`

## Authentication

### Google OAuth Authentication

All API endpoints (except public ones) require authentication via Google OAuth. Users must authenticate through the Google OAuth flow to receive a session token.

#### Get Auth URL
```
GET /auth/google
```

#### OAuth Callback
```
GET /auth/google/callback
```

#### Logout
```
POST /auth/logout
```

#### Get Current User
```
GET /auth/me
```

**Response:**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "avatar_url": "https://lh3.googleusercontent.com/...",
    "created_at": "2023-12-01T10:00:00.000Z"
  }
}
```

## Rate Limiting

API requests are rate-limited to prevent abuse:
- **Default**: 100 requests per 15 minutes
- **Rate Limit Headers**: 
  - `X-RateLimit-Limit`: Total requests allowed
  - `X-RateLimit-Remaining`: Requests remaining
  - `X-RateLimit-Reset`: Time when limit resets

## Tickets

### Get All Tickets
```
GET /tickets?page=1&limit=20&status=open&priority=high&hotel_id=1
```

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20, max: 100)
- `status` (string): Filter by status (`open`, `in_progress`, `resolved`, `closed`, `cancelled`)
- `priority` (string): Filter by priority (`low`, `medium`, `high`, `critical`)
- `hotel_id` (number): Filter by hotel ID
- `assigned_to` (number): Filter by assigned user ID
- `created_by` (number): Filter by creator ID
- `search` (string): Search in title and description

**Response:**
```json
{
  "tickets": [
    {
      "id": 1,
      "title": "Leaky faucet in room 101",
      "description": "The faucet in the bathroom is leaking",
      "priority": "medium",
      "status": "open",
      "category": "maintenance",
      "hotel": {
        "id": 1,
        "name": "Grand Hotel"
      },
      "assigned_to": null,
      "created_by": {
        "id": 1,
        "name": "John Doe",
        "email": "john@example.com"
      },
      "created_at": "2023-12-01T10:00:00.000Z",
      "updated_at": "2023-12-01T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "pages": 3
  }
}
```

### Get Single Ticket
```
GET /tickets/{id}
```

**Response:**
```json
{
  "ticket": {
    "id": 1,
    "title": "Leaky faucet in room 101",
    "description": "The faucet in the bathroom is leaking and causing water damage to the countertop.",
    "priority": "medium",
    "status": "open",
    "category": "maintenance",
    "hotel": {
      "id": 1,
      "name": "Grand Hotel",
      "address": "123 Main St, City, State"
    },
    "assigned_to": {
      "id": 2,
      "name": "Jane Smith",
      "email": "jane@example.com"
    },
    "created_by": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com"
    },
    "comments": [
      {
        "id": 1,
        "content": "I've assigned this to the maintenance team.",
        "user": {
          "id": 2,
          "name": "Jane Smith"
        },
        "is_internal": false,
        "created_at": "2023-12-01T10:30:00.000Z"
      }
    ],
    "attachments": [
      {
        "id": 1,
        "filename": "faucet_leak.jpg",
        "original_name": "leaky_faucet.jpg",
        "file_size": 1024000,
        "mime_type": "image/jpeg",
        "uploaded_by": {
          "id": 1,
          "name": "John Doe"
        },
        "created_at": "2023-12-01T10:00:00.000Z"
      }
    ],
    "created_at": "2023-12-01T10:00:00.000Z",
    "updated_at": "2023-12-01T10:30:00.000Z"
  }
}
```

### Create Ticket
```
POST /tickets
Content-Type: application/json

{
  "title": "Broken air conditioner",
  "description": "The AC unit is not cooling properly",
  "priority": "high",
  "category": "maintenance",
  "hotel_id": 1
}
```

**Response:**
```json
{
  "ticket": {
    "id": 2,
    "title": "Broken air conditioner",
    "description": "The AC unit is not cooling properly",
    "priority": "high",
    "status": "open",
    "category": "maintenance",
    "hotel_id": 1,
    "created_by": 1,
    "created_at": "2023-12-01T11:00:00.000Z"
  }
}
```

### Update Ticket
```
PUT /tickets/{id}
Content-Type: application/json

{
  "status": "in_progress",
  "priority": "high",
  "assigned_to": 2
}
```

### Delete Ticket
```
DELETE /tickets/{id}
```

## Ticket Comments

### Add Comment
```
POST /tickets/{id}/comments
Content-Type: application/json

{
  "content": "Working on this issue now.",
  "is_internal": false
}
```

### Update Comment
```
PUT /tickets/{ticketId}/comments/{commentId}
Content-Type: application/json

{
  "content": "Updated comment content"
}
```

### Delete Comment
```
DELETE /tickets/{ticketId}/comments/{commentId}
```

## Ticket Attachments

### Upload Attachment
```
POST /tickets/{id}/attachments
Content-Type: multipart/form-data

file: [binary file data]
```

**Response:**
```json
{
  "attachment": {
    "id": 1,
    "filename": "document_abc123.pdf",
    "original_name": "maintenance_report.pdf",
    "file_size": 2048000,
    "mime_type": "application/pdf",
    "created_at": "2023-12-01T11:30:00.000Z"
  }
}
```

### Download Attachment
```
GET /tickets/{ticketId}/attachments/{attachmentId}/download
```

### Delete Attachment
```
DELETE /tickets/{ticketId}/attachments/{attachmentId}
```

## Hotels

### Get All Hotels
```
GET /hotels?page=1&limit=20
```

### Get Single Hotel
```
GET /hotels/{id}
```

### Create Hotel (Admin only)
```
POST /hotels
Content-Type: application/json

{
  "name": "Grand Hotel",
  "description": "A luxury hotel downtown",
  "address": "123 Main St, City, State",
  "phone": "+1-555-0123",
  "email": "info@grandhotel.com",
  "total_rooms": 200
}
```

### Update Hotel (Admin only)
```
PUT /hotels/{id}
Content-Type: application/json

{
  "name": "Updated Hotel Name",
  "total_rooms": 250
}
```

### Delete Hotel (Admin only)
```
DELETE /hotels/{id}
```

## Hotel Analytics

### Get Hotel Overview
```
GET /hotels/{id}/analytics?period=30d
```

**Query Parameters:**
- `period` (string): Time period (`7d`, `30d`, `90d`, `1y`)

**Response:**
```json
{
  "overview": {
    "total_tickets": 150,
    "open_tickets": 12,
    "resolved_tickets": 135,
    "avg_resolution_time": 24.5,
    "categories": {
      "maintenance": 80,
      "housekeeping": 35,
      "food_service": 20,
      "other": 15
    },
    "priorities": {
      "low": 30,
      "medium": 80,
      "high": 35,
      "critical": 5
    }
  },
  "trends": [
    {
      "date": "2023-11-01",
      "tickets_created": 5,
      "tickets_resolved": 3
    }
  ]
}
```

## Users (Admin Only)

### Get All Users
```
GET /admin/users?page=1&limit=20&role=user&status=active
```

### Create User (Admin only)
```
POST /admin/users
Content-Type: application/json

{
  "email": "newuser@example.com",
  "name": "New User",
  "role": "user"
}
```

### Update User (Admin only)
```
PUT /admin/users/{id}
Content-Type: application/json

{
  "role": "manager",
  "is_active": true
}
```

### Delete User (Admin only)
```
DELETE /admin/users/{id}
```

## System Administration (Admin Only)

### System Settings
```
GET /admin/settings
PUT /admin/settings
Content-Type: application/json

{
  "app_name": "Ticket System",
  "maintenance_mode": false,
  "max_file_size": 5242880
}
```

### Audit Logs
```
GET /admin/audit-logs?page=1&limit=50&action=create&entity_type=ticket
```

**Response:**
```json
{
  "logs": [
    {
      "id": 1,
      "user": {
        "id": 1,
        "name": "John Doe"
      },
      "action": "create",
      "entity_type": "ticket",
      "entity_id": 1,
      "old_values": null,
      "new_values": {
        "title": "New ticket title",
        "priority": "medium"
      },
      "ip_address": "192.168.1.100",
      "user_agent": "Mozilla/5.0...",
      "created_at": "2023-12-01T10:00:00.000Z"
    }
  ]
}
```

## Health & Monitoring

### Health Check
```
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2023-12-01T12:00:00.000Z",
  "uptime": 86400000,
  "version": "1.0.0",
  "environment": "production",
  "checks": {
    "database": {
      "status": "healthy",
      "responseTime": 15,
      "details": {
        "pool": {
          "used": 2,
          "free": 8,
          "total": 10
        }
      }
    },
    "redis": {
      "status": "healthy",
      "responseTime": 5
    },
    "memory": {
      "status": "healthy",
      "details": {
        "process": {
          "heap": {
            "used": "45MB",
            "total": "64MB",
            "usage": "70%"
          }
        }
      }
    }
  }
}
```

### Liveness Probe
```
GET /health/liveness
```

### Readiness Probe
```
GET /health/readiness
```

### Metrics (Prometheus format)
```
GET /metrics
```

## Error Responses

All API errors follow this format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Email is required"
      }
    ]
  }
}
```

### Common Error Codes

| Status Code | Error Code | Description |
|-------------|-------------|-------------|
| 400 | VALIDATION_ERROR | Invalid input data |
| 401 | UNAUTHORIZED | Authentication required |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Resource not found |
| 409 | CONFLICT | Resource already exists |
| 422 | UNPROCESSABLE_ENTITY | Cannot process request |
| 429 | RATE_LIMIT_EXCEEDED | Too many requests |
| 500 | INTERNAL_ERROR | Server error |

## SDK Examples

### JavaScript/Node.js
```javascript
const API_BASE_URL = 'https://api.yourdomain.com';

// Get current user
async function getCurrentUser() {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return response.json();
}

// Create a ticket
async function createTicket(ticketData) {
  const response = await fetch(`${API_BASE_URL}/tickets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(ticketData)
  });
  return response.json();
}
```

### Python
```python
import requests

API_BASE_URL = 'https://api.yourdomain.com'

def get_current_user(token):
    response = requests.get(
        f'{API_BASE_URL}/auth/me',
        headers={'Authorization': f'Bearer {token}'}
    )
    return response.json()

def create_ticket(token, ticket_data):
    response = requests.post(
        f'{API_BASE_URL}/tickets',
        json=ticket_data,
        headers={'Authorization': f'Bearer {token}'}
    )
    return response.json()
```

### cURL
```bash
# Get all tickets
curl -X GET "https://api.yourdomain.com/api/tickets" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Create a ticket
curl -X POST "https://api.yourdomain.com/api/tickets" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "New ticket",
    "description": "Ticket description",
    "priority": "medium"
  }'
```

## Changelog

### v1.0.0 (2023-12-01)
- Initial API release
- Authentication via Google OAuth
- Full CRUD operations for tickets
- Hotel management
- User administration
- Analytics endpoints
- Health monitoring

---

For support and questions, contact: api-support@yourdomain.com