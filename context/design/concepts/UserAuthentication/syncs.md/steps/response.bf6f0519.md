---
timestamp: 'Mon Nov 03 2025 00:16:35 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251103_001635.d624f5fa.md]]'
content_id: bf6f051928c7384a31a64cd731691ec92fd053680212eb827ccc14d454da8924
---

# response:

Here's the updated `UserAuthenticationConcept.ts` with the necessary adjustments for query return types and the `src/syncs/user_auth_syncs.ts` file containing the synchronizations for the excluded actions.

I've refined the query methods in `UserAuthenticationConcept` to consistently return arrays of objects, which is the expected format for `Requesting` concept queries. I've also made a security-conscious decision to exclude the `password` field from the `_getAllUsers` query, as exposing hashed passwords in a general list is typically not desirable, and added a `_getUserById` query for more granular (and potentially privileged) access if the full user document is strictly needed.

***

### **Updated `src/UserAuthentication/UserAuthenticationConcept.ts`**

```typescript
// # concept: UserAuthentication[User]

/**
 * **concept** UserAuthentication[User]
 *
 * **purpose** limit access to known users and find users by name
 *
 * **principle** After a user registers with a username and a password, they can authenticate with that same username and password and be treated each time as the same user. They can also be looked up by other users when sharing events
 */

// # file: src/UserAuthentication/UserAuthenticationConcept.ts

import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "../../utils/types.ts"; // Adjust path as per your project structure
import { freshID } from "../../utils/database.ts"; // Adjust path as per your project structure

// Declare collection prefix, uses the concept name to avoid conflicts
const PREFIX = "UserAuthentication" + ".";

// Generic types of this concept, defined as branded IDs
type User = ID;

/**
 * **state**
 *   a set of Users with
 *     a username String
 *     a password String
 *
 * Represents the persistent state for the UserAuthentication concept.
 * Each document in this collection stores the unique user ID, their username, and their password.
 */
interface UsersDocument {
  _id: User;
  username: string;
  password: string; // In a production system, this should be a hashed password, not plain text.
}

// Interface for _getAllUsers return, excluding password for security
interface UserPublicProfile {
    _id: User;
    username: string;
}

export default class UserAuthenticationConcept {
  private users: Collection<UsersDocument>;

  constructor(private readonly db: Db) {
    this.users = this.db.collection(PREFIX + "users");
  }

  /**
   * **action** register (username: String, password: String): (user: User)
   *
   * **requires**: no `User` with `username` exists
   * **effects**: create and return a new `User` with the given `username` and `password`
   *
   * Registers a new user with a unique username and password.
   * If the username already exists, it returns an error.
   *
   * @param {string} username - The desired unique username for the new user.
   * @param {string} password - The password for the new user.
   * @returns {Promise<{ user: User } | { error: string }>} - The ID of the newly created user on success, or an error message.
   */
  async register(
    { username, password }: { username: string; password: string },
  ): Promise<{ user: User } | { error: string }> {
    // Check precondition: no User with `username` exists
    const existingUser = await this.users.findOne({ username });
    if (existingUser) {
      return { error: `User with username '${username}' already exists.` };
    }

    // Effect: create and return a new User
    const newUser: UsersDocument = {
      _id: freshID() as User, // Generate a fresh ID for the new user
      username,
      password, // Reminder: In a real application, hash this password!
    };
    await this.users.insertOne(newUser);
    return { user: newUser._id };
  }

  /**
   * **action** authenticate (username: String, password: String): (user: User)
   *
   * **requires**: `User` with the same `username` and `password` exists
   * **effects**: grants access to the `User` associated with that `username` and `password`
   *
   * Authenticates a user by checking if the provided username and password match an existing user.
   *
   * @param {string} username - The username to authenticate.
   * @param {string} password - The password to authenticate.
   * @returns {Promise<{ user: User } | { error: string }>} - The ID of the authenticated user on success, or an error message.
   */
  async authenticate(
    { username, password }: { username: string; password: string },
  ): Promise<{ user: User } | { error: string }> {
    // Check precondition: User with the same `username` and `password` exists
    const user = await this.users.findOne({ username, password }); // Reminder: Compare against hashed password in real app!
    if (!user) {
      return { error: "Invalid username or password." };
    }

    // Effect: grants access to the User
    return { user: user._id };
  }

  /**
   * **action** changePassword (user: User, oldPassword: String, newPassword: String)
   *
   * **requires**: `user` exists and `user.password` is equal to `oldPassword`
   * **effects**: `password` for `user` is changed to `newPassword`.
   *
   * Allows a user to change their password. This action does not perform authentication itself;
   * authentication is expected to be handled by synchronizations ensuring the `user`
   * argument corresponds to the currently authenticated user.
   *
   * @param {User} user - The ID of the user whose password is to be changed.
   * @param {string} oldPassword - The current password of the user.
   * @param {string} newPassword - The new password for the user.
   * @returns {Promise<Empty | { error: string }>} - An empty object on success, or an error message.
   */
  async changePassword(
    { user, oldPassword, newPassword }: {
      user: User;
      oldPassword: string;
      newPassword: string;
    },
  ): Promise<Empty | { error: string }> {
    // Check preconditions:
    // 1. `user` exists
    const existingUser = await this.users.findOne({ _id: user });
    if (!existingUser) {
      return { error: `User with ID '${user}' not found.` };
    }
    // 2. `user.password` is equal to `oldPassword`
    if (existingUser.password !== oldPassword) { // Reminder: Compare against hashed password in real app!
      return { error: "Old password does not match." };
    }
    // Additional check: New password must be different from old
    if (oldPassword === newPassword) {
      return { error: "New password cannot be the same as the old password." };
    }

    // Effect: `password` for `user` is changed to `newPassword`.
    await this.users.updateOne(
      { _id: user },
      { $set: { password: newPassword } }, // Reminder: Store hashed new password!
    );
    return {};
  }

  /**
   * **action** deleteAccount (user: User)
   *
   * **requires**: `user` exists
   * **effects**: `user` is removed from the state
   *
   * Deletes a user account from the system. This action does not perform authentication;
   * it expects authentication to be handled by synchronizations ensuring the `user`
   * argument corresponds to the currently authenticated user.
   *
   * @param {User} user - The ID of the user account to delete.
   * @returns {Promise<Empty | { error: string }>} - An empty object on success, or an error message.
   */
  async deleteAccount(
    { user }: { user: User },
  ): Promise<Empty | { error: string }> {
    // Check precondition: `user` exists (implicitly checked by deleteOne result)
    const result = await this.users.deleteOne({ _id: user });
    if (result.deletedCount === 0) {
      return { error: `User with ID '${user}' not found.` };
    }

    // Effect: `user` is removed from the state
    return {};
  }

  // --- Queries ---

  /**
   * _getUserByUsername (username: String): (user: User)
   *
   * Effects: returns the user ID associated with a username if found.
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
    return []; // Return an empty array for no results
  }

  /**
   * _checkUserExists (user: User): (exists: Flag)
   *
   * Effects: returns true if the user with the given ID exists, false otherwise.
   *
   * @param {User} user - The user ID to check for existence.
   * @returns {Promise<Array<{ exists: boolean }>>} - An array containing a boolean indicating if the user exists.
   */
  async _checkUserExists({ user }: { user: User }): Promise<Array<{ exists: boolean }>> {
    const userDoc = await this.users.findOne({ _id: user });
    return [{ exists: !!userDoc }]; // Always return an array with one object
  }

  /**
   * _getAllUsers (): (users: { _id: User, username: String }[])
   *
   * Effects: Returns a list of all user public profiles (ID and username).
   * Passwords are intentionally excluded for security.
   *
   * @returns {Promise<Array<UserPublicProfile>>} - An array of user public profile objects.
   */
  async _getAllUsers(): Promise<Array<UserPublicProfile>> {
    const allUsers = await this.users.find({}).project({ password: 0 }).toArray();
    return allUsers.map(user => ({ _id: user._id, username: user.username }));
  }

  /**
   * _getUsernameById (user: User): (username: String)
   *
   * Effects: Returns the username for a specific user ID, if found.
   *
   * @param {User} user - The ID of the user to retrieve the username for.
   * @returns {Promise<Array<{ username: string }>>} - An array containing an object with the username if found, otherwise an empty array.
   */
  async _getUsernameById(
    { user }: { user: User },
  ): Promise<Array<{ username: string }>> {
    const userDoc = await this.users.findOne({ _id: user });
    if (userDoc) {
      return [{ username: userDoc.username }];
    }
    return []; // Return an empty array if not found
  }
  
  /**
   * _getUserById (user: User): (user: { _id: User, username: String, password: String })
   *
   * Effects: Retrieves a specific user document by its ID.
   * This query is intended for internal use or privileged contexts where password hash might be needed.
   *
   * @param {User} user - The ID of the user to retrieve.
   * @returns {Promise<Array<UsersDocument>>} - An array containing the UsersDocument object if found, otherwise an empty array.
   */
  async _getUserById(
    { user }: { user: User },
  ): Promise<Array<UsersDocument>> {
    const userDoc = await this.users.findOne({ _id: user });
    if (userDoc) {
      return [userDoc];
    }
    return [];
  }
}
```

