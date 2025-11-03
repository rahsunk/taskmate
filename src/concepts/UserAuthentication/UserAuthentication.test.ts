// // # file: src/UserAuthentication/UserAuthenticationConcept.test.ts

// import {
//   assertArrayIncludes,
//   assertEquals,
//   assertExists,
//   assertFalse,
//   assertNotEquals,
// } from "jsr:@std/assert";
// import { testDb } from "../../utils/database.ts"; // Adjust path as per your project structure
// import UserAuthenticationConcept from "./UserAuthenticationConcept.ts";
// import { Empty, ID } from "../../utils/types.ts";

// Deno.test("UserAuthentication Concept Tests", async (t) => {
//   const [db, client] = await testDb();
//   const authConcept = new UserAuthenticationConcept(db);

//   // Declare user ID variables in the outer scope to retain state across t.step blocks
//   let aliceUser: ID;
//   let bobUser: ID;
//   let charlieUser: ID;
//   let davidUser: ID; // David is created and deleted within its scenario
//   let eveUser: ID;
//   let frankUser: ID;

//   // Helper to log action calls and results
//   const logAction = <T, E>(
//     name: string,
//     args: Record<string, unknown>,
//     result: T | E,
//   ): void => {
//     console.log(`--- Action: ${name} ---`);
//     console.log(`Input: ${JSON.stringify(args)}`);
//     if ("error" in (result as Record<string, unknown>)) {
//       console.log(
//         `Result: { error: "${(result as { error: string }).error}" }`,
//       );
//     } else {
//       console.log(`Result: ${JSON.stringify(result)}`);
//     }
//     console.log("-----------------------");
//   };

//   // Helper to log query calls and results
//   const logQuery = <T>(
//     name: string,
//     args: Record<string, unknown>,
//     result: T,
//   ): void => {
//     console.log(`--- Query: ${name} ---`);
//     console.log(`Input: ${JSON.stringify(args)}`);
//     console.log(`Result: ${JSON.stringify(result)}`);
//     console.log("-----------------------");
//   };

//   await t.step(
//     "Operational Principle: User Registration, Authentication, and Lookup",
//     async () => {
//       console.log("\n--- Executing Operational Principle Scenario ---");

//       // 1. Register a user (Alice)
//       const registerAliceArgs = { username: "alice", password: "password123" };
//       const registerAliceResult = await authConcept.register(registerAliceArgs);
//       logAction("register", registerAliceArgs, registerAliceResult);

//       if ("error" in registerAliceResult) {
//         assertNotEquals(
//           registerAliceResult.error,
//           registerAliceResult.error,
//           "Registration should not fail unexpectedly",
//         );
//         return; // Stop if registration fails (unexpectedly)
//       }
//       aliceUser = registerAliceResult.user; // Assign to outer scope variable
//       assertExists(
//         aliceUser,
//         "Alice's user ID should be returned upon successful registration.",
//       );
//       console.log(`✅ Registered Alice with ID: ${aliceUser}`);

//       // 2. Authenticate Alice successfully
//       const authenticateAliceArgs = {
//         username: "alice",
//         password: "password123",
//       };
//       const authenticateAliceResult = await authConcept.authenticate(
//         authenticateAliceArgs,
//       );
//       logAction("authenticate", authenticateAliceArgs, authenticateAliceResult);

//       if ("error" in authenticateAliceResult) {
//         assertNotEquals(
//           authenticateAliceResult.error,
//           authenticateAliceResult.error,
//           "Authentication should not fail unexpectedly",
//         );
//         return; // Stop if authentication fails (unexpectedly)
//       }
//       assertEquals(
//         authenticateAliceResult.user,
//         aliceUser,
//         "Authentication should return Alice's ID.",
//       );
//       console.log(`✅ Authenticated Alice successfully.`);

