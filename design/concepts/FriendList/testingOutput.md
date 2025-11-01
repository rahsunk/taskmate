Check file:///Users/rahsunkomatsuzaki-fields/Desktop/MIT/academic/Y3/Fall/6.1040/taskmate/src/concepts/FriendList/FriendList.test.ts
running 1 test from ./src/concepts/FriendList/FriendList.test.ts
FriendsListConcept Tests ...
  Operational Principle: Alice and Bob become friends, then Alice removes Bob ...
------- output -------

--- Operational Principle Test ---
Scenario: Alice sends request to Bob, Bob accepts, Alice removes Bob.
Action: Alice (user:Alice) sends friend request to Bob (user:Bob)
Effect: Request 019a3ce3-c8aa-79ca-a0ce-443079de1e58 sent. Result: { request: "019a3ce3-c8aa-79ca-a0ce-443079de1e58" }
Action: Bob (user:Bob) accepts friend request from Alice (user:Alice)
Effect: Bob accepted request. Result: { success: true }
State: Alice and Bob are now friends.
Action: Alice (user:Alice) removes Bob (user:Bob) from friends.
Effect: Alice removed Bob. Result: { success: true }
State: Alice and Bob are no longer friends.
----- output end -----
  Operational Principle: Alice and Bob become friends, then Alice removes Bob ... ok (316ms)
  Scenario 1: Rejecting a request and re-sending ...
------- output -------

--- Scenario 1: Rejecting a request and re-sending ---
Action: Alice (user:Alice) sends friend request to Carol (user:Carol)
Effect: Request 019a3ce3-c9ee-7439-ab9e-3909ceb6eb76 sent. Result: { request: "019a3ce3-c9ee-7439-ab9e-3909ceb6eb76" }
Action: Carol (user:Carol) declines friend request from Alice (user:Alice)
Effect: Carol declined request. Result: { success: true }
Action: Alice (user:Alice) sends friend request to Carol (user:Carol) again
Effect: Second request 019a3ce3-ca55-734b-ba0b-e9dc1e47fbff sent. Result: { request: "019a3ce3-ca55-734b-ba0b-e9dc1e47fbff" }
Action: Carol (user:Carol) accepts second friend request from Alice (user:Alice)
Effect: Carol accepted second request. Result: { success: true }
State: Alice and Carol are now friends.
----- output end -----
  Scenario 1: Rejecting a request and re-sending ... ok (270ms)
  Scenario 2: Duplicate requests and already friends ...
------- output -------

--- Scenario 2: Duplicate requests and already friends ---
Action: Alice (user:Alice) sends friend request to David (user:David)
Effect: Request 019a3ce3-cb1b-7e28-8258-3e6b27a807d9 sent. Result: { request: "019a3ce3-cb1b-7e28-8258-3e6b27a807d9" }
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
  Scenario 2: Duplicate requests and already friends ... ok (297ms)
  Scenario 3: Cancelling a request ...
------- output -------

--- Scenario 3: Cancelling a request ---
Action: Eve (user:Eve) sends friend request to Carol (user:Carol)
Effect: Request 019a3ce3-cc50-729c-b1a5-5aefe74d47b5 sent. Result: { request: "019a3ce3-cc50-729c-b1a5-5aefe74d47b5" }
Action: Eve (user:Eve) cancels sent request to Carol (user:Carol)
Effect: Eve canceled request. Result: { success: true }
Action: Carol (user:Carol) tries to accept a cancelled request from Eve (user:Eve)
Effect: Accepting cancelled request failed as expected. Error: No pending friend request from sender to receiver.
----- output end -----
  Scenario 3: Cancelling a request ... ok (174ms)
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
  Scenario 4: Edge cases / Errors ... ok (75ms)
  Query Tests ...
------- output -------

--- Query Tests ---
Query: _getAllFriendships
Result _getAllFriendships: [
  {
    _id: "019a3ce3-cdd4-7b6e-9505-63268d7b440a",
    user1: "user:Alice",
    user2: "user:Bob"
  }
]
Query: _getFriendshipsByUser for user:Alice
Result _getFriendshipsByUser (Alice): [
  {
    _id: "019a3ce3-cdd4-7b6e-9505-63268d7b440a",
    user1: "user:Alice",
    user2: "user:Bob"
  }
]
Query: _getFriendshipsByUser for user:David
Result _getFriendshipsByUser (David): []
Query: _getAllFriendRequests
Result _getAllFriendRequests: [
  {
    _id: "019a3ce3-cd7f-79d4-87a7-74cd43cd81ad",
    sender: "user:Carol",
    receiver: "user:David"
  },
  {
    _id: "019a3ce3-ce11-7522-a3d9-d902cfaa538f",
    sender: "user:Eve",
    receiver: "user:Alice"
  }
]
Query: _getSentFriendRequests for user:Carol
Result _getSentFriendRequests (Carol): [
  {
    _id: "019a3ce3-cd7f-79d4-87a7-74cd43cd81ad",
    sender: "user:Carol",
    receiver: "user:David"
  }
]
Query: _getReceivedFriendRequests for user:Alice
Result _getReceivedFriendRequests (Alice): [
  {
    _id: "019a3ce3-ce11-7522-a3d9-d902cfaa538f",
    sender: "user:Eve",
    receiver: "user:Alice"
  }
]
Query: _getFriendshipDetails for ID 019a3ce3-cdd4-7b6e-9505-63268d7b440a
Result _getFriendshipDetails (existing): [
  {
    _id: "019a3ce3-cdd4-7b6e-9505-63268d7b440a",
    user1: "user:Alice",
    user2: "user:Bob"
  }
]
Query: _getFriendshipDetails for non-existent ID nonExistentFriendship
Result _getFriendshipDetails (non-existent): []
Query: _getFriendRequestDetails for ID 019a3ce3-cd7f-79d4-87a7-74cd43cd81ad
Result _getFriendRequestDetails (existing): [
  {
    _id: "019a3ce3-cd7f-79d4-87a7-74cd43cd81ad",
    sender: "user:Carol",
    receiver: "user:David"
  }
]
Query: _getFriendRequestDetails for non-existent ID nonExistentRequest
Result _getFriendRequestDetails (non-existent): []
----- output end -----
  Query Tests ... ok (529ms)
FriendsListConcept Tests ... ok (2s)

ok | 1 passed (6 steps) | 0 failed (2s)
