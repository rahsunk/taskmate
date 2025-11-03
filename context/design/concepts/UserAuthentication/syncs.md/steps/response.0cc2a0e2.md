---
timestamp: 'Mon Nov 03 2025 00:05:44 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251103_000544.8ae030ee.md]]'
content_id: 0cc2a0e2dac0af8638b7a88bca6c2e95054d479fecae14f59f9d9ad6049718b8
---

# response:

Okay, here are the synchronizations for the `UserAuthentication` concept's excluded actions. Each sync ensures that the action is only performed if a user is "logged in," as indicated by a valid `session` ID provided in the `Requesting.request`.

First, let's update the `UserAuthenticationConcept` itself to ensure its query methods consistently return arrays, even if empty, as per the `Concept queries` section's guidelines:

**Updated `UserAuthenticationConcept` (Queries Section Only)**

```typescript
// # file: src/UserAuthentication/UserAuthenticationConcept.ts

import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "../../utils/types.ts";
import { freshID } from "../../utils/database.ts";

const PREFIX = "UserAuthentication" + ".";

type User = ID;

interface UsersDocument {
  _id: User;
  username: string;
  password: string;
}

export default class UserAuthenticationConcept {
  private users: Collection<UsersDocument>;

  constructor(private readonly db: Db) {
    this.users = this.db.collection(PREFIX + "users");
  }

  // ... (register, authenticate, changePassword, deleteAccount actions remain unchanged)

  /**
   * **action** register (username: String, password: String): (user: User)
   * ... (unchanged)
   */
  async register(
    { username, password }: { username: string; password: string },
  ): Promise<{ user: User } | { error: string }> {
    // ... (unchanged)
  }

  /**
   * **action** authenticate (username: String, password: String): (user: User)
   * ... (unchanged)
   */
  async authenticate(
    { username, password }: { username: string; password: string },
  ): Promise<{ user: User } | { error: string }> {
    // ... (unchanged)
  }

  /**
   * **action** changePassword (user: User, oldPassword: String, newPassword: String)
   * ... (unchanged)
   */
  async changePassword(
    { user, oldPassword, newPassword }: {
      user: User;
      oldPassword: string;
      newPassword: string;
    },
  ): Promise<Empty | { error: string }> {
    // ... (unchanged)
  }

  /**
   * **action** deleteAccount (user: User)
   * ... (unchanged)
   */
  async deleteAccount(
    { user }: { user: User },
  ): Promise<Empty | { error: string }> {
    // ... (unchanged)
  }

  // --- Queries (Modified to consistently return Array of Dictionaries) ---

  /**
   * _getUserByUsername (username: String): (user: User)
   *
   * Effects: returns an array containing the user ID associated with a username if found, otherwise an empty array.
   *
   * @param {string} username - The username to look up.
   * @returns {Promise<Array<{ user: User }>>} - An array containing the user ID if found, otherwise an empty array.
   */
  async _getUserByUsername(
    { username }: { username: string },
  ): Promise<Array<{ user: User }>> {
    const userDoc = await this.users.findOne({ username });
    if (userDoc) {
      return [{ user: userDoc._id }];
    }
    return []; // Return empty array if not found
  }

  /**
   * _checkUserExists (user: User): (exists: Flag)
   *
   * Effects: returns an array containing an object with `exists: true` if the user with the given ID exists,
   * otherwise an array containing an object with `exists: false`.
   * (Note: Always returns an array with one result, even if exists is false, for consistent query behavior).
   *
   * @param {User} user - The user ID to check for existence.
   * @returns {Promise<Array<{ exists: boolean }>>} - An array with a single object indicating if the user exists.
   */
  async _checkUserExists({ user }: { user: User }): Promise<Array<{ exists: boolean }>> {
    const userDoc = await this.users.findOne({ _id: user });
    return [{ exists: !!userDoc }]; // Always return an array with one result
  }

  /**
   * _getAllUsers (): (user: { _id: User, username: String, password: String }[])
   *
   * Effects: Returns a list of all user documents.
   *
   * @returns {Promise<UsersDocument[]>} - An array of all UsersDocument objects.
   */
  async _getAllUsers(): Promise<UsersDocument[]> {
    const allUsers = await this.users.find({}).toArray();
    return allUsers;
  }

  /**
   * _getUsernameById (user: User): (username: String)
   *
   * Effects: Returns an array containing the username for a specific user ID, if found, otherwise an empty array.
   *
   * @param {User} user - The ID of the user to retrieve the username for.
   * @returns {Promise<Array<{ username: string }>>} - An array containing the username if found, otherwise an empty array.
   */
  async _getUsernameById(
    { user }: { user: User },
  ): Promise<Array<{ username: string }>> {
    const userDoc = await this.users.findOne({ _id: user });
    if (userDoc) {
      return [{ username: userDoc.username }];
    }
    return []; // Return empty array if not found
  }
}
```

