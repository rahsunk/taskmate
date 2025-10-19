Check file:///Users/rahsunkomatsuzaki-fields/Desktop/MIT/academic/Y3/Fall/6.1040/taskmate/src/concepts/UserAuthentication/UserAuthentication.test.ts
running 1 test from ./src/concepts/UserAuthentication/UserAuthentication.test.ts\
UserAuthenticationConcept Tests ...\
  Scenario: Operational Principle (Register and Authenticate) ...\
------- output -------\
Attempting to register user 'alice'...\
--- Action: register ---\
Input: { username: "alice", password: "password123" }\
Output: { user: "0199fdac-4162-7b09-89a1-b904bf96e5ab" }\
Registered user ID: 0199fdac-4162-7b09-89a1-b904bf96e5ab\
Attempting to authenticate user 'alice'...\
--- Action: authenticate ---\
Input: { username: "alice", password: "password123" }\
Output: { user: "0199fdac-4162-7b09-89a1-b904bf96e5ab" }\
--- Action: _getUserByUsername ---\
Input: { username: "alice" }\
Output: { user: "0199fdac-4162-7b09-89a1-b904bf96e5ab" }\
----- output end -----\
  Scenario: Operational Principle (Register and Authenticate) ... ok (91ms)\
  Scenario: Registering with existing username should fail ...\
------- output -------\
--- Action: register ---\
Input: { username: "bob", password: "securepassword" }\
Output: { user: "0199fdac-41bc-7bdd-8416-3880e256dd31" }\
Attempting to re-register user 'bob'...\
--- Action: register ---\
Input: { username: "bob", password: "securepassword" }\
Output: { error: "User with username 'bob' already exists." }\
Error: User with username 'bob' already exists.\
----- output end -----\
  Scenario: Registering with existing username should fail ... ok (54ms)\
  Scenario: Authentication failures (wrong password, non-existent user) ...\
------- output -------\
--- Action: register ---\
Input: { username: "charlie", password: "supersecret" }\
Output: { user: "0199fdac-41f2-7726-99e6-0e21f89ce8b8" }\
Attempting to authenticate 'charlie' with wrong password...\
--- Action: authenticate ---\
Input: { username: "charlie", password: "incorrectpassword" }\
Output: { error: "Invalid username or password." }\
Error: Invalid username or password.\
Attempting to authenticate non-existent user 'diana'...\
--- Action: authenticate ---\
Input: { username: "diana", password: "supersecret" }\
Output: { error: "Invalid username or password." }\
Error: Invalid username or password.\
----- output end -----\
  Scenario: Authentication failures (wrong password, non-existent user) ... ok (71ms)\
  Scenario: Change password functionality ...\
------- output -------\
--- Action: register ---\
Input: { username: "eve", password: "oldpassword" }\
Output: { user: "0199fdac-4239-75ac-b901-7326753f164b" }\
--- Action: authenticate ---\
Input: { username: "eve", password: "oldpassword" }\
Output: { user: "0199fdac-4239-75ac-b901-7326753f164b" }\
Attempting to change password for 'eve' with wrong old password...\
--- Action: changePassword ---\
Input: {\
  user: "0199fdac-4239-75ac-b901-7326753f164b",\
  oldPassword: "wrongoldpassword",\
  newPassword: "newsecurepassword"\
}\
Output: { error: "Old password does not match." }\
Error: Old password does not match.\
Attempting to change password for 'eve' to the same password...\
--- Action: changePassword ---\
Input: {\
  user: "0199fdac-4239-75ac-b901-7326753f164b",\
  oldPassword: "oldpassword",\
  newPassword: "oldpassword"\
}\
Output: { error: "New password cannot be the same as the old password." }\
Successfully changing password for 'eve'...\
Error: New password cannot be the same as the old password.\
--- Action: changePassword ---\
Input: {\
  user: "0199fdac-4239-75ac-b901-7326753f164b",\
  oldPassword: "oldpassword",\
  newPassword: "newsecurepassword"\
}\
Output: {}\
Attempting to authenticate 'eve' with old password (should fail)...\
--- Action: authenticate ---\
Input: { username: "eve", password: "oldpassword" }\
Output: { error: "Invalid username or password." }\
Error: Invalid username or password.\
Attempting to authenticate 'eve' with new password (should succeed)...\
--- Action: authenticate ---\
Input: { username: "eve", password: "newsecurepassword" }\
Output: { user: "0199fdac-4239-75ac-b901-7326753f164b" }\
----- output end -----\
  Scenario: Change password functionality ... ok (158ms)\
  Scenario: Delete account functionality ...\
------- output -------\
--- Action: register ---\
Input: { username: "frank", password: "pass1" }\
Output: { user: "0199fdac-42d7-753a-9bcc-ec430eaeaa1f" }\
--- Action: register ---\
Input: { username: "grace", password: "pass2" }\
Output: { user: "0199fdac-42fc-7320-b2ac-70590cb26649" }\
Attempting to delete account for 'frank'...\
--- Action: deleteAccount ---\
Input: { user: "0199fdac-42d7-753a-9bcc-ec430eaeaa1f" }\
Output: {}\
Attempting to authenticate 'frank' (should fail)...\
--- Action: authenticate ---\
Input: { username: "frank", password: "pass1" }\
Output: { error: "Invalid username or password." }\
Error: Invalid username or password.\
--- Action: _checkUserExists ---\
Input: { user: "0199fdac-42d7-753a-9bcc-ec430eaeaa1f" }\
Output: { exists: false }\
Attempting to delete account for 'frank' again...\
--- Action: deleteAccount ---\
Input: { user: "0199fdac-42d7-753a-9bcc-ec430eaeaa1f" }\
Error: User with ID '0199fdac-42d7-753a-9bcc-ec430eaeaa1f' not found.\
Output: {\
  error: "User with ID '0199fdac-42d7-753a-9bcc-ec430eaeaa1f' not found."\
}\
Attempting to authenticate 'grace' (should still succeed)...\
--- Action: authenticate ---\
Input: { username: "grace", password: "pass2" }\
Output: { user: "0199fdac-42fc-7320-b2ac-70590cb26649" }\
----- output end -----\
  Scenario: Delete account functionality ... ok (164ms)\
  Scenario: Query functionality for user existence ...\
------- output -------\
--- Action: register ---\
Input: { username: "heidi", password: "hpassword" }\
Output: { user: "0199fdac-437b-76e8-b951-deb546c30bb4" }\
Querying for user by username 'heidi'...\
--- Action: _getUserByUsername ---\
Input: { username: "heidi" }\
Output: { user: "0199fdac-437b-76e8-b951-deb546c30bb4" }\
Querying for non-existent user by username 'ivan'...\
--- Action: _getUserByUsername ---\
Input: { username: "ivan" }\
Output: {}\
Checking existence for user ID '0199fdac-437b-76e8-b951-deb546c30bb4'...\
--- Action: _checkUserExists ---\
Input: { user: "0199fdac-437b-76e8-b951-deb546c30bb4" }\
Output: { exists: true }\
Checking existence for non-existent user ID 'nonexistentid'...\
--- Action: _checkUserExists ---\
Input: { user: "nonexistentid" }\
Output: { exists: false }\
----- output end -----\
  Scenario: Query functionality for user existence ... ok (104ms)\
UserAuthenticationConcept Tests ... ok (1s)\
\
ok | 1 passed (6 steps) | 0 failed (1s)\
