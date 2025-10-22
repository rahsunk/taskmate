---
timestamp: 'Mon Oct 20 2025 17:16:49 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251020_171649.6eb73be8.md]]'
content_id: 474ee208245a9042fc1dcc0b466acc802e5b6b94607fa667ad3f94c7621954ba
---

# API Specification: UserAuthentication Concept

**Purpose:** limit access to known users and find users by name

***

## API Endpoints

### POST /api/UserAuthentication/register

**Description:** Registers a new user with a username and password.

**Requirements:**

* no `User` with `username` exists

**Effects:**

* create and return a new `User` with the given `username` and `password`

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

**Description:** Authenticates a user with the provided username and password.

**Requirements:**

* `User` with the same `username` and `password` exists

**Effects:**

* grants access to the `User` associated with that `username` and `password`

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

**Description:** Changes the password for an existing user.

**Requirements:**

* `user` exists and `user.password` is equal to `oldPassword`

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

**Description:** Deletes a user account.

**Requirements:**

* `user` exists

**Effects:**

* `user` is removed from the state

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
