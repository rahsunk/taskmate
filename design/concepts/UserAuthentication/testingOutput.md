Check file:///Users/rahsunkomatsuzaki-fields/Desktop/MIT/academic/Y3/Fall/6.1040/taskmate/src/concepts/UserAuthentication/UserAuthentication.test.ts
running 1 test from ./src/concepts/UserAuthentication/UserAuthentication.test.ts
UserAuthentication Concept Tests ...
  Operational Principle: User Registration, Authentication, and Lookup ...
------- output -------

--- Executing Operational Principle Scenario ---
--- Action: register ---
Input: {"username":"alice","password":"password123"}
Result: {"user":"019a3cd1-87f1-7edd-90a0-391135a2c88d"}
-----------------------
✅ Registered Alice with ID: 019a3cd1-87f1-7edd-90a0-391135a2c88d
--- Action: authenticate ---
Input: {"username":"alice","password":"password123"}
Result: {"user":"019a3cd1-87f1-7edd-90a0-391135a2c88d"}
-----------------------
✅ Authenticated Alice successfully.
--- Query: _getUserByUsername ---
Input: {"username":"alice"}
Result: {"user":"019a3cd1-87f1-7edd-90a0-391135a2c88d"}
-----------------------
✅ Found Alice by username: 019a3cd1-87f1-7edd-90a0-391135a2c88d
--- Query: _checkUserExists ---
Input: {"user":"019a3cd1-87f1-7edd-90a0-391135a2c88d"}
Result: {"exists":true}
-----------------------
✅ Confirmed Alice exists.
--- Query: _getAllUsers ---
Input: {}
Result: [{"_id":"019a3cd1-87f1-7edd-90a0-391135a2c88d","username":"alice","password":"password123"}]
-----------------------
✅ Confirmed Alice is present via _getAllUsers.
--- Query: _getUserById ---
Input: {"user":"019a3cd1-87f1-7edd-90a0-391135a2c88d"}
Result: [{"_id":"019a3cd1-87f1-7edd-90a0-391135a2c88d","username":"alice","password":"password123"}]
-----------------------
✅ Found Alice by ID.
--- Query: _getUsernameById ---
Input: {"user":"019a3cd1-87f1-7edd-90a0-391135a2c88d"}
Result: {"username":"alice"}
-----------------------
✅ Retrieved Alice's username by ID.
--- Operational Principle Scenario Complete ---
----- output end -----
  Operational Principle: User Registration, Authentication, and Lookup ... ok (197ms)
  Scenario 1: Registration and Authentication Failure Cases ...
------- output -------

--- Executing Failure Cases Scenario ---
--- Action: register ---
Input: {"username":"bob","password":"bob_password"}
Result: {"user":"019a3cd1-88b6-7ea9-9c20-051c618ce23e"}
-----------------------
✅ Registered Bob with ID: 019a3cd1-88b6-7ea9-9c20-051c618ce23e
--- Action: register ---
Input: {"username":"bob","password":"another_password"}
Result: { error: "User with username 'bob' already exists." }
-----------------------
✅ Correctly prevented registration with duplicate username.
--- Action: authenticate ---
Input: {"username":"bob","password":"wrong_password"}
Result: { error: "Invalid username or password." }
-----------------------
✅ Correctly failed authentication with wrong password.
--- Action: authenticate ---
Input: {"username":"unknown","password":"any_password"}
Result: { error: "Invalid username or password." }
-----------------------
✅ Correctly failed authentication for non-existent user.
--- Failure Cases Scenario Complete ---
----- output end -----
  Scenario 1: Registration and Authentication Failure Cases ... ok (128ms)
  Scenario 2: Password Change Functionality ...
------- output -------

--- Executing Password Change Scenario ---
--- Action: register ---
Input: {"username":"charlie","password":"charlie_old_pass"}
Result: {"user":"019a3cd1-894a-75ad-b99b-2ccd92b6888f"}
-----------------------
✅ Registered Charlie with ID: 019a3cd1-894a-75ad-b99b-2ccd92b6888f
--- Action: authenticate ---
Input: {"username":"charlie","password":"charlie_old_pass"}
Result: {"user":"019a3cd1-894a-75ad-b99b-2ccd92b6888f"}
-----------------------
✅ Authenticated Charlie with old password.
--- Action: changePassword ---
Input: {"user":"019a3cd1-894a-75ad-b99b-2ccd92b6888f","oldPassword":"wrong_old_pass","newPassword":"charlie_new_pass"}
Result: { error: "Old password does not match." }
-----------------------
✅ Correctly failed to change password with wrong old password.
--- Action: changePassword ---
Input: {"user":"019a3cd1-894a-75ad-b99b-2ccd92b6888f","oldPassword":"charlie_old_pass","newPassword":"charlie_old_pass"}
Result: { error: "New password cannot be the same as the old password." }
-----------------------
✅ Correctly failed to change password to the same password.
--- Action: changePassword ---
Input: {"user":"019a3cd1-894a-75ad-b99b-2ccd92b6888f","oldPassword":"charlie_old_pass","newPassword":"charlie_new_pass"}
Result: {}
-----------------------
✅ Successfully changed Charlie's password.
--- Action: authenticate ---
Input: {"username":"charlie","password":"charlie_old_pass"}
Result: { error: "Invalid username or password." }
-----------------------
✅ Correctly failed authentication with old password.
--- Action: authenticate ---
Input: {"username":"charlie","password":"charlie_new_pass"}
Result: {"user":"019a3cd1-894a-75ad-b99b-2ccd92b6888f"}
-----------------------
✅ Authenticated Charlie with new password.
--- Password Change Scenario Complete ---
----- output end -----
  Scenario 2: Password Change Functionality ... ok (231ms)
  Scenario 3: Account Deletion ...
