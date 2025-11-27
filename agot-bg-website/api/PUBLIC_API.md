# Public API Documentation

## Overview

The public API provides authenticated access to game data for external applications and services.

## Authentication

All public API endpoints require authentication. You must be logged in to the website (via Google or Discord OAuth) to use the API.

### Session Authentication
Once logged in to the website, your session cookies will automatically authenticate API requests. This is the standard method for browser-based access.

## Endpoints

### Get Game View
Retrieve the `view_of_game` JSON data for a specific game.

**URL:** `/api/public/game/<game_id>`

**Method:** `GET`

**Authentication Required:** Yes

**URL Parameters:**
- `game_id` (UUID): The unique identifier of the game

**Success Response:**
- **Code:** 200 OK
- **Content:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Game Name",
  "view_of_game": {
    "round": 1,
    "maxPlayerCount": 6,
    "settings": {
      "pbem": true
    },
    "waitingFor": "House Stark",
    "winner": null,
    "replacePlayerVoteOngoing": false
  },
  "state": "ONGOING"
}
```

**Notes on Data Sanitization:**
- Sensitive fields are removed from `view_of_game`: `replacerIds`, `oldPlayerIds`, `waitingForIds`, `publicChatRoomId`, `timeoutPlayerIds`
- The field `turn` is renamed to `round` in the public response

**Error Responses:**
- **Code:** 401 UNAUTHORIZED
  - **Content:** `{"detail": "Authentication credentials were not provided."}`

- **Code:** 404 NOT FOUND
  - **Content:** `{"error": "Game not found"}`

## Example Usage

### Using curl with Session Cookie
```bash
curl -X GET \
  -b cookies.txt \
  https://yourdomain.com/api/public/game/550e8400-e29b-41d4-a716-446655440000
```

### Using JavaScript Fetch API
```javascript
fetch('/api/public/game/550e8400-e29b-41d4-a716-446655440000', {
  method: 'GET',
  credentials: 'include', // Include cookies for session auth
  headers: {
    'Content-Type': 'application/json',
  }
})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));
```

### Using Python requests
```python
import requests

# Use a session with cookies from a logged-in browser session
session = requests.Session()
# You need to obtain session cookies after logging in via OAuth
# For example, copy cookies from your browser after logging in
session.cookies.set('sessionid', 'your-session-id-here')

response = session.get(
    'https://yourdomain.com/api/public/game/550e8400-e29b-41d4-a716-446655440000'
)

print(response.json())
```

## Notes

- The `view_of_game` field contains the game state as it appears to players
- **Sensitive data is removed** from the response for security:
  - `replacerIds`, `oldPlayerIds`, `waitingForIds`, `publicChatRoomId`, `timeoutPlayerIds` are stripped out
  - The `turn` field is renamed to `round`
- This endpoint is read-only and does not modify game state
- The endpoint is accessible to any authenticated user, regardless of whether they are a player in the game
- Game states include: `IN_LOBBY`, `ONGOING`, `FINISHED`, `CLOSED`, `CANCELLED`
