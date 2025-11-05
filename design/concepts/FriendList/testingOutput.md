```
Check file:///Users/rahsunkomatsuzaki-fields/Desktop/MIT/academic/Y3/Fall/6.1040/taskmate/src/concepts/FriendList/FriendList.test.ts
running 1 test from ./src/concepts/FriendList/FriendList.test.ts
FriendsListConcept Tests ...
  Operational Principle: Alice and Bob become friends, then Alice removes Bob ...
------- output -------

--- Operational Principle Test ---
Scenario: Alice sends request to Bob, Bob accepts, Alice removes Bob.
Action: Alice (user:Alice) sends friend request to Bob (user:Bob)
Effect: Request 019a51fe-d617-7cf1-b811-f3c378ab57d3 sent. Result: { request: "019a51fe-d617-7cf1-b811-f3c378ab57d3" }
Action: Bob (user:Bob) accepts friend request from Alice (user:Alice)
Effect: Bob accepted request. Result: { success: true }
State: Alice and Bob are now friends.
Action: Alice (user:Alice) removes Bob (user:Bob) from friends.
Effect: Alice removed Bob. Result: { success: true }
State: Alice and Bob are no longer friends.
----- output end -----
  Operational Principle: Alice and Bob become friends, then Alice removes Bob ... ok (247ms)
  Scenario 1: Rejecting a request and re-sending ...
------- output -------

--- Scenario 1: Rejecting a request and re-sending ---
Action: Alice (user:Alice) sends friend request to Carol (user:Carol)
Effect: Request 019a51fe-d711-78db-836a-dcae526e054b sent. Result: { request: "019a51fe-d711-78db-836a-dcae526e054b" }
Action: Carol (user:Carol) declines friend request from Alice (user:Alice)
Effect: Carol declined request. Result: { success: true }
Action: Alice (user:Alice) sends friend request to Carol (user:Carol) again
Effect: Second request 019a51fe-d774-7412-aba5-e0619ea34a53 sent. Result: { request: "019a51fe-d774-7412-aba5-e0619ea34a53" }
Action: Carol (user:Carol) accepts second friend request from Alice (user:Alice)
Effect: Carol accepted second request. Result: { success: true }
State: Alice and Carol are now friends.
----- output end -----
  Scenario 1: Rejecting a request and re-sending ... ok (246ms)
  Scenario 2: Duplicate requests and already friends ...
------- output -------

--- Scenario 2: Duplicate requests and already friends ---
Action: Alice (user:Alice) sends friend request to David (user:David)
Effect: Request 019a51fe-d824-7a5e-937c-c4fb625f143e sent. Result: { request: "019a51fe-d824-7a5e-937c-c4fb625f143e" }
Action: Alice (user:Alice) tries to send duplicate request to David (user:David)
Effect: Duplicate request failed as expected. Error: A pending friend request already exists between these users.
Action: David (user:David) tries to send request to Alice (user:Alice) (reverse direction)
Effect: Reverse request failed as expected. Error: A pending friend request already exists between these users.
Action: David (user:David) accepts request from Alice (user:Alice)
Effect: David accepted request. Result: { success: true }
State: Alice and David are now friends.
Action: Alice (user:Alice) tries to send request to David (user:David) (already friends)
Effect: Request to existing friend failed as expected. Error: Users are already friends.
Action: David (user:David) tries to accept a non-existent request from Alice (user:Alice)
Effect: Accepting non-existent request failed as expected. Error: No pending friend request from sender to receiver.
----- output end -----
  Scenario 2: Duplicate requests and already friends ... ok (271ms)
  Scenario 3: Cancelling a request ...
------- output -------

--- Scenario 3: Cancelling a request ---
Action: Eve (user:Eve) sends friend request to Carol (user:Carol)
Effect: Request 019a51fe-d935-7049-9798-c04c730799a5 sent. Result: { request: "019a51fe-d935-7049-9798-c04c730799a5" }
Action: Eve (user:Eve) cancels sent request to Carol (user:Carol)
Effect: Eve canceled request. Result: { success: true }
Action: Carol (user:Carol) tries to accept a cancelled request from Eve (user:Eve)
Effect: Accepting cancelled request failed as expected. Error: No pending friend request from sender to receiver.
----- output end -----
  Scenario 3: Cancelling a request ... ok (141ms)
  Scenario 4: Edge cases / Errors ...
------- output -------

--- Scenario 4: Edge cases / Errors ---
Action: Alice (user:Alice) tries to send friend request to herself
Effect: Request to self failed as expected. Error: Cannot send a friend request to yourself.
Action: Alice (user:Alice) tries to remove non-existent friendship with Eve (user:Eve)
Effect: Removing non-existent friendship failed as expected. Error: No friendship found between these users.
Action: David (user:David) tries to accept non-existent request from Eve (user:Eve)
Effect: Accepting non-existent request failed as expected. Error: No pending friend request from sender to receiver.
Action: David (user:David) tries to decline non-existent request from Eve (user:Eve)
Effect: Declining non-existent request failed as expected. Error: No pending friend request from sender to receiver found to decline.
Action: Eve (user:Eve) tries to cancel non-existent request to David (user:David)
Effect: Cancelling non-existent request failed as expected. Error: No pending friend request from sender to receiver found to cancel.
----- output end -----
  Scenario 4: Edge cases / Errors ... ok (77ms)
  Query Tests ...
------- output -------

--- Query Tests ---
Query: _getAllFriendships
Result _getAllFriendships: [
  {
    _id: "019a51fe-da9b-7f2b-aff4-41d7bf6978ff",
    user1: "user:Alice",
    user2: "user:Bob"
  }
]
Query: _getFriendshipsByUser for user:Alice
Result _getFriendshipsByUser (Alice): [
  {
    _id: "019a51fe-da9b-7f2b-aff4-41d7bf6978ff",
    user1: "user:Alice",
    user2: "user:Bob"
  }
]
Query: _getFriendshipsByUser for user:David
Result _getFriendshipsByUser (David): []
Query: _getAllFriendRequests
Result _getAllFriendRequests: [
  {
    _id: "019a51fe-da50-7e61-bf77-a4eba37105be",
    sender: "user:Carol",
    receiver: "user:David"
  },
  {
    _id: "019a51fe-dade-700e-a49c-590fc5a42cf0",
    sender: "user:Eve",
    receiver: "user:Alice"
  }
]
Query: _getSentFriendRequests for user:Carol
Result _getSentFriendRequests (Carol): [
  {
    _id: "019a51fe-da50-7e61-bf77-a4eba37105be",
    sender: "user:Carol",
    receiver: "user:David"
  }
]
Query: _getReceivedFriendRequests for user:Alice
Result _getReceivedFriendRequests (Alice): [
  {
    _id: "019a51fe-dade-700e-a49c-590fc5a42cf0",
    sender: "user:Eve",
    receiver: "user:Alice"
  }
]
Query: _getFriendshipDetails for ID 019a51fe-da9b-7f2b-aff4-41d7bf6978ff
Result _getFriendshipDetails (existing): [
  {
    _id: "019a51fe-da9b-7f2b-aff4-41d7bf6978ff",
    user1: "user:Alice",
    user2: "user:Bob"
  }
]
Query: _getFriendshipDetails for non-existent ID nonExistentFriendship
Result _getFriendshipDetails (non-existent): []
Query: _getFriendRequestDetails for ID 019a51fe-da50-7e61-bf77-a4eba37105be
Result _getFriendRequestDetails (existing): [
  {
    _id: "019a51fe-da50-7e61-bf77-a4eba37105be",
    sender: "user:Carol",
    receiver: "user:David"
  }
]
Query: _getFriendRequestDetails for non-existent ID nonExistentRequest
Result _getFriendRequestDetails (non-existent): []
----- output end -----
  Query Tests ... ok (466ms)
FriendsListConcept Tests ... ok (1s)

ok | 1 passed (6 steps) | 0 failed (1s)
```