***

### **New file: `src/syncs/user_auth_syncs.ts`**

```typescript
import { actions, Frames, Sync } from "@engine";
import { Requesting, Sessioning, UserAuthentication } from "../concepts/concepts.ts"; // Adjust path if necessary based on your project structure
import { ID, Empty } from "../utils/types.ts";

type User = ID;
type Session = ID;

// ============================================================================
// Syncs for changePassword
// ============================================================================

/**
 * **sync** ChangePasswordRequest
 *
 * **when** Requesting.request (path: "/UserAuthentication/changePassword", session, oldPassword, newPassword) : (request)
 * **where** in Sessioning: user of session is logged_in_user
 * **then** UserAuthentication.changePassword (user: logged_in_user, oldPassword, newPassword)
 *
 * Captures a request to change password, authorizes it by checking the session,
 * and then triggers the UserAuthentication.changePassword action for the logged-in user.
 */
export const ChangePasswordRequest: Sync = (
  { request, session, oldPassword, newPassword, logged_in_user },
) => ({
  when: actions([
    Requesting.request,
    { path: "/UserAuthentication/changePassword", session, oldPassword, newPassword },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];
    // Ensure there's an active session and get the associated user
    frames = await frames.query(Sessioning._getUser, { session }, { user: logged_in_user });
    if (frames.length === 0) {
      // If no session found, return a frame with an error for Requesting.respond
      return new Frames({ ...originalFrame, error: "Authentication required." });
    }
    return frames;
  },
  then: actions([
    UserAuthentication.changePassword,
    { user: logged_in_user, oldPassword, newPassword }, // Action is performed for the logged_in_user
  ]),
});

/**
 * **sync** ChangePasswordResponse
 *
 * **when** Requesting.request (path: "/UserAuthentication/changePassword") : (request)
 * **when** UserAuthentication.changePassword () : ()
 * **then** Requesting.respond (request, status: "Password changed successfully")
 *
 * Responds to the client after a successful password change.
 */
export const ChangePasswordResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuthentication/changePassword" }, { request }],
    [UserAuthentication.changePassword, {}, {} as Empty], // No output means success
  ),
  then: actions([
    Requesting.respond,
    { request, status: "Password changed successfully." },
  ]),
});

/**
 * **sync** ChangePasswordResponseError
 *
 * **when** Requesting.request (path: "/UserAuthentication/changePassword") : (request)
 * **when** UserAuthentication.changePassword () : (error)
 * **then** Requesting.respond (request, error)
 *
 * Responds to the client after a failed password change.
 */
export const ChangePasswordResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuthentication/changePassword" }, { request }],
    [UserAuthentication.changePassword, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// ============================================================================
// Syncs for deleteAccount
// ============================================================================

/**
 * **sync** DeleteAccountRequest
 *
 * **when** Requesting.request (path: "/UserAuthentication/deleteAccount", session) : (request)
 * **where** in Sessioning: user of session is logged_in_user
 * **then** UserAuthentication.deleteAccount (user: logged_in_user)
 *
 * Captures a request to delete an account, authorizes it by checking the session,
 * and then triggers the UserAuthentication.deleteAccount action for the logged-in user.
 */
export const DeleteAccountRequest: Sync = (
  { request, session, logged_in_user },
) => ({
  when: actions([
    Requesting.request,
    { path: "/UserAuthentication/deleteAccount", session },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];
    frames = await frames.query(Sessioning._getUser, { session }, { user: logged_in_user });
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, error: "Authentication required." });
    }
    return frames;
  },
  then: actions([
    UserAuthentication.deleteAccount,
    { user: logged_in_user }, // Action is performed for the logged_in_user
  ]),
});

/**
 * **sync** DeleteAccountResponse
 *
 * **when** Requesting.request (path: "/UserAuthentication/deleteAccount") : (request)
 * **when** UserAuthentication.deleteAccount () : ()
 * **then** Requesting.respond (request, status: "Account deleted successfully")
 *
 * Responds to the client after a successful account deletion.
 */
export const DeleteAccountResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuthentication/deleteAccount" }, { request }],
    [UserAuthentication.deleteAccount, {}, {} as Empty],
  ),
  then: actions([
    Requesting.respond,
    { request, status: "Account deleted successfully." },
  ]),
});

/**
 * **sync** DeleteAccountResponseError
 *
 * **when** Requesting.request (path: "/UserAuthentication/deleteAccount") : (request)
 * **when** UserAuthentication.deleteAccount () : (error)
 * **then** Requesting.respond (request, error)
 *
 * Responds to the client after a failed account deletion.
 */
export const DeleteAccountResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuthentication/deleteAccount" }, { request }],
    [UserAuthentication.deleteAccount, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// ============================================================================
// Syncs for _checkUserExists (Query)
// ============================================================================

/**
 * **sync** CheckUserExistsRequest
 *
 * **when** Requesting.request (path: "/UserAuthentication/_checkUserExists", session, user_to_check) : (request)
 * **where** in Sessioning: user of session is logged_in_user
 * **then** UserAuthentication._checkUserExists (user: user_to_check)
 *
 * Captures a request to check if a user exists (by their ID), authorizes the caller,
 * and then triggers the UserAuthentication._checkUserExists query.
 * The `user_to_check` is the ID provided in the request body.
 */
export const CheckUserExistsRequest: Sync = (
  { request, session, user_to_check, logged_in_user },
) => ({
  when: actions([
    Requesting.request,
    { path: "/UserAuthentication/_checkUserExists", session, user: user_to_check }, // 'user' from request body is bound to 'user_to_check'
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];
    // Ensure there's an active session
    frames = await frames.query(Sessioning._getUser, { session }, { user: logged_in_user });
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, error: "Authentication required." });
    }
    return frames;
  },
  then: actions([
    UserAuthentication._checkUserExists,
    { user: user_to_check },
  ]),
});

/**
 * **sync** CheckUserExistsResponse
 *
 * **when** Requesting.request (path: "/UserAuthentication/_checkUserExists") : (request)
 * **when** UserAuthentication._checkUserExists () : (results: { exists: Flag }[])
 * **then** Requesting.respond (request, exists: results[0].exists)
 *
 * Responds to the client with the result of the _checkUserExists query.
 */
export const CheckUserExistsResponse: Sync = (
  { request, results },
) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuthentication/_checkUserExists" }, { request }],
    [UserAuthentication._checkUserExists, {}, { results }],
  ),
  then: actions([
    Requesting.respond,
    { request, exists: results[0].exists }, // Queries return an array, so take the first element
  ]),
});

// ============================================================================
// Syncs for _getAllUsers (Query)
// ============================================================================

/**
 * **sync** GetAllUsersRequest
 *
 * **when** Requesting.request (path: "/UserAuthentication/_getAllUsers", session) : (request)
 * **where** in Sessioning: user of session is logged_in_user
 * **then** UserAuthentication._getAllUsers ()
 *
 * Captures a request to get all users, authorizes the caller,
 * and then triggers the UserAuthentication._getAllUsers query.
 */
export const GetAllUsersRequest: Sync = (
  { request, session, logged_in_user },
) => ({
  when: actions([
    Requesting.request,
    { path: "/UserAuthentication/_getAllUsers", session },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];
    // Ensure there's an active session
    frames = await frames.query(Sessioning._getUser, { session }, { user: logged_in_user });
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, error: "Authentication required." });
    }
    // No specific user ID needed for this query; just a logged-in user.
    return frames;
  },
  then: actions([
    UserAuthentication._getAllUsers,
    {}, // No input parameters for _getAllUsers
  ]),
});

/**
 * **sync** GetAllUsersResponse
 *
 * **when** Requesting.request (path: "/UserAuthentication/_getAllUsers") : (request)
 * **when** UserAuthentication._getAllUsers () : (users: { _id: User, username: String }[])
 * **then** Requesting.respond (request, users)
 *
 * Responds to the client with the list of all users' public profiles.
 */
export const GetAllUsersResponse: Sync = (
  { request, users },
) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuthentication/_getAllUsers" }, { request }],
    [UserAuthentication._getAllUsers, {}, { users }],
  ),
  then: actions([
    Requesting.respond,
    { request, users },
  ]),
});

// ============================================================================
// Syncs for _getUsernameById (Query)
// ============================================================================

/**
 * **sync** GetUsernameByIdRequest
 *
 * **when** Requesting.request (path: "/UserAuthentication/_getUsernameById", session, user_id) : (request)
 * **where** in Sessioning: user of session is logged_in_user
 * **then** UserAuthentication._getUsernameById (user: user_id)
 *
 * Captures a request to get a username by ID, authorizes the caller,
 * and then triggers the UserAuthentication._getUsernameById query.
 * The `user_id` is the ID provided in the request body.
 */
export const GetUsernameByIdRequest: Sync = (
  { request, session, user_id, logged_in_user },
) => ({
  when: actions([
    Requesting.request,
    { path: "/UserAuthentication/_getUsernameById", session, user: user_id }, // 'user' from request body is bound to 'user_id'
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];
    // Ensure there's an active session
    frames = await frames.query(Sessioning._getUser, { session }, { user: logged_in_user });
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, error: "Authentication required." });
    }
    return frames;
  },
  then: actions([
    UserAuthentication._getUsernameById,
    { user: user_id },
  ]),
});

/**
 * **sync** GetUsernameByIdResponse
 *
 * **when** Requesting.request (path: "/UserAuthentication/_getUsernameById") : (request)
 * **when** UserAuthentication._getUsernameById () : (results: { username: String }[])
 * **then** Requesting.respond (request, username: results[0].username)
 *
 * Responds to the client with the username found by ID.
 */
export const GetUsernameByIdResponse: Sync = (
  { request, results },
) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuthentication/_getUsernameById" }, { request }],
    [UserAuthentication._getUsernameById, {}, { results }],
  ),
  then: actions([
    Requesting.respond,
    { request, username: results[0]?.username ?? null }, // Handle case where results might be empty
  ]),
});

// ============================================================================
// General Error Sync for Authentication Failures in Where Clauses
// ============================================================================

/**
 * **sync** RespondAuthenticationError
 *
 * **when** Requesting.request (path, error) : (request)
 * **then** Requesting.respond (request, error)
 *
 * Catches requests that had an authentication error (e.g., from Sessioning._getUser)
 * and ensures a proper error response is sent. This sync serves as a fallback for
 * 'where' clauses that explicitly return a frame with an 'error' binding.
 */
export const RespondAuthenticationError: Sync = ({ request, error }) => ({
  when: actions([
    Requesting.request, // Match any Requesting.request that eventually had an error binding
    { error }, // The error binding is added by the 'where' clause if authentication fails
    { request },
  ]),
  then: actions([
    Requesting.respond,
    { request, error },
  ]),
});
```
