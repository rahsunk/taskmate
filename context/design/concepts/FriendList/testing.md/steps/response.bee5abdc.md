---
timestamp: 'Fri Oct 31 2025 20:48:07 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251031_204807.6f689144.md]]'
content_id: bee5abdc4a3867df0708bb6ca336b3f1cfa4a0b2751471a851beeba1985311f8
---

# response:

```typescript
// file: src/FriendsList/FriendsListConcept.test.ts

import { assertEquals, assertNotEquals, assertArrayIncludes } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import FriendsListConcept from "./FriendsListConcept.ts";

Deno.test("FriendsListConcept Tests", async (test) => {
  const [db, client] = await testDb();
  const friendsListConcept = new FriendsListConcept(db);

  // Define some test users
  const userAlice: ID = "user:Alice" as ID;
  const userBob: ID = "user:Bob" as ID;
  const userCarol: ID = "user:Carol" as ID;
  const userDavid: ID = "user:David" as ID;
  const userEve: ID = "user:Eve" as ID;

  Deno.test.beforeAll(async () => {
    // Clean up collections before all tests start (testDb handles full db drop)
    await friendsListConcept.friendships.deleteMany({});
    await friendsListConcept.friendRequests.deleteMany({});
  });

  await test.step("Operational Principle: Alice and Bob become friends, then Alice removes Bob", async () => {
    console.log("\n--- Operational Principle Test ---");
    console.log("Scenario: Alice sends request to Bob, Bob accepts, Alice removes Bob.");

    // 1. Alice sends a friend request to Bob
    console.log(`Action: Alice (${userAlice}) sends friend request to Bob (${userBob})`);
    const sendResult = await friendsListConcept.sendFriendRequest({
      sender: userAlice,
      receiver: userBob,
    });
    if ("error" in sendResult) {
      throw new Error(`sendFriendRequest failed: ${sendResult.error}`);
    }
    const requestId = sendResult.request;
    assertNotEquals(requestId, undefined, "Friend request ID should be returned.");
    console.log(`Effect: Request ${requestId} sent. Result:`, sendResult);

    // Verify request exists
    const requestsAfterSend = await friendsListConcept.friendRequests.find({
      sender: userAlice,
      receiver: userBob,
    }).toArray();
    assertEquals(requestsAfterSend.length, 1, "Friend request should exist after sending.");

    // 2. Bob accepts the friend request from Alice
    console.log(`Action: Bob (${userBob}) accepts friend request from Alice (${userAlice})`);
    const acceptResult = await friendsListConcept.acceptFriendRequest({
      receiver: userBob,
      sender: userAlice,
    });
    if ("error" in acceptResult) {
      throw new Error(`acceptFriendRequest failed: ${acceptResult.error}`);
    }
    assertEquals(acceptResult.success, true, "Friend request acceptance should be successful.");
    console.log(`Effect: Bob accepted request. Result:`, acceptResult);

    // Verify request is deleted and friendship exists
    const requestsAfterAccept = await friendsListConcept.friendRequests.find({
      sender: userAlice,
      receiver: userBob,
    }).toArray();
    assertEquals(requestsAfterAccept.length, 0, "Friend request should be deleted after acceptance.");

    const { user1, user2 } = friendsListConcept["canonicalizeUsers"](userAlice, userBob);
    const friendshipsAfterAccept = await friendsListConcept.friendships.find({
      user1: user1,
      user2: user2,
    }).toArray();
    assertEquals(friendshipsAfterAccept.length, 1, "Friendship should exist after acceptance.");
    console.log(`State: Alice and Bob are now friends.`);

    // 3. Alice removes Bob from friends
    console.log(`Action: Alice (${userAlice}) removes Bob (${userBob}) from friends.`);
    const removeResult = await friendsListConcept.removeFriend({
      user1: userAlice,
      user2: userBob,
    });
    if ("error" in removeResult) {
      throw new Error(`removeFriend failed: ${removeResult.error}`);
    }
    assertEquals(removeResult.success, true, "Friend removal should be successful.");
    console.log(`Effect: Alice removed Bob. Result:`, removeResult);

    // Verify friendship is gone
    const friendshipsAfterRemove = await friendsListConcept.friendships.find({
      user1: user1,
      user2: user2,
    }).toArray();
    assertEquals(friendshipsAfterRemove.length, 0, "Friendship should be deleted after removal.");
    console.log(`State: Alice and Bob are no longer friends.`);
  });

  await test.step("Scenario 1: Rejecting a request and re-sending", async () => {
    console.log("\n--- Scenario 1: Rejecting a request and re-sending ---");

    // Alice sends request to Carol
    console.log(`Action: Alice (${userAlice}) sends friend request to Carol (${userCarol})`);
    const sendResult1 = await friendsListConcept.sendFriendRequest({
      sender: userAlice,
      receiver: userCarol,
    });
    if ("error" in sendResult1) {
      throw new Error(`sendFriendRequest failed: ${sendResult1.error}`);
    }
    console.log(`Effect: Request ${sendResult1.request} sent. Result:`, sendResult1);

    // Carol declines the request
    console.log(`Action: Carol (${userCarol}) declines friend request from Alice (${userAlice})`);
    const declineResult = await friendsListConcept.declineFriendRequest({
      receiver: userCarol,
      sender: userAlice,
    });
    if ("error" in declineResult) {
      throw new Error(`declineFriendRequest failed: ${declineResult.error}`);
    }
    assertEquals(declineResult.success, true, "Request should be declined.");
    console.log(`Effect: Carol declined request. Result:`, declineResult);

    const requestsAfterDecline = await friendsListConcept.friendRequests.find({
      sender: userAlice,
      receiver: userCarol,
    }).toArray();
    assertEquals(requestsAfterDecline.length, 0, "Request should be deleted after decline.");

    // Alice tries to send another request (should be allowed now)
    console.log(`Action: Alice (${userAlice}) sends friend request to Carol (${userCarol}) again`);
    const sendResult2 = await friendsListConcept.sendFriendRequest({
      sender: userAlice,
      receiver: userCarol,
    });
    if ("error" in sendResult2) {
      throw new Error(`sendFriendRequest failed: ${sendResult2.error}`);
    }
    assertNotEquals(sendResult2.request, undefined, "Second request should be sent.");
    console.log(`Effect: Second request ${sendResult2.request} sent. Result:`, sendResult2);

    // Carol accepts the second request
    console.log(`Action: Carol (${userCarol}) accepts second friend request from Alice (${userAlice})`);
    const acceptResult = await friendsListConcept.acceptFriendRequest({
      receiver: userCarol,
      sender: userAlice,
    });
    if ("error" in acceptResult) {
      throw new Error(`acceptFriendRequest failed: ${acceptResult.error}`);
    }
    assertEquals(acceptResult.success, true, "Second request acceptance should be successful.");
    console.log(`Effect: Carol accepted second request. Result:`, acceptResult);

    // Verify friendship
    const { user1: cUser1, user2: cUser2 } = friendsListConcept["canonicalizeUsers"](userAlice, userCarol);
    const friendship = await friendsListConcept.friendships.findOne({
      user1: cUser1,
      user2: cUser2,
    });
    assertNotEquals(friendship, null, "Alice and Carol should be friends.");
    console.log(`State: Alice and Carol are now friends.`);
  });

  await test.step("Scenario 2: Duplicate requests and already friends", async () => {
    console.log("\n--- Scenario 2: Duplicate requests and already friends ---");

    // Make sure Alice and David are not friends initially
    await friendsListConcept.friendships.deleteMany({
      $or: [{ user1: userAlice, user2: userDavid }, { user1: userDavid, user2: userAlice }],
    });
    await friendsListConcept.friendRequests.deleteMany({
      $or: [{ sender: userAlice, receiver: userDavid }, { sender: userDavid, receiver: userAlice }],
    });

    // Alice sends request to David
    console.log(`Action: Alice (${userAlice}) sends friend request to David (${userDavid})`);
    const sendResult1 = await friendsListConcept.sendFriendRequest({
      sender: userAlice,
      receiver: userDavid,
    });
    if ("error" in sendResult1) {
      throw new Error(`sendFriendRequest failed: ${sendResult1.error}`);
    }
    console.log(`Effect: Request ${sendResult1.request} sent. Result:`, sendResult1);

    // Alice tries to send request to David again (should fail)
    console.log(`Action: Alice (${userAlice}) tries to send duplicate request to David (${userDavid})`);
    const sendResult2 = await friendsListConcept.sendFriendRequest({
      sender: userAlice,
      receiver: userDavid,
    });
    if (!("error" in sendResult2)) { // Asserting type for TS
      throw new Error("sendFriendRequest should have failed due to existing request.");
    }
    assertEquals(sendResult2.error, "A pending friend request already exists between these users.", "Duplicate request should be rejected.");
    console.log(`Effect: Duplicate request failed as expected. Error: ${sendResult2.error}`);

    // David sends request to Alice (should fail - request already exists)
    console.log(`Action: David (${userDavid}) tries to send request to Alice (${userAlice}) (reverse direction)`);
    const sendResult3 = await friendsListConcept.sendFriendRequest({
      sender: userDavid,
      receiver: userAlice,
    });
    if (!("error" in sendResult3)) { // Asserting type for TS
      throw new Error("sendFriendRequest should have failed due to existing request (reverse).");
    }
    assertEquals(sendResult3.error, "A pending friend request already exists between these users.", "Reverse request should be rejected.");
    console.log(`Effect: Reverse request failed as expected. Error: ${sendResult3.error}`);

    // David accepts request from Alice
    console.log(`Action: David (${userDavid}) accepts request from Alice (${userAlice})`);
    const acceptResult = await friendsListConcept.acceptFriendRequest({
      receiver: userDavid,
      sender: userAlice,
    });
    if ("error" in acceptResult) {
      throw new Error(`acceptFriendRequest failed: ${acceptResult.error}`);
    }
    assertEquals(acceptResult.success, true, "David should successfully accept the request.");
    console.log(`Effect: David accepted request. Result:`, acceptResult);
    console.log(`State: Alice and David are now friends.`);

    // Alice tries to send request to David (should fail - already friends)
    console.log(`Action: Alice (${userAlice}) tries to send request to David (${userDavid}) (already friends)`);
    const sendResult4 = await friendsListConcept.sendFriendRequest({
      sender: userAlice,
      receiver: userDavid,
    });
    if (!("error" in sendResult4)) { // Asserting type for TS
      throw new Error("sendFriendRequest should have failed because users are already friends.");
    }
    assertEquals(sendResult4.error, "Users are already friends.", "Request to existing friend should be rejected.");
    console.log(`Effect: Request to existing friend failed as expected. Error: ${sendResult4.error}`);

    // David tries to accept again (should fail - no request)
    console.log(`Action: David (${userDavid}) tries to accept a non-existent request from Alice (${userAlice})`);
    const acceptResult2 = await friendsListConcept.acceptFriendRequest({
      receiver: userDavid,
      sender: userAlice,
    });
    if (!("error" in acceptResult2)) { // Asserting type for TS
      throw new Error("acceptFriendRequest should have failed because no request exists.");
    }
    assertEquals(acceptResult2.error, "No pending friend request from sender to receiver.", "Accepting non-existent request should fail.");
    console.log(`Effect: Accepting non-existent request failed as expected. Error: ${acceptResult2.error}`);
  });

  await test.step("Scenario 3: Cancelling a request", async () => {
    console.log("\n--- Scenario 3: Cancelling a request ---");

    // Make sure Eve and Carol are clean
    await friendsListConcept.friendships.deleteMany({
      $or: [{ user1: userEve, user2: userCarol }, { user1: userCarol, user2: userEve }],
    });
    await friendsListConcept.friendRequests.deleteMany({
      $or: [{ sender: userEve, receiver: userCarol }, { sender: userCarol, receiver: userEve }],
    });

    // Eve sends request to Carol
    console.log(`Action: Eve (${userEve}) sends friend request to Carol (${userCarol})`);
    const sendResult = await friendsListConcept.sendFriendRequest({
      sender: userEve,
      receiver: userCarol,
    });
    if ("error" in sendResult) {
      throw new Error(`sendFriendRequest failed: ${sendResult.error}`);
    }
    console.log(`Effect: Request ${sendResult.request} sent. Result:`, sendResult);

    // Eve cancels the request
    console.log(`Action: Eve (${userEve}) cancels sent request to Carol (${userCarol})`);
    const cancelResult = await friendsListConcept.cancelSentRequest({
      sender: userEve,
      receiver: userCarol,
    });
    if ("error" in cancelResult) {
      throw new Error(`cancelSentRequest failed: ${cancelResult.error}`);
    }
    assertEquals(cancelResult.success, true, "Request cancellation should be successful.");
    console.log(`Effect: Eve canceled request. Result:`, cancelResult);

    // Verify request is gone
    const requestsAfterCancel = await friendsListConcept.friendRequests.find({
      sender: userEve,
      receiver: userCarol,
    }).toArray();
    assertEquals(requestsAfterCancel.length, 0, "Friend request should be deleted after cancellation.");

    // Carol tries to accept (should fail)
    console.log(`Action: Carol (${userCarol}) tries to accept a cancelled request from Eve (${userEve})`);
    const acceptResult = await friendsListConcept.acceptFriendRequest({
      receiver: userCarol,
      sender: userEve,
    });
    if (!("error" in acceptResult)) { // Asserting type for TS
      throw new Error("acceptFriendRequest should have failed because request was cancelled.");
    }
    assertEquals(acceptResult.error, "No pending friend request from sender to receiver.", "Accepting cancelled request should fail.");
    console.log(`Effect: Accepting cancelled request failed as expected. Error: ${acceptResult.error}`);
  });

  await test.step("Scenario 4: Edge cases / Errors", async () => {
    console.log("\n--- Scenario 4: Edge cases / Errors ---");

    // Sending request to self
    console.log(`Action: Alice (${userAlice}) tries to send friend request to herself`);
    const selfRequestResult = await friendsListConcept.sendFriendRequest({
      sender: userAlice,
      receiver: userAlice,
    });
    if (!("error" in selfRequestResult)) { // Asserting type for TS
      throw new Error("sendFriendRequest to self should have failed.");
    }
    assertEquals(selfRequestResult.error, "Cannot send a friend request to yourself.", "Sending request to self should fail.");
    console.log(`Effect: Request to self failed as expected. Error: ${selfRequestResult.error}`);

    // Removing a non-existent friendship
    console.log(`Action: Alice (${userAlice}) tries to remove non-existent friendship with Eve (${userEve})`);
    const nonExistentRemoveResult = await friendsListConcept.removeFriend({
      user1: userAlice,
      user2: userEve,
    });
    if (!("error" in nonExistentRemoveResult)) { // Asserting type for TS
      throw new Error("removeFriend for non-existent friendship should have failed.");
    }
    assertEquals(nonExistentRemoveResult.error, "No friendship found between these users.", "Removing non-existent friendship should fail.");
    console.log(`Effect: Removing non-existent friendship failed as expected. Error: ${nonExistentRemoveResult.error}`);

    // Accepting a non-existent request
    console.log(`Action: David (${userDavid}) tries to accept non-existent request from Eve (${userEve})`);
    const nonExistentAcceptResult = await friendsListConcept.acceptFriendRequest({
      receiver: userDavid,
      sender: userEve,
    });
    if (!("error" in nonExistentAcceptResult)) { // Asserting type for TS
      throw new Error("acceptFriendRequest for non-existent request should have failed.");
    }
    assertEquals(nonExistentAcceptResult.error, "No pending friend request from sender to receiver.", "Accepting non-existent request should fail.");
    console.log(`Effect: Accepting non-existent request failed as expected. Error: ${nonExistentAcceptResult.error}`);

    // Declining a non-existent request
    console.log(`Action: David (${userDavid}) tries to decline non-existent request from Eve (${userEve})`);
    const nonExistentDeclineResult = await friendsListConcept.declineFriendRequest({
      receiver: userDavid,
      sender: userEve,
    });
    if (!("error" in nonExistentDeclineResult)) { // Asserting type for TS
      throw new Error("declineFriendRequest for non-existent request should have failed.");
    }
    assertEquals(nonExistentDeclineResult.error, "No pending friend request from sender to receiver found to decline.", "Declining non-existent request should fail.");
    console.log(`Effect: Declining non-existent request failed as expected. Error: ${nonExistentDeclineResult.error}`);

    // Cancelling a non-existent request
    console.log(`Action: Eve (${userEve}) tries to cancel non-existent request to David (${userDavid})`);
    const nonExistentCancelResult = await friendsListConcept.cancelSentRequest({
      sender: userEve,
      receiver: userDavid,
    });
    if (!("error" in nonExistentCancelResult)) { // Asserting type for TS
      throw new Error("cancelSentRequest for non-existent request should have failed.");
    }
    assertEquals(nonExistentCancelResult.error, "No pending friend request from sender to receiver found to cancel.", "Cancelling non-existent request should fail.");
    console.log(`Effect: Cancelling non-existent request failed as expected. Error: ${nonExistentCancelResult.error}`);
  });

  await test.step("Query Tests", async () => {
    console.log("\n--- Query Tests ---");

    // Ensure a clean state for queries first
    await friendsListConcept.friendships.deleteMany({});
    await friendsListConcept.friendRequests.deleteMany({});

    // Setup some state
    const { request: req1 } = await friendsListConcept.sendFriendRequest({ sender: userAlice, receiver: userBob }) as { request: ID };
    const { request: req2 } = await friendsListConcept.sendFriendRequest({ sender: userCarol, receiver: userDavid }) as { request: ID };
    await friendsListConcept.acceptFriendRequest({ receiver: userBob, sender: userAlice }); // Alice-Bob friendship
    await friendsListConcept.sendFriendRequest({ sender: userEve, receiver: userAlice }); // Eve-Alice pending

    // _getAllFriendships
    console.log("Query: _getAllFriendships");
    const allFriendships = await friendsListConcept._getAllFriendships();
    if ("error" in allFriendships) throw new Error(`Query failed: ${allFriendships.error}`);
    assertEquals(allFriendships.length, 1, "Should have 1 friendship.");
    assertArrayIncludes(allFriendships.map(f => f.user1), [friendsListConcept["canonicalizeUsers"](userAlice, userBob).user1]);
    console.log("Result _getAllFriendships:", allFriendships);

    // _getFriendshipsByUser (userAlice)
    console.log(`Query: _getFriendshipsByUser for ${userAlice}`);
    const aliceFriendships = await friendsListConcept._getFriendshipsByUser({ user: userAlice });
    if ("error" in aliceFriendships) throw new Error(`Query failed: ${aliceFriendships.error}`);
    assertEquals(aliceFriendships.length, 1, "Alice should have 1 friendship.");
    assertArrayIncludes(aliceFriendships.map(f => f.user1), [friendsListConcept["canonicalizeUsers"](userAlice, userBob).user1]);
    console.log("Result _getFriendshipsByUser (Alice):", aliceFriendships);

    // _getFriendshipsByUser (userDavid - no friendships)
    console.log(`Query: _getFriendshipsByUser for ${userDavid}`);
    const davidFriendships = await friendsListConcept._getFriendshipsByUser({ user: userDavid });
    if ("error" in davidFriendships) throw new Error(`Query failed: ${davidFriendships.error}`);
    assertEquals(davidFriendships.length, 0, "David should have 0 friendships.");
    console.log("Result _getFriendshipsByUser (David):", davidFriendships);


    // _getAllFriendRequests
    console.log("Query: _getAllFriendRequests");
    const allRequests = await friendsListConcept._getAllFriendRequests();
    if ("error" in allRequests) throw new Error(`Query failed: ${allRequests.error}`);
    assertEquals(allRequests.length, 2, "Should have 2 pending friend requests.");
    assertArrayIncludes(allRequests.map(r => r.sender), [userCarol, userEve]);
    console.log("Result _getAllFriendRequests:", allRequests);

    // _getSentFriendRequests (userCarol)
    console.log(`Query: _getSentFriendRequests for ${userCarol}`);
    const carolSentRequests = await friendsListConcept._getSentFriendRequests({ sender: userCarol });
    if ("error" in carolSentRequests) throw new Error(`Query failed: ${carolSentRequests.error}`);
    assertEquals(carolSentRequests.length, 1, "Carol should have sent 1 request.");
    assertEquals(carolSentRequests[0].receiver, userDavid);
    console.log("Result _getSentFriendRequests (Carol):", carolSentRequests);

    // _getReceivedFriendRequests (userAlice)
    console.log(`Query: _getReceivedFriendRequests for ${userAlice}`);
    const aliceReceivedRequests = await friendsListConcept._getReceivedFriendRequests({ receiver: userAlice });
    if ("error" in aliceReceivedRequests) throw new Error(`Query failed: ${aliceReceivedRequests.error}`);
    assertEquals(aliceReceivedRequests.length, 1, "Alice should have received 1 request.");
    assertEquals(aliceReceivedRequests[0].sender, userEve);
    console.log("Result _getReceivedFriendRequests (Alice):", aliceReceivedRequests);

    // _getFriendshipDetails (existing)
    const existingFriendship = allFriendships[0];
    console.log(`Query: _getFriendshipDetails for ID ${existingFriendship._id}`);
    const friendshipDetails = await friendsListConcept._getFriendshipDetails({ friendshipId: existingFriendship._id });
    if ("error" in friendshipDetails) throw new Error(`Query failed: ${friendshipDetails.error}`);
    assertEquals(friendshipDetails.length, 1, "Should find 1 friendship detail.");
    assertEquals(friendshipDetails[0]._id, existingFriendship._id);
    console.log("Result _getFriendshipDetails (existing):", friendshipDetails);

    // _getFriendshipDetails (non-existent)
    const nonExistentId: ID = "nonExistentFriendship" as ID;
    console.log(`Query: _getFriendshipDetails for non-existent ID ${nonExistentId}`);
    const nonExistentFriendshipDetails = await friendsListConcept._getFriendshipDetails({ friendshipId: nonExistentId });
    if ("error" in nonExistentFriendshipDetails) throw new Error(`Query failed: ${nonExistentFriendshipDetails.error}`);
    assertEquals(nonExistentFriendshipDetails.length, 0, "Should find 0 friendship details for non-existent ID.");
    console.log("Result _getFriendshipDetails (non-existent):", nonExistentFriendshipDetails);

    // _getFriendRequestDetails (existing)
    const existingRequest = allRequests.find(r => r.sender === userCarol);
    if (!existingRequest) throw new Error("Could not find Carol's request for testing");
    console.log(`Query: _getFriendRequestDetails for ID ${existingRequest._id}`);
    const requestDetails = await friendsListConcept._getFriendRequestDetails({ requestId: existingRequest._id });
    if ("error" in requestDetails) throw new Error(`Query failed: ${requestDetails.error}`);
    assertEquals(requestDetails.length, 1, "Should find 1 request detail.");
    assertEquals(requestDetails[0]._id, existingRequest._id);
    console.log("Result _getFriendRequestDetails (existing):", requestDetails);

    // _getFriendRequestDetails (non-existent)
    const nonExistentRequestId: ID = "nonExistentRequest" as ID;
    console.log(`Query: _getFriendRequestDetails for non-existent ID ${nonExistentRequestId}`);
    const nonExistentRequestDetails = await friendsListConcept._getFriendRequestDetails({ requestId: nonExistentRequestId });
    if ("error" in nonExistentRequestDetails) throw new Error(`Query failed: ${nonExistentRequestDetails.error}`);
    assertEquals(nonExistentRequestDetails.length, 0, "Should find 0 request details for non-existent ID.");
    console.log("Result _getFriendRequestDetails (non-existent):", nonExistentRequestDetails);
  });

  await client.close();
});
```