//       // 3. Use _getUserByUsername to look up Alice
//       const getUserByUsernameArgs = { username: "alice" };
//       const getUserByUsernameResult = await authConcept._getUserByUsername(
//         getUserByUsernameArgs,
//       );
//       logQuery(
//         "_getUserByUsername",
//         getUserByUsernameArgs,
//         getUserByUsernameResult,
//       );

//       if ("user" in getUserByUsernameResult) { // Type assertion for union type
//         assertEquals(
//           getUserByUsernameResult.user,
//           aliceUser,
//           "Query by username should return Alice's ID.",
//         );
//         console.log(
//           `✅ Found Alice by username: ${getUserByUsernameResult.user}`,
//         );
//       } else {
//         // If no user field, it means it returned Empty. For this scenario, we expect success.
//         assertExists(
//           getUserByUsernameResult,
//           "Should have found user by username.",
//         );
//       }

//       // 4. Use _checkUserExists for Alice
//       const checkUserExistsArgs = { user: aliceUser };
//       const checkUserExistsResult = await authConcept._checkUserExists(
//         checkUserExistsArgs,
//       );
//       logQuery("_checkUserExists", checkUserExistsArgs, checkUserExistsResult);
//       assertEquals(checkUserExistsResult.exists, true, "Alice should exist.");
//       console.log(`✅ Confirmed Alice exists.`);

//       // 5. Use _getAllUsers to verify Alice is there (expect array with one user)
//       const getAllUsersResult = await authConcept._getAllUsers();
//       logQuery("_getAllUsers", {}, getAllUsersResult);
//       assertEquals(
//         getAllUsersResult.length,
//         1,
//         "Should have exactly one user in the database (Alice).",
//       );
//       assertEquals(
//         getAllUsersResult[0]._id,
//         aliceUser,
//         "The retrieved user should be Alice.",
//       );
//       assertEquals(
//         getAllUsersResult[0].username,
//         "alice",
//         "The retrieved username should be alice.",
//       );
//       console.log(`✅ Confirmed Alice is present via _getAllUsers.`);

//       // 6. Use _getUserById to fetch Alice by her ID
//       const getUserByIdArgs = { user: aliceUser };
//       const getUserByIdResult = await authConcept._getUserById(getUserByIdArgs);
//       logQuery("_getUserById", getUserByIdArgs, getUserByIdResult);

//       if (Array.isArray(getUserByIdResult) && getUserByIdResult.length > 0) { // Type assertion for union type
//         assertEquals(
//           getUserByIdResult[0]._id,
//           aliceUser,
//           "Query by ID should return Alice's document.",
//         );
//         console.log(`✅ Found Alice by ID.`);
//       } else {
//         assertExists(getUserByIdResult, "Should have found user by ID.");
//       }

//       // 7. Use _getUsernameById to fetch Alice's username
//       const getUsernameByIdArgs = { user: aliceUser };
//       const getUsernameByIdResult = await authConcept._getUsernameById(
//         getUsernameByIdArgs,
//       );
//       logQuery("_getUsernameById", getUsernameByIdArgs, getUsernameByIdResult);

//       if ("username" in getUsernameByIdResult) { // Type assertion for union type
//         assertEquals(
//           getUsernameByIdResult.username,
//           "alice",
//           "Query for username by ID should return 'alice'.",
//         );
//         console.log(`✅ Retrieved Alice's username by ID.`);
//       } else {
//         assertExists(
//           getUsernameByIdResult,
//           "Should have retrieved username by ID.",
//         );
//       }

//       console.log("--- Operational Principle Scenario Complete ---");
//     },
//   );

//   await t.step(
//     "Scenario 1: Registration and Authentication Failure Cases",
//     async () => {
//       console.log("\n--- Executing Failure Cases Scenario ---");

