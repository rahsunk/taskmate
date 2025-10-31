---
timestamp: 'Fri Oct 31 2025 06:03:36 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251031_060336.5ff3090d.md]]'
content_id: 4acd3fdf598ba90884606c89b45036ffdd15cfd390dfac62bc3f152425b08822
---

# API Specification: FriendsList Concept

**Purpose:** Enable users to establish and manage mutual social connections with others in the application.

***

## API Endpoints

### POST /api/FriendsList/sendFriendRequest

**Description:** Creates a new friend request from one user to another.

**Requirements:**

* `sender` is not equal to `receiver`.
* No `Friendship` exists between `sender` and `receiver`.
* No `FriendRequest` exists from `sender` to `receiver`.
* No `FriendRequest` exists from `receiver` to `sender`.

**Effects:**

* A new `FriendRequest` is created with the given `sender` and `receiver`.
* Returns the ID of the newly created `FriendRequest`.

**Request Body:**

```json
{
  "sender": "string",
  "receiver": "string"
}
```

**Success Response Body (Action):**

```json
{
  "request": "string"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/FriendsList/acceptFriendRequest

**Description:** Accepts an existing friend request, establishing a mutual friendship.

**Requirements:**

* A `FriendRequest` exists from `sender` to `receiver`.
* No `Friendship` exists between `sender` and `receiver`.

**Effects:**

* The `FriendRequest` from `sender` to `receiver` is deleted.
* A new `Friendship` is created between `sender` and `receiver` (canonicalized).

**Request Body:**

```json
{
  "receiver": "string",
  "sender": "string"
}
```

**Success Response Body (Action):**

```json
{
  "success": true
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/FriendsList/declineFriendRequest

**Description:** Declines an existing friend request.

**Requirements:**

* A `FriendRequest` exists from `sender` to `receiver`.

**Effects:**

* The `FriendRequest` from `sender` to `receiver` is deleted.

**Request Body:**

```json
{
  "receiver": "string",
  "sender": "string"
}
```

**Success Response Body (Action):**

```json
{
  "success": true

}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/FriendsList/cancelSentRequest

**Description:** Cancels a previously sent friend request.

**Requirements:**

* A `FriendRequest` exists from `sender` to `receiver`.

**Effects:**

* The `FriendRequest` from `sender` to `receiver` is deleted.

**Request Body:**

```json
{
  "sender": "string",
  "receiver": "string"
}
```

**Success Response Body (Action):**

```json
{
  "success": true
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/FriendsList/removeFriend

**Description:** Removes an existing mutual friendship between two users.

**Requirements:**

* A `Friendship` exists between `user1` and `user2`.

**Effects:**

* The `Friendship` between `user1` and `user2` is deleted.

**Request Body:**

```json
{
  "user1": "string",
  "user2": "string"
}
```

**Success Response Body (Action):**

```json
{
  "success": true
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/FriendsList/\_getAllFriendships

**Description:** Retrieves all active friendships in the system.

**Requirements:**

* `true`

**Effects:**

* Returns an array of all `FriendshipDoc` objects, including `_id`, `user1`, and `user2`.

**Request Body:**

```json
{}
```

**Success Response Body (Query):**

```json
[
  {
    "_id": "string",
    "user1": "string",
    "user2": "string"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/FriendsList/\_getFriendshipsByUser

**Description:** Retrieves all active friendships involving a specific user.

**Requirements:**

* `user` exists (external to this concept).

**Effects:**

* Returns an array of `FriendshipDoc` objects where `user1` or `user2` matches the input `user`.

**Request Body:**

```json
{
  "user": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "_id": "string",
    "user1": "string",
    "user2": "string"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/FriendsList/\_getAllFriendRequests

**Description:** Retrieves all pending friend requests in the system.

**Requirements:**

* `true`

**Effects:**

* Returns an array of all `FriendRequestDoc` objects, including `_id`, `sender`, and `receiver`.

**Request Body:**

```json
{}
```

**Success Response Body (Query):**

```json
[
  {
    "_id": "string",
    "sender": "string",
    "receiver": "string"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/FriendsList/\_getSentFriendRequests

**Description:** Retrieves all friend requests sent by a specific user.

**Requirements:**

* `sender` exists (external to this concept).

**Effects:**

* Returns an array of `FriendRequestDoc` objects sent by the `sender`.

**Request Body:**

```json
{
  "sender": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "_id": "string",
    "sender": "string",
    "receiver": "string"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/FriendsList/\_getReceivedFriendRequests

**Description:** Retrieves all friend requests received by a specific user.

**Requirements:**

* `receiver` exists (external to this concept).

**Effects:**

* Returns an array of `FriendRequestDoc` objects received by the `receiver`.

**Request Body:**

```json
{
  "receiver": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "_id": "string",
    "sender": "string",
    "receiver": "string"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/FriendsList/\_getFriendshipDetails

**Description:** Retrieves the details of a specific friendship by its ID.

**Requirements:**

* `friendshipId` exists.

**Effects:**

* Returns an array containing the `FriendshipDoc` object matching the provided ID.

**Request Body:**

```json
{
  "friendshipId": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "_id": "string",
    "user1": "string",
    "user2": "string"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/FriendsList/\_getFriendRequestDetails

**Description:** Retrieves the details of a specific friend request by its ID.

**Requirements:**

* `requestId` exists.

**Effects:**

* Returns an array containing the `FriendRequestDoc` object matching the provided ID.

**Request Body:**

```json
{
  "requestId": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "_id": "string",
    "sender": "string",
    "receiver": "string"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***
