[@newImplementation](newImplementation.md)

[@testing-concepts](../../background/testing-concepts.md)

[@testing-concepts-rubric](../../background/testing-concepts-rubric.md)

# test: UserAuthentication
# response:

Okay, here's the test file for the `UserAuthenticationConcept`, including tests for the operational principle and several interesting scenarios, along with clear console output and programmatic assertions.

**file: src/UserAuthentication/UserAuthenticationConcept.test.ts**

```typescript
import { assertEquals, assertNotEquals, assertExists, assert } from "jsr:@std/assert";
import { testDb } from "../../utils/database.ts"; // Adjust path as per your project structure
import UserAuthenticationConcept from "./UserAuthenticationConcept.ts";
import { ID, Empty } from "../../utils/types.ts";

Deno.test("UserAuthenticationConcept Tests", async (t) => {
  const [db, client] = await testDb();
  const concept = new UserAuthenticationConcept(db);

  // Helper for console logging
  const log = (message: string, ...args: any[]) => {
    console.log(`\n--- ${message} ---`, ...args);
  };

  // Helper to assert an error was returned
  const assertError = (result: { error?: string }, message: string) => {
    assertExists(result.error, message);
    console.log(`  Expected error: ${result.error}`);
  };

  // Helper to assert no error was returned
  const assertNoError = (result: { error?: string }, message: string) => {
    assertEquals(result.error, undefined, message);
  };

  await t.step("Operational Principle: Register, Authenticate, and Query by Username", async () => {
    log("Trace: Operational Principle");
    log("Principle: After a user registers with a username and a password, they can authenticate with that same username and password and be treated each time as the same user. They can also be looked up by other users when sharing events.");

    const username = "alice";
    const password = "password123";
    let aliceId: ID;

    log("Action: register(username: 'alice', password: 'password123')");
    const registerResult = await concept.register({ username, password });
    assertNoError(registerResult, "Registration should succeed");
    assertExists((registerResult as { user: ID }).user, "Registered user ID should be returned");
    aliceId = (registerResult as { user: ID }).user;
    console.log(`  Registered user with ID: ${aliceId}`);

    log(`Action: authenticate(username: '${username}', password: '${password}')`);
    const authenticateResult = await concept.authenticate({ username, password });
    assertNoError(authenticateResult, "Authentication should succeed with correct credentials");
    assertEquals((authenticateResult as { user: ID }).user, aliceId, "Authenticated user ID should match registered ID");
    console.log(`  Authenticated user with ID: ${(authenticateResult as { user: ID }).user}`);

    log(`Query: _getUserByUsername(username: '${username}')`);
    const queryByUsernameResult = await concept._getUserByUsername({ username });
    assertNoError(queryByUsernameResult, "Query by username should succeed");
    assertExists((queryByUsernameResult as { user: ID }).user, "User should be found by username");
    assertEquals((queryByUsernameResult as { user: ID }).user, aliceId, "User ID from query should match registered ID");
    console.log(`  Found user by username: ${(queryByUsernameResult as { user: ID }).user}`);

    log(`Query: _checkUserExists(user: '${aliceId}')`);
    const checkExistsResult = await concept._checkUserExists({ user: aliceId });
    assert(checkExistsResult.exists, "User should exist after registration and authentication");
    console.log(`  User ${aliceId} exists: ${checkExistsResult.exists}`);

    console.log("Operational Principle fulfilled: User registered, authenticated, and successfully looked up.");
  });

  await t.step("Scenario 1: Registration and Authentication Failure Cases", async () => {
    log("Trace: Scenario 1 - Failure Cases");

    const username = "bob";
    const password = "bobpassword";
    const wrongPassword = "wrong";
    const nonExistentUsername = "charlie";

    log(`Action: register(username: '${username}', password: '${password}')`);
    const registerResult = await concept.register({ username, password });
    assertNoError(registerResult, "Initial registration for Bob should succeed");
    const bobId = (registerResult as { user: ID }).user;
    console.log(`  Registered user Bob with ID: ${bobId}`);

    log(`Action: register(username: '${username}', password: 'another_password') (Duplicate username)`);
    const duplicateRegisterResult = await concept.register({ username, password: "another_password" });
    assertError(duplicateRegisterResult, "Registration with duplicate username should fail");
    console.log(`  Attempt to register duplicate username '${username}' failed as expected.`);

    log(`Action: authenticate(username: '${username}', password: '${wrongPassword}') (Wrong password)`);
    const wrongPasswordAuthResult = await concept.authenticate({ username, password: wrongPassword });
    assertError(wrongPasswordAuthResult, "Authentication with wrong password should fail");
    console.log(`  Attempt to authenticate with wrong password failed as expected.`);

    log(`Action: authenticate(username: '${nonExistentUsername}', password: 'any_password') (Non-existent user)`);
    const nonExistentAuthResult = await concept.authenticate({ username: nonExistentUsername, password: "any_password" });
    assertError(nonExistentAuthResult, "Authentication for non-existent user should fail");
    console.log(`  Attempt to authenticate non-existent user '${nonExistentUsername}' failed as expected.`);

    log(`Query: _checkUserExists(user: '${freshID() as ID}') (Non-existent user ID)`);
    const nonExistentUserCheck = await concept._checkUserExists({ user: freshID() as ID });
    assertEquals(nonExistentUserCheck.exists, false, "Checking for a non-existent user ID should return false");
    console.log(`  Checking for non-existent user ID returned: ${nonExistentUserCheck.exists}`);

    log(`Query: _getUserByUsername(username: '${nonExistentUsername}') (Non-existent username)`);
    const nonExistentUserQuery = await concept._getUserByUsername({ username: nonExistentUsername });
    assertEquals(Object.keys(nonExistentUserQuery).length, 0, "Querying for non-existent username should return an empty object");
    console.log(`  Querying for non-existent username '${nonExistentUsername}' returned: ${JSON.stringify(nonExistentUserQuery)}`);
  });

  await t.step("Scenario 2: Change Password Functionality", async () => {
    log("Trace: Scenario 2 - Change Password");

    const username = "charlie";
    const initialPassword = "initialpassword";
    const newPassword = "newpassword";

    log(`Action: register(username: '${username}', password: '${initialPassword}')`);
    const registerResult = await concept.register({ username, password: initialPassword });
    assertNoError(registerResult, "Registration for Charlie should succeed");
    const charlieId = (registerResult as { user: ID }).user;
    console.log(`  Registered user Charlie with ID: ${charlieId}`);

    log(`Action: authenticate(username: '${username}', password: '${initialPassword}')`);
    const authenticateResult = await concept.authenticate({ username, password: initialPassword });
    assertNoError(authenticateResult, "Authentication with initial password should succeed");
    console.log(`  Authenticated with initial password.`);

    log(`Action: changePassword(user: '${charlieId}', oldPassword: 'wrong_password', newPassword: '${newPassword}') (Wrong old password)`);
    const wrongOldPasswordResult = await concept.changePassword({ user: charlieId, oldPassword: "wrong_password", newPassword });
    assertError(wrongOldPasswordResult, "Changing password with wrong old password should fail");
    console.log(`  Attempt to change password with wrong old password failed as expected.`);

    log(`Action: changePassword(user: '${charlieId}', oldPassword: '${initialPassword}', newPassword: '${initialPassword}') (Same new password)`);
    const sameNewPasswordResult = await concept.changePassword({ user: charlieId, oldPassword: initialPassword, newPassword: initialPassword });
    assertError(sameNewPasswordResult, "Changing password to the same password should fail");
    console.log(`  Attempt to change password to the same password failed as expected.`);

    log(`Action: changePassword(user: '${charlieId}', oldPassword: '${initialPassword}', newPassword: '${newPassword}') (Successful change)`);
    const changePasswordResult = await concept.changePassword({ user: charlieId, oldPassword: initialPassword, newPassword });
    assertNoError(changePasswordResult, "Password change should succeed with correct old password and different new password");
    assertEquals(changePasswordResult, {}, "Successful password change should return an empty object");
    console.log(`  Password for Charlie successfully changed.`);

    log(`Action: authenticate(username: '${username}', password: '${initialPassword}') (Old password after change)`);
    const authWithOldPassword = await concept.authenticate({ username, password: initialPassword });
    assertError(authWithOldPassword, "Authentication with old password should now fail");
    console.log(`  Authentication with old password failed as expected.`);

    log(`Action: authenticate(username: '${username}', password: '${newPassword}') (New password after change)`);
    const authWithNewPassword = await concept.authenticate({ username, password: newPassword });
    assertNoError(authWithNewPassword, "Authentication with new password should succeed");
    assertEquals((authWithNewPassword as { user: ID }).user, charlieId, "Authenticated user ID should match Charlie's ID");
    console.log(`  Authenticated with new password successfully.`);
  });

  await t.step("Scenario 3: Account Deletion Functionality", async () => {
    log("Trace: Scenario 3 - Account Deletion");

    const username = "diana";
    const password = "dianapassword";

    log(`Action: register(username: '${username}', password: '${password}')`);
    const registerResult = await concept.register({ username, password });
    assertNoError(registerResult, "Registration for Diana should succeed");
    const dianaId = (registerResult as { user: ID }).user;
    console.log(`  Registered user Diana with ID: ${dianaId}`);

    log(`Query: _checkUserExists(user: '${dianaId}') before deletion`);
    let checkExistsResult = await concept._checkUserExists({ user: dianaId });
    assert(checkExistsResult.exists, "Diana should exist before deletion");
    console.log(`  Diana exists: ${checkExistsResult.exists}`);

    log(`Action: deleteAccount(user: '${dianaId}')`);
    const deleteResult = await concept.deleteAccount({ user: dianaId });
    assertNoError(deleteResult, "Account deletion should succeed for existing user");
    assertEquals(deleteResult, {}, "Successful deletion should return an empty object");
    console.log(`  User Diana with ID ${dianaId} successfully deleted.`);

    log(`Query: _checkUserExists(user: '${dianaId}') after deletion`);
    checkExistsResult = await concept._checkUserExists({ user: dianaId });
    assert(!checkExistsResult.exists, "Diana should not exist after deletion");
    console.log(`  Diana exists: ${checkExistsResult.exists}`);

    log(`Action: authenticate(username: '${username}', password: '${password}') (After deletion)`);
    const authAfterDelete = await concept.authenticate({ username, password });
    assertError(authAfterDelete, "Authentication should fail for a deleted user");
    console.log(`  Authentication for deleted user failed as expected.`);

    log(`Action: deleteAccount(user: '${dianaId}') (Non-existent user)`);
    const deleteNonExistentResult = await concept.deleteAccount({ user: dianaId });
    assertError(deleteNonExistentResult, "Deleting a non-existent account should fail");
    console.log(`  Attempt to delete non-existent user failed as expected.`);
  });

  await t.step("Scenario 4: Comprehensive Querying", async () => {
    log("Trace: Scenario 4 - Comprehensive Querying");

    const user1 = { username: "eve", password: "evepassword" };
    const user2 = { username: "frank", password: "frankpassword" };
    const user3 = { username: "grace", password: "gracepassword" };

    log("Action: Register Eve");
    const eveResult = await concept.register(user1);
    assertNoError(eveResult, "Eve registration should succeed");
    const eveId = (eveResult as { user: ID }).user;
    console.log(`  Registered Eve with ID: ${eveId}`);

    log("Action: Register Frank");
    const frankResult = await concept.register(user2);
    assertNoError(frankResult, "Frank registration should succeed");
    const frankId = (frankResult as { user: ID }).user;
    console.log(`  Registered Frank with ID: ${frankId}`);

    log("Action: Register Grace");
    const graceResult = await concept.register(user3);
    assertNoError(graceResult, "Grace registration should succeed");
    const graceId = (graceResult as { user: ID }).user;
    console.log(`  Registered Grace with ID: ${graceId}`);

    log("Query: _getAllUsers()");
    const allUsers = await concept._getAllUsers();
    assertNoError(allUsers, "Getting all users should succeed"); // Assuming _getAllUsers could return error
    assert(Array.isArray(allUsers), "Result should be an array");
    assertEquals(allUsers.length, 3, "Should retrieve 3 users (excluding earlier deleted Diana)");
    console.log(`  Retrieved ${allUsers.length} users:`);
    allUsers.forEach(u => console.log(`    ID: ${u._id}, Username: ${u.username}`));
    assertExists(allUsers.find(u => u._id === eveId), "Eve should be in the list");
    assertExists(allUsers.find(u => u._id === frankId), "Frank should be in the list");
    assertExists(allUsers.find(u => u._id === graceId), "Grace should be in the list");

    log(`Query: _getUserById(user: '${frankId}')`);
    const frankById = await concept._getUserById({ user: frankId });
    assertNoError(frankById, "Getting Frank by ID should succeed"); // Assuming _getUserById could return error
    assert(Array.isArray(frankById), "Result should be an array");
    assertEquals(frankById.length, 1, "Should retrieve exactly one user");
    assertEquals(frankById[0]._id, frankId, "Retrieved user ID should match Frank's ID");
    assertEquals(frankById[0].username, user2.username, "Retrieved username should match Frank's");
    console.log(`  Retrieved user by ID '${frankId}': ${JSON.stringify(frankById[0])}`);

    const nonExistentId = freshID() as ID;
    log(`Query: _getUserById(user: '${nonExistentId}') (Non-existent ID)`);
    const nonExistentUser = await concept._getUserById({ user: nonExistentId });
    assertEquals(nonExistentUser, [], "Getting a non-existent user by ID should return an empty array");
    console.log(`  Query for non-existent ID '${nonExistentId}' returned: ${JSON.stringify(nonExistentUser)}`);

    log(`Query: _checkUserExists(user: '${graceId}')`);
    const graceExists = await concept._checkUserExists({ user: graceId });
    assert(graceExists.exists, "Grace should exist");
    console.log(`  User ${graceId} exists: ${graceExists.exists}`);

    log(`Query: _getUserByUsername(username: '${user3.username}')`);
    const graceByUsername = await concept._getUserByUsername({ username: user3.username });
    assertNoError(graceByUsername, "Getting Grace by username should succeed");
    assertExists((graceByUsername as { user: ID }).user, "Grace should be found by username");
    assertEquals((graceByUsername as { user: ID }).user, graceId, "User ID from query should match Grace's ID");
    console.log(`  Found user by username '${user3.username}': ${(graceByUsername as { user: ID }).user}`);
  });

  await client.close(); // Close the database connection after all tests in this file
});
```