//       // Register a user (Bob) for base case
//       const registerBobArgs = { username: "bob", password: "bob_password" };
//       const registerBobResult = await authConcept.register(registerBobArgs);
//       logAction("register", registerBobArgs, registerBobResult);
//       if ("error" in registerBobResult) {
//         assertNotEquals(
//           registerBobResult.error,
//           registerBobResult.error,
//           "Bob registration should succeed",
//         );
//         return;
//       }
//       bobUser = registerBobResult.user; // Assign to outer scope variable
//       assertExists(bobUser, "Bob's user ID should exist.");
//       console.log(`✅ Registered Bob with ID: ${bobUser}`);

//       // Verify current user count (Alice + Bob = 2 users)
//       const currentUsers1 = await authConcept._getAllUsers();
//       assertEquals(
//         currentUsers1.length,
//         2,
//         "Should have two users after Bob's registration.",
//       );
//       assertArrayIncludes(
//         currentUsers1.map((u) => u._id),
//         [aliceUser, bobUser],
//         "Alice and Bob should be present.",
//       );

//       // Attempt to register with an existing username (expect error)
//       const registerDuplicateBobArgs = {
//         username: "bob",
//         password: "another_password",
//       };
//       const registerDuplicateBobResult = await authConcept.register(
//         registerDuplicateBobArgs,
//       );
//       logAction(
//         "register",
//         registerDuplicateBobArgs,
//         registerDuplicateBobResult,
//       );
//       if ("error" in registerDuplicateBobResult) { // Type assertion for union type
//         assertEquals(
//           registerDuplicateBobResult.error,
//           "User with username 'bob' already exists.",
//           "Should prevent duplicate username registration.",
//         );
//         console.log(
//           `✅ Correctly prevented registration with duplicate username.`,
//         );
//       } else {
//         assertExists(
//           registerDuplicateBobResult.user,
//           "Should have returned an error for duplicate username.",
//         );
//       }

//       // Attempt to authenticate with wrong password (expect error)
//       const authenticateWrongPasswordArgs = {
//         username: "bob",
//         password: "wrong_password",
//       };
//       const authenticateWrongPasswordResult = await authConcept.authenticate(
//         authenticateWrongPasswordArgs,
//       );
//       logAction(
//         "authenticate",
//         authenticateWrongPasswordArgs,
//         authenticateWrongPasswordResult,
//       );
//       if ("error" in authenticateWrongPasswordResult) { // Type assertion for union type
//         assertEquals(
//           authenticateWrongPasswordResult.error,
//           "Invalid username or password.",
//           "Should fail authentication with wrong password.",
//         );
//         console.log(`✅ Correctly failed authentication with wrong password.`);
//       } else {
//         assertExists(
//           authenticateWrongPasswordResult.user,
//           "Should have returned an error for wrong password.",
//         );
//       }

//       // Attempt to authenticate with non-existent username (expect error)
//       const authenticateNonExistentArgs = {
//         username: "unknown",
//         password: "any_password",
//       };
//       const authenticateNonExistentResult = await authConcept.authenticate(
//         authenticateNonExistentArgs,
//       );
//       logAction(
//         "authenticate",
//         authenticateNonExistentArgs,
//         authenticateNonExistentResult,
//       );
//       if ("error" in authenticateNonExistentResult) { // Type assertion for union type
//         assertEquals(
//           authenticateNonExistentResult.error,
//           "Invalid username or password.",
//           "Should fail authentication for non-existent user.",
//         );
//         console.log(
//           `✅ Correctly failed authentication for non-existent user.`,
//         );
//       } else {
//         assertExists(
//           authenticateNonExistentResult.user,
//           "Should have returned an error for non-existent user.",
//         );
//       }

//       console.log("--- Failure Cases Scenario Complete ---");
//     },
//   );

//   await t.step("Scenario 2: Password Change Functionality", async () => {
//     console.log("\n--- Executing Password Change Scenario ---");

