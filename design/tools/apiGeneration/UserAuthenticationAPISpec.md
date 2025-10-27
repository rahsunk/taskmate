**Purpose:** limit access to known users and find users by name.

---

## API Endpoints

### POST /api/UserAuthentication/register

**Description:** Registers a new user with a unique username and password.

**Requirements:**

*   No `User` with `username` already exists.

**Effects:**

*   Creates and returns a new `User` with the given `username` and `password`.

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

---

### POST /api/UserAuthentication/authenticate

**Description:** Authenticates a user by checking if the provided username and password match an existing user.

**Requirements:**

*   A `User` with the same `username` and `password` exists.

**Effects:**

*   Grants access to the `User` associated with that `username` and `password`.

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

---

### POST /api/UserAuthentication/changePassword

**Description:** Allows an authenticated user to change their password.

**Requirements:**

*   `user` exists.
*   `user.password` is equal to `oldPassword`.
*   `newPassword` must be different from `oldPassword`.

**Effects:**

*   `password` for `user` is changed to `newPassword`.

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

---

### POST /api/UserAuthentication/deleteAccount

**Description:** Deletes a user account from the system.

**Requirements:**

*   `user` exists.

**Effects:**

*   `user` is removed from the state.

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

---

### GET /api/UserAuthentication/\_getUserByUsername

**Description:** Returns the user ID associated with a username if found.

**Requirements:**

*   None explicitly stated for the query, but an existing username is implied for a successful lookup.

**Effects:**

*   Returns the user ID if found, otherwise an empty array.

**Request Parameters (Query String):**

*   `username`: `string`

**Success Response Body (Query):**

```json
[
  {
    "user": "string"
  }
]
```
*(If no user is found, an empty array `[]` will be returned.)*

**Error Response Body:**

*(Queries generally return an empty array for no results, not an error object, unless an exceptional database error occurs which should be handled internally or re-thrown as a true exception per concept guidelines.)*

---

### GET /api/UserAuthentication/\_checkUserExists

**Description:** Returns true if the user with the given ID exists, false otherwise.

**Requirements:**

*   None.

**Effects:**

*   Returns a boolean indicating if the user exists.

**Request Parameters (Query String):**

*   `user`: `string` (User ID)

**Success Response Body (Query):**

```json
[
  {
    "exists": "boolean"
  }
]
```

**Error Response Body:**

*(Queries generally return an empty array for no results or a `false` flag as a successful result, not an error object, unless an exceptional database error occurs.)*

---

### GET /api/UserAuthentication/\_getAllUsers

**Description:** Retrieves all user documents.

**Requirements:**

*   None.

**Effects:**

*   Returns an array of all `UsersDocument` objects, each containing `_id`, `username`, and `password`.

**Request Parameters:**

*   None.

**Success Response Body (Query):**

```json
[
  {
    "_id": "string",
    "username": "string",
    "password": "string"
  },
  {
    "_id": "string",
    "username": "string",
    "password": "string"
  }
  // ... more user objects
]
```
*(If no users are found, an empty array `[]` will be returned.)*

**Error Response Body:**

*(Queries generally return an empty array for no results, not an error object, unless an exceptional database error occurs.)*

---

### GET /api/UserAuthentication/\_getUserById

**Description:** Retrieves a specific user document by its ID.

**Requirements:**

*   The `user` ID exists in the state.

**Effects:**

*   Returns an array containing the `UsersDocument` object matching the provided ID, if found.

**Request Parameters (Query String):**

*   `user`: `string` (User ID)

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
*(If no user is found, an empty array `[]` will be returned.)*

**Error Response Body:**

*(Queries generally return an empty array for no results, not an error object, unless an exceptional database error occurs.)*