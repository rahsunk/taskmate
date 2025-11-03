---
timestamp: 'Mon Nov 03 2025 15:04:24 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251103_150424.0a015642.md]]'
content_id: bb703fabc17ac8834644b1cefbcfb62d5087f393ba1c145525ef44c50ee13497
---

# prompt: Given the current implementation of the UserAuthentication concept, update it so that it includes the additional GET endpoints in the API spec.

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
    this.users.createIndex({ username: 1 }, { unique: true }).catch(
      console.error,
    );
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
    return [{ exists: !!userDoc }];
  }

  /**
   * _getAllUsers (): (user: { _id: User, username: String, password: String }[])
   *
   * Effects: Returns a list of all user documents.
   *
   * @returns {Promise<UsersDocument[]>} - An array of all UsersDocument objects.
   */
  async _getAllUsers(): Promise<UsersDocument[]> {
    const allUsers = await this.users.find({}).project({
      _id: 1,
      username: 1,
      password: 1,
    }).toArray();
    return allUsers as UsersDocument[];
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
