
[@UserAuthentication](UserAuthentication.md)

[@newImplementation](newImplementation.md)

[@architecture](../../background/architecture.md)

[@implementing-synchronizations](../../background/implementing-synchronizations.md)

[@README](../../../src/concepts/Requesting/README.md)

[@implementation](../Requesting/implementation.md)

[@implementation](../Sessioning/implementation.md)


- "/api/UserAuthentication/register",
- "/api/UserAuthentication/authenticate",
- "/api/UserAuthentication/changePassword",
- "/api/UserAuthentication/deleteAccount",
- "/api/UserAuthentication/_checkUserExists",
- "/api/UserAuthentication/_getAllUsers",
- "/api/UserAuthentication/_getUsernameById",

# Example auth sync:
  
```typescript
import { actions, Sync } from "@engine";

import { Requesting, UserAuthentication, Sessioning } from "@concepts";

  

//-- User Registration --//

export const RegisterRequest: Sync = ({ request, username, password }) => ({

when: actions([Requesting.request, { path: "/UserAuthentication/register", username, password }, { request }]),

then: actions([UserAuthentication.register, { username, password }]),

});

  

export const RegisterResponseSuccess: Sync = ({ request, user }) => ({

when: actions(

[Requesting.request, { path: "/UserAuthentication/register" }, { request }],

[UserAuthentication.register, {}, { user }],

),

then: actions([Requesting.respond, { request, user }]),

});

  

export const RegisterResponseError: Sync = ({ request, error }) => ({

when: actions(

[Requesting.request, { path: "/UserAuthentication/register" }, { request }],

[UserAuthentication.register, {}, { error }],

),

then: actions([Requesting.respond, { request, error }]),

});

  

//-- User Login & Session Creation --//

export const LoginRequest: Sync = ({ request, username, password }) => ({

when: actions([Requesting.request, { path: "/login", username, password }, { request }]),

then: actions([UserAuthentication.login, { username, password }]),

});

  

export const LoginSuccessCreatesSession: Sync = ({ user }) => ({

when: actions([UserAuthentication.login, {}, { user }]),

then: actions([Sessioning.create, { user }]),

});

  

export const LoginResponseSuccess: Sync = ({ request, user, session }) => ({

when: actions(

[Requesting.request, { path: "/login" }, { request }],

[UserAuthentication.login, {}, { user }],

[Sessioning.create, { user }, { session }],

),

then: actions([Requesting.respond, { request, session }]),

});

  

export const LoginResponseError: Sync = ({ request, error }) => ({

when: actions(

[Requesting.request, { path: "/login" }, { request }],

[UserAuthentication.login, {}, { error }]

),

then: actions([Requesting.respond, { request, error }]),

});

  

//-- User Logout --//

export const LogoutRequest: Sync = ({ request, session, user }) => ({

when: actions([Requesting.request, { path: "/logout", session }, { request }]),

where: (frames) => frames.query(Sessioning._getUser, { session }, { user }),

then: actions([Sessioning.delete, { session }]),

});

  

export const LogoutResponse: Sync = ({ request }) => ({

when: actions(

[Requesting.request, { path: "/logout" }, { request }],

[Sessioning.delete, {}, {}],

),

then: actions([Requesting.respond, { request, status: "logged_out" }]),

});
```
  
  
# Alternate UserAuthentication implementation (used by the example sync):
```typescript
import { Collection, Db } from "npm:mongodb";

import { ID } from "@utils/types.ts";

import { freshID } from "@utils/database.ts";

  

// A simple helper function to hash passwords using the Web Crypto API.

// In a production system, a more robust, salted hashing algorithm like Argon2 or bcrypt would be preferred.

async function hashPassword(password: string): Promise<string> {

const data = new TextEncoder().encode(password);

const hashBuffer = await crypto.subtle.digest("SHA-256", data);

const hashArray = Array.from(new Uint8Array(hashBuffer));

return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

}

  

function isMongoError(error: unknown): error is { code: number } {

return typeof error === "object" && error !== null && "code" in error;

}

  

// Collection prefix for this concept

const PREFIX = "UserAuthentication" + ".";

  

// Generic types of this concept

type User = ID;

  

/**

* Represents the state of a single user in the database.

* a set of `User`s with

* a `username` String (unique)

* a `passwordHash` String

*/

interface UserDoc {

_id: User;

username: string;

passwordHash: string;

}

  

/**

* @concept UserAuthentication

* @purpose To securely verify a user's identity based on credentials.

*/

export default class UserAuthenticationConcept {

users: Collection<UserDoc>;

  

constructor(private readonly db: Db) {

this.users = this.db.collection(PREFIX + "users");

// Ensure username is unique at the database level

this.users.createIndex({ username: 1 }, { unique: true });

}

  

/**

* register (username: String, password: String): (user: User) | (error: String)

*

* **requires**: no User exists with the given `username`.

* **effects**: creates a new User `u`; sets their `username` and a hash of their `password`; returns `u` as `user`.

*

* **requires**: a User already exists with the given `username`.

* **effects**: returns an error message.

*/

async register(

{ username, password }: { username: string; password: string },

): Promise<{ user: User } | { error: string }> {

// Check if a user with this username already exists.

// We also rely on the unique index in MongoDB, but this provides a cleaner error message.

try {

const existingUser = await this.users.findOne({ username });

if (existingUser) {

return { error: "Username already exists" };

}

  

const passwordHash = await hashPassword(password);

const newUser: UserDoc = {

_id: freshID(),

username,

passwordHash,

};

  

await this.users.insertOne(newUser);

return { user: newUser._id };

} catch (e) {

// Catch potential duplicate key error from the database index

if (isMongoError(e) && e.code === 11000) {

return { error: "Username already exists" };

}

// For other unexpected errors, re-throw or handle appropriately

throw e;

}

}

  

/**

* login (username: String, password: String): (user: User) | (error: String)

*

* **requires**: a User exists with the given `username` and the `password` matches their `passwordHash`.

* **effects**: returns the matching User `u` as `user`.

*

* **requires**: no User exists with the given `username` or the `password` does not match.

* **effects**: returns an error message.

*/

async login(

{ username, password }: { username: string; password: string },

): Promise<{ user: User } | { error: string }> {

const user = await this.users.findOne({ username });

  

// To prevent timing attacks and username enumeration, use a generic error message.

if (!user) {

return { error: "Invalid username or password" };

}

  

const providedPasswordHash = await hashPassword(password);

if (user.passwordHash !== providedPasswordHash) {

return { error: "Invalid username or password" };

}

  

return { user: user._id };

}

  

/**

* _getUserByUsername (username: String): (user: User)

*

* **requires**: a User with the given `username` exists.

* **effects**: returns the corresponding User.

*/

async _getUserByUsername(

{ username }: { username: string },

): Promise<{ user: User }[]> {

const user = await this.users.findOne({ username });

if (user) {

return [{ user: user._id }];

}

// As per specification, queries must return an array.

return [];

}

  

/**

* _getUsername (user: User): (username: String)

*

* **requires**: a User with the given `user` ID exists.

* **effects**: returns the username of the corresponding User.

*/

async _getUsername({ user: userId }: { user: User }): Promise<{ username: string }[]> {

const user = await this.users.findOne({ _id: userId });

if (user) {

return [{ username: user.username }];

}

return [];

}

}
```
# prompt: Given this example sync file, which creates sessions when a user logs in, for the list of above excluded actions in UserAuthentication, generate syncs for each action. register and authenticate should create a session for the user, and the other actions should check if a user logs in (by getting the session). Do not edit the Requesting nor the Sessioning implementations, but feel free to edit the UserAuthentication implementation so that the syncs work better. 

