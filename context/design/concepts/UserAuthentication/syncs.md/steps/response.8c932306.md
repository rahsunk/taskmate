---
timestamp: 'Sun Nov 02 2025 23:53:17 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251102_235317.2e3f8d4f.md]]'
content_id: 8c932306464e610f36202fb2dac167713cbdd3ff656d47ff6f93a6d7fea43751
---

# response:

Here are the synchronization rules for the excluded `UserAuthentication` actions, following the provided guidelines. These syncs assume the existence of a `Sessioning` concept (as implied by the `Requesting` and `DeletePost` examples) which provides a `_getUser` query to determine the `loggedInUser` from a `session` ID.

Create a new file, for example, `src/syncs/userAuthentication.sync.ts`, and place the following content in it:

```typescript
// src/syncs/userAuthentication.sync.ts

import { actions, Sync, Frames } from "@engine";
import { Requesting } from "../concepts/Requesting/RequestingConcept.ts";
import SessioningConcept from "../concepts/Sessioning/SessioningConcept.ts"; // Assuming Sessioning concept exists
import UserAuthenticationConcept from "../concepts/UserAuthentication/UserAuthenticationConcept.ts";
import { ID } from "../utils/types.ts";

// Re-declare concept types for clarity in syncs
type User = ID;
type Request = ID;
type Session = ID; // Assuming Sessioning uses 'Session' as its primary ID type

// Alias concepts for cleaner access
const UserAuth = UserAuthenticationConcept;
const Sessioning = SessioningConcept;

/**
 * --- Helper for handling query responses when result might be empty ---
 * This pattern is used for queries that return a list (or potentially a single item
 * wrapped in an array), where an empty list/missing item should still result in a
 * response to the original request. It ensures the original request frame is preserved
 * and a default empty/null result is provided if the query yielded no frames.
 *
 * @param requestSymbol The symbol for the original request ID.
 * @param queryResultSymbol The symbol for the variable that would hold the query's output.
 * @param outputResultSymbol The symbol for the variable that will contain the collected/final result.
 * @param defaultValue The default value to return if the query yields no results (e.g., [] or null).
 * @returns A function suitable for a 'where' clause that calls the query and processes its results.
 */
function queryResponseHandler<QueryInput, QueryOutput>(
  requestSymbol: symbol,
  queryConcept: any, // The concept object (e.g., UserAuth)
  queryAction: string, // The name of the query method (e.g., "_getAllUsers")
  queryInputPattern: (frame: Record<symbol, unknown>) => QueryInput, // Function to get input from frame
  queryOutputPattern: (outputVar: symbol) => QueryOutput, // Function to get output pattern for query
  outputResultSymbol: symbol, // The symbol for the final output variable in the response
  defaultValue: any = [], // Default value if query returns empty, e.g., [] for lists, null for single items
  extractSingleResult: boolean = false, // If true, extracts first item for single results
): (frames: Frames) => Promise<Frames> {
  return async (frames: Frames) => {
    const originalRequestFrame = frames.first();
    if (!originalRequestFrame) {
      // Should not happen if Requesting.request is in 'when', but defensive check
      return new Frames();
    }

    // Call the query within the where clause
    const queryInputs = queryInputPattern(originalRequestFrame);
    let queryFrames = await frames.query(
      (queryConcept as any)[queryAction], // Dynamically call the query method
      queryInputs,
      queryOutputPattern(queryResultSymbol as symbol), // Use the output pattern
    );

    if (queryFrames.length === 0) {
      // If the query returned no results, ensure we still respond to the original request
      return new Frames({ ...originalRequestFrame, [outputResultSymbol]: defaultValue });
    }

    if (extractSingleResult) {
      // For queries that are expected to return a single item (or nothing)
      return new Frames({ ...originalRequestFrame, [outputResultSymbol]: queryFrames.first()![queryResultSymbol as symbol] });
    } else {
      // For queries that return a list
      return queryFrames.collectAs([queryResultSymbol as symbol], outputResultSymbol);
    }
  };
}

// Internal symbol for query result from concept call (temp)
const queryResultSymbol = Symbol("queryResult");


// =======================================================================
// 1. changePassword
// Path: /UserAuthentication/changePassword (POST)
// =======================================================================

// Sync to trigger changePassword action, ensuring user is logged in and owns the account
export const UserAuth_ChangePassword_Request: Sync = (
  { request, session, user: reqUser, oldPassword, newPassword, loggedInUser },
) => ({
  when: actions([
    Requesting.request,
    {
      path: "/UserAuthentication/changePassword",
      session,
      user: reqUser, // The user ID passed in the request body
      oldPassword,
      newPassword,
    },
    { request },
  ]),
  where: async (frames) => {
    // Authenticate the session to get the logged-in user
    frames = await frames.query(Sessioning._getUser, { session }, { user: loggedInUser });
    // Ensure the user ID in the request matches the logged-in user for authorization
    return frames.filter(($) => $[reqUser] === $[loggedInUser]);
  },
  then: actions([
    UserAuth.changePassword,
    { user: reqUser, oldPassword, newPassword },
  ]),
});

// Sync to respond to changePassword success
export const UserAuth_ChangePassword_Response_Success: Sync = (
  { request, user, oldPassword, newPassword }, // Match original action arguments
) => ({
  when: actions(
    [
      Requesting.request,
      {
        path: "/UserAuthentication/changePassword",
        user,
        oldPassword,
        newPassword,
      },
      { request },
    ], // Original request
    [
      UserAuth.changePassword,
      { user, oldPassword, newPassword },
      {}, // Successful action completion (empty result)
    ],
  ),
  then: actions([Requesting.respond, { request, message: "Password changed successfully." }]),
});

// Sync to respond to changePassword error
export const UserAuth_ChangePassword_Response_Error: Sync = (
  { request, user, oldPassword, newPassword, error }, // Match original action arguments and error output
) => ({
  when: actions(
    [
      Requesting.request,
      {
        path: "/UserAuthentication/changePassword",
        user,
        oldPassword,
        newPassword,
      },
      { request },
    ], // Original request
    [
      UserAuth.changePassword,
      { user, oldPassword, newPassword },
      { error }, // Action failed with error
    ],
  ),
  then: actions([Requesting.respond, { request, error }]),
});


// =======================================================================
// 2. deleteAccount
// Path: /UserAuthentication/deleteAccount (POST)
// =======================================================================

// Sync to trigger deleteAccount action, ensuring user is logged in and owns the account
export const UserAuth_DeleteAccount_Request: Sync = (
  { request, session, user: reqUser, loggedInUser },
) => ({
  when: actions([
    Requesting.request,
    {
      path: "/UserAuthentication/deleteAccount",
      session,
      user: reqUser, // The user ID passed in the request body
    },
    { request },
  ]),
  where: async (frames) => {
    // Authenticate the session to get the logged-in user
    frames = await frames.query(Sessioning._getUser, { session }, { user: loggedInUser });
    // Ensure the user ID in the request matches the logged-in user for authorization
    return frames.filter(($) => $[reqUser] === $[loggedInUser]);
  },
  then: actions([
    UserAuth.deleteAccount,
    { user: reqUser },
  ]),
});

// Sync to respond to deleteAccount success
export const UserAuth_DeleteAccount_Response_Success: Sync = (
  { request, user }, // Match original action argument
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/UserAuthentication/deleteAccount", user },
      { request },
    ], // Original request
    [UserAuth.deleteAccount, { user }, {}], // Successful action completion
  ),
  then: actions([Requesting.respond, { request, message: "Account deleted successfully." }]),
});

// Sync to respond to deleteAccount error
export const UserAuth_DeleteAccount_Response_Error: Sync = (
  { request, user, error }, // Match original action argument and error output
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/UserAuthentication/deleteAccount", user },
      { request },
    ], // Original request
    [UserAuth.deleteAccount, { user }, { error }], // Action failed with error
  ),
  then: actions([Requesting.respond, { request, error }]),
});


// =======================================================================
// 3. _checkUserExists
// Path: /UserAuthentication/_checkUserExists (GET)
// =======================================================================

// Sync to trigger _checkUserExists query, ensuring any user is logged in
export const UserAuth_CheckUserExists_Request: Sync = (
  { request, session, user: userToQuery, loggedInUser },
) => ({
  when: actions([
    Requesting.request,
    {
      path: "/UserAuthentication/_checkUserExists",
      session,
      user: userToQuery, // The user ID to check existence for
    },
    { request },
  ]),
  where: async (frames) => {
    // Authenticate the session to ensure a logged-in user is making the request.
    // The query itself is about `userToQuery`, not necessarily `loggedInUser`.
    frames = await frames.query(Sessioning._getUser, { session }, { user: loggedInUser });
    return frames;
  },
  then: actions([
    UserAuth._checkUserExists,
    { user: userToQuery },
  ]),
});

// Sync to respond to _checkUserExists query. It always returns `exists: boolean`.
export const UserAuth_CheckUserExists_Response: Sync = (
  { request, user, existsResult, existsOutput },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/UserAuthentication/_checkUserExists", user },
      { request },
    ], // Original request to capture its frame
  ),
  where: queryResponseHandler(
    request,
    UserAuth,
    "_checkUserExists",
    (frame) => ({ user: frame[user] as User }), // Input for the query
    (outputVar) => ({ exists: outputVar as boolean }), // Output pattern for the query
    existsOutput, // Symbol for the final output variable
    { exists: false }, // Default value if no result (though _checkUserExists should always return one)
    true // Extract single result as it returns {exists: boolean}
  ),
  then: actions([Requesting.respond, { request, exists: existsOutput }]),
});


// =======================================================================
// 4. _getAllUsers
// Path: /UserAuthentication/_getAllUsers (GET)
// =======================================================================

// Sync to trigger _getAllUsers query, ensuring any user is logged in
export const UserAuth_GetAllUsers_Request: Sync = (
  { request, session, loggedInUser },
) => ({
  when: actions([
    Requesting.request,
    {
      path: "/UserAuthentication/_getAllUsers",
      session,
    },
    { request },
  ]),
  where: async (frames) => {
    // Authenticate the session to ensure a logged-in user is making the request
    frames = await frames.query(Sessioning._getUser, { session }, { user: loggedInUser });
    return frames;
  },
  then: actions([
    UserAuth._getAllUsers,
    {}, // No input arguments
  ]),
});

// Sync to respond to _getAllUsers query, handling potentially empty results
export const UserAuth_GetAllUsers_Response: Sync = (
  { request, allUsersResults },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/UserAuthentication/_getAllUsers" },
      { request },
    ], // Original request to capture its frame
  ),
  where: queryResponseHandler(
    request,
    UserAuth,
    "_getAllUsers",
    (frame) => ({}), // No input for this query
    (outputVar) => ({ _id: outputVar as User, username: String, password: String }), // Output pattern
    allUsersResults, // Symbol for the final output variable
    [] // Default value if no result (empty array for a list of users)
  ),
  then: actions([Requesting.respond, { request, users: allUsersResults }]), // Responding with 'users' as the key
});


// =======================================================================
// 5. _getUsernameById
// Path: /UserAuthentication/_getUsernameById (GET)
// =======================================================================

// Sync to trigger _getUsernameById query, ensuring any user is logged in
export const UserAuth_GetUsernameById_Request: Sync = (
  { request, session, user: userToQuery, loggedInUser },
) => ({
  when: actions([
    Requesting.request,
    {
      path: "/UserAuthentication/_getUsernameById",
      session,
      user: userToQuery, // The user ID to get username for
    },
    { request },
  ]),
  where: async (frames) => {
    // Authenticate the session
    frames = await frames.query(Sessioning._getUser, { session }, { user: loggedInUser });
    return frames;
  },
  then: actions([
    UserAuth._getUsernameById,
    { user: userToQuery },
  ]),
});

// Sync to respond to _getUsernameById query, handling potentially empty results
export const UserAuth_GetUsernameById_Response: Sync = (
  { request, user, usernameOutput },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/UserAuthentication/_getUsernameById", user },
      { request },
    ], // Original request to capture its frame
  ),
  where: queryResponseHandler(
    request,
    UserAuth,
    "_getUsernameById",
    (frame) => ({ user: frame[user] as User }), // Input for the query
    (outputVar) => ({ username: outputVar as string }), // Output pattern for the query
    usernameOutput, // Symbol for the final output variable
    null, // Default value if no result (null for a single username)
    true // Extract single result from the array
  ),
  then: actions([Requesting.respond, { request, username: usernameOutput }]),
});


// =======================================================================
// 6. _getUserById (New Query based on API spec's GET /api/UserAuthentication/_getUserById)
// Path: /UserAuthentication/_getUserById (GET)
// =======================================================================

// Sync to trigger _getUserById query, ensuring any user is logged in
export const UserAuth_GetUserById_Request: Sync = (
  { request, session, user: userToQuery, loggedInUser },
) => ({
  when: actions([
    Requesting.request,
    {
      path: "/UserAuthentication/_getUserById",
      session,
      user: userToQuery, // The user ID to get the full user document for
    },
    { request },
  ]),
  where: async (frames) => {
    // Authenticate the session
    frames = await frames.query(Sessioning._getUser, { session }, { user: loggedInUser });
    return frames;
  },
  then: actions([
    UserAuth._getUserById,
    { user: userToQuery },
  ]),
});

// Sync to respond to _getUserById query, handling potentially empty results
export const UserAuth_GetUserById_Response: Sync = (
  { request, user, userDocumentOutput },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/UserAuthentication/_getUserById", user },
      { request },
    ], // Original request to capture its frame
  ),
  where: queryResponseHandler(
    request,
    UserAuth,
    "_getUserById",
    (frame) => ({ user: frame[user] as User }), // Input for the query
    (outputVar) => ({ _id: outputVar as User, username: String, password: String }), // Output pattern for the query
    userDocumentOutput, // Symbol for the final output variable
    null, // Default value if no result (null for a single user document)
    true // Extract single result from the array (as _getUserById returns a single doc or Empty)
  ),
  then: actions([Requesting.respond, { request, user: userDocumentOutput }]),
});
```

To use these syncs, you need to ensure:

1. The `SessioningConcept.ts` file exists at `../concepts/Sessioning/SessioningConcept.ts` and exports a default class `SessioningConcept` with at least a `_getUser` query.
2. The `UserAuthenticationConcept.ts` file exists at `../concepts/UserAuthentication/UserAuthenticationConcept.ts` and exports the default class `UserAuthenticationConcept` with the actions and queries defined in your updated implementation.
3. You run `deno run build` to update the `@concepts` import map if you've added new concept files or changed their structure.
4. These syncs will be automatically picked up by the engine if placed in `src/syncs/`.