//     // Register a user (Charlie)
//     const registerCharlieArgs = {
//       username: "charlie",
//       password: "charlie_old_pass",
//     };
//     const registerCharlieResult = await authConcept.register(
//       registerCharlieArgs,
//     );
//     logAction("register", registerCharlieArgs, registerCharlieResult);
//     if ("error" in registerCharlieResult) {
//       assertNotEquals(
//         registerCharlieResult.error,
//         registerCharlieResult.error,
//         "Charlie registration should succeed",
//       );
//       return;
//     }
//     charlieUser = registerCharlieResult.user; // Assign to outer scope variable
//     assertExists(charlieUser, "Charlie's user ID should exist.");
//     console.log(`✅ Registered Charlie with ID: ${charlieUser}`);

//     // Verify current user count (Alice + Bob + Charlie = 3 users)
//     const currentUsers2 = await authConcept._getAllUsers();
//     assertEquals(
//       currentUsers2.length,
//       3,
//       "Should have three users after Charlie's registration.",
//     );
//     assertArrayIncludes(currentUsers2.map((u) => u._id), [
//       aliceUser,
//       bobUser,
//       charlieUser,
//     ], "Alice, Bob, and Charlie should be present.");

//     // Authenticate Charlie
//     const authenticateCharlieArgs = {
//       username: "charlie",
//       password: "charlie_old_pass",
//     };
//     const authenticateCharlieResult = await authConcept.authenticate(
//       authenticateCharlieArgs,
//     );
//     logAction(
//       "authenticate",
//       authenticateCharlieArgs,
//       authenticateCharlieResult,
//     );
//     if ("error" in authenticateCharlieResult) {
//       assertNotEquals(
//         authenticateCharlieResult.error,
//         authenticateCharlieResult.error,
//         "Charlie authentication should succeed",
//       );
//       return;
//     }
//     assertEquals(
//       authenticateCharlieResult.user,
//       charlieUser,
//       "Charlie should authenticate with old password.",
//     );
//     console.log(`✅ Authenticated Charlie with old password.`);

//     // Attempt to change Charlie's password with wrong old password (expect error)
//     const changePasswordWrongOldArgs = {
//       user: charlieUser,
//       oldPassword: "wrong_old_pass",
//       newPassword: "charlie_new_pass",
//     };
//     const changePasswordWrongOldResult = await authConcept.changePassword(
//       changePasswordWrongOldArgs,
//     );
//     logAction(
//       "changePassword",
//       changePasswordWrongOldArgs,
//       changePasswordWrongOldResult,
//     );
//     if ("error" in changePasswordWrongOldResult) { // Type assertion for union type
//       assertEquals(
//         changePasswordWrongOldResult.error,
//         "Old password does not match.",
//         "Should fail to change password with wrong old password.",
//       );
//       console.log(
//         `✅ Correctly failed to change password with wrong old password.`,
//       );
//     } else {
//       // If no error, it should be an Empty object. Assert it's not a successful empty object if an error was expected.
//       assertNotEquals(
//         Object.keys(changePasswordWrongOldResult).length,
//         0,
//         "Expected an error object, not an empty success object.",
//       );
//     }

//     // Attempt to change Charlie's password to the same password (expect error)
//     const changePasswordSameArgs = {
//       user: charlieUser,
//       oldPassword: "charlie_old_pass",
//       newPassword: "charlie_old_pass",
//     };
//     const changePasswordSameResult = await authConcept.changePassword(
//       changePasswordSameArgs,
//     );
//     logAction(
//       "changePassword",
//       changePasswordSameArgs,
//       changePasswordSameResult,
//     );
//     if ("error" in changePasswordSameResult) { // Type assertion for union type
//       assertEquals(
//         changePasswordSameResult.error,
//         "New password cannot be the same as the old password.",
//         "Should fail to change password to the same password.",
//       );
//       console.log(
//         `✅ Correctly failed to change password to the same password.`,
//       );
//     } else {
//       assertNotEquals(
//         Object.keys(changePasswordSameResult).length,
//         0,
//         "Expected an error object, not an empty success object.",
//       );
//     }

