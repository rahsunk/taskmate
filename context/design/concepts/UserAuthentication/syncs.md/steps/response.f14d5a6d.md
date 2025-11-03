---
timestamp: 'Mon Nov 03 2025 00:12:11 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251103_001211.7859fdc0.md]]'
content_id: f14d5a6d5e6e589ec5ef9ed69ec8ec5112519aadc87b955b169269e06806fbaf
---

# response:

Here are the synchronization rules for the excluded `UserAuthentication` actions, ensuring that a user is logged in via the `Sessioning` concept before the actions can proceed.

**Assumptions:**

1. The `session` ID for authentication is passed in the request body alongside other action parameters (e.g., `POST /api/UserAuthentication/changePassword { "user": "userId123", "oldPassword": "old", "newPassword": "new", "session": "sessionId456" }`).
2. For `changePassword` and `deleteAccount`, the `user` ID provided in the request body must match the `user` associated with the provided `session`. This ensures a user can only modify/delete their own account.
3. For query actions (`_checkUserExists`, `_getAllUsers`, `_getUsernameById`), any logged-in user can perform these queries (i.e., `user` from session doesn't necessarily need to match the `user` being queried, unless specified otherwise).

**File:** `src/syncs/user_authentication.sync.ts`

```typescript
import { actions, Frames, Sync } from "@engine";
import { Requesting, Sessioning, UserAuthentication } from "@concepts";
import { ID } from "../utils/types.ts";

// Type alias for clarity in syncs
type User = ID;
type Session = ID;

// --- Helper for handling query responses returning arrays or empty ---
// This ensures that even if a query returns an empty array, a default response
// is provided to `Requesting.respond` to avoid the sync from failing silently
// due to no frames reaching the 'then' clause.
// It also collects multiple results into a single object with a key.
const handleQueryResponse = async (
  frames: Frames,
  queryResultKey: symbol,
  originalRequestBindings: Record<symbol, unknown>,
  collectAsKey?: string, // Optional: key to collect multiple results under
) => {
  if (frames.length === 0) {
    // If no results from the query, return a single frame with an empty result for the queryResultKey
    return new Frames({
      ...originalRequestBindings,
      [queryResultKey]: collectAsKey ? { [collectAsKey]: [] } : {},
    });
  }

  if (collectAsKey) {
    // If collecting multiple results, use collectAs
    return frames.collectAs([queryResultKey], Symbol(collectAsKey)).map(($) => ({
      ...$._raw, // Keep other original bindings
      [queryResultKey]: { [collectAsKey]: $[Symbol(collectAsKey)] },
    }));
  }

  // Otherwise, if single result or no collection, just pass through or structure it
  return frames.map(($) => ({
    ...$._raw, // Keep other original bindings
    [queryResultKey]: $[queryResultKey],
  }));
};

// --- Synchronizations for UserAuthentication.changePassword ---

// Sync: Handle request to change password
export const ChangePasswordRequest: Sync = (
  { request, session, user, oldPassword, newPassword, activeUser },
) => ({
  when: actions([
    Requesting.request,
    {
      path: "/UserAuthentication/changePassword",
      session,
      user,
      oldPassword,
      newPassword,
    },
    { request },
  ]),
  where: async (frames) => {
    // 1. Get the active user from the session
    frames = await frames.query(Sessioning._getUser, { session }, { activeUser });
    // 2. Ensure the active user matches the user attempting to change password
    return frames.filter(($) => $[user] === $[activeUser]);
  },
  then: actions([
    UserAuthentication.changePassword,
    { user, oldPassword, newPassword },
  ]),
});

// Sync: Respond to successful password change
export const ChangePasswordResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuthentication/changePassword" }, {
      request,
    }],
    [UserAuthentication.changePassword, {}, {}], // Success, empty result
  ),
  then: actions([Requesting.respond, { request, success: true }]), // Explicit success message
});

// Sync: Respond to failed password change
export const ChangePasswordResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuthentication/changePassword" }, {
      request,
    }],
    [UserAuthentication.changePassword, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- Synchronizations for UserAuthentication.deleteAccount ---

// Sync: Handle request to delete account
export const DeleteAccountRequest: Sync = (
  { request, session, user, activeUser },
) => ({
  when: actions([
    Requesting.request,
    { path: "/UserAuthentication/deleteAccount", session, user },
    { request },
  ]),
  where: async (frames) => {
    // 1. Get the active user from the session
    frames = await frames.query(Sessioning._getUser, { session }, { activeUser });
    // 2. Ensure the active user matches the user attempting to delete their account
    return frames.filter(($) => $[user] === $[activeUser]);
  },
  then: actions([
    UserAuthentication.deleteAccount,
    { user },
  ]),
});

// Sync: Respond to successful account deletion
export const DeleteAccountResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuthentication/deleteAccount" }, {
      request,
    }],
    [UserAuthentication.deleteAccount, {}, {}], // Success, empty result
  ),
  then: actions([Requesting.respond, { request, success: true }]),
});

// Sync: Respond to failed account deletion
export const DeleteAccountResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuthentication/deleteAccount" }, {
      request,
    }],
    [UserAuthentication.deleteAccount, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- Synchronizations for UserAuthentication._checkUserExists ---

// Sync: Handle request to check user existence
export const CheckUserExistsRequest: Sync = (
  { request, session, user, activeUser, exists },
) => ({
  when: actions([
    Requesting.request,
    { path: "/UserAuthentication/_checkUserExists", session, user },
    { request },
  ]),
  where: async (frames) => {
    // 1. Get the active user from the session (ensures someone is logged in to perform the query)
    frames = await frames.query(Sessioning._getUser, { session }, { activeUser });
    // 2. Perform the _checkUserExists query
    frames = await frames.query(UserAuthentication._checkUserExists, { user }, { exists });

    // Handle cases where the query might not yield a frame or we want to structure the response
    return handleQueryResponse(frames, Symbol("exists"), frames[0], "exists");
  },
  then: actions([Requesting.respond, { request, exists }]),
});

// Note: _checkUserExists is a query and returns a result directly,
// so separate success/error response syncs are typically not needed
// unless the query itself throws an exception which is caught and
// translated into an error response by the `Requesting` concept.

// --- Synchronizations for UserAuthentication._getAllUsers ---

// Sync: Handle request to get all users
export const GetAllUsersRequest: Sync = (
  { request, session, activeUser, userList },
) => ({
  when: actions([
    Requesting.request,
    { path: "/UserAuthentication/_getAllUsers", session },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0]; // Capture original frame for response
    // 1. Get the active user from the session (ensures someone is logged in to perform the query)
    frames = await frames.query(Sessioning._getUser, { session }, { activeUser });

    // Handle case where session is invalid/no active user
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, error: "Authentication required to list all users." });
    }

    // 2. Perform the _getAllUsers query
    // The query returns an array of UsersDocument, so `userList` will bind to this array
    const usersData = await UserAuthentication._getAllUsers();

    // The _getAllUsers returns the full UsersDocument, including password (which is not ideal for an API response)
    // We should filter this out or define a more specific query in UserAuthenticationConcept.
    // For this exercise, we'll return the full document as per `_getAllUsers` spec,
    // but in a real app, you'd project only safe fields.
    const usersSafe = usersData.map(({ _id, username }) => ({ _id, username }));

    // Create a new frame that merges the request ID with the list of users.
    return new Frames({
      ...originalFrame,
      [userList]: { users: usersSafe }, // Structure as { users: [...] }
    });
  },
  then: actions([Requesting.respond, { request, userList }]),
});

// --- Synchronizations for UserAuthentication._getUsernameById ---

// Sync: Handle request to get username by ID
export const GetUsernameByIdRequest: Sync = (
  { request, session, user, activeUser, username },
) => ({
  when: actions([
    Requesting.request,
    { path: "/UserAuthentication/_getUsernameById", session, user },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0]; // Capture original frame for response
    // 1. Get the active user from the session (ensures someone is logged in to perform the query)
    frames = await frames.query(Sessioning._getUser, { session }, { activeUser });

    // Handle case where session is invalid/no active user
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, error: "Authentication required to get username by ID." });
    }

    // 2. Perform the _getUsernameById query
    frames = await frames.query(UserAuthentication._getUsernameById, { user }, { username });

    // Handle cases where the query might not yield a frame or we want to structure the response
    // If username is not found, _getUsernameById returns Empty {}, so `username` might be `undefined` in the frame.
    // We want to return `{ username: "..." }` or `{}`.
    const responseData = frames[0] ? { username: frames[0][username] } : {};
    return new Frames({ ...originalFrame, response: responseData });
  },
  then: actions([Requesting.respond, { request, response }]),
});
```
