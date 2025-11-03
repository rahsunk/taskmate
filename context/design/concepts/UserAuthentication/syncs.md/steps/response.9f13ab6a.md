---
timestamp: 'Mon Nov 03 2025 00:54:59 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251103_005459.1d8392d4.md]]'
content_id: 9f13ab6a48d30878eb2334eacab9a853b9e12ea6aa1a05508a2bccd53758612a
---

# response:

Okay, let's update the `UserAuthenticationConcept` to ensure query methods return arrays as per the guidelines, and then generate the corresponding synchronization rules (`.sync.ts` file) for the excluded actions, including session-based authentication/authorization where appropriate.

## Updated `UserAuthenticationConcept.ts`

The queries in the `UserAuthenticationConcept` need to be modified to consistently return an array of results, even if there's only one result or no results. Additionally, `_getAllUsers` and `_getUsernameById` will be added.

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

export default class UserAuthenticationConcept {
  private users: Collection<UsersDocument>;

  constructor(private readonly db: Db) {
    this.users = this.db.collection(PREFIX + "users");
    // Ensure username is unique at the database level for robust checks
    // This could also be added to the alternate UserAuthentication implementation as well.
    this.users.createIndex({ username: 1 }, { unique: true }).catch(console.error);
  }

  /**
   * **action** register (username: String, password: String): (user: User) | (error: String)
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
   * **action** authenticate (username: String, password: String): (user: User) | (error: String)
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
   * **action** changePassword (user: User, oldPassword: String, newPassword: String): Empty | (error: String)
   *
   * **requires**: `user` exists and `user.password` is equal to `oldPassword`
   * **effects**: `password` for `user` is changed to `newPassword`.
   *
   * Allows an authenticated user to change their password.
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
   * **action** deleteAccount (user: User): Empty | (error: String)
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
   * _getUserByUsername (username: String): (user: User)[]
   *
   * Effects: returns the user ID associated with a username if found.
   *
   * @param {string} username - The username to look up.
   * @returns {Promise<{ user: User }[]>} - An array containing the user ID if found, otherwise an empty array.
   */
  async _getUserByUsername(
    { username }: { username: string },
  ): Promise<{ user: User }[]> {
    const userDoc = await this.users.findOne({ username });
    if (userDoc) {
      return [{ user: userDoc._id }];
    }
    return [];
  }

  /**
   * _checkUserExists (user: User): (exists: Flag)[]
   *
   * Effects: returns true if the user with the given ID exists, false otherwise.
   *
   * @param {User} user - The user ID to check for existence.
   * @returns {Promise<{ exists: boolean }[]>} - An array containing a boolean indicating if the user exists.
   */
  async _checkUserExists(
    { user }: { user: User },
  ): Promise<{ exists: boolean }[]> {
    const userDoc = await this.users.findOne({ _id: user });
    return [{ exists: !!userDoc }]; // Wrap in array
  }

  /**
   * _getAllUsers (): (user: { _id: User, username: String, password: String }[])
   *
   * Effects: Returns a list of all user documents.
   *
   * @returns {Promise<UsersDocument[]>} - An array of all UsersDocument objects.
   */
  async _getAllUsers(): Promise<UsersDocument[]> {
    // Project only necessary fields if password shouldn't be exposed by default,
    // but UsersDocument implicitly includes password per concept state.
    const allUsers = await this.users.find({}).project({ _id: 1, username: 1, password: 1 }).toArray();
    return allUsers;
  }

  /**
   * _getUsernameById (user: User): (username: String)[]
   *
   * Effects: Returns the username for a specific user ID, if found.
   *
   * @param {User} user - The ID of the user to retrieve the username for.
   * @returns {Promise<{ username: string }[]>} - An array containing an object with the username if found, otherwise an empty array.
   */
  async _getUsernameById(
    { user }: { user: User },
  ): Promise<{ username: string }[]> {
    const userDoc = await this.users.findOne({ _id: user });
    if (userDoc) {
      return [{ username: userDoc.username }];
    }
    return [];
  }
}
```

## `UserAuthentication.sync.ts` - New Synchronization Rules

Here are the syncs for the excluded `UserAuthentication` actions, following the requirements for session creation and authorization.

```typescript
// # file: src/syncs/UserAuthentication.sync.ts

import { actions, Sync, Frames } from "@engine";
import { Requesting, UserAuthentication, Sessioning } from "@concepts";

// --- User Registration --- //