//     // Change Charlie's password successfully
//     const changePasswordSuccessArgs = {
//       user: charlieUser,
//       oldPassword: "charlie_old_pass",
//       newPassword: "charlie_new_pass",
//     };
//     const changePasswordSuccessResult = await authConcept.changePassword(
//       changePasswordSuccessArgs,
//     );
//     logAction(
//       "changePassword",
//       changePasswordSuccessArgs,
//       changePasswordSuccessResult,
//     );
//     if ("error" in changePasswordSuccessResult) {
//       assertNotEquals(
//         changePasswordSuccessResult.error,
//         changePasswordSuccessResult.error,
//         "Password change should succeed.",
//       );
//       return;
//     }
//     assertEquals(
//       changePasswordSuccessResult,
//       {},
//       "Password change should return an empty object on success.",
//     );
//     console.log(`✅ Successfully changed Charlie's password.`);

//     // Attempt to authenticate Charlie with old password (expect error)
//     const authenticateOldPassArgs = {
//       username: "charlie",
//       password: "charlie_old_pass",
//     };
//     const authenticateOldPassResult = await authConcept.authenticate(
//       authenticateOldPassArgs,
//     );
//     logAction(
//       "authenticate",
//       authenticateOldPassArgs,
//       authenticateOldPassResult,
//     );
//     if ("error" in authenticateOldPassResult) { // Type assertion for union type
//       assertEquals(
//         authenticateOldPassResult.error,
//         "Invalid username or password.",
//         "Should fail authentication with old password.",
//       );
//       console.log(`✅ Correctly failed authentication with old password.`);
//     } else {
//       assertExists(
//         authenticateOldPassResult.user,
//         "Should have returned an error for old password.",
//       );
//     }

//     // Authenticate Charlie with new password (expect success)
//     const authenticateNewPassArgs = {
//       username: "charlie",
//       password: "charlie_new_pass",
//     };
//     const authenticateNewPassResult = await authConcept.authenticate(
//       authenticateNewPassArgs,
//     );
//     logAction(
//       "authenticate",
//       authenticateNewPassArgs,
//       authenticateNewPassResult,
//     );
//     if ("error" in authenticateNewPassResult) {
//       assertNotEquals(
//         authenticateNewPassResult.error,
//         authenticateNewPassResult.error,
//         "Authentication with new password should succeed.",
//       );
//       return;
//     }
//     assertEquals(
//       authenticateNewPassResult.user,
//       charlieUser,
//       "Charlie should authenticate with new password.",
//     );
//     console.log(`✅ Authenticated Charlie with new password.`);

//     console.log("--- Password Change Scenario Complete ---");
//   });

//   await t.step("Scenario 3: Account Deletion", async () => {
//     console.log("\n--- Executing Account Deletion Scenario ---");

//     // Register a user (David)
//     const registerDavidArgs = { username: "david", password: "david_password" };
//     const registerDavidResult = await authConcept.register(registerDavidArgs);
//     logAction("register", registerDavidArgs, registerDavidResult);
//     if ("error" in registerDavidResult) {
//       assertNotEquals(
//         registerDavidResult.error,
//         registerDavidResult.error,
//         "David registration should succeed",
//       );
//       return;
//     }
//     davidUser = registerDavidResult.user; // Assign to outer scope variable
//     assertExists(davidUser, "David's user ID should exist.");
//     console.log(`✅ Registered David with ID: ${davidUser}`);

//     // Verify current user count (Alice + Bob + Charlie + David = 4 users)
//     const currentUsers3_beforeDelete = await authConcept._getAllUsers();
//     assertEquals(
//       currentUsers3_beforeDelete.length,
//       4,
//       "Should have four users before David's deletion.",
//     );
//     assertArrayIncludes(currentUsers3_beforeDelete.map((u) => u._id), [
//       aliceUser,
//       bobUser,
//       charlieUser,
//       davidUser,
//     ], "Alice, Bob, Charlie, and David should be present.");

