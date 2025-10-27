---
timestamp: 'Mon Oct 27 2025 07:03:03 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251027_070303.3e16807b.md]]'
content_id: acaab936283ee4853df68df8faf1bcd4e4576967e478704d43b7827ff6291dd9
---

# file: src/UserAuthentication/UserAuthenticationConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "../../utils/types.ts";
import { freshID } from "../../utils/database.ts";
import { compare, genSalt, hash } from "https://deno.land/x/bcrypt@v1.1.0/mod.ts";

// Declare collection prefix for MongoDB, using the concept name
const PREFIX = "UserAuthentication" + ".";

// Generic types as defined in the concept specification
type User = ID;
type Session = ID;

/**
 * Interface for the 'Users' collection documents.
 * Corresponds to "a set of Users with a username String a password String"
 * Note: password will be stored as a hash for security.
 */
interface UserDoc {
  _id: User;
  username: string;
  passwordHash: string; // Store hashed password, not plaintext
}

/**
 * Interface for the 'Sessions' collection documents.
 * Corresponds to "a set of Sessions with a user User a sessionID String"
 * Added createdAt and expiresAt for session management.
 */
interface SessionDoc {
  _id: Session;
  user: User; // The ID of the user associated with this session
  sessionID: string; // The actual session token string
  createdAt: Date;
  expiresAt: Date;
}

/**
 * UserAuthenticationConcept class implementation.
 *
 * purpose: identify and authenticate users.
 *
 * principle: If you register with a user name and password, and then you login with that same user name and password,
 *            you will be authenticated as the user who registered.
 */
export default class UserAuthenticationConcept {
  private users: Collection<UserDoc>;
  private sessions: Collection<SessionDoc>;
  private readonly SESSION_EXPIRY_MINUTES = 60 * 24; // Sessions expire after 24 hours

  constructor(private readonly db: Db) {
    this.users = this.db.collection(PREFIX + "users");
    this.sessions = this.db.collection(PREFIX + "sessions");
    // Ensure unique usernames
    this.users.createIndex({ username: 1 }, { unique: true });
    // Ensure unique sessionIDs
    this.sessions.createIndex({ sessionID: 1 }, { unique: true });
    // Index for quick lookup by user in sessions
    this.sessions.createIndex({ user: 1 });
    // Index for session expiry (TTL index if using MongoDB's auto-expiry)
    this.sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  }

  /**
   * register (username: String, password: String): (user: User | error: String)
   *
   * requires: no user with that `username` already exists
   *
   * effects: creates a new `User` `u` with the given `username` and `password` (hashed); returns `u`
   *
   * @param {Object} params - The action parameters.
   * @param {string} params.username - The desired username.
   * @param {string} params.password - The desired password (will be hashed).
   * @returns {Promise<{user?: User; error?: string}>} - The ID of the newly registered user or an error message.
   */
  async register({
    username,
    password,
  }: {
    username: string;
    password: string;
  }): Promise<{ user?: User; error?: string }> {
    // Precondition: check if username already exists
    const existingUser = await this.users.findOne({ username });
    if (existingUser) {
      return { error: `Username '${username}' already exists.` };
    }

    // Hash the password before storing it
    const salt = await genSalt(10);
    const passwordHash = await hash(password, salt);

    const newUserId = freshID();
    const newUserDoc: UserDoc = {
      _id: newUserId,
      username,
      passwordHash,
    };

    try {
      await this.users.insertOne(newUserDoc);
      return { user: newUserDoc._id };
    } catch (e: any) {
      console.error("Error in register:", e);
      return { error: `Failed to register user: ${e.message}` };
    }
  }

  /**
   * login (username: String, password: String): (session: Session | error: String)
   *
   * requires: a `User` with that `username` and `password` exists
   *
   * effects: if successful, creates a new `Session` linked to the `User` and returns its `sessionID`;
   *          otherwise, returns an `error`
   *
   * @param {Object} params - The action parameters.
   * @param {string} params.username - The username to log in with.
   * @param {string} params.password - The password to log in with.
   * @returns {Promise<{session?: Session; error?: string}>} - The ID of the new session or an error message.
   */
  async login({
    username,
    password,
  }: {
    username: string;
    password: string;
  }): Promise<{ session?: Session; error?: string }> {
    const userDoc = await this.users.findOne({ username });
    if (!userDoc) {
      return { error: "Invalid username or password." };
    }

    // Compare the provided password with the stored hash
    const passwordMatches = await compare(password, userDoc.passwordHash);
    if (!passwordMatches) {
      return { error: "Invalid username or password." };
    }

    const newSessionId = freshID();
    const sessionToken = freshID(); // Use freshID for sessionToken as well for uniqueness
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.SESSION_EXPIRY_MINUTES * 60 * 1000);