```typescript
// # file: src/syncs/UserAuthentication.sync.ts

  

import { actions, Frames, Sync } from "@engine";

import { Requesting, Sessioning, UserAuthentication } from "@concepts";

  

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

  

// On successful registration, create a session

export const RegisterCreateSession: Sync = ({ user }) => ({

when: actions(

[UserAuthentication.register, {}, { user }], // UserAuthentication.register returns { user } on success

),

then: actions(

[Sessioning.create, { user }], // Create a session for the newly registered user

),

});

  

// On successful registration and session creation, respond

export const RegisterResponseSuccess: Sync = ({ request, user, session }) => ({

when: actions(

[Requesting.request, { path: "/UserAuthentication/register" }, { request }],

[UserAuthentication.register, {}, { user }], // UserAuthentication.register returns { user } on success

[Sessioning.create, { user }, { session }], // Match on the session created by RegisterCreateSession

),

then: actions(

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

export const AuthenticateSuccessCreatesSession: Sync = ({ user }) => ({

when: actions([

UserAuthentication.authenticate,

{},

{ user }, // UserAuthentication.authenticate returns { user } on success

]),

then: actions([Sessioning.create, { user }]),

});

  

// On successful authentication and session creation, respond with user and session

export const AuthenticateResponseSuccess: Sync = (

{ request, user, session },

) => ({

when: actions(

[Requesting.request, { path: "/UserAuthentication/authenticate" }, {

request,

}],

[UserAuthentication.authenticate, {}, { user }], // Match on successful auth

[Sessioning.create, { user }, { session }], // Match on the session created by AuthenticateSuccessCreatesSession

),

then: actions([Requesting.respond, { request, user, session }]),

});

  

// On authentication error, respond with the error

export const AuthenticateResponseError: Sync = ({ request, error }) => ({

when: actions(

[Requesting.request, { path: "/UserAuthentication/authenticate" }, {

request,

}],

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

// Extract the session ID from the frame bindings

const sessionId = frames.at(0)![session];

frames = await frames.query(Sessioning._getUser, { session: sessionId }, {

user: activeUser,

});

  

// Check if frames is empty after the query to detect invalid session

if (frames.length === 0) {

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

// Extract the session ID from the frame bindings

const sessionId = frames.at(0)![session];

frames = await frames.query(Sessioning._getUser, { session: sessionId }, {

user: activeUser,

});

  

// Check if frames is empty after the query to detect invalid session

if (frames.length === 0) {

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

const queryRequiresSession = async (

frames: Frames,

session: symbol,

activeUser: symbol,

): Promise<Frames> => {

// Pass the session ID from the current frame to the query

frames = await frames.query(Sessioning._getUser, {

session: frames.at(0)![session],

}, { user: activeUser });

// If Sessioning._getUser returns an empty array, 'frames' will correctly become empty.

return frames;

};

  

// Handle incoming request to check if a user exists, requires an active session

export const CheckUserExistsRequest: Sync = (

{ request, session, userToCheck, activeUser, exists },

) => ({

when: actions([

Requesting.request,

{

path: "/UserAuthentication/_checkUserExists",

session,

user: userToCheck,

}, // 'user' in request is the ID to check

{ request },

]),

where: async (frames) => {

// Ensure an active session before allowing this query

frames = await queryRequiresSession(frames, session, activeUser);

if (frames.length === 0) {

return new Frames(); // No active session

}

  

// Call the query and bind the result to 'exists'

const userToCheckValue = frames.at(0)![userToCheck];

frames = await frames.query(UserAuthentication._checkUserExists, { user: userToCheckValue }, { exists });

return frames;

},

then: actions([Requesting.respond, {

request,

exists,

}]),

});

  

// Handle incoming request to get all users, requires an active session

export const GetAllUsersRequest: Sync = (

{ request, session, activeUser, results },

) => ({

when: actions([

Requesting.request,

{ path: "/UserAuthentication/_getAllUsers", session },

{ request },

]),

where: async (frames) => {

// Ensure an active session before allowing this query

frames = await queryRequiresSession(frames, session, activeUser);

if (frames.length === 0) {

return new Frames(); // No active session

}

  

// Call the query and bind the result to 'results'

// _getAllUsers returns an array of UsersDocument, so we need to handle it differently

const queryResults = await UserAuthentication._getAllUsers();

// Since this is a direct query result (not through frames.query), we manually add it to the frame

frames.at(0)![results] = queryResults;

return frames;

},

then: actions([Requesting.respond, { request, results }]),

});

  

// Handle incoming request to get a username by ID, requires an active session

export const GetUsernameByIdRequest: Sync = (

{ request, session, userToLookup, activeUser, username },

) => ({

when: actions([

Requesting.request,

{

path: "/UserAuthentication/_getUsernameById",

session,

user: userToLookup,

}, // 'user' in request is the ID to lookup

{ request },

]),

where: async (frames) => {

// Ensure an active session before allowing this query

frames = await queryRequiresSession(frames, session, activeUser);

if (frames.length === 0) {

return new Frames(); // No active session

}

  

// Call the query and bind the result to 'username'

const userToLookupValue = frames.at(0)![userToLookup];

frames = await frames.query(UserAuthentication._getUsernameById, { user: userToLookupValue }, { username });

return frames;

},

then: actions([Requesting.respond, { request, username }]),

});
```