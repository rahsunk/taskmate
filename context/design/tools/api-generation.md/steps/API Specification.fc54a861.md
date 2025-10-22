---
timestamp: 'Tue Oct 21 2025 12:29:31 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251021_122931.fcb5e987.md]]'
content_id: fc54a86164908b597360841ac243389f1728ac730a5c190b1e3fb2e896bad8f6
---

# API Specification: UserAuthentication Concept

**Purpose:** limit access to known users and find users by name

***

## API Endpoints

### POST /api/UserAuthentication/register

**Description:** Registers a new user with a unique username and password.

**Requirements:**

* No `User` with `username` exists.

**Effects:**

* Creates and returns a new `User` with the given `username` and `password`.

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

### POST /api/UserAuthentication/authenticate

**Description:** Authenticates a user by checking if the provided username and password match an existing user.

**Requirements:**

* `User` with the same `username` and `password` exists.

**Effects:**

* Grants access to the `User` associated with that `username` and `password`.

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

### POST /api/UserAuthentication/\_getUserByUsername

**Description:** Retrieves the user ID associated with a username if found.

**Requirements:**

* None explicitly stated, but a username should be provided.

**Effects:**

* Returns the user ID associated with a username if found.

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
{}
```

***

### POST /api/UserAuthentication/\_checkUserExists

**Description:** Returns true if the user with the given ID exists, false otherwise.

**Requirements:**

* None explicitly stated, but a user ID should be provided.

**Effects:**

* Returns true if the user with the given ID exists, false otherwise.

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