***

**`user_authentication.sync.ts` - Synchronization Rules**

```typescript
// # file: src/syncs/user_authentication.sync.ts

import { actions, Frames, Sync } from "@engine";
import { Requesting, Sessioning, UserAuthentication } from "@concepts";
import { ID } from "../../utils/types.ts"; // Adjust path as per your project structure

type User = ID;
type Session = ID;

/**
 * Helper function to authenticate a request by checking a session.
 * Filters out frames where the session is invalid or missing, and maps
 * original frames to an error response if authentication fails.
 *
 * @param frames The current set of frames.
 * @param sessionVar The symbol representing the session ID.
 * @param userVar The symbol to bind the authenticated user ID to.
 * @param errorVar The symbol to bind the error message to if authentication fails.
 * @returns A new set of frames with valid sessions and authenticated users, or error frames.
 */
const withSession = async (
  frames: Frames,
  sessionVar: symbol,
  userVar: symbol,
  errorVar: symbol, // This symbol will carry the error message for the request
): Promise<Frames> => {
  const originalFrames = frames; // Preserve original frames to respond to failed requests

  // Query Sessioning to get the user for each session
  frames = await frames.query(
    Sessioning._getUser,
    ({ [sessionVar]: s }) => ({ session: s as Session }), // Input pattern for Sessioning._getUser
    { user: userVar }, // Output pattern, binds the user to userVar
  );

  // Filter out frames where Sessioning._getUser returned an error (user will be { error: "..." })
  const validSessionFrames = frames.filter(($) =>
    !($[userVar] && typeof $[userVar] === "object" && "error" in ($[userVar] as object))
  );

  if (validSessionFrames.length === 0 && originalFrames.length > 0) {
    // If no valid session was found for any of the original request frames,
    // generate an error frame for each original request that failed authentication.
    return originalFrames.map((frame) => {
      // Create a response object that includes the original request ID and the error.
      // Assuming 'request' variable is always present in the original frame for these syncs.
      return {
        ...frame, // Keep other bindings if they exist
        [errorVar]: "Authentication required: Invalid or expired session.",
      };
    });
  }

  return validSessionFrames;
};

// --- Sync for UserAuthentication.changePassword ---
export const ChangePasswordRequest: Sync = (
  { request, session, oldPassword, newPassword, user, error },
) => ({
  when: actions([
    Requesting.request,
    {
      path: "/UserAuthentication/changePassword",
      session,
      oldPassword,
      newPassword,
    },
    { request },
  ]),
  where: async (frames) => {
    // Store the original frame state for error responses if authentication fails
    const originalRequestFrame = frames[0];

    // 1. Authenticate the user via session
    frames = await withSession(frames, session, user, error);

    // If authentication failed for this request, withSession would have returned an error frame
    if (frames.length === 0 && originalRequestFrame) {
      return new Frames({
        ...originalRequestFrame,
        [error]: originalRequestFrame[error], // Use the error message from withSession
      });
    }

    // 2. Execute the UserAuthentication.changePassword action
    frames = await frames.query(
      UserAuthentication.changePassword,
      ({ [user]: u, oldPassword: op, newPassword: np }) => ({
        user: u as User,
        oldPassword: op as string,
        newPassword: np as string,
      }),
      { error }, // Bind any error from changePassword to the 'error' symbol
    );

    return frames;
  },
  then: actions([
    Requesting.respond,
    ({ request, error }) => ({ request, ...(error ? { error } : {}) }), // Respond with error or empty success
  ]),
});

// --- Sync for UserAuthentication.deleteAccount ---
export const DeleteAccountRequest: Sync = ({ request, session, user, error }) =>
({
  when: actions([
    Requesting.request,
    { path: "/UserAuthentication/deleteAccount", session },
    { request },
  ]),
  where: async (frames) => {
    const originalRequestFrame = frames[0];

    // 1. Authenticate the user via session
    frames = await withSession(frames, session, user, error);
    if (frames.length === 0 && originalRequestFrame) {
      return new Frames({
        ...originalRequestFrame,
        [error]: originalRequestFrame[error],
      });
    }

    // 2. Execute the UserAuthentication.deleteAccount action
    frames = await frames.query(
      UserAuthentication.deleteAccount,
      ({ [user]: u }) => ({ user: u as User }),
      { error },
    );
    return frames;
  },
  then: actions([
    Requesting.respond,
    ({ request, error }) => ({ request, ...(error ? { error } : {}) }),
  ]),
});

// --- Sync for UserAuthentication._checkUserExists ---
export const CheckUserExistsQuery: Sync = (
  { request, session, userToCheck, user, exists, error },
) => ({
  when: actions([
    Requesting.request,
    { path: "/UserAuthentication/_checkUserExists", session, user: userToCheck },
    { request },
  ]),
  where: async (frames) => {
    const originalRequestFrame = frames[0];

    // 1. Authenticate the user via session (to authorize this query)
    frames = await withSession(frames, session, user, error);
    if (frames.length === 0 && originalRequestFrame) {
      return new Frames({
        ...originalRequestFrame,
        [error]: originalRequestFrame[error],
      });
    }

    // 2. Execute the UserAuthentication._checkUserExists query
    // This query always returns [{ exists: boolean }], so frames will not be empty.
    frames = await frames.query(
      UserAuthentication._checkUserExists,
      ({ user: ut }) => ({ user: ut as User }), // Use user ID from request for the check
      { exists },
    );

    return frames;
  },
  then: actions([
    Requesting.respond,
    ({ request, exists, error }) => ({
      request,
      ...(error ? { error } : { exists }),
    }),
  ]),
});

// --- Sync for UserAuthentication._getAllUsers ---
export const GetAllUsersQuery: Sync = (
  { request, session, user, allUsers, error },
) => ({
  when: actions([
    Requesting.request,
    { path: "/UserAuthentication/_getAllUsers", session },
    { request },
  ]),
  where: async (frames) => {
    const originalRequestFrame = frames[0];

    // 1. Authenticate the user via session
    frames = await withSession(frames, session, user, error);
    if (frames.length === 0 && originalRequestFrame) {
      return new Frames({
        ...originalRequestFrame,
        [error]: originalRequestFrame[error],
      });
    }

    // 2. Execute the UserAuthentication._getAllUsers query
    frames = await frames.query(
      UserAuthentication._getAllUsers,
      {},
      { allUsers }, // Binds the array of user documents to 'allUsers'
    );

    // If _getAllUsers returns an empty array, 'allUsers' will be bound to [].
    // Ensure that if query returns nothing, we still respond to the original request.
    if (frames.length === 0 && originalRequestFrame) {
      return new Frames({
        ...originalRequestFrame,
        [allUsers]: [], // Explicitly set empty array for results
      });
    }

    return frames;
  },
  then: actions([
    Requesting.respond,
    ({ request, allUsers, error }) => ({
      request,
      ...(error ? { error } : { allUsers }),
    }),
  ]),
});

// --- Sync for UserAuthentication._getUsernameById ---
export const GetUsernameByIdQuery: Sync = (
  { request, session, userToLookup, user, username, error },
) => ({
  when: actions([
    Requesting.request,
    { path: "/UserAuthentication/_getUsernameById", session, user: userToLookup },
    { request },
  ]),
  where: async (frames) => {
    const originalRequestFrame = frames[0];

    // 1. Authenticate the user via session
    frames = await withSession(frames, session, user, error);
    if (frames.length === 0 && originalRequestFrame) {
      return new Frames({
        ...originalRequestFrame,
        [error]: originalRequestFrame[error],
      });
    }

    // 2. Execute the UserAuthentication._getUsernameById query
    frames = await frames.query(
      UserAuthentication._getUsernameById,
      ({ user: utl }) => ({ user: utl as User }),
      { username },
    );

    // If _getUsernameById returns an empty array (user not found),
    // then `frames` will be empty here. We need to respond with `null` for username.
    if (frames.length === 0 && originalRequestFrame) {
      return new Frames({
        ...originalRequestFrame,
        [username]: null, // Explicitly set username to null if not found
      });
    }

    return frames;
  },
  then: actions([
    Requesting.respond,
    ({ request, username, error }) => ({
      request,
      ...(error ? { error } : { username }),
    }),
  ]),
});
```