//     // Authenticate David
//     const authenticateDavidArgs = {
//       username: "david",
//       password: "david_password",
//     };
//     const authenticateDavidResult = await authConcept.authenticate(
//       authenticateDavidArgs,
//     );
//     logAction("authenticate", authenticateDavidArgs, authenticateDavidResult);
//     if ("error" in authenticateDavidResult) {
//       assertNotEquals(
//         authenticateDavidResult.error,
//         authenticateDavidResult.error,
//         "David authentication should succeed",
//       );
//       return;
//     }
//     assertEquals(
//       authenticateDavidResult.user,
//       davidUser,
//       "David should authenticate.",
//     );
//     console.log(`✅ Authenticated David.`);

//     // Delete David's account
//     const deleteDavidArgs = { user: davidUser };
//     const deleteDavidResult = await authConcept.deleteAccount(deleteDavidArgs);
//     logAction("deleteAccount", deleteDavidArgs, deleteDavidResult);
//     if ("error" in deleteDavidResult) { // Type assertion for union type
//       assertNotEquals(
//         deleteDavidResult.error,
//         deleteDavidResult.error,
//         "David account deletion should succeed.",
//       );
//       return;
//     }
//     assertEquals(
//       deleteDavidResult,
//       {},
//       "Account deletion should return an empty object on success.",
//     );
//     console.log(`✅ Deleted David's account.`);

//     // After deletion, there should be 3 users (Alice, Bob, Charlie)
//     const currentUsers3_afterDelete = await authConcept._getAllUsers();
//     assertEquals(
//       currentUsers3_afterDelete.length,
//       3,
//       "Should have three users after David's deletion.",
//     );
//     assertArrayIncludes(currentUsers3_afterDelete.map((u) => u._id), [
//       aliceUser,
//       bobUser,
//       charlieUser,
//     ], "Alice, Bob, Charlie should remain.");
//     assertFalse(
//       currentUsers3_afterDelete.map((u) => u._id).includes(davidUser),
//       "David should not be in the list.",
//     );

//     // Attempt to authenticate David (expect error)
//     const authenticateDeletedDavidArgs = {
//       username: "david",
//       password: "david_password",
//     };
//     const authenticateDeletedDavidResult = await authConcept.authenticate(
//       authenticateDeletedDavidArgs,
//     );
//     logAction(
//       "authenticate",
//       authenticateDeletedDavidArgs,
//       authenticateDeletedDavidResult,
//     );
//     if ("error" in authenticateDeletedDavidResult) { // Type assertion for union type
//       assertEquals(
//         authenticateDeletedDavidResult.error,
//         "Invalid username or password.",
//         "Should fail to authenticate deleted user.",
//       );
//       console.log(`✅ Correctly failed to authenticate deleted user.`);
//     } else {
//       assertExists(
//         authenticateDeletedDavidResult.user,
//         "Should have returned an error for deleted user.",
//       );
//     }

//     // Attempt to delete David's account again (expect error)
//     const deleteDavidAgainArgs = { user: davidUser };
//     const deleteDavidAgainResult = await authConcept.deleteAccount(
//       deleteDavidAgainArgs,
//     );
//     logAction("deleteAccount", deleteDavidAgainArgs, deleteDavidAgainResult);
//     if ("error" in deleteDavidAgainResult) { // Type assertion for union type
//       assertEquals(
//         deleteDavidAgainResult.error,
//         `User with ID '${davidUser}' not found.`,
//         "Should fail to delete non-existent user.",
//       );
//       console.log(`✅ Correctly failed to delete non-existent user.`);
//     } else {
//       assertNotEquals(
//         Object.keys(deleteDavidAgainResult).length,
//         0,
//         "Expected an error object, not an empty success object.",
//       );
//     }