# prompt: There are currently many Typescript errors as a result of assuming the type of a variable that is a union type. For example: Argument of type '{ user: ID; } | { error: string; }' is not assignable to parameter of type '{ error?: string | undefined; }'.  Type '{ user: ID; }' has no properties in common with type '{ error?: string | undefined; }'.deno-ts(2345). Resolve these errors.
# response:

To resolve the TypeScript errors caused by union types not being directly assignable to parameters expecting an optional `error` property, I will refactor the helper assertion functions. The core issue is that `assertError` and `assertNoError` were expecting a type that *always* potentially contained an `error` property, while action results often return `{ user: ID }` (which does not have an `error` property) or `{ error: string }`.

The solution involves creating more robust helper functions, `assertSuccess` and `assertFailure`, which correctly use TypeScript's type guards (`asserts result is Type`) to narrow down the union type *after* the assertion, allowing the subsequent code to safely access properties of the specific success or error type.

I will also ensure that these helpers are appropriately used for actions that return explicit error objects, and that queries (which typically return empty arrays/objects for "not found" scenarios rather than `{ error: string }` objects) are asserted on their specific return structures.

Here's the updated `UserAuthenticationConcept.test.ts` file:

**file: src/UserAuthentication/UserAuthenticationConcept.test.ts**

```typescript
import { assertEquals, assertExists, assert } from "jsr:@std/assert";
import { testDb } from "../../utils/database.ts"; // Adjust path as per your project structure
import UserAuthenticationConcept from "./UserAuthenticationConcept.ts";
import { ID, Empty } from "../../utils/types.ts";

Deno.test("UserAuthenticationConcept Tests", async (t) => {
  const [db, client] = await testDb();
  const concept = new UserAuthenticationConcept(db);

  // Helper for console logging
  const log = (message: string, ...args: any[]) => {
    console.log(`\n--- ${message} ---`, ...args);
  };

  // Type guard to check if a result is an error object
  function isErrorResult<T>(result: T | { error: string }): result is { error: string } {
    return typeof result === 'object' && result !== null && 'error' in result && typeof (result as { error: string }).error === 'string';
  }

  // Helper to assert an action/query result is a success (no error object)
  function assertSuccess<TResult>(
    result: TResult | { error: string },
    message: string,
  ): asserts result is TResult {
    if (isErrorResult(result)) {
      throw new Error(`${message}: Unexpected error received: ${result.error}`);
    }
  }

  // Helper to assert an action/query result is an error object
  function assertFailure<TError extends { error: string }>(
    result: any, // Use `any` to allow checking against the actual return type before narrowing
    message: string,
  ): asserts result is TError {
    if (!isErrorResult(result)) {
      throw new Error(`${message}: Expected an error object, but received: ${JSON.stringify(result)}`);
    }
    console.log(`  Expected error: ${result.error}`);
  }


  await t.step("Operational Principle: Register, Authenticate, and Query by Username", async () => {
    log("Trace: Operational Principle");
    log("Principle: After a user registers with a username and a password, they can authenticate with that same username and password and be treated each time as the same user. They can also be looked up by other users when sharing events.");

    const username = "alice";
    const password = "password123";
    let aliceId: ID;

    log("Action: register(username: 'alice', password: 'password123')");
    const registerResult = await concept.register({ username, password });
    assertSuccess(registerResult, "Registration should succeed"); // Type narrowed to { user: ID }
    assertExists(registerResult.user, "Registered user ID should be returned");
    aliceId = registerResult.user;
    console.log(`  Registered user with ID: ${aliceId}`);

    log(`Action: authenticate(username: '${username}', password: '${password}')`);
    const authenticateResult = await concept.authenticate({ username, password });
    assertSuccess(authenticateResult, "Authentication should succeed with correct credentials"); // Type narrowed to { user: ID }
    assertEquals(authenticateResult.user, aliceId, "Authenticated user ID should match registered ID");
    console.log(`  Authenticated user with ID: ${authenticateResult.user}`);

    log(`Query: _getUserByUsername(username: '${username}')`);
    const queryByUsernameResult = await concept._getUserByUsername({ username });
    // Queries like _getUserByUsername return { user: User } | Empty, not explicit error objects
    // So we assert success, then check its specific content.
    assertSuccess(queryByUsernameResult, "Query by username should succeed"); // Type narrowed to { user: ID } | Empty
    if ('user' in queryByUsernameResult) { // Check if 'user' property exists for the non-Empty case
      assertExists(queryByUsernameResult.user, "User should be found by username");
      assertEquals(queryByUsernameResult.user, aliceId, "User ID from query should match registered ID");
      console.log(`  Found user by username: ${queryByUsernameResult.user}`);
    } else {
      throw new Error("Expected to find user by username, but received Empty.");
    }

    log(`Query: _checkUserExists(user: '${aliceId}')`);
    const checkExistsResult = await concept._checkUserExists({ user: aliceId });
    assert(checkExistsResult.exists, "User should exist after registration and authentication"); // _checkUserExists returns { exists: boolean } directly
    console.log(`  User ${aliceId} exists: ${checkExistsResult.exists}`);

    console.log("Operational Principle fulfilled: User registered, authenticated, and successfully looked up.");
  });

  await t.step("Scenario 1: Registration and Authentication Failure Cases", async () => {
    log("Trace: Scenario 1 - Failure Cases");

    const username = "bob";
    const password = "bobpassword";
    const wrongPassword = "wrong";
    const nonExistentUsername = "charlie";

    log(`Action: register(username: '${username}', password: '${password}')`);
    const registerResult = await concept.register({ username, password });
    assertSuccess(registerResult, "Initial registration for Bob should succeed"); // Type narrowed to { user: ID }
    const bobId = registerResult.user;
    console.log(`  Registered user Bob with ID: ${bobId}`);

    log(`Action: register(username: '${username}', password: 'another_password') (Duplicate username)`);
    const duplicateRegisterResult = await concept.register({ username, password: "another_password" });
    assertFailure(duplicateRegisterResult, "Registration with duplicate username should fail"); // Type narrowed to { error: string }
    console.log(`  Attempt to register duplicate username '${username}' failed as expected: ${duplicateRegisterResult.error}`);

    log(`Action: authenticate(username: '${username}', password: '${wrongPassword}') (Wrong password)`);
    const wrongPasswordAuthResult = await concept.authenticate({ username, password: wrongPassword });
    assertFailure(wrongPasswordAuthResult, "Authentication with wrong password should fail"); // Type narrowed to { error: string }
    console.log(`  Attempt to authenticate with wrong password failed as expected: ${wrongPasswordAuthResult.error}`);

    log(`Action: authenticate(username: '${nonExistentUsername}', password: 'any_password') (Non-existent user)`);
    const nonExistentAuthResult = await concept.authenticate({ username: nonExistentUsername, password: "any_password" });
    assertFailure(nonExistentAuthResult, "Authentication for non-existent user should fail"); // Type narrowed to { error: string }
    console.log(`  Attempt to authenticate non-existent user '${nonExistentUsername}' failed as expected: ${nonExistentAuthResult.error}`);

    log(`Query: _checkUserExists(user: '${freshID() as ID}') (Non-existent user ID)`);
    const nonExistentUserCheck = await concept._checkUserExists({ user: freshID() as ID });
    assertEquals(nonExistentUserCheck.exists, false, "Checking for a non-existent user ID should return false");
    console.log(`  Checking for non-existent user ID returned: ${nonExistentUserCheck.exists}`);

    log(`Query: _getUserByUsername(username: '${nonExistentUsername}') (Non-existent username)`);
    const nonExistentUserQuery = await concept._getUserByUsername({ username: nonExistentUsername });
    assertSuccess(nonExistentUserQuery, "Querying for non-existent username should return an empty object"); // Type narrowed to Empty
    assertEquals(Object.keys(nonExistentUserQuery).length, 0, "Querying for non-existent username should return an empty object");
    console.log(`  Querying for non-existent username '${nonExistentUsername}' returned: ${JSON.stringify(nonExistentUserQuery)}`);
  });

  await t.step("Scenario 2: Change Password Functionality", async () => {
    log("Trace: Scenario 2 - Change Password");

    const username = "charlie";
    const initialPassword = "initialpassword";
    const newPassword = "newpassword";

    log(`Action: register(username: '${username}', password: '${initialPassword}')`);
    const registerResult = await concept.register({ username, password: initialPassword });
    assertSuccess(registerResult, "Registration for Charlie should succeed"); // Type narrowed to { user: ID }
    const charlieId = registerResult.user;
    console.log(`  Registered user Charlie with ID: ${charlieId}`);

    log(`Action: authenticate(username: '${username}', password: '${initialPassword}')`);
    const authenticateResult = await concept.authenticate({ username, password: initialPassword });
    assertSuccess(authenticateResult, "Authentication with initial password should succeed"); // Type narrowed to { user: ID }
    console.log(`  Authenticated with initial password.`);

    log(`Action: changePassword(user: '${charlieId}', oldPassword: 'wrong_password', newPassword: '${newPassword}') (Wrong old password)`);
    const wrongOldPasswordResult = await concept.changePassword({ user: charlieId, oldPassword: "wrong_password", newPassword });
    assertFailure(wrongOldPasswordResult, "Changing password with wrong old password should fail"); // Type narrowed to { error: string }
    console.log(`  Attempt to change password with wrong old password failed as expected: ${wrongOldPasswordResult.error}`);

    log(`Action: changePassword(user: '${charlieId}', oldPassword: '${initialPassword}', newPassword: '${initialPassword}') (Same new password)`);
    const sameNewPasswordResult = await concept.changePassword({ user: charlieId, oldPassword: initialPassword, newPassword: initialPassword });
    assertFailure(sameNewPasswordResult, "Changing password to the same password should fail"); // Type narrowed to { error: string }
    console.log(`  Attempt to change password to the same password failed as expected: ${sameNewPasswordResult.error}`);

    log(`Action: changePassword(user: '${charlieId}', oldPassword: '${initialPassword}', newPassword: '${newPassword}') (Successful change)`);
    const changePasswordResult = await concept.changePassword({ user: charlieId, oldPassword: initialPassword, newPassword });
    assertSuccess(changePasswordResult, "Password change should succeed with correct old password and different new password"); // Type narrowed to Empty
    assertEquals(changePasswordResult, {}, "Successful password change should return an empty object");
    console.log(`  Password for Charlie successfully changed.`);

    log(`Action: authenticate(username: '${username}', password: '${initialPassword}') (Old password after change)`);
    const authWithOldPassword = await concept.authenticate({ username, password: initialPassword });
    assertFailure(authWithOldPassword, "Authentication with old password should now fail"); // Type narrowed to { error: string }
    console.log(`  Authentication with old password failed as expected: ${authWithOldPassword.error}`);

    log(`Action: authenticate(username: '${username}', password: '${newPassword}') (New password after change)`);
    const authWithNewPassword = await concept.authenticate({ username, password: newPassword });
    assertSuccess(authWithNewPassword, "Authentication with new password should succeed"); // Type narrowed to { user: ID }
    assertEquals(authWithNewPassword.user, charlieId, "Authenticated user ID should match Charlie's ID");
    console.log(`  Authenticated with new password successfully.`);
  });

  await t.step("Scenario 3: Account Deletion Functionality", async () => {
    log("Trace: Scenario 3 - Account Deletion");

    const username = "diana";
    const password = "dianapassword";

    log(`Action: register(username: '${username}', password: '${password}')`);
    const registerResult = await concept.register({ username, password });
    assertSuccess(registerResult, "Registration for Diana should succeed"); // Type narrowed to { user: ID }
    const dianaId = registerResult.user;
    console.log(`  Registered user Diana with ID: ${dianaId}`);

    log(`Query: _checkUserExists(user: '${dianaId}') before deletion`);
    let checkExistsResult = await concept._checkUserExists({ user: dianaId });
    assert(checkExistsResult.exists, "Diana should exist before deletion");
    console.log(`  Diana exists: ${checkExistsResult.exists}`);

    log(`Action: deleteAccount(user: '${dianaId}')`);
    const deleteResult = await concept.deleteAccount({ user: dianaId });
    assertSuccess(deleteResult, "Account deletion should succeed for existing user"); // Type narrowed to Empty
    assertEquals(deleteResult, {}, "Successful deletion should return an empty object");
    console.log(`  User Diana with ID ${dianaId} successfully deleted.`);

    log(`Query: _checkUserExists(user: '${dianaId}') after deletion`);
    checkExistsResult = await concept._checkUserExists({ user: dianaId });
    assert(!checkExistsResult.exists, "Diana should not exist after deletion");
    console.log(`  Diana exists: ${checkExistsResult.exists}`);

    log(`Action: authenticate(username: '${username}', password: '${password}') (After deletion)`);
    const authAfterDelete = await concept.authenticate({ username, password });
    assertFailure(authAfterDelete, "Authentication should fail for a deleted user"); // Type narrowed to { error: string }
    console.log(`  Authentication for deleted user failed as expected: ${authAfterDelete.error}`);

    log(`Action: deleteAccount(user: '${dianaId}') (Non-existent user)`);
    const deleteNonExistentResult = await concept.deleteAccount({ user: dianaId });
    assertFailure(deleteNonExistentResult, "Deleting a non-existent account should fail"); // Type narrowed to { error: string }
    console.log(`  Attempt to delete non-existent user failed as expected: ${deleteNonExistentResult.error}`);
  });

  await t.step("Scenario 4: Comprehensive Querying", async () => {
    log("Trace: Scenario 4 - Comprehensive Querying");

    const user1 = { username: "eve", password: "evepassword" };
    const user2 = { username: "frank", password: "frankpassword" };
    const user3 = { username: "grace", password: "gracepassword" };

    log("Action: Register Eve");
    const eveResult = await concept.register(user1);
    assertSuccess(eveResult, "Eve registration should succeed"); // Type narrowed to { user: ID }
    const eveId = eveResult.user;
    console.log(`  Registered Eve with ID: ${eveId}`);

    log("Action: Register Frank");
    const frankResult = await concept.register(user2);
    assertSuccess(frankResult, "Frank registration should succeed"); // Type narrowed to { user: ID }
    const frankId = frankResult.user;
    console.log(`  Registered Frank with ID: ${frankId}`);

    log("Action: Register Grace");
    const graceResult = await concept.register(user3);
    assertSuccess(graceResult, "Grace registration should succeed"); // Type narrowed to { user: ID }
    const graceId = graceResult.user;
    console.log(`  Registered Grace with ID: ${graceId}`);

    log("Query: _getAllUsers()");
    const allUsers = await concept._getAllUsers(); // Returns UsersDocument[]
    // _getAllUsers does not return an error object, so we directly assert on its structure
    assert(Array.isArray(allUsers), "Result should be an array");
    assertEquals(allUsers.length, 3, "Should retrieve 3 users (excluding earlier deleted Diana)");
    console.log(`  Retrieved ${allUsers.length} users:`);
    allUsers.forEach(u => console.log(`    ID: ${u._id}, Username: ${u.username}`));
    assertExists(allUsers.find(u => u._id === eveId), "Eve should be in the list");
    assertExists(allUsers.find(u => u._id === frankId), "Frank should be in the list");
    assertExists(allUsers.find(u => u._id === graceId), "Grace should be in the list");

    log(`Query: _getUserById(user: '${frankId}')`);
    const frankById = await concept._getUserById({ user: frankId }); // Returns UsersDocument[] | Empty
    assertSuccess(frankById, "Getting Frank by ID should succeed"); // Type narrowed to UsersDocument[] | Empty
    assert(Array.isArray(frankById), "Result should be an array");
    assertEquals(frankById.length, 1, "Should retrieve exactly one user");
    assertEquals(frankById[0]._id, frankId, "Retrieved user ID should match Frank's ID");
    assertEquals(frankById[0].username, user2.username, "Retrieved username should match Frank's");
    console.log(`  Retrieved user by ID '${frankId}': ${JSON.stringify(frankById[0])}`);

    const nonExistentId = "nonExistent" as ID; // Using a manually asserted ID for non-existence
    log(`Query: _getUserById(user: '${nonExistentId}') (Non-existent ID)`);
    const nonExistentUser = await concept._getUserById({ user: nonExistentId });
    assertSuccess(nonExistentUser, "Getting a non-existent user by ID should return an empty array"); // Type narrowed to Empty
    assertEquals(nonExistentUser, [], "Getting a non-existent user by ID should return an empty array");
    console.log(`  Query for non-existent ID '${nonExistentId}' returned: ${JSON.stringify(nonExistentUser)}`);

    log(`Query: _checkUserExists(user: '${graceId}')`);
    const graceExists = await concept._checkUserExists({ user: graceId }); // Returns { exists: boolean }
    assert(graceExists.exists, "Grace should exist");
    console.log(`  User ${graceId} exists: ${graceExists.exists}`);

    log(`Query: _getUserByUsername(username: '${user3.username}')`);
    const graceByUsername = await concept._getUserByUsername({ username: user3.username }); // Returns { user: User } | Empty
    assertSuccess(graceByUsername, "Getting Grace by username should succeed"); // Type narrowed
    if ('user' in graceByUsername) {
      assertExists(graceByUsername.user, "Grace should be found by username");
      assertEquals(graceByUsername.user, graceId, "User ID from query should match Grace's ID");
      console.log(`  Found user by username '${user3.username}': ${graceByUsername.user}`);
    } else {
      throw new Error("Expected to find user by username, but received Empty.");
    }
  });

  await client.close(); // Close the database connection after all tests in this file
});
```

