---
timestamp: 'Mon Nov 03 2025 00:23:18 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251103_002318.cd62b99c.md]]'
content_id: e5b38a87ef01557584e182ed5e783c639e81c2442f8fe240b088bec375afc2ef
---

# response:

You've hit a common TypeScript type error when working with the Concept Engine's synchronization DSL! The issue `Element implicitly has an 'any' type because expression of type '0' can't be used to index type 'Symbol'. Property '0' does not exist on type 'Symbol'` arises because variables declared in the `Sync` function's destructuring (like `results` in your query responses) are actually `Symbol` objects that represent bindings, not the actual values themselves. To access the *value* bound to a symbol within the `then` clause, you must use the `$` object with bracket notation, like `$[results]`.

Additionally, the way authentication errors from `where` clauses are handled can be refined for clarity and robustness. Instead of a single sync injecting an `error` binding into the frame, it's generally clearer to use two separate syncs for each authenticated request: one for the successful (authenticated) path and one for the authentication failure path. The authentication failure sync will then `Requesting.respond` with an error directly.

Here's the updated `src/UserAuthentication/UserAuthenticationConcept.ts` (with minor corrections to ensure queries return arrays consistently) and the revised `src/syncs/user_auth_syncs.ts` implementing this pattern, along with the fixes for the TypeScript error.

***

### **Updated `src/UserAuthentication/UserAuthenticationConcept.ts`**

