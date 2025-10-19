---
timestamp: 'Sun Oct 19 2025 14:14:05 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251019_141405.7363ed64.md]]'
content_id: 3e0d2ca13ca2e26cd20e9248167e6554d779b74e9b07bf30c0d33a2ff66825d4
---

# test: UserAuthentication

```typescript
// # file: src/UserAuthentication/UserAuthenticationConcept.test.ts

import { assertEquals, assertNotEquals, assertExists } from "jsr:@std/assert";
import { testDb } from "../../utils/database.ts"; // Adjust path as per your project structure
import UserAuthenticationConcept from "./UserAuthenticationConcept.ts";
import { ID, Empty } from "../../utils/types.ts";

// Helper for logging action calls and results
// --- FIX START ---
// Removed the restrictive generic constraint "extends { error?: string }"
function logAction<T>(
  actionName: string,
  input: Record<string, unknown>,
  output: T,
) {
  console.log(`--- Action: ${actionName} ---`);
  console.log("Input:", input);
  console.log("Output:", output);
  // Safely check if output is an object and has an 'error' property
  if (
    typeof output === "object" && output !== null && "error" in output &&
    typeof (output as { error: string }).error === "string"
  ) {
    console.error("Error:", (output as { error: string }).error);
  }
}
// --- FIX END ---

Deno.test("UserAuthenticationConcept Tests", async (t) => {
  const [db, client] = await testDb();
  const userAuthConcept = new UserAuthenticationConcept(db);

  // # trace: Operational Principle - Register and Authenticate
  await t.step("Scenario: Operational Principle (Register and Authenticate)", async () => {
    const username = "alice";
    const password = "password123";

    // Action: register
    console.log(`Attempting to register user '${username}'...`);
    const registerResult = await userAuthConcept.register({ username, password });
    logAction("register", { username, password }, registerResult); // This call is now valid

    assertExists((registerResult as { user: ID }).user, "Registration should return a user ID.");
    const registeredUserId = (registerResult as { user: ID }).user;
    console.log(`Registered user ID: ${registeredUserId}`);

    // Action: authenticate
    console.log(`Attempting to authenticate user '${username}'...`);
    const authResult = await userAuthConcept.authenticate({ username, password });
    logAction("authenticate", { username, password }, authResult); // This call is now valid

    assertExists((authResult as { user: ID }).user, "Authentication should return a user ID.");
    assertEquals(
      (authResult as { user: ID }).user,
      registeredUserId,
      "Authenticated user ID should match registered user ID.",
    );

    // Verify state via query
    const userLookup = await userAuthConcept._getUserByUsername({ username });
    logAction("_getUserByUsername", { username }, userLookup); // This call is now valid
    assertEquals(
      (userLookup as { user: ID }).user,
      registeredUserId,
      "Query _getUserByUsername should find the registered user.",
    );
  });

  await t.step("Scenario: Registering with existing username should fail", async () => {
    const username = "bob";
    const password = "securepassword";

    // First successful registration
    const registerResult1 = await userAuthConcept.register({ username, password });
    logAction("register", { username, password }, registerResult1); // This call is now valid
    assertExists((registerResult1 as { user: ID }).user, "First registration should succeed.");

    // Attempt to register with the same username
    console.log(`Attempting to re-register user '${username}'...`);
    const registerResult2 = await userAuthConcept.register({ username, password });
    logAction("register", { username, password }, registerResult2); // This call is now valid

    assertExists((registerResult2 as { error: string }).error, "Second registration should return an error.");
    assertEquals(
      (registerResult2 as { error: string }).error,
      `User with username '${username}' already exists.`,
      "Error message should indicate existing username.",
    );
  });

  await t.step("Scenario: Authentication failures (wrong password, non-existent user)", async () => {
    const username = "charlie";
    const password = "supersecret";
    const wrongPassword = "incorrectpassword";
    const nonExistentUsername = "diana";

    // Register a user first
    const registerResult = await userAuthConcept.register({ username, password });
    logAction("register", { username, password }, registerResult); // This call is now valid
    assertExists((registerResult as { user: ID }).user, "Registration should succeed for Charlie.");

    // Attempt to authenticate with wrong password
    console.log(`Attempting to authenticate '${username}' with wrong password...`);
    const authResultWrongPass = await userAuthConcept.authenticate({
      username,
      password: wrongPassword,
    });
    logAction("authenticate", { username, password: wrongPassword }, authResultWrongPass); // This call is now valid
    assertExists(
      (authResultWrongPass as { error: string }).error,
      "Authentication with wrong password should fail.",
    );
    assertEquals(
      (authResultWrongPass as { error: string }).error,
      "Invalid username or password.",
      "Error message should indicate invalid credentials.",
    );

    // Attempt to authenticate non-existent user
    console.log(`Attempting to authenticate non-existent user '${nonExistentUsername}'...`);
    const authResultNonExistent = await userAuthConcept.authenticate({
      username: nonExistentUsername,
      password: password,
    });
    logAction("authenticate", { username: nonExistentUsername, password }, authResultNonExistent); // This call is now valid
    assertExists(
      (authResultNonExistent as { error: string }).error,
      "Authentication for non-existent user should fail.",
    );
    assertEquals(
      (authResultNonExistent as { error: string }).error,
      "Invalid username or password.",
      "Error message should indicate invalid credentials.",
    );
  });

  await t.step("Scenario: Change password functionality", async () => {
    const username = "eve";
    const oldPassword = "oldpassword";
    const newPassword = "newsecurepassword";

    // Register user Eve
    const registerResult = await userAuthConcept.register({
      username,
      password: oldPassword,
    });
    logAction("register", { username, password: oldPassword }, registerResult); // This call is now valid
    assertExists((registerResult as { user: ID }).user, "Eve's registration should succeed.");
    const eveId = (registerResult as { user: ID }).user;

    // Authenticate with old password (should succeed)
    const authOldPass = await userAuthConcept.authenticate({ username, password: oldPassword });
    logAction("authenticate", { username, password: oldPassword }, authOldPass); // This call is now valid
    assertExists((authOldPass as { user: ID }).user, "Authentication with old password should succeed.");

    // Attempt to change password with wrong old password
    console.log(`Attempting to change password for '${username}' with wrong old password...`);
    const changePassWrongOld = await userAuthConcept.changePassword({
      user: eveId,
      oldPassword: "wrongoldpassword",
      newPassword,
    });
    logAction(
      "changePassword",
      { user: eveId, oldPassword: "wrongoldpassword", newPassword },
      changePassWrongOld,
    ); // This call is now valid
    assertExists(
      (changePassWrongOld as { error: string }).error,
      "Changing password with wrong old password should fail.",
    );
    assertEquals(
      (changePassWrongOld as { error: string }).error,
      "Old password does not match.",
      "Error message should indicate old password mismatch.",
    );

    // Attempt to change password to the same password
    console.log(`Attempting to change password for '${username}' to the same password...`);
    const changePassSame = await userAuthConcept.changePassword({
      user: eveId,
      oldPassword,
      newPassword: oldPassword,
    });
    logAction(
      "changePassword",
      { user: eveId, oldPassword, newPassword: oldPassword },
      changePassSame,
    ); // This call is now valid
    assertExists(
      (changePassSame as { error: string }).error,
      "Changing password to the same password should fail.",
    );
    assertEquals(
      (changePassSame as { error: string }).error,
      "New password cannot be the same as the old password.",
      "Error message should indicate same password.",
    );

    // Successfully change password
    console.log(`Successfully changing password for '${username}'...`);
    const changePassSuccess = await userAuthConcept.changePassword({
      user: eveId,
      oldPassword,
      newPassword,
    });
    logAction("changePassword", { user: eveId, oldPassword, newPassword }, changePassSuccess); // This call is now valid
    assertEquals(changePassSuccess, {}, "Password change should succeed with an empty result.");

    // Authenticate with old password (should now fail)
    console.log(`Attempting to authenticate '${username}' with old password (should fail)...`);
    const authAfterChangeOld = await userAuthConcept.authenticate({
      username,
      password: oldPassword,
    });
    logAction("authenticate", { username, password: oldPassword }, authAfterChangeOld); // This call is now valid
    assertExists(
      (authAfterChangeOld as { error: string }).error,
      "Authentication with old password after change should fail.",
    );

    // Authenticate with new password (should succeed)
    console.log(`Attempting to authenticate '${username}' with new password (should succeed)...`);
    const authAfterChangeNew = await userAuthConcept.authenticate({
      username,
      password: newPassword,
    });
    logAction("authenticate", { username, password: newPassword }, authAfterChangeNew); // This call is now valid
    assertExists(
      (authAfterChangeNew as { user: ID }).user,
      "Authentication with new password after change should succeed.",
    );
    assertEquals(
      (authAfterChangeNew as { user: ID }).user,
      eveId,
      "Authenticated user ID should match Eve's ID.",
    );
  });

  await t.step("Scenario: Delete account functionality", async () => {
    const username1 = "frank";
    const password1 = "pass1";
    const username2 = "grace";
    const password2 = "pass2";

    // Register two users
    const registerResult1 = await userAuthConcept.register({
      username: username1,
      password: password1,
    });
    logAction("register", { username: username1, password: password1 }, registerResult1); // This call is now valid
    assertExists((registerResult1 as { user: ID }).user, "Frank's registration should succeed.");
    const frankId = (registerResult1 as { user: ID }).user;

    const registerResult2 = await userAuthConcept.register({
      username: username2,
      password: password2,
    });
    logAction("register", { username: username2, password: password2 }, registerResult2); // This call is now valid
    assertExists((registerResult2 as { user: ID }).user, "Grace's registration should succeed.");
    const graceId = (registerResult2 as { user: ID }).user;

    // Delete Frank's account
    console.log(`Attempting to delete account for '${username1}'...`);
    const deleteFrank = await userAuthConcept.deleteAccount({ user: frankId });
    logAction("deleteAccount", { user: frankId }, deleteFrank); // This call is now valid
    assertEquals(deleteFrank, {}, "Frank's account deletion should succeed.");

    // Attempt to authenticate Frank (should fail)
    console.log(`Attempting to authenticate '${username1}' (should fail)...`);
    const authFrank = await userAuthConcept.authenticate({
      username: username1,
      password: password1,
    });
    logAction("authenticate", { username: username1, password: password1 }, authFrank); // This call is now valid
    assertExists((authFrank as { error: string }).error, "Authentication for deleted Frank should fail.");

    // Verify Frank's existence via query
    const checkFrankExists = await userAuthConcept._checkUserExists({ user: frankId });
    logAction("_checkUserExists", { user: frankId }, checkFrankExists); // This call is now valid
    assertEquals(checkFrankExists.exists, false, "Frank's account should no longer exist.");

    // Attempt to delete Frank's account again (should fail)
    console.log(`Attempting to delete account for '${username1}' again...`);
    const deleteFrankAgain = await userAuthConcept.deleteAccount({ user: frankId });
    logAction("deleteAccount", { user: frankId }, deleteFrankAgain); // This call is now valid
    assertExists(
      (deleteFrankAgain as { error: string }).error,
      "Deleting a non-existent account should return an error.",
    );
    assertEquals(
      (deleteFrankAgain as { error: string }).error,
      `User with ID '${frankId}' not found.`,
      "Error message should indicate user not found.",
    );

    // Authenticate Grace (should still succeed)
    console.log(`Attempting to authenticate '${username2}' (should still succeed)...`);
    const authGrace = await userAuthConcept.authenticate({
      username: username2,
      password: password2,
    });
    logAction("authenticate", { username: username2, password: password2 }, authGrace); // This call is now valid
    assertExists((authGrace as { user: ID }).user, "Authentication for Grace should still succeed.");
    assertEquals(
      (authGrace as { user: ID }).user,
      graceId,
      "Authenticated user ID should match Grace's ID.",
    );
  });

  await t.step("Scenario: Query functionality for user existence", async () => {
    const username = "heidi";
    const password = "hpassword";

    // Register Heidi
    const registerResult = await userAuthConcept.register({ username, password });
    logAction("register", { username, password }, registerResult); // This call is now valid
    assertExists((registerResult as { user: ID }).user, "Heidi's registration should succeed.");
    const heidiId = (registerResult as { user: ID }).user;

    // Query _getUserByUsername for existing user
    console.log(`Querying for user by username '${username}'...`);
    const lookupHeidi = await userAuthConcept._getUserByUsername({ username });
    logAction("_getUserByUsername", { username }, lookupHeidi); // This call is now valid
    assertExists((lookupHeidi as { user: ID }).user, "Query should find Heidi by username.");
    assertEquals(
      (lookupHeidi as { user: ID }).user,
      heidiId,
      "Returned user ID should match Heidi's ID.",
    );

    // Query _getUserByUsername for non-existent user
    const nonExistentUsername = "ivan";
    console.log(`Querying for non-existent user by username '${nonExistentUsername}'...`);
    const lookupIvan = await userAuthConcept._getUserByUsername({ username: nonExistentUsername });
    logAction("_getUserByUsername", { username: nonExistentUsername }, lookupIvan); // This call is now valid
    assertEquals(lookupIvan, {}, "Query for non-existent user should return an empty object.");

    // Query _checkUserExists for existing user
    console.log(`Checking existence for user ID '${heidiId}'...`);
    const checkHeidiExists = await userAuthConcept._checkUserExists({ user: heidiId });
    logAction("_checkUserExists", { user: heidiId }, checkHeidiExists); // This call is now valid
    assertEquals(checkHeidiExists.exists, true, "Heidi should exist.");

    // Query _checkUserExists for non-existent user ID
    const nonExistentUserId = "nonexistentid" as ID;
    console.log(`Checking existence for non-existent user ID '${nonExistentUserId}'...`);
    const checkNonExistentUser = await userAuthConcept._checkUserExists({ user: nonExistentUserId });
    logAction("_checkUserExists", { user: nonExistentUserId }, checkNonExistentUser); // This call is now valid
    assertEquals(checkNonExistentUser.exists, false, "Non-existent user should not exist.");
  });

  await client.close();
});
```