# prompt: Cannot find name 'freshID'.deno-ts(2304)
# response:

You are absolutely right! The `freshID` utility function was used in the test file but not explicitly imported there.

I've updated the `UserAuthenticationConcept.test.ts` file to include `freshID` in the import statement from `../../utils/database.ts`.

Here's the corrected test file:

**file: src/UserAuthentication/UserAuthenticationConcept.test.ts**

```typescript
import { assertEquals, assertExists, assert } from "jsr:@std/assert";
import { testDb, freshID } from "../../utils/database.ts"; // Added freshID here
import UserAuthenticationConcept from "./UserAuthenticationConcept.ts";
import { ID, Empty } from "../../utils/types.ts";

Deno.test("UserAuthenticationConcept Tests", async (t) => {
  const [db, client] = await testDb();
  const concept = new UserAuthenticationConcept(db);

  // Helper for console logging
  const log = (message: string, ...args: any[]) => {
    console.log(`\n--- ${message} ---`, ...args);
  };

  // Type guard to check if a result is an error object
  function isErrorResult<T>(result: T | { error: string }): result is { error: string } {
    return typeof result === 'object' && result !== null && 'error' in result && typeof (result as { error: string }).error === 'string';
  }

  // Helper to assert an action/query result is a success (no error object)
  function assertSuccess<TResult>(
    result: TResult | { error: string },
    message: string,
  ): asserts result is TResult {
    if (isErrorResult(result)) {
      throw new Error(`${message}: Unexpected error received: ${result.error}`);
    }
  }

  // Helper to assert an action/query result is an error object
  function assertFailure<TError extends { error: string }>(
    result: any, // Use `any` to allow checking against the actual return type before narrowing
    message: string,
  ): asserts result is TError {
    if (!isErrorResult(result)) {
      throw new Error(`${message}: Expected an error object, but received: ${JSON.stringify(result)}`);
    }
    console.log(`  Expected error: ${result.error}`);
  }


  await t.step("Operational Principle: Register, Authenticate, and Query by Username", async () => {
    log("Trace: Operational Principle");
    log("Principle: After a user registers with a username and a password, they can authenticate with that same username and password and be treated each time as the same user. They can also be looked up by other users when sharing events.");

    const username = "alice";
    const password = "password123";
    let aliceId: ID;

    log("Action: register(username: 'alice', password: 'password123')");
    const registerResult = await concept.register({ username, password });
    assertSuccess(registerResult, "Registration should succeed"); // Type narrowed to { user: ID }
    assertExists(registerResult.user, "Registered user ID should be returned");
    aliceId = registerResult.user;
    console.log(`  Registered user with ID: ${aliceId}`);

    log(`Action: authenticate(username: '${username}', password: '${password}')`);
    const authenticateResult = await concept.authenticate({ username, password });
    assertSuccess(authenticateResult, "Authentication should succeed with correct credentials"); // Type narrowed to { user: ID }
    assertEquals(authenticateResult.user, aliceId, "Authenticated user ID should match registered ID");
    console.log(`  Authenticated user with ID: ${authenticateResult.user}`);

    log(`Query: _getUserByUsername(username: '${username}')`);
    const queryByUsernameResult = await concept._getUserByUsername({ username });
    // Queries like _getUserByUsername return { user: User } | Empty, not explicit error objects
    // So we assert success, then check its specific content.
    assertSuccess(queryByUsernameResult, "Query by username should succeed"); // Type narrowed to { user: ID } | Empty
    if ('user' in queryByUsernameResult) { // Check if 'user' property exists for the non-Empty case
      assertExists(queryByUsernameResult.user, "User should be found by username");
      assertEquals(queryByUsernameResult.user, aliceId, "User ID from query should match registered ID");
      console.log(`  Found user by username: ${queryByUsernameResult.user}`);
    } else {
      throw new Error("Expected to find user by username, but received Empty.");
    }

    log(`Query: _checkUserExists(user: '${aliceId}')`);
    const checkExistsResult = await concept._checkUserExists({ user: aliceId });
    assert(checkExistsResult.exists, "User should exist after registration and authentication"); // _checkUserExists returns { exists: boolean } directly
    console.log(`  User ${aliceId} exists: ${checkExistsResult.exists}`);

    console.log("Operational Principle fulfilled: User registered, authenticated, and successfully looked up.");
  });

  await t.step("Scenario 1: Registration and Authentication Failure Cases", async () => {
    log("Trace: Scenario 1 - Failure Cases");

    const username = "bob";
    const password = "bobpassword";
    const wrongPassword = "wrong";
    const nonExistentUsername = "charlie";

    log(`Action: register(username: '${username}', password: '${password}')`);
    const registerResult = await concept.register({ username, password });
    assertSuccess(registerResult, "Initial registration for Bob should succeed"); // Type narrowed to { user: ID }
    const bobId = registerResult.user;
    console.log(`  Registered user Bob with ID: ${bobId}`);

    log(`Action: register(username: '${username}', password: 'another_password') (Duplicate username)`);
    const duplicateRegisterResult = await concept.register({ username, password: "another_password" });
    assertFailure(duplicateRegisterResult, "Registration with duplicate username should fail"); // Type narrowed to { error: string }
    console.log(`  Attempt to register duplicate username '${username}' failed as expected: ${duplicateRegisterResult.error}`);

    log(`Action: authenticate(username: '${username}', password: '${wrongPassword}') (Wrong password)`);
    const wrongPasswordAuthResult = await concept.authenticate({ username, password: wrongPassword });
    assertFailure(wrongPasswordAuthResult, "Authentication with wrong password should fail"); // Type narrowed to { error: string }
    console.log(`  Attempt to authenticate with wrong password failed as expected: ${wrongPasswordAuthResult.error}`);

    log(`Action: authenticate(username: '${nonExistentUsername}', password: 'any_password') (Non-existent user)`);
    const nonExistentAuthResult = await concept.authenticate({ username: nonExistentUsername, password: "any_password" });
    assertFailure(nonExistentAuthResult, "Authentication for non-existent user should fail"); // Type narrowed to { error: string }
    console.log(`  Attempt to authenticate non-existent user '${nonExistentUsername}' failed as expected: ${nonExistentAuthResult.error}`);

    log(`Query: _checkUserExists(user: '${freshID() as ID}') (Non-existent user ID)`);
    const nonExistentUserCheck = await concept._checkUserExists({ user: freshID() as ID });
    assertEquals(nonExistentUserCheck.exists, false, "Checking for a non-existent user ID should return false");
    console.log(`  Checking for non-existent user ID returned: ${nonExistentUserCheck.exists}`);

    log(`Query: _getUserByUsername(username: '${nonExistentUsername}') (Non-existent username)`);
    const nonExistentUserQuery = await concept._getUserByUsername({ username: nonExistentUsername });
    assertSuccess(nonExistentUserQuery, "Querying for non-existent username should return an empty object"); // Type narrowed to Empty
    assertEquals(Object.keys(nonExistentUserQuery).length, 0, "Querying for non-existent username should return an empty object");
    console.log(`  Querying for non-existent username '${nonExistentUsername}' returned: ${JSON.stringify(nonExistentUserQuery)}`);
  });

  await t.step("Scenario 2: Change Password Functionality", async () => {
    log("Trace: Scenario 2 - Change Password");

    const username = "charlie";
    const initialPassword = "initialpassword";
    const newPassword = "newpassword";

    log(`Action: register(username: '${username}', password: '${initialPassword}')`);
    const registerResult = await concept.register({ username, password: initialPassword });
    assertSuccess(registerResult, "Registration for Charlie should succeed"); // Type narrowed to { user: ID }
    const charlieId = registerResult.user;
    console.log(`  Registered user Charlie with ID: ${charlieId}`);

    log(`Action: authenticate(username: '${username}', password: '${initialPassword}')`);
    const authenticateResult = await concept.authenticate({ username, password: initialPassword });
    assertSuccess(authenticateResult, "Authentication with initial password should succeed"); // Type narrowed to { user: ID }
    console.log(`  Authenticated with initial password.`);

    log(`Action: changePassword(user: '${charlieId}', oldPassword: 'wrong_password', newPassword: '${newPassword}') (Wrong old password)`);
    const wrongOldPasswordResult = await concept.changePassword({ user: charlieId, oldPassword: "wrong_password", newPassword });
    assertFailure(wrongOldPasswordResult, "Changing password with wrong old password should fail"); // Type narrowed to { error: string }
    console.log(`  Attempt to change password with wrong old password failed as expected: ${wrongOldPasswordResult.error}`);

    log(`Action: changePassword(user: '${charlieId}', oldPassword: '${initialPassword}', newPassword: '${initialPassword}') (Same new password)`);
    const sameNewPasswordResult = await concept.changePassword({ user: charlieId, oldPassword: initialPassword, newPassword: initialPassword });
    assertFailure(sameNewPasswordResult, "Changing password to the same password should fail"); // Type narrowed to { error: string }
    console.log(`  Attempt to change password to the same password failed as expected: ${sameNewPasswordResult.error}`);

    log(`Action: changePassword(user: '${charlieId}', oldPassword: '${initialPassword}', newPassword: '${newPassword}') (Successful change)`);
    const changePasswordResult = await concept.changePassword({ user: charlieId, oldPassword: initialPassword, newPassword });
    assertSuccess(changePasswordResult, "Password change should succeed with correct old password and different new password"); // Type narrowed to Empty
    assertEquals(changePasswordResult, {}, "Successful password change should return an empty object");
    console.log(`  Password for Charlie successfully changed.`);

    log(`Action: authenticate(username: '${username}', password: '${initialPassword}') (Old password after change)`);
    const authWithOldPassword = await concept.authenticate({ username, password: initialPassword });
    assertFailure(authWithOldPassword, "Authentication with old password should now fail"); // Type narrowed to { error: string }
    console.log(`  Authentication with old password failed as expected: ${authWithOldPassword.error}`);

    log(`Action: authenticate(username: '${username}', password: '${newPassword}') (New password after change)`);
    const authWithNewPassword = await concept.authenticate({ username, password: newPassword });
    assertSuccess(authWithNewPassword, "Authentication with new password should succeed"); // Type narrowed to { user: ID }
    assertEquals(authWithNewPassword.user, charlieId, "Authenticated user ID should match Charlie's ID");
    console.log(`  Authenticated with new password successfully.`);
  });

  await t.step("Scenario 3: Account Deletion Functionality", async () => {
    log("Trace: Scenario 3 - Account Deletion");

    const username = "diana";
    const password = "dianapassword";

    log(`Action: register(username: '${username}', password: '${password}')`);
    const registerResult = await concept.register({ username, password });
    assertSuccess(registerResult, "Registration for Diana should succeed"); // Type narrowed to { user: ID }
    const dianaId = registerResult.user;
    console.log(`  Registered user Diana with ID: ${dianaId}`);

    log(`Query: _checkUserExists(user: '${dianaId}') before deletion`);
    let checkExistsResult = await concept._checkUserExists({ user: dianaId });
    assert(checkExistsResult.exists, "Diana should exist before deletion");
    console.log(`  Diana exists: ${checkExistsResult.exists}`);

    log(`Action: deleteAccount(user: '${dianaId}')`);
    const deleteResult = await concept.deleteAccount({ user: dianaId });
    assertSuccess(deleteResult, "Account deletion should succeed for existing user"); // Type narrowed to Empty
    assertEquals(deleteResult, {}, "Successful deletion should return an empty object");
    console.log(`  User Diana with ID ${dianaId} successfully deleted.`);

    log(`Query: _checkUserExists(user: '${dianaId}') after deletion`);
    checkExistsResult = await concept._checkUserExists({ user: dianaId });
    assert(!checkExistsResult.exists, "Diana should not exist after deletion");
    console.log(`  Diana exists: ${checkExistsResult.exists}`);

    log(`Action: authenticate(username: '${username}', password: '${password}') (After deletion)`);
    const authAfterDelete = await concept.authenticate({ username, password });
    assertFailure(authAfterDelete, "Authentication should fail for a deleted user"); // Type narrowed to { error: string }
    console.log(`  Authentication for deleted user failed as expected: ${authAfterDelete.error}`);

    log(`Action: deleteAccount(user: '${dianaId}') (Non-existent user)`);
    const deleteNonExistentResult = await concept.deleteAccount({ user: dianaId });
    assertFailure(deleteNonExistentResult, "Deleting a non-existent account should fail"); // Type narrowed to { error: string }
    console.log(`  Attempt to delete non-existent user failed as expected: ${deleteNonExistentResult.error}`);
  });

  await t.step("Scenario 4: Comprehensive Querying", async () => {
    log("Trace: Scenario 4 - Comprehensive Querying");

    const user1 = { username: "eve", password: "evepassword" };
    const user2 = { username: "frank", password: "frankpassword" };
    const user3 = { username: "grace", password: "gracepassword" };

    log("Action: Register Eve");
    const eveResult = await concept.register(user1);
    assertSuccess(eveResult, "Eve registration should succeed"); // Type narrowed to { user: ID }
    const eveId = eveResult.user;
    console.log(`  Registered Eve with ID: ${eveId}`);

    log("Action: Register Frank");
    const frankResult = await concept.register(user2);
    assertSuccess(frankResult, "Frank registration should succeed"); // Type narrowed to { user: ID }
    const frankId = frankResult.user;
    console.log(`  Registered Frank with ID: ${frankId}`);

    log("Action: Register Grace");
    const graceResult = await concept.register(user3);
    assertSuccess(graceResult, "Grace registration should succeed"); // Type narrowed to { user: ID }
    const graceId = graceResult.user;
    console.log(`  Registered Grace with ID: ${graceId}`);

    log("Query: _getAllUsers()");
    const allUsers = await concept._getAllUsers(); // Returns UsersDocument[]
    // _getAllUsers does not return an error object, so we directly assert on its structure
    assert(Array.isArray(allUsers), "Result should be an array");
    assertEquals(allUsers.length, 3, "Should retrieve 3 users (excluding earlier deleted Diana)");
    console.log(`  Retrieved ${allUsers.length} users:`);
    allUsers.forEach(u => console.log(`    ID: ${u._id}, Username: ${u.username}`));
    assertExists(allUsers.find(u => u._id === eveId), "Eve should be in the list");
    assertExists(allUsers.find(u => u._id === frankId), "Frank should be in the list");
    assertExists(allUsers.find(u => u._id === graceId), "Grace should be in the list");

    log(`Query: _getUserById(user: '${frankId}')`);
    const frankById = await concept._getUserById({ user: frankId }); // Returns UsersDocument[] | Empty
    assertSuccess(frankById, "Getting Frank by ID should succeed"); // Type narrowed to UsersDocument[] | Empty
    assert(Array.isArray(frankById), "Result should be an array");
    assertEquals(frankById.length, 1, "Should retrieve exactly one user");
    assertEquals(frankById[0]._id, frankId, "Retrieved user ID should match Frank's ID");
    assertEquals(frankById[0].username, user2.username, "Retrieved username should match Frank's");
    console.log(`  Retrieved user by ID '${frankId}': ${JSON.stringify(frankById[0])}`);

    const nonExistentId = freshID() as ID; // Changed back to using freshID for a truly unique non-existent ID
    log(`Query: _getUserById(user: '${nonExistentId}') (Non-existent ID)`);
    const nonExistentUser = await concept._getUserById({ user: nonExistentId });
    assertSuccess(nonExistentUser, "Getting a non-existent user by ID should return an empty array"); // Type narrowed to Empty
    assertEquals(nonExistentUser, [], "Getting a non-existent user by ID should return an empty array");
    console.log(`  Query for non-existent ID '${nonExistentId}' returned: ${JSON.stringify(nonExistentUser)}`);

    log(`Query: _checkUserExists(user: '${graceId}')`);
    const graceExists = await concept._checkUserExists({ user: graceId }); // Returns { exists: boolean }
    assert(graceExists.exists, "Grace should exist");
    console.log(`  User ${graceId} exists: ${graceExists.exists}`);

    log(`Query: _getUserByUsername(username: '${user3.username}')`);
    const graceByUsername = await concept._getUserByUsername({ username: user3.username }); // Returns { user: User } | Empty
    assertSuccess(graceByUsername, "Getting Grace by username should succeed"); // Type narrowed
    if ('user' in graceByUsername) {
      assertExists(graceByUsername.user, "Grace should be found by username");
      assertEquals(graceByUsername.user, graceId, "User ID from query should match Grace's ID");
      console.log(`  Found user by username '${user3.username}': ${graceByUsername.user}`);
    } else {
      throw new Error("Expected to find user by username, but received Empty.");
    }
  });

  await client.close(); // Close the database connection after all tests in this file
});
```

