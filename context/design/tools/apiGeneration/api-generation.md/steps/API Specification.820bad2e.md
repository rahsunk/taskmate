---
timestamp: 'Thu Oct 30 2025 11:02:07 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251030_110207.27b49008.md]]'
content_id: 820bad2ea5bb2206537847d4e98e376e9a353308dfa30416f5580cff7b4b6eed
---

# API Specification: UserAuthentication Concept

**Purpose:** identify and authenticate users.

***

## API Endpoints

### POST /api/UserAuthentication/register

**Description:** Registers a new user with a unique username and password.

**Requirements:**

* No user with that `username` already exists.

**Effects:**

* Creates a new `User` `u` with the given `username` and `password`; returns `u`.

**Request Body:**

```json
{
  "username": "string",
  "password": "string"
}
```

**Success Response Body (Action):**

```json
{
  "user": "string"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/UserAuthentication/login

**Description:** Authenticates a user with a username and password, creating a new session if successful.

**Requirements:**

* A `User` with that `username` and `password` exists.

**Effects:**

* If successful, creates a new `Session` linked to the `User` and returns its `sessionID`.
* Otherwise, returns an `error`.

**Request Body:**

```json
{
  "username": "string",
  "password": "string"
}
```

**Success Response Body (Action):**

```json
{
  "session": "string"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/UserAuthentication/logout

**Description:** Deletes an existing user session, effectively logging out the user.

**Requirements:**

* `session` exists and is valid.

**Effects:**

* Deletes the `session`.

**Request Body:**

```json
{
  "session": "string"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/UserAuthentication/changePassword

**Description:** Allows an authenticated user to change their password.

**Requirements:**

* `user` exists.
* `user.password` is equal to `oldPassword`.
* `newPassword` must be different from `oldPassword`.

**Effects:**

* `password` for `user` is changed to `newPassword`.

**Request Body:**

```json
{
  "user": "string",
  "oldPassword": "string",
  "newPassword": "string"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/UserAuthentication/deleteAccount

**Description:** Deletes a user account from the system.

**Requirements:**

* `user` exists.

**Effects:**

* `user` is removed from the state.

**Request Body:**

```json
{
  "user": "string"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/UserAuthentication/\_getUsers

**Description:** Returns a list of all users with their IDs and usernames.

**Requirements:**

* `true`

**Effects:**

* Returns a list of all users with their IDs and usernames.

**Request Body:**

```json
{}
```

**Success Response Body (Query):**

```json
[
  {
    "user": [
      {
        "id": "string",
        "username": "string"
      }
    ]
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

### POST /api/UserAuthentication/\_getUserDetails

**Description:** Returns the ID and username of a specific user. Password is not returned for security reasons.

**Requirements:**

* `user` exists.

**Effects:**

* Returns the ID and username of a specific user. Password is not returned for security reasons.

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
    "userDetails": [
      {
        "id": "string",
        "username": "string"
      }
    ]
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

### POST /api/UserAuthentication/\_getUserByUsername

**Description:** Returns the user ID associated with a username if found, as an array.

**Requirements:**

* `true`

**Effects:**

* Returns the user ID associated with a username if found, as an array.

**Request Body:**

```json
{
  "username": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "user": "string"
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

### POST /api/UserAuthentication/\_checkUserExists

**Description:** Returns true if the user with the given ID exists, false otherwise, as an array.

**Requirements:**

* `true`

**Effects:**

* Returns true if the user with the given ID exists, false otherwise, as an array.

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
    "exists": "boolean"
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

### POST /api/UserAuthentication/\_getSessions

**Description:** Returns a list of all active sessions, including their ID, associated user ID, session string, creation and expiry times.

**Requirements:**

* `true`

**Effects:**

* Returns a list of all active sessions, including their ID, associated user ID, session string, creation and expiry times.

**Request Body:**

```json
{}
```

**Success Response Body (Query):**

```json
[
  {
    "session": [
      {
        "id": "string",
        "userId": "string",
        "sessionID": "string",
        "createdAt": "string (ISO Date)",
        "expiresAt": "string (ISO Date)"
      }
    ]
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

### POST /api/UserAuthentication/\_getSessionDetails

**Description:** Returns the details of a specific session (ID, associated user ID, session string, creation and expiry times) or an empty array if not found.

**Requirements:**

* `session` exists.

**Effects:**

* Returns the details of a specific session (ID, associated user ID, session string, creation and expiry times) or an empty array if not found.

**Request Body:**

```json
{
  "session": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "sessionDetails": [
      {
        "id": "string",
        "userId": "string",
        "sessionID": "string",
        "createdAt": "string (ISO Date)",
        "expiresAt": "string (ISO Date)"
      }
    ]
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