------- output -------

--- Executing Account Deletion Scenario ---
--- Action: register ---
Input: {"username":"david","password":"david_password"}
Result: {"user":"019a3cd1-8a1f-7120-8217-73f70afa5eba"}
-----------------------
✅ Registered David with ID: 019a3cd1-8a1f-7120-8217-73f70afa5eba
--- Action: authenticate ---
Input: {"username":"david","password":"david_password"}
Result: {"user":"019a3cd1-8a1f-7120-8217-73f70afa5eba"}
-----------------------
✅ Authenticated David.
--- Action: deleteAccount ---
Input: {"user":"019a3cd1-8a1f-7120-8217-73f70afa5eba"}
Result: {}
-----------------------
✅ Deleted David's account.
--- Action: authenticate ---
Input: {"username":"david","password":"david_password"}
Result: { error: "Invalid username or password." }
-----------------------
✅ Correctly failed to authenticate deleted user.
--- Action: deleteAccount ---
Input: {"user":"019a3cd1-8a1f-7120-8217-73f70afa5eba"}
Result: { error: "User with ID '019a3cd1-8a1f-7120-8217-73f70afa5eba' not found." }
-----------------------
✅ Correctly failed to delete non-existent user.
--- Query: _checkUserExists ---
Input: {"user":"019a3cd1-8a1f-7120-8217-73f70afa5eba"}
Result: {"exists":false}
-----------------------
✅ Confirmed David no longer exists.
--- Query: _getAllUsers ---
Input: {}
Result: [{"_id":"019a3cd1-87f1-7edd-90a0-391135a2c88d","username":"alice","password":"password123"},{"_id":"019a3cd1-88b6-7ea9-9c20-051c618ce23e","username":"bob","password":"bob_password"},{"_id":"019a3cd1-894a-75ad-b99b-2ccd92b6888f","username":"charlie","password":"charlie_new_pass"}]
-----------------------
✅ Confirmed David is gone via _getAllUsers.
--- Account Deletion Scenario Complete ---
----- output end -----
  Scenario 3: Account Deletion ... ok (203ms)
  Scenario 4: Multiple Users and Comprehensive Querying ...
------- output -------

--- Executing Multiple Users Querying Scenario ---
--- Action: register ---
Input: {"username":"eve","password":"eve_pass"}
Result: {"user":"019a3cd1-8ae9-7fd3-9dfb-762633bc5350"}
-----------------------
✅ Registered Eve with ID: 019a3cd1-8ae9-7fd3-9dfb-762633bc5350
--- Action: register ---
Input: {"username":"frank","password":"frank_pass"}
Result: {"user":"019a3cd1-8b11-70df-82c0-715b76956d03"}
-----------------------
✅ Registered Frank with ID: 019a3cd1-8b11-70df-82c0-715b76956d03
--- Query: _getAllUsers ---
Input: {}
Result: [{"_id":"019a3cd1-87f1-7edd-90a0-391135a2c88d","username":"alice","password":"password123"},{"_id":"019a3cd1-88b6-7ea9-9c20-051c618ce23e","username":"bob","password":"bob_password"},{"_id":"019a3cd1-894a-75ad-b99b-2ccd92b6888f","username":"charlie","password":"charlie_new_pass"},{"_id":"019a3cd1-8ae9-7fd3-9dfb-762633bc5350","username":"eve","password":"eve_pass"},{"_id":"019a3cd1-8b11-70df-82c0-715b76956d03","username":"frank","password":"frank_pass"}]
-----------------------
✅ Confirmed all 5 users are present via _getAllUsers.
--- Query: _getUserByUsername ---
Input: {"username":"eve"}
Result: {"user":"019a3cd1-8ae9-7fd3-9dfb-762633bc5350"}
-----------------------
✅ Found Eve by username.
--- Query: _getUserByUsername ---
Input: {"username":"frank"}
Result: {"user":"019a3cd1-8b11-70df-82c0-715b76956d03"}
-----------------------
✅ Found Frank by username.
--- Query: _getUserById ---
Input: {"user":"019a3cd1-8ae9-7fd3-9dfb-762633bc5350"}
Result: [{"_id":"019a3cd1-8ae9-7fd3-9dfb-762633bc5350","username":"eve","password":"eve_pass"}]
-----------------------
✅ Found Eve by ID.
--- Query: _getUserById ---
Input: {"user":"019a3cd1-8b11-70df-82c0-715b76956d03"}
Result: [{"_id":"019a3cd1-8b11-70df-82c0-715b76956d03","username":"frank","password":"frank_pass"}]
-----------------------
✅ Found Frank by ID.
--- Query: _getUserById ---
Input: {"user":"nonexistent:user"}
Result: []
-----------------------
✅ Correctly returned empty for non-existent user ID.
--- Query: _getUserByUsername ---
Input: {"username":"unknown"}
Result: {}
-----------------------
✅ Correctly returned empty for non-existent username.
--- Multiple Users Querying Scenario Complete ---
----- output end -----
  Scenario 4: Multiple Users and Comprehensive Querying ... ok (212ms)
UserAuthentication Concept Tests ... ok (1s)

ok | 1 passed (5 steps) | 0 failed (1s)