// Handle incoming request to register
export const RegisterRequest: Sync = ({ request, username, password }) => ({
  when: actions([
    Requesting.request,
    { path: "/UserAuthentication/register", username, password },
    { request },
  ]),
  then: actions([UserAuthentication.register, { username, password }]),
});

// On successful registration, create a session and respond
export const RegisterResponseSuccess: Sync = ({ request, user, session }) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuthentication/register" }, { request }],
    [UserAuthentication.register, {}, { user }], // UserAuthentication.register returns { user } on success
  ),
  then: actions(
    [Sessioning.create, { user }, { session }], // Create a session for the newly registered user
    [Requesting.respond, { request, user, session }], // Respond with user ID and session ID
  ),
});

// On registration error, respond with the error
export const RegisterResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuthentication/register" }, { request }],
    [UserAuthentication.register, {}, { error }], // UserAuthentication.register returns { error } on failure
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- User Authentication & Session Creation --- //

// Handle incoming request to authenticate (login)
export const AuthenticateRequest: Sync = ({ request, username, password }) => ({
  when: actions([
    Requesting.request,
    { path: "/UserAuthentication/authenticate", username, password },
    { request },
  ]),
  then: actions([UserAuthentication.authenticate, { username, password }]),
});

// On successful authentication, create a session
export const AuthenticateSuccessCreatesSession: Sync = ({ user, session }) => ({
  when: actions([
    UserAuthentication.authenticate,
    {},
    { user }, // UserAuthentication.authenticate returns { user } on success
  ]),
  then: actions([Sessioning.create, { user }, { session }]),
});

// On successful authentication and session creation, respond with user and session
export const AuthenticateResponseSuccess: Sync = (
  { request, user, session },
) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuthentication/authenticate" }, { request }],
    [UserAuthentication.authenticate, {}, { user }], // Match on successful auth
    [Sessioning.create, { user }, { session }], // Match on the session created by AuthenticateSuccessCreatesSession
  ),
  then: actions([Requesting.respond, { request, user, session }]),
});

// On authentication error, respond with the error
export const AuthenticateResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuthentication/authenticate" }, { request }],
    [UserAuthentication.authenticate, {}, { error }], // UserAuthentication.authenticate returns { error } on failure
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- Change Password --- //

// Handle incoming request to change password, requires an active session
export const ChangePasswordRequest: Sync = (
  { request, session, userToChange, oldPassword, newPassword, activeUser },
) => ({
  when: actions([
    Requesting.request,
    {
      path: "/UserAuthentication/changePassword",
      session,
      user: userToChange, // The ID of the user whose password is to be changed, from the request body
      oldPassword,
      newPassword,
    },
    { request },
  ]),
  where: async (frames) => {
    // 1. Ensure the session is valid and get the currently authenticated user (activeUser)
    frames = await frames.query(Sessioning._getUser, { session }, { user: activeUser });
    // If Sessioning._getUser returns an error, the frame will become [{ error: string }],
    // which will not match the filter below if there is no user, or it can be explicitly filtered.
    // For simplicity, we assume Sessioning._getUser returns either [{user: User}] or [].
    if (frames.length === 0 || frames[0].error) {
        return new Frames(); // No active session, no frames
    }

    // 2. Authorize: the active user must be the same as the user whose password is being changed
    return frames.filter(($) => $[activeUser] === $[userToChange]);
  },
  then: actions([
    UserAuthentication.changePassword,
    { user: userToChange, oldPassword, newPassword },
  ]),
});

// On successful password change, respond with a success status
export const ChangePasswordResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/UserAuthentication/changePassword" },
      { request },
    ],
    [UserAuthentication.changePassword, {}, {}], // UserAuthentication.changePassword returns Empty on success
  ),
  then: actions([Requesting.respond, { request, status: "password_changed" }]),
});

// On password change error, respond with the error
export const ChangePasswordResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/UserAuthentication/changePassword" },
      { request },
    ],
    [UserAuthentication.changePassword, {}, { error }], // UserAuthentication.changePassword returns { error } on failure
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- Delete Account --- //