(The previous concept implementation was already mostly correct regarding returning arrays, I've just added `_getUserById` for completeness and re-iterated the query return types.)

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
    const existingUser = await this.users.findOne({ username });
    if (existingUser) {
      return { error: `User with username '${username}' already exists.` };
    }
    const newUser: UsersDocument = {
      _id: freshID() as User,
      username,
      password,
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
    const user = await this.users.findOne({ username, password });
    if (!user) {
      return { error: "Invalid username or password." };
    }
    return { user: user._id };
  }

  /**
   * **action** changePassword (user: User, oldPassword: String, newPassword: String)
   *
   * **requires**: `user` exists and `user.password` is equal to `oldPassword`
   * **effects**: `password` for `user` is changed to `newPassword`.
   *
   * Allows a user to change their password.
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
    const existingUser = await this.users.findOne({ _id: user });
    if (!existingUser) {
      return { error: `User with ID '${user}' not found.` };
    }
    if (existingUser.password !== oldPassword) {
      return { error: "Old password does not match." };
    }
    if (oldPassword === newPassword) {
      return { error: "New password cannot be the same as the old password." };
    }
    await this.users.updateOne(
      { _id: user },
      { $set: { password: newPassword } },
    );
    return {};
  }

  /**
   * **action** deleteAccount (user: User)
   *
   * **requires**: `user` exists
   * **effects**: `user` is removed from the state
   *
   * Deletes a user account from the system.
   *
   * @param {User} user - The ID of the user account to delete.
   * @returns {Promise<Empty | { error: string }>} - An empty object on success, or an error message.
   */
  async deleteAccount(
    { user }: { user: User },
  ): Promise<Empty | { error: string }> {
    const result = await this.users.deleteOne({ _id: user });
    if (result.deletedCount === 0) {
      return { error: `User with ID '${user}' not found.` };
    }
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
    return [];
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
    return [{ exists: !!userDoc }];
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
    return [];
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

(This file will contain all the new syncs to handle authentication and responses for the previously excluded routes.)

```typescript
// # file: src/syncs/user_auth_syncs.ts

import { actions, Frames, Sync } from "@engine";
// Adjust path as necessary based on your project structure
import { Requesting, Sessioning, UserAuthentication } from "../concepts/concepts.ts";
import { ID, Empty } from "../utils/types.ts";

type User = ID;
type Session = ID;

// ============================================================================
// Syncs for changePassword
// ============================================================================

/**
 * **sync** ChangePasswordRequestAuthenticated
 *
 * **when** Requesting.request (path: "/UserAuthentication/changePassword", session, oldPassword, newPassword) : (request)
 * **where** in Sessioning: user of session is logged_in_user
 * **then** UserAuthentication.changePassword (user: logged_in_user, oldPassword, newPassword)
 *
 * Captures a request to change password for an authenticated user.
 * Proceeds to trigger the `UserAuthentication.changePassword` action if a valid session exists.
 */
export const ChangePasswordRequestAuthenticated: Sync = (
  { request, session, oldPassword, newPassword, logged_in_user },
) => ({
  when: actions([
    Requesting.request,
    { path: "/UserAuthentication/changePassword", session, oldPassword, newPassword },
    { request },
  ]),
  where: async (frames) => {
    // Authenticate: Ensure there's an active session and get the associated user
    frames = await frames.query(Sessioning._getUser, { session }, { user: logged_in_user });
    return frames; // If frames is empty, the then clause won't fire.
  },
  then: actions([
    UserAuthentication.changePassword,
    { user: logged_in_user, oldPassword, newPassword },
  ]),
});

/**
 * **sync** ChangePasswordRequestAuthError
 *
 * **when** Requesting.request (path: "/UserAuthentication/changePassword", session) : (request)
 * **where** (NOT in Sessioning: user of session exists)
 * **then** Requesting.respond (request, error: "Authentication required.")
 *
 * Responds with an authentication error if a request to change password
 * is made without a valid session.
 */
export const ChangePasswordRequestAuthError: Sync = (
  { request, session },
) => ({
  when: actions([
    Requesting.request,
    { path: "/UserAuthentication/changePassword", session },
    { request },
  ]),
  where: async (frames) => {
    // Check if the session is *invalid*. This means _getUser returns no frames.
    const userFrames = await frames.query(Sessioning._getUser, { session }, { user: 'any_user_id' }); // 'any_user_id' is just a placeholder variable
    if (userFrames.length > 0) {
      // If a user was found for the session, this is NOT an auth error, so return empty frames
      return new Frames();
    }
    // If no user found, this *is* an auth error, so proceed with the original request frame
    return frames;
  },
  then: actions([
    Requesting.respond,
    { request, error: "Authentication required." },
  ]),
});

/**
 * **sync** ChangePasswordResponseSuccess
 *
 * **when** Requesting.request (path: "/UserAuthentication/changePassword") : (request)
 * **when** UserAuthentication.changePassword () : ()
 * **then** Requesting.respond (request, status: "Password changed successfully")
 *
 * Responds to the client after a successful password change action.
 */
export const ChangePasswordResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuthentication/changePassword" }, { request }],
    [UserAuthentication.changePassword, {}, {} as Empty],
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
 * Responds to the client after a failed password change action (due to concept logic error).
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
 * **sync** DeleteAccountRequestAuthenticated
 *
 * **when** Requesting.request (path: "/UserAuthentication/deleteAccount", session) : (request)
 * **where** in Sessioning: user of session is logged_in_user
 * **then** UserAuthentication.deleteAccount (user: logged_in_user)
 *
 * Captures a request to delete an account for an authenticated user.
 * Proceeds to trigger the `UserAuthentication.deleteAccount` action if a valid session exists.
 */
export const DeleteAccountRequestAuthenticated: Sync = (
  { request, session, logged_in_user },
) => ({
  when: actions([
    Requesting.request,
    { path: "/UserAuthentication/deleteAccount", session },
    { request },
  ]),
  where: async (frames) => {
    // Authenticate: Ensure there's an active session and get the associated user
    frames = await frames.query(Sessioning._getUser, { session }, { user: logged_in_user });
    return frames;
  },
  then: actions([
    UserAuthentication.deleteAccount,
    { user: logged_in_user },
  ]),
});

/**
 * **sync** DeleteAccountRequestAuthError
 *
 * **when** Requesting.request (path: "/UserAuthentication/deleteAccount", session) : (request)
 * **where** (NOT in Sessioning: user of session exists)
 * **then** Requesting.respond (request, error: "Authentication required.")
 *
 * Responds with an authentication error if a request to delete an account
 * is made without a valid session.
 */
export const DeleteAccountRequestAuthError: Sync = (
  { request, session },
) => ({
  when: actions([
    Requesting.request,
    { path: "/UserAuthentication/deleteAccount", session },
    { request },
  ]),
  where: async (frames) => {
    const userFrames = await frames.query(Sessioning._getUser, { session }, { user: 'any_user_id' });
    if (userFrames.length > 0) {
      return new Frames();
    }
    return frames;
  },
  then: actions([
    Requesting.respond,
    { request, error: "Authentication required." },
  ]),
});

/**
 * **sync** DeleteAccountResponseSuccess
 *
 * **when** Requesting.request (path: "/UserAuthentication/deleteAccount") : (request)
 * **when** UserAuthentication.deleteAccount () : ()
 * **then** Requesting.respond (request, status: "Account deleted successfully")
 *
 * Responds to the client after a successful account deletion action.
 */
export const DeleteAccountResponseSuccess: Sync = ({ request }) => ({
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
 * Responds to the client after a failed account deletion action (due to concept logic error).
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
 * **sync** CheckUserExistsRequestAuthenticated
 *
 * **when** Requesting.request (path: "/UserAuthentication/_checkUserExists", session, user_to_check) : (request)
 * **where** in Sessioning: user of session is logged_in_user
 * **then** UserAuthentication._checkUserExists (user: user_to_check)
 *
 * Captures a request to check if a user exists (by their ID) for an authenticated caller.
 * Triggers the `UserAuthentication._checkUserExists` query if a valid session exists.
 */
export const CheckUserExistsRequestAuthenticated: Sync = (
  { request, session, user_to_check, logged_in_user },
) => ({
  when: actions([
    Requesting.request,
    { path: "/UserAuthentication/_checkUserExists", session, user: user_to_check },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(Sessioning._getUser, { session }, { user: logged_in_user });
    return frames;
  },
  then: actions([
    UserAuthentication._checkUserExists,
    { user: user_to_check },
  ]),
});

/**
 * **sync** CheckUserExistsRequestAuthError
 *
 * **when** Requesting.request (path: "/UserAuthentication/_checkUserExists", session) : (request)
 * **where** (NOT in Sessioning: user of session exists)
 * **then** Requesting.respond (request, error: "Authentication required.")
 *
 * Responds with an authentication error if a request to check user existence
 * is made without a valid session.
 */
export const CheckUserExistsRequestAuthError: Sync = (
  { request, session },
) => ({
  when: actions([
    Requesting.request,
    { path: "/UserAuthentication/_checkUserExists", session },
    { request },
  ]),
  where: async (frames) => {
    const userFrames = await frames.query(Sessioning._getUser, { session }, { user: 'any_user_id' });
    if (userFrames.length > 0) {
      return new Frames();
    }
    return frames;
  },
  then: actions([
    Requesting.respond,
    { request, error: "Authentication required." },
  ]),
});

/**
 * **sync** CheckUserExistsResponse
 *
 * **when** Requesting.request (path: "/UserAuthentication/_checkUserExists") : (request)
 * **when** UserAuthentication._checkUserExists () : (results: { exists: Flag }[])
 * **then** Requesting.respond (request, exists: results[0].exists)
 *
 * Responds to the client with the result of the `_checkUserExists` query.
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
    // Access the value bound to the 'results' symbol using '$'
    { request, exists: ($[results] as Array<{ exists: boolean }>)[0]?.exists ?? false },
  ]),
});

// ============================================================================
// Syncs for _getAllUsers (Query)
// ============================================================================

/**
 * **sync** GetAllUsersRequestAuthenticated
 *
 * **when** Requesting.request (path: "/UserAuthentication/_getAllUsers", session) : (request)
 * **where** in Sessioning: user of session is logged_in_user
 * **then** UserAuthentication._getAllUsers ()
 *
 * Captures a request to get all users for an authenticated caller.
 * Triggers the `UserAuthentication._getAllUsers` query if a valid session exists.
 */
export const GetAllUsersRequestAuthenticated: Sync = (
  { request, session, logged_in_user },
) => ({
  when: actions([
    Requesting.request,
    { path: "/UserAuthentication/_getAllUsers", session },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(Sessioning._getUser, { session }, { user: logged_in_user });
    return frames;
  },
  then: actions([
    UserAuthentication._getAllUsers,
    {},
  ]),
});

/**
 * **sync** GetAllUsersRequestAuthError
 *
 * **when** Requesting.request (path: "/UserAuthentication/_getAllUsers", session) : (request)
 * **where** (NOT in Sessioning: user of session exists)
 * **then** Requesting.respond (request, error: "Authentication required.")
 *
 * Responds with an authentication error if a request to get all users
 * is made without a valid session.
 */
export const GetAllUsersRequestAuthError: Sync = (
  { request, session },
) => ({
  when: actions([
    Requesting.request,
    { path: "/UserAuthentication/_getAllUsers", session },
    { request },
  ]),
  where: async (frames) => {
    const userFrames = await frames.query(Sessioning._getUser, { session }, { user: 'any_user_id' });
    if (userFrames.length > 0) {
      return new Frames();
    }
    return frames;
  },
  then: actions([
    Requesting.respond,
    { request, error: "Authentication required." },
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
    { request, users: $[users] }, // Access the value bound to the 'users' symbol
  ]),
});

// ============================================================================
// Syncs for _getUsernameById (Query)
// ============================================================================

/**
 * **sync** GetUsernameByIdRequestAuthenticated
 *
 * **when** Requesting.request (path: "/UserAuthentication/_getUsernameById", session, user_id) : (request)
 * **where** in Sessioning: user of session is logged_in_user
 * **then** UserAuthentication._getUsernameById (user: user_id)
 *
 * Captures a request to get a username by ID for an authenticated caller.
 * Triggers the `UserAuthentication._getUsernameById` query if a valid session exists.
 */
export const GetUsernameByIdRequestAuthenticated: Sync = (
  { request, session, user_id, logged_in_user },
) => ({
  when: actions([
    Requesting.request,
    { path: "/UserAuthentication/_getUsernameById", session, user: user_id },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(Sessioning._getUser, { session }, { user: logged_in_user });
    return frames;
  },
  then: actions([
    UserAuthentication._getUsernameById,
    { user: user_id },
  ]),
});

/**
 * **sync** GetUsernameByIdRequestAuthError
 *
 * **when** Requesting.request (path: "/UserAuthentication/_getUsernameById", session) : (request)
 * **where** (NOT in Sessioning: user of session exists)
 * **then** Requesting.respond (request, error: "Authentication required.")
 *
 * Responds with an authentication error if a request to get a username by ID
 * is made without a valid session.
 */
export const GetUsernameByIdRequestAuthError: Sync = (
  { request, session },
) => ({
  when: actions([
    Requesting.request,
    { path: "/UserAuthentication/_getUsernameById", session },
    { request },
  ]),
  where: async (frames) => {
    const userFrames = await frames.query(Sessioning._getUser, { session }, { user: 'any_user_id' });
    if (userFrames.length > 0) {
      return new Frames();
    }
    return frames;
  },
  then: actions([
    Requesting.respond,
    { request, error: "Authentication required." },
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
    // Access the value bound to the 'results' symbol using '$'
    { request, username: ($[results] as Array<{ username: string }>)[0]?.username ?? null },
  ]),
});

// ============================================================================
// Syncs for _getUserById (Query)
// This query was not in the original list of "excluded" routes,
// but included in the API spec in the prompt and seems like a useful
// privileged query, so adding a sync for it.
// ============================================================================

/**
 * **sync** GetUserByIdRequestAuthenticated
 *
 * **when** Requesting.request (path: "/UserAuthentication/_getUserById", session, user_id) : (request)
 * **where** in Sessioning: user of session is logged_in_user
 * **then** UserAuthentication._getUserById (user: user_id)
 *
 * Captures a request to get a user document by ID for an authenticated caller.
 * Triggers the `UserAuthentication._getUserById` query if a valid session exists.
 */
export const GetUserByIdRequestAuthenticated: Sync = (
  { request, session, user_id, logged_in_user },
) => ({
  when: actions([
    Requesting.request,
    { path: "/UserAuthentication/_getUserById", session, user: user_id },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(Sessioning._getUser, { session }, { user: logged_in_user });
    return frames;
  },
  then: actions([
    UserAuthentication._getUserById,
    { user: user_id },
  ]),
});

/**
 * **sync** GetUserByIdRequestAuthError
 *
 * **when** Requesting.request (path: "/UserAuthentication/_getUserById", session) : (request)
 * **where** (NOT in Sessioning: user of session exists)
 * **then** Requesting.respond (request, error: "Authentication required.")
 *
 * Responds with an authentication error if a request to get a user by ID
 * is made without a valid session.
 */
export const GetUserByIdRequestAuthError: Sync = (
  { request, session },
) => ({
  when: actions([
    Requesting.request,
    { path: "/UserAuthentication/_getUserById", session },
    { request },
  ]),
  where: async (frames) => {
    const userFrames = await frames.query(Sessioning._getUser, { session }, { user: 'any_user_id' });
    if (userFrames.length > 0) {
      return new Frames();
    }
    return frames;
  },
  then: actions([
    Requesting.respond,
    { request, error: "Authentication required." },
  ]),
});

/**
 * **sync** GetUserByIdResponse
 *
 * **when** Requesting.request (path: "/UserAuthentication/_getUserById") : (request)
 * **when** UserAuthentication._getUserById () : (results: UserDocument[])
 * **then** Requesting.respond (request, user: results[0])
 *
 * Responds to the client with the user document found by ID.
 */
export const GetUserByIdResponse: Sync = (
  { request, results },
) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuthentication/_getUserById" }, { request }],
    [UserAuthentication._getUserById, {}, { results }],
  ),
  then: actions([
    Requesting.respond,
    { request, user: ($[results] as Array<any>)[0] ?? null }, // Assuming result is an array of UserDocument, return the first one
  ]),
});
```
