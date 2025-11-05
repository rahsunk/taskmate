---
timestamp: 'Tue Nov 04 2025 21:50:55 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251104_215055.8679bfee.md]]'
content_id: 24d0f9907b1f39eba01450c09fb8e7a8b3d9a28252f7785082702d9d8f6a5cd3
---

# file: src/UserAuthentication/UserAuthenticationConcept.test.ts

```typescript
import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "../../utils/database.ts";
import UserAuthenticationConcept from "./UserAuthenticationConcept.ts";

// Test suite for the UserAuthenticationConcept
Deno.test("UserAuthenticationConcept", async (t) => {
  const [db, client] = await testDb();
  const concept = new UserAuthenticationConcept(db);

  await t.step("Operational Principle: Register and Authenticate", async () => {
    console.log("--- Testing Operational Principle: Register and Authenticate ---");

    // Step 1: Register a new user
    const username = "testuser_principle";
    const password = "password123";
    console.log(
      `Attempting to register user '${username}' with password '${password}'...`,
    );
    const registerResult = await concept.register({ username, password });
    console.log("Register result:", registerResult);

    // Assert that registration was successful and returned a user ID
    assertNotEquals("error" in registerResult, true, "Registration should not return an error.");
    if ("user" in registerResult) { // Type assertion
      assertExists(registerResult.user, "Registration should return a user ID.");
      const userId = registerResult.user;

      // Step 2: Authenticate with the same credentials
      console.log(`Attempting to authenticate user '${username}'...`);
      const authResult = await concept.authenticate({ username, password });
      console.log("Authentication result:", authResult);

      // Assert that authentication was successful
      assertNotEquals("error" in authResult, true, "Authentication should not return an error.");
      if ("user" in authResult) { // Type assertion
        // Assert that the authenticated user ID is the same as the registered one
        assertEquals(
          authResult.user,
          userId,
          "Authenticated user ID should match the registered user ID.",
        );
        console.log(
          "Principle confirmed: User registered and authenticated successfully.",
        );
      }
    }
  });

  await t.step(
    "Scenario 1: Attempt to register a duplicate username",
    async () => {
      console.log("\n--- Testing Scenario 1: Duplicate Username Registration ---");
      const username = "duplicate_user";
      const password = "password_A";

      // Step 1: Register the user for the first time
      console.log(`Registering '${username}' for the first time...`);
      const firstRegisterResult = await concept.register({
        username,
        password,
      });
      console.log("First registration result:", firstRegisterResult);
      assertNotEquals("error" in firstRegisterResult, true, "First registration should succeed.");

      // Step 2: Attempt to register with the same username again
      console.log(`Attempting to register '${username}' again...`);
      const secondRegisterResult = await concept.register({
        username,
        password: "password_B",
      }); // Using a different password to be sure
      console.log("Second registration result:", secondRegisterResult);

      // Assert that the second registration fails and returns an error
      assertEquals("error" in secondRegisterResult, true, "Second registration should fail.");
      if ("error" in secondRegisterResult) { // Type assertion
        assertExists(
          secondRegisterResult.error,
          "An error message should be returned.",
        );
        console.log("Scenario confirmed: Cannot register a duplicate username.");
      }
    },
  );

  await t.step("Scenario 2: Failed authentication attempts", async () => {
    console.log("\n--- Testing Scenario 2: Failed Authentication ---");
    const username = "auth_fail_user";
    const correctPassword = "correct_password";
    const wrongPassword = "wrong_password";

    // Step 1: Register a user
    console.log(`Registering user '${username}'...`);
    await concept.register({ username, password: correctPassword });

    // Step 2: Attempt authentication with wrong password
    console.log("Attempting authentication with wrong password...");
    const wrongPassResult = await concept.authenticate({
      username,
      password: wrongPassword,
    });
    console.log("Result:", wrongPassResult);
    assertEquals("error" in wrongPassResult, true, "Authentication with wrong password should fail.");

    // Step 3: Attempt authentication with non-existent username
    console.log("Attempting authentication with non-existent username...");
    const nonExistentUserResult = await concept.authenticate({
      username: "non_existent_user",
      password: "any_password",
    });
    console.log("Result:", nonExistentUserResult);
    assertEquals("error" in nonExistentUserResult, true, "Authentication for non-existent user should fail.");
    console.log("Scenario confirmed: Invalid credentials lead to authentication failure.");
  });

  await t.step(
    "Scenario 3: Successfully change password and use new credentials",
    async () => {
      console.log("\n--- Testing Scenario 3: Change Password ---");
      const username = "changepass_user";
      const oldPassword = "old_password";
      const newPassword = "new_password";

      // Step 1: Register and get user ID
      console.log(`Registering user '${username}'...`);
      const registerResult = await concept.register({
        username,
        password: oldPassword,
      });
      assertNotEquals("error" in registerResult, true);
      if ("user" in registerResult) {
        const userId = registerResult.user;

        // Step 2: Change the password
        console.log("Attempting to change password...");
        const changePassResult = await concept.changePassword({
          user: userId,
          oldPassword,
          newPassword,
        });
        console.log("Change password result:", changePassResult);
        assertEquals("error" in changePassResult, false, "Password change should succeed.");

        // Step 3: Attempt to authenticate with the old password
        console.log("Attempting to authenticate with OLD password...");
        const oldAuthResult = await concept.authenticate({
          username,
          password: oldPassword,
        });
        console.log("Old auth result:", oldAuthResult);
        assertEquals("error" in oldAuthResult, true, "Authentication with old password should fail.");

        // Step 4: Authenticate with the new password
        console.log("Attempting to authenticate with NEW password...");
        const newAuthResult = await concept.authenticate({
          username,
          password: newPassword,
        });
        console.log("New auth result:", newAuthResult);
        assertNotEquals("error" in newAuthResult, true, "Authentication with new password should succeed.");

        console.log(
          "Scenario confirmed: Password changed and new credentials work.",
        );
      }
    },
  );

  await t.step("Scenario 4: Delete an account", async () => {
    console.log("\n--- Testing Scenario 4: Delete Account ---");
    const username = "delete_user";
    const password = "password_to_delete";

    // Step 1: Register and get user ID
    console.log(`Registering user '${username}' to be deleted...`);
    const registerResult = await concept.register({ username, password });
    assertNotEquals("error" in registerResult, true);
    if ("user" in registerResult) {
      const userId = registerResult.user;

      // Step 2: Delete the account
      console.log(`Deleting account for user ID '${userId}'...`);
      const deleteResult = await concept.deleteAccount({ user: userId });
      console.log("Delete result:", deleteResult);
      assertEquals("error" in deleteResult, false, "Account deletion should succeed.");

      // Step 3: Verify user no longer exists using a query
      console.log("Verifying user no longer exists...");
      const checkResult = await concept._checkUserExists({ user: userId });
      assertEquals(checkResult[0].exists, false, "User should not exist after deletion.");

      // Step 4: Attempt to authenticate the deleted user
      console.log("Attempting to authenticate deleted user...");
      const authResult = await concept.authenticate({ username, password });
      console.log("Auth result:", authResult);
      assertEquals("error" in authResult, true, "Authentication for deleted user should fail.");
      console.log(
        "Scenario confirmed: Account deleted and can no longer be used.",
      );
    }
  });

  await client.close(); // Close the database connection
});
```