// Handle incoming request to delete an account, requires an active session
export const DeleteAccountRequest: Sync = (
  { request, session, userToDelete, activeUser },
) => ({
  when: actions([
    Requesting.request,
    { path: "/UserAuthentication/deleteAccount", session, user: userToDelete }, // The ID of the user to delete, from the request body
    { request },
  ]),
  where: async (frames) => {
    // 1. Ensure the session is valid and get the currently authenticated user (activeUser)
    frames = await frames.query(Sessioning._getUser, { session }, { user: activeUser });
    if (frames.length === 0 || frames[0].error) {
        return new Frames(); // No active session, no frames
    }
    // 2. Authorize: the active user must be the same as the user whose account is being deleted
    return frames.filter(($) => $[activeUser] === $[userToDelete]);
  },
  then: actions([UserAuthentication.deleteAccount, { user: userToDelete }]),
});

// On successful account deletion, respond with a success status
export const DeleteAccountResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/UserAuthentication/deleteAccount" },
      { request },
    ],
    [UserAuthentication.deleteAccount, {}, {}], // UserAuthentication.deleteAccount returns Empty on success
  ),
  then: actions([Requesting.respond, { request, status: "account_deleted" }]),
});

// On account deletion error, respond with the error
export const DeleteAccountResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/UserAuthentication/deleteAccount" },
      { request },
    ],
    [UserAuthentication.deleteAccount, {}, { error }], // UserAuthentication.deleteAccount returns { error } on failure
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- Queries requiring session --- //

// Helper for session check for queries, to avoid repeating boilerplate
const queryRequiresSession = async (frames: Frames, session: symbol, activeUser: symbol): Promise<Frames> => {
    frames = await frames.query(Sessioning._getUser, { [session]: frames.at(0)![session] }, { user: activeUser });
    // If the session is invalid or user not found, Sessioning._getUser will return an empty array,
    // causing 'frames' to become empty and the 'then' clause not to fire.
    return frames;
};

// Handle incoming request to check if a user exists, requires an active session
export const CheckUserExistsRequest: Sync = (
  { request, session, userToCheck, activeUser, exists },
) => ({
  when: actions([
    Requesting.request,
    { path: "/UserAuthentication/_checkUserExists", session, user: userToCheck }, // 'user' in request is the ID to check
    { request },
  ]),
  where: async (frames) => {
    // Ensure an active session before allowing this query
    return await queryRequiresSession(frames, session, activeUser);
  },
  then: actions([UserAuthentication._checkUserExists, { user: userToCheck }]),
});

// Respond with the existence status
export const CheckUserExistsResponse: Sync = (
  { request, exists },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/UserAuthentication/_checkUserExists" },
      { request },
    ],
    // UserAuthentication._checkUserExists returns [{exists: boolean}] on success
    [UserAuthentication._checkUserExists, {}, { exists }],
  ),
  then: actions([Requesting.respond, { request, exists }]),
});

// Handle incoming request to get all users, requires an active session
export const GetAllUsersRequest: Sync = (
  { request, session, activeUser },
) => ({
  when: actions([
    Requesting.request,
    { path: "/UserAuthentication/_getAllUsers", session },
    { request },
  ]),
  where: async (frames) => {
    // Ensure an active session before allowing this query
    return await queryRequiresSession(frames, session, activeUser);
  },
  then: actions([UserAuthentication._getAllUsers, {}]), // No arguments for _getAllUsers
});

// Respond with the list of all users
export const GetAllUsersResponse: Sync = (
  { request, results },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/UserAuthentication/_getAllUsers" },
      { request },
    ],
    // UserAuthentication._getAllUsers returns UsersDocument[] (bound to `results`)
    [UserAuthentication._getAllUsers, {}, { results }],
  ),
  then: actions([Requesting.respond, { request, results }]),
});

// Handle incoming request to get a username by ID, requires an active session
export const GetUsernameByIdRequest: Sync = (
  { request, session, userToLookup, activeUser },
) => ({
  when: actions([
    Requesting.request,
    { path: "/UserAuthentication/_getUsernameById", session, user: userToLookup }, // 'user' in request is the ID to lookup
    { request },
  ]),
  where: async (frames) => {
    // Ensure an active session before allowing this query
    return await queryRequiresSession(frames, session, activeUser);
  },
  then: actions([UserAuthentication._getUsernameById, { user: userToLookup }]),
});

// Respond with the username for the given ID
export const GetUsernameByIdResponse: Sync = (
  { request, username },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/UserAuthentication/_getUsernameById" },
      { request },
    ],
    // UserAuthentication._getUsernameById returns [{username: string}]
    [UserAuthentication._getUsernameById, {}, { username }],
  ),
  then: actions([Requesting.respond, { request, username }]),
});
```