    const newSessionDoc: SessionDoc = {
      _id: newSessionId,
      user: userDoc._id,
      sessionID: sessionToken,
      createdAt: now,
      expiresAt: expiresAt,
    };

    try {
      await this.sessions.insertOne(newSessionDoc);
      return { session: newSessionDoc._id };
    } catch (e: any) {
      console.error("Error in login:", e);
      return { error: `Failed to create session: ${e.message}` };
    }
  }

  /**
   * logout (session: Session): (Empty | error: String)
   *
   * requires: `session` exists and is valid (not expired)
   *
   * effects: deletes the `session`
   *
   * @param {Object} params - The action parameters.
   * @param {Session} params.session - The ID of the session to log out.
   * @returns {Promise<Empty | {error: string}>} - An empty object on success or an error message.
   */
  async logout({
    session,
  }: {
    session: Session;
  }): Promise<Empty | { error: string }> {
    const sessionDoc = await this.sessions.findOne({ _id: session });
    if (!sessionDoc || sessionDoc.expiresAt < new Date()) {
      return { error: `Session with ID '${session}' not found or already expired.` };
    }

    try {
      const result = await this.sessions.deleteOne({ _id: session });
      if (result.deletedCount === 0) {
        return { error: `Session with ID '${session}' not found.` };
      }
      return {};
    } catch (e: any) {
      console.error("Error in logout:", e);
      return { error: `Failed to logout session: ${e.message}` };
    }
  }

  // --- Concept Queries ---

  /**
   * _getUsers(): (user: {id: User, username: String}[])
   *
   * requires: true
   *
   * effects: returns a list of all users with their IDs and usernames.
   *
   * @returns {Promise<{user?: {id: User, username: string}[]; error?: string}>} - An array of user objects (ID and username) or an error.
   */
  async _getUsers(): Promise<{
    user?: { id: User; username: string }[];
    error?: string;
  }> {
    try {
      const userDocs = await this.users.find({}, { projection: { passwordHash: 0 } }).toArray(); // Exclude password hash
      return { user: userDocs.map((doc) => ({ id: doc._id, username: doc.username })) };
    } catch (e: any) {
      console.error("Error in _getUsers:", e);
      return { error: `Failed to retrieve users: ${e.message}` };
    }
  }

  /**
   * _getUserDetails(user: User): (userDetails: {id: User, username: String}[] | error: String)
   *
   * requires: `user` exists
   *
   * effects: returns the ID and username of a specific user. Password is not returned for security reasons.
   *
   * @param {Object} params - The query parameters.
   * @param {User} params.user - The ID of the user to retrieve details for.
   * @returns {Promise<{userDetails?: {id: User, username: string}[]; error?: string}>} - An array containing the user object (ID and username) or an error.
   */
  async _getUserDetails({ user }: { user: User }): Promise<{
    userDetails?: { id: User; username: string }[];
    error?: string;
  }> {
    try {
      const userDoc = await this.users.findOne({ _id: user }, { projection: { passwordHash: 0 } }); // Exclude password hash
      if (!userDoc) {
        return { error: `User with ID '${user}' not found.` };
      }
      return { userDetails: [{ id: userDoc._id, username: userDoc.username }] };
    } catch (e: any) {
      console.error("Error in _getUserDetails:", e);
      return { error: `Failed to retrieve user details: ${e.message}` };
    }
  }

  /**
   * _getSessions(): (session: {id: Session, userId: User, sessionID: String, createdAt: Date, expiresAt: Date}[])
   *
   * requires: true
   *
   * effects: returns a list of all active sessions, including their ID, associated user ID, session string, creation and expiry times.
   *
   * @returns {Promise<{session?: {id: Session, userId: User, sessionID: string, createdAt: Date, expiresAt: Date}[]; error?: string}>} - An array of session objects or an error.
   */
  async _getSessions(): Promise<{
    session?: {
      id: Session;
      userId: User;
      sessionID: string;
      createdAt: Date;
      expiresAt: Date;
    }[];
    error?: string;
  }> {
    try {
      // Filter out expired sessions here to ensure "active sessions"
      const now = new Date();
      const sessionDocs = await this.sessions.find({ expiresAt: { $gt: now } }).toArray();
      return {
        session: sessionDocs.map((doc) => ({
          id: doc._id,
          userId: doc.user,
          sessionID: doc.sessionID,
          createdAt: doc.createdAt,
          expiresAt: doc.expiresAt,
        })),
      };
    } catch (e: any) {
      console.error("Error in _getSessions:", e);
      return { error: `Failed to retrieve sessions: ${e.message}` };
    }
  }

  /**
   * _getSessionDetails(session: Session): (sessionDetails: {id: Session, userId: User, sessionID: String, createdAt: Date, expiresAt: Date}[] | error: String)
   *
   * requires: `session` exists
   *
   * effects: returns the details of a specific session (ID, associated user ID, session string, creation and expiry times) or an error if not found.
   *
   * @param {Object} params - The query parameters.
   * @param {Session} params.session - The ID of the session to retrieve details for.
   * @returns {Promise<{sessionDetails?: {id: Session, userId: User, sessionID: string, createdAt: Date, expiresAt: Date}[]; error?: string}>} - An array containing the session object or an error.
   */
  async _getSessionDetails({ session }: { session: Session }): Promise<{
    sessionDetails?: {
      id: Session;
      userId: User;
      sessionID: string;
      createdAt: Date;
      expiresAt: Date;
    }[];
    error?: string;
  }> {
    try {
      const sessionDoc = await this.sessions.findOne({ _id: session });
      if (!sessionDoc || sessionDoc.expiresAt < new Date()) {
        return { error: `Session with ID '${session}' not found or expired.` };
      }
      return {
        sessionDetails: [
          {
            id: sessionDoc._id,
            userId: sessionDoc.user,
            sessionID: sessionDoc.sessionID,
            createdAt: sessionDoc.createdAt,
            expiresAt: sessionDoc.expiresAt,
          },
        ],
      };
    } catch (e: any) {
      console.error("Error in _getSessionDetails:", e);
      return { error: `Failed to retrieve session details: ${e.message}` };
    }
  }
}
```

***

## API Endpoints (Updated)

### POST /api/UserAuthentication/register

**Description:** Creates a new user with the given username and a hashed password.

**Requirements:**

* No user with the given `username` already exists.

**Effects:**

* Creates a new `User` `u` with the provided `username` and hashed `password`.
* Returns the ID of the newly registered user.

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

* A `User` with the provided `username` and `password` exists.

**Effects:**

* If successful, creates a new `Session` linked to the `User` and returns its ID.
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

* The `session` identified by `session` ID exists and is valid (not expired).

**Effects:**

* Deletes the specified `session`.

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

### GET /api/UserAuthentication/\_getUsers

**Description:** Retrieves a list of all registered users with their IDs and usernames.

**Requirements:**

* None.

**Effects:**

* Returns an array of user objects, each containing `id` and `username`. Passwords are *not* included.

**Request Parameters:**

* None.

**Success Response Body (Query):**

```json
[
  {
    "user": [
      {
        "id": "string",
        "username": "string"
      },
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

### GET /api/UserAuthentication/\_getUserDetails

**Description:** Retrieves the ID and username for a specific user.

**Requirements:**

* The `user` identified by `user` ID exists.

**Effects:**

* Returns an array containing the user object (ID and username) if found. Passwords are *not* included.
* Returns an error if the user is not found.

**Request Parameters:**

* `user`: `string` (User ID)

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

### GET /api/UserAuthentication/\_getSessions

**Description:** Retrieves a list of all active sessions, including their IDs, associated user IDs, session strings, creation, and expiry times.

**Requirements:**

* None.

**Effects:**

* Returns an array of session objects.

**Request Parameters:**

* None.

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
      },
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

### GET /api/UserAuthentication/\_getSessionDetails

**Description:** Retrieves the details for a specific session.

**Requirements:**

* The `session` identified by `session` ID exists and is active.

**Effects:**

* Returns an array containing the session object (ID, associated user ID, session string, creation, and expiry times) if found.
* Returns an error if the session is not found or is expired.

**Request Parameters:**

* `session`: `string` (Session ID)

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