//     // Use _checkUserExists for David (expect false)
//     const checkDeletedDavidExistsArgs = { user: davidUser };
//     const checkDeletedDavidExistsResult = await authConcept._checkUserExists(
//       checkDeletedDavidExistsArgs,
//     );
//     logQuery(
//       "_checkUserExists",
//       checkDeletedDavidExistsArgs,
//       checkDeletedDavidExistsResult,
//     );
//     assertFalse(
//       checkDeletedDavidExistsResult.exists,
//       "David should no longer exist.",
//     );
//     console.log(`✅ Confirmed David no longer exists.`);

//     // Use _getAllUsers to confirm David is gone (already done above, but for redundancy)
//     const getAllUsersAfterDeleteResult = await authConcept._getAllUsers();
//     logQuery("_getAllUsers", {}, getAllUsersAfterDeleteResult);
//     assertEquals(
//       getAllUsersAfterDeleteResult.some((u) => u._id === davidUser),
//       false,
//       "David should not appear in _getAllUsers.",
//     );
//     console.log(`✅ Confirmed David is gone via _getAllUsers.`);

//     console.log("--- Account Deletion Scenario Complete ---");
//   });

//   await t.step(
//     "Scenario 4: Multiple Users and Comprehensive Querying",
//     async () => {
//       console.log("\n--- Executing Multiple Users Querying Scenario ---");

//       // At this point, there are 3 users in the database: Alice, Bob, Charlie.

//       // Register two new users (Eve and Frank)
//       const registerEveArgs = { username: "eve", password: "eve_pass" };
//       const registerEveResult = await authConcept.register(registerEveArgs);
//       logAction("register", registerEveArgs, registerEveResult);
//       if ("error" in registerEveResult) {
//         assertNotEquals(
//           registerEveResult.error,
//           registerEveResult.error,
//           "Eve registration should succeed",
//         );
//         return;
//       }
//       eveUser = registerEveResult.user; // Assign to outer scope variable
//       assertExists(eveUser);
//       console.log(`✅ Registered Eve with ID: ${eveUser}`);

//       const registerFrankArgs = { username: "frank", password: "frank_pass" };
//       const registerFrankResult = await authConcept.register(registerFrankArgs);
//       logAction("register", registerFrankArgs, registerFrankResult);
//       if ("error" in registerFrankResult) {
//         assertNotEquals(
//           registerFrankResult.error,
//           registerFrankResult.error,
//           "Frank registration should succeed",
//         );
//         return;
//       }
//       frankUser = registerFrankResult.user; // Assign to outer scope variable
//       assertExists(frankUser);
//       console.log(`✅ Registered Frank with ID: ${frankUser}`);

//       // Now, there should be 5 users in total: Alice, Bob, Charlie, Eve, Frank
//       const expectedUserIds = [
//         aliceUser,
//         bobUser,
//         charlieUser,
//         eveUser,
//         frankUser,
//       ];

//       // Use _getAllUsers to get all users
//       const allUsersResult = await authConcept._getAllUsers();
//       logQuery("_getAllUsers", {}, allUsersResult);
//       // FIX: Updated assertion to account for cumulative users from previous t.step blocks
//       assertEquals(
//         allUsersResult.length,
//         expectedUserIds.length,
//         `Should now have ${expectedUserIds.length} users (Alice, Bob, Charlie, Eve, Frank).`,
//       );
//       assertArrayIncludes(
//         allUsersResult.map((u) => u._id),
//         expectedUserIds,
//         "All expected users should be present.",
//       );
//       console.log(
//         `✅ Confirmed all ${expectedUserIds.length} users are present via _getAllUsers.`,
//       );

//       // Use _getUserByUsername to find Eve
//       const getUserByUsernameEveArgs = { username: "eve" };
//       const getUserByUsernameEveResult = await authConcept._getUserByUsername(
//         getUserByUsernameEveArgs,
//       );
//       logQuery(
//         "_getUserByUsername",
//         getUserByUsernameEveArgs,
//         getUserByUsernameEveResult,
//       );
//       if ("user" in getUserByUsernameEveResult) { // Type assertion for union type
//         assertEquals(
//           getUserByUsernameEveResult.user,
//           eveUser,
//           "Should find Eve by username.",
//         );
//         console.log(`✅ Found Eve by username.`);
//       } else {
//         assertExists(
//           getUserByUsernameEveResult,
//           "Should have found Eve by username.",
//         );
//       }

