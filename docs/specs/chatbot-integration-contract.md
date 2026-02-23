# Chatbot Integration Contract (EcoTrack Support)

## Purpose

Define the interface between the EcoTrack app and an optional chatbot assistant used for support triage.

## Endpoint

- Suggested route: `POST /api/tickets/support/chatbot/suggest`
- Auth: same user session/auth guard as support ticket endpoints.

## Request Payload

```json
{
  "message": "Container at Avenue 5 is overflowing again",
  "context": {
    "ticketId": "optional-uuid",
    "category": "optional-current-category"
  }
}
```

## Response Payload

```json
{
  "categorySuggestion": "container_overflow",
  "confidence": 0.92,
  "responseText": "Thanks, we can route this as a container overflow report.",
  "escalationRecommended": true
}
```

## Category Keys

- `general_help`
- `container_overflow`
- `collection_delay`
- `damaged_container`
- `route_request`
- `billing`
- `other`

## Notes

- The chatbot remains optional; if unavailable, standard support ticket flows continue unaffected.
- Returned category suggestion is advisory and can be overridden by user/admin.