# prompt: Test fails with AssertionError at serAuthenticationConcept Tests ... Scenario 4: Comprehensive Querying => ./src/concepts/UserAuthentication/UserAuthentication.test.ts:406:11
# response:

You've hit a common pitfall when structuring Deno tests (and many other testing frameworks): the `testDb()` helper function likely drops the database **before each `Deno.test` block**, not before each `t.step` block. This means that users registered in previous `t.step` blocks (Alice, Bob, Charlie) are still present in the database when "Scenario 4: Comprehensive Querying" runs.

Let's trace the user count:

1.  **`Operational Principle`**: `alice` is registered. (1 user)
2.  **`Scenario 1`**: `bob` is registered. (2 users)
3.  **`Scenario 2`**: `charlie` is registered. (3 users)
4.  **`Scenario 3`**: `diana` is registered, then `diana` is deleted. (Still 3 users)
5.  **`Scenario 4`**:
    *   `eve` is registered. (4 users)
    *   `frank` is registered. (5 users)
    *   `grace` is registered. (6 users)

So, when `_getAllUsers()` is called in Scenario 4, there should actually be 6 users (Alice, Bob, Charlie, Eve, Frank, Grace) in the database.

The fix is to update the expected count in the `assertEquals` call on line 406.

**file: src/UserAuthentication/UserAuthenticationConcept.test.ts**

