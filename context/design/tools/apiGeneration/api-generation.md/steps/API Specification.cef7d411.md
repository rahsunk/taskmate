---
timestamp: 'Thu Oct 30 2025 10:59:27 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251030_105927.54e03087.md]]'
content_id: cef7d411ff1a5b075e35fba2154659ca8da629a2b419783624dc20053d4c05af
---

# API Specification: UserAuthentication Concept

**Purpose:** limit access to known users and find users by name.

***

## API Endpoints

### POST /api/UserAuthentication/register

**Description:** Registers a new user with a unique username and password.

**Requirements:**

* No `User` with `username` already exists.

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

* A `User` with the same `username` and `password` exists.

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

### GET /api/UserAuthentication/\_getUserByUsername

**Description:** Returns the user ID associated with a username if found.

**Requirements:**

* None explicitly stated.

**Effects:**

* Returns the user ID if found, otherwise an empty object.

**Request Parameters:**

* `username`: `string`

**Success Response Body (Query):**

```json
[
  {
    "user": "string"
  }
]
```

*(Note: If no user is found, an empty array `[]` would be returned as per the general query rule, or an empty object `{}` as per the implementation's success case, which is then wrapped in an array for consistency with the prompt's query response body template.)*

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### GET /api/UserAuthentication/\_checkUserExists

**Description:** Returns true if the user with the given ID exists, false otherwise.

**Requirements:**

* None.

**Effects:**

* Returns a boolean indicating if the user exists.

**Request Parameters:**

* `user`: `string` (User ID)

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

### GET /api/UserAuthentication/users

**Description:** Retrieves all user documents.

**Requirements:**

* None.

**Effects:**

* Returns an array of all `UsersDocument` objects.

**Request Parameters:**

* None.

**Success Response Body (Query):**

```json
[
  {
    "_id": "string",
    "username": "string",
    "password": "string"
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

### GET /api/UserAuthentication/users/{userId}

**Description:** Retrieves a specific user document by its ID.

**Requirements:**

* The `userId` exists.

**Effects:**

* Returns the `UsersDocument` object matching the provided ID.

**Request Parameters:**

* `userId`: `string` (User ID, part of URL path)

**Success Response Body (Query):**

```json
[
  {
    "_id": "string",
    "username": "string",
    "password": "string"
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