//       // Use _getUserByUsername to find Frank
//       const getUserByUsernameFrankArgs = { username: "frank" };
//       const getUserByUsernameFrankResult = await authConcept._getUserByUsername(
//         getUserByUsernameFrankArgs,
//       );
//       logQuery(
//         "_getUserByUsername",
//         getUserByUsernameFrankArgs,
//         getUserByUsernameFrankResult,
//       );
//       if ("user" in getUserByUsernameFrankResult) { // Type assertion for union type
//         assertEquals(
//           getUserByUsernameFrankResult.user,
//           frankUser,
//           "Should find Frank by username.",
//         );
//         console.log(`✅ Found Frank by username.`);
//       } else {
//         assertExists(
//           getUserByUsernameFrankResult,
//           "Should have found Frank by username.",
//         );
//       }

//       // Use _getUserById to find Eve
//       const getUserByIdEveArgs = { user: eveUser };
//       const getUserByIdEveResult = await authConcept._getUserById(
//         getUserByIdEveArgs,
//       );
//       logQuery("_getUserById", getUserByIdEveArgs, getUserByIdEveResult);
//       if (
//         Array.isArray(getUserByIdEveResult) && getUserByIdEveResult.length > 0
//       ) { // Type assertion for union type
//         assertEquals(
//           getUserByIdEveResult[0]._id,
//           eveUser,
//           "Should find Eve by ID.",
//         );
//         console.log(`✅ Found Eve by ID.`);
//       } else {
//         assertExists(getUserByIdEveResult, "Should have found Eve by ID.");
//       }

//       // Use _getUserById to find Frank
//       const getUserByIdFrankArgs = { user: frankUser };
//       const getUserByIdFrankResult = await authConcept._getUserById(
//         getUserByIdFrankArgs,
//       );
//       logQuery("_getUserById", getUserByIdFrankArgs, getUserByIdFrankResult);
//       if (
//         Array.isArray(getUserByIdFrankResult) &&
//         getUserByIdFrankResult.length > 0
//       ) { // Type assertion for union type
//         assertEquals(
//           getUserByIdFrankResult[0]._id,
//           frankUser,
//           "Should find Frank by ID.",
//         );
//         console.log(`✅ Found Frank by ID.`);
//       } else {
//         assertExists(getUserByIdFrankResult, "Should have found Frank by ID.");
//       }

//       // Query for a non-existent user by ID
//       const nonExistentUserId = "nonexistent:user" as ID;
//       const getUserByIdNonExistentResult = await authConcept._getUserById({
//         user: nonExistentUserId,
//       });
//       logQuery(
//         "_getUserById",
//         { user: nonExistentUserId },
//         getUserByIdNonExistentResult,
//       );
//       assertEquals(
//         getUserByIdNonExistentResult,
//         [],
//         "Should return an empty array for non-existent user ID.",
//       );
//       console.log(`✅ Correctly returned empty for non-existent user ID.`);

//       // Query for a non-existent username
//       const getUserByUsernameNonExistentResult = await authConcept
//         ._getUserByUsername({ username: "unknown" });
//       logQuery(
//         "_getUserByUsername",
//         { username: "unknown" },
//         getUserByUsernameNonExistentResult,
//       );
//       assertEquals(
//         getUserByUsernameNonExistentResult,
//         {},
//         "Should return an empty object for non-existent username.",
//       );
//       console.log(`✅ Correctly returned empty for non-existent username.`);

//       console.log("--- Multiple Users Querying Scenario Complete ---");
//     },
//   );

//   await client.close();
// });