```typescript
import { assertEquals, assertExists, assert } from "jsr:@std/assert";
import { testDb, freshID } from "../../utils/database.ts";
import UserAuthenticationConcept from "./UserAuthenticationConcept.ts";
import { ID, Empty } from "../../utils/types.ts";

Deno.test("UserAuthenticationConcept Tests", async (t) => {
  const [db, client] = await testDb();
  const concept = new UserAuthenticationConcept(db);

  // Helper for console logging
  const log = (message: string, ...args: any[]) => {
    console.log(`\n--- ${message} ---`, ...args);
  };

  // Type guard to check if a result is an error object
  function isErrorResult<T>(result: T | { error: string }): result is { error: string } {
    return typeof result === 'object' && result !== null && 'error' in result && typeof (result as { error: string }).error === 'string';
  }

  // Helper to assert an action/query result is a success (no error object)
  function assertSuccess<TResult>(
    result: TResult | { error: string },
    message: string,
  ): asserts result is TResult {
    if (isErrorResult(result)) {
      throw new Error(`${message}: Unexpected error received: ${result.error}`);
    }
  }

  // Helper to assert an action/query result is an error object
  function assertFailure<TError extends { error: string }>(
    result: any, // Use `any` to allow checking against the actual return type before narrowing
    message: string,
  ): asserts result is TError {
    if (!isErrorResult(result)) {
      throw new Error(`${message}: Expected an error object, but received: ${JSON.stringify(result)}`);
    }
    console.log(`  Expected error: ${result.error}`);
  }


  await t.step("Operational Principle: Register, Authenticate, and Query by Username", async () => {
    log("Trace: Operational Principle");
    log("Principle: After a user registers with a username and a password, they can authenticate with that same username and password and be treated each time as the same user. They can also be looked up by other users when sharing events.");

    const username = "alice";
    const password = "password123";
    let aliceId: ID;

    log("Action: register(username: 'alice', password: 'password123')");
    const registerResult = await concept.register({ username, password });
    assertSuccess(registerResult, "Registration should succeed"); // Type narrowed to { user: ID }
    assertExists(registerResult.user, "Registered user ID should be returned");
    aliceId = registerResult.user;
    console.log(`  Registered user with ID: ${aliceId}`);

    log(`Action: authenticate(username: '${username}', password: '${password}')`);
    const authenticateResult = await concept.authenticate({ username, password });
    assertSuccess(authenticateResult, "Authentication should succeed with correct credentials"); // Type narrowed to { user: ID }
    assertEquals(authenticateResult.user, aliceId, "Authenticated user ID should match registered ID");
    console.log(`  Authenticated user with ID: ${authenticateResult.user}`);

    log(`Query: _getUserByUsername(username: '${username}')`);
    const queryByUsernameResult = await concept._getUserByUsername({ username });
    // Queries like _getUserByUsername return { user: User } | Empty, not explicit error objects
    // So we assert success, then check its specific content.
    assertSuccess(queryByUsernameResult, "Query by username should succeed"); // Type narrowed to { user: ID } | Empty
    if ('user' in queryByUsernameResult) { // Check if 'user' property exists for the non-Empty case
      assertExists(queryByUsernameResult.user, "User should be found by username");
      assertEquals(queryByUsernameResult.user, aliceId, "User ID from query should match registered ID");
      console.log(`  Found user by username: ${queryByUsernameResult.user}`);
    } else {
      throw new Error("Expected to find user by username, but received Empty.");
    }

    log(`Query: _checkUserExists(user: '${aliceId}')`);
    const checkExistsResult = await concept._checkUserExists({ user: aliceId });
    assert(checkExistsResult.exists, "User should exist after registration and authentication"); // _checkUserExists returns { exists: boolean } directly
    console.log(`  User ${aliceId} exists: ${checkExistsResult.exists}`);

    console.log("Operational Principle fulfilled: User registered, authenticated, and successfully looked up.");
  });

  await t.step("Scenario 1: Registration and Authentication Failure Cases", async () => {
    log("Trace: Scenario 1 - Failure Cases");

    const username = "bob";
    const password = "bobpassword";
    const wrongPassword = "wrong";
    const nonExistentUsername = "charlie";

    log(`Action: register(username: '${username}', password: '${password}')`);
    const registerResult = await concept.register({ username, password });
    assertSuccess(registerResult, "Initial registration for Bob should succeed"); // Type narrowed to { user: ID }
    const bobId = registerResult.user;
    console.log(`  Registered user Bob with ID: ${bobId}`);

    log(`Action: register(username: '${username}', password: 'another_password') (Duplicate username)`);
    const duplicateRegisterResult = await concept.register({ username, password: "another_password" });
    assertFailure(duplicateRegisterResult, "Registration with duplicate username should fail"); // Type narrowed to { error: string }
    console.log(`  Attempt to register duplicate username '${username}' failed as expected: ${duplicateRegisterResult.error}`);

    log(`Action: authenticate(username: '${username}', password: '${wrongPassword}') (Wrong password)`);
    const wrongPasswordAuthResult = await concept.authenticate({ username, password: wrongPassword });
    assertFailure(wrongPasswordAuthResult, "Authentication with wrong password should fail"); // Type narrowed to { error: string }
    console.log(`  Attempt to authenticate with wrong password failed as expected: ${wrongPasswordAuthResult.error}`);

    log(`Action: authenticate(username: '${nonExistentUsername}', password: 'any_password') (Non-existent user)`);
    const nonExistentAuthResult = await concept.authenticate({ username: nonExistentUsername, password: "any_password" });
    assertFailure(nonExistentAuthResult, "Authentication for non-existent user should fail"); // Type narrowed to { error: string }
    console.log(`  Attempt to authenticate non-existent user '${nonExistentUsername}' failed as expected: ${nonExistentAuthResult.error}`);

    log(`Query: _checkUserExists(user: '${freshID() as ID}') (Non-existent user ID)`);
    const nonExistentUserCheck = await concept._checkUserExists({ user: freshID() as ID });
    assertEquals(nonExistentUserCheck.exists, false, "Checking for a non-existent user ID should return false");
    console.log(`  Checking for non-existent user ID returned: ${nonExistentUserCheck.exists}`);

    log(`Query: _getUserByUsername(username: '${nonExistentUsername}') (Non-existent username)`);
    const nonExistentUserQuery = await concept._getUserByUsername({ username: nonExistentUsername });
    assertSuccess(nonExistentUserQuery, "Querying for non-existent username should return an empty object"); // Type narrowed to Empty
    assertEquals(Object.keys(nonExistentUserQuery).length, 0, "Querying for non-existent username should return an empty object");
    console.log(`  Querying for non-existent username '${nonExistentUsername}' returned: ${JSON.stringify(nonExistentUserQuery)}`);
  });

  await t.step("Scenario 2: Change Password Functionality", async () => {
    log("Trace: Scenario 2 - Change Password");

    const username = "charlie";
    const initialPassword = "initialpassword";
    const newPassword = "newpassword";

    log(`Action: register(username: '${username}', password: '${initialPassword}')`);
    const registerResult = await concept.register({ username, password: initialPassword });
    assertSuccess(registerResult, "Registration for Charlie should succeed"); // Type narrowed to { user: ID }
    const charlieId = registerResult.user;
    console.log(`  Registered user Charlie with ID: ${charlieId}`);

    log(`Action: authenticate(username: '${username}', password: '${initialPassword}')`);
    const authenticateResult = await concept.authenticate({ username, password: initialPassword });
    assertSuccess(authenticateResult, "Authentication with initial password should succeed"); // Type narrowed to { user: ID }
    console.log(`  Authenticated with initial password.`);

    log(`Action: changePassword(user: '${charlieId}', oldPassword: 'wrong_password', newPassword: '${newPassword}') (Wrong old password)`);
    const wrongOldPasswordResult = await concept.changePassword({ user: charlieId, oldPassword: "wrong_password", newPassword });
    assertFailure(wrongOldPasswordResult, "Changing password with wrong old password should fail"); // Type narrowed to { error: string }
    console.log(`  Attempt to change password with wrong old password failed as expected: ${wrongOldPasswordResult.error}`);

    log(`Action: changePassword(user: '${charlieId}', oldPassword: '${initialPassword}', newPassword: '${initialPassword}') (Same new password)`);
    const sameNewPasswordResult = await concept.changePassword({ user: charlieId, oldPassword: initialPassword, newPassword: initialPassword });
    assertFailure(sameNewPasswordResult, "Changing password to the same password should fail"); // Type narrowed to { error: string }
    console.log(`  Attempt to change password to the same password failed as expected: ${sameNewPasswordResult.error}`);

    log(`Action: changePassword(user: '${charlieId}', oldPassword: '${initialPassword}', newPassword: '${newPassword}') (Successful change)`);
    const changePasswordResult = await concept.changePassword({ user: charlieId, oldPassword: initialPassword, newPassword });
    assertSuccess(changePasswordResult, "Password change should succeed with correct old password and different new password"); // Type narrowed to Empty
    assertEquals(changePasswordResult, {}, "Successful password change should return an empty object");
    console.log(`  Password for Charlie successfully changed.`);

    log(`Action: authenticate(username: '${username}', password: '${initialPassword}') (Old password after change)`);
    const authWithOldPassword = await concept.authenticate({ username, password: initialPassword });
    assertFailure(authWithOldPassword, "Authentication with old password should now fail"); // Type narrowed to { error: string }
    console.log(`  Authentication with old password failed as expected: ${authWithOldPassword.error}`);

    log(`Action: authenticate(username: '${username}', password: '${newPassword}') (New password after change)`);
    const authWithNewPassword = await concept.authenticate({ username, password: newPassword });
    assertSuccess(authWithNewPassword, "Authentication with new password should succeed"); // Type narrowed to { user: ID }
    assertEquals(authWithNewPassword.user, charlieId, "Authenticated user ID should match Charlie's ID");
    console.log(`  Authenticated with new password successfully.`);
  });

  await t.step("Scenario 3: Account Deletion Functionality", async () => {
    log("Trace: Scenario 3 - Account Deletion");

    const username = "diana";
    const password = "dianapassword";

    log(`Action: register(username: '${username}', password: '${password}')`);
    const registerResult = await concept.register({ username, password });
    assertSuccess(registerResult, "Registration for Diana should succeed"); // Type narrowed to { user: ID }
    const dianaId = registerResult.user;
    console.log(`  Registered user Diana with ID: ${dianaId}`);

    log(`Query: _checkUserExists(user: '${dianaId}') before deletion`);
    let checkExistsResult = await concept._checkUserExists({ user: dianaId });
    assert(checkExistsResult.exists, "Diana should exist before deletion");
    console.log(`  Diana exists: ${checkExistsResult.exists}`);

    log(`Action: deleteAccount(user: '${dianaId}')`);
    const deleteResult = await concept.deleteAccount({ user: dianaId });
    assertSuccess(deleteResult, "Account deletion should succeed for existing user"); // Type narrowed to Empty
    assertEquals(deleteResult, {}, "Successful deletion should return an empty object");
    console.log(`  User Diana with ID ${dianaId} successfully deleted.`);

    log(`Query: _checkUserExists(user: '${dianaId}') after deletion`);
    checkExistsResult = await concept._checkUserExists({ user: dianaId });
    assert(!checkExistsResult.exists, "Diana should not exist after deletion");
    console.log(`  Diana exists: ${checkExistsResult.exists}`);

    log(`Action: authenticate(username: '${username}', password: '${password}') (After deletion)`);
    const authAfterDelete = await concept.authenticate({ username, password });
    assertFailure(authAfterDelete, "Authentication should fail for a deleted user"); // Type narrowed to { error: string }
    console.log(`  Authentication for deleted user failed as expected: ${authAfterDelete.error}`);

    log(`Action: deleteAccount(user: '${dianaId}') (Non-existent user)`);
    const deleteNonExistentResult = await concept.deleteAccount({ user: dianaId });
    assertFailure(deleteNonExistentResult, "Deleting a non-existent account should fail"); // Type narrowed to { error: string }
    console.log(`  Attempt to delete non-existent user failed as expected: ${deleteNonExistentResult.error}`);
  });

  await t.step("Scenario 4: Comprehensive Querying", async () => {
    log("Trace: Scenario 4 - Comprehensive Querying");

    const user1 = { username: "eve", password: "evepassword" };
    const user2 = { username: "frank", password: "frankpassword" };
    const user3 = { username: "grace", password: "gracepassword" };

    log("Action: Register Eve");
    const eveResult = await concept.register(user1);
    assertSuccess(eveResult, "Eve registration should succeed"); // Type narrowed to { user: ID }
    const eveId = eveResult.user;
    console.log(`  Registered Eve with ID: ${eveId}`);

    log("Action: Register Frank");
    const frankResult = await concept.register(user2);
    assertSuccess(frankResult, "Frank registration should succeed"); // Type narrowed to { user: ID }
    const frankId = frankResult.user;
    console.log(`  Registered Frank with ID: ${frankId}`);

    log("Action: Register Grace");
    const graceResult = await concept.register(user3);
    assertSuccess(graceResult, "Grace registration should succeed"); // Type narrowed to { user: ID }
    const graceId = graceResult.user;
    console.log(`  Registered Grace with ID: ${graceId}`);

    log("Query: _getAllUsers()");
    const allUsers = await concept._getAllUsers(); // Returns UsersDocument[]
    // _getAllUsers does not return an error object, so we directly assert on its structure
    assert(Array.isArray(allUsers), "Result should be an array");
    // FIX: Expected 6 users, not 3, because previous test steps also added users.
    assertEquals(allUsers.length, 6, "Should retrieve 6 users (Alice, Bob, Charlie, Eve, Frank, Grace)");
    console.log(`  Retrieved ${allUsers.length} users:`);
    allUsers.forEach(u => console.log(`    ID: ${u._id}, Username: ${u.username}`));
    assertExists(allUsers.find(u => u._id === eveId), "Eve should be in the list");
    assertExists(allUsers.find(u => u._id === frankId), "Frank should be in the list");
    assertExists(allUsers.find(u => u._id === graceId), "Grace should be in the list");

    log(`Query: _getUserById(user: '${frankId}')`);
    const frankById = await concept._getUserById({ user: frankId }); // Returns UsersDocument[] | Empty
    assertSuccess(frankById, "Getting Frank by ID should succeed"); // Type narrowed to UsersDocument[] | Empty
    assert(Array.isArray(frankById), "Result should be an array");
    assertEquals(frankById.length, 1, "Should retrieve exactly one user");
    assertEquals(frankById[0]._id, frankId, "Retrieved user ID should match Frank's ID");
    assertEquals(frankById[0].username, user2.username, "Retrieved username should match Frank's");
    console.log(`  Retrieved user by ID '${frankId}': ${JSON.stringify(frankById[0])}`);

    const nonExistentId = freshID() as ID; // Using freshID for a truly unique non-existent ID
    log(`Query: _getUserById(user: '${nonExistentId}') (Non-existent ID)`);
    const nonExistentUser = await concept._getUserById({ user: nonExistentId });
    assertSuccess(nonExistentUser, "Getting a non-existent user by ID should return an empty array"); // Type narrowed to Empty
    assertEquals(nonExistentUser, [], "Getting a non-existent user by ID should return an empty array");
    console.log(`  Query for non-existent ID '${nonExistentId}' returned: ${JSON.stringify(nonExistentUser)}`);

    log(`Query: _checkUserExists(user: '${graceId}')`);
    const graceExists = await concept._checkUserExists({ user: graceId }); // Returns { exists: boolean }
    assert(graceExists.exists, "Grace should exist");
    console.log(`  User ${graceId} exists: ${graceExists.exists}`);

    log(`Query: _getUserByUsername(username: '${user3.username}')`);
    const graceByUsername = await concept._getUserByUsername({ username: user3.username }); // Returns { user: User } | Empty
    assertSuccess(graceByUsername, "Getting Grace by username should succeed"); // Type narrowed
    if ('user' in graceByUsername) {
      assertExists(graceByUsername.user, "Grace should be found by username");
      assertEquals(graceByUsername.user, graceId, "User ID from query should match Grace's ID");
      console.log(`  Found user by username '${user3.username}': ${graceByUsername.user}`);
    } else {
      throw new Error("Expected to find user by username, but received Empty.");
    }
  });

  await client.close(); // Close the database connection after all tests in this file
});
```