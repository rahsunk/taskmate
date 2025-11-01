---
timestamp: 'Fri Oct 31 2025 20:34:10 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251031_203410.1757f690.md]]'
content_id: a72f152a85a55750980835f161069bfd9b5e9ecfb19077912e17022811f74b7a
---

# response:

```typescript
// file: src/FriendsList/FriendsListConcept.test.ts
import { assertEquals, assertExists, assertObjectMatch } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import FriendsListConcept from "./FriendsListConcept.ts";
import { ID } from "@utils/types.ts";

Deno.test("FriendsListConcept - Basic Operations and Operational Principle", async (t) => {
  const [db, client] = await testDb();
  const concept = new FriendsListConcept(db);

  const userA = "user:Alice" as ID;
  const userB = "user:Bob" as ID;
  const userC = "user:Charlie" as ID;

  console.log("\n--- Starting FriendsListConcept Tests ---");

  // --- Operational Principle Test ---
  await t.step("Scenario: Operational Principle (Send -> Accept -> Remove)", async () => {
    console.log("\n--- Operational Principle: Alice sends request to Bob, Bob accepts, Alice removes Bob ---");

    // 1. Alice sends a friend request to Bob
    console.log(`Action: Alice (${userA}) sends friend request to Bob (${userB})`);
    const sendResult = await concept.sendFriendRequest({ sender: userA, receiver: userB });
    if ("error" in sendResult) {
      throw new Error(`sendFriendRequest failed: ${sendResult.error}`);
    }
    const requestId1 = sendResult.request;
    assertExists(requestId1, "Request ID should be returned on successful sendFriendRequest.");
    console.log(`Effect: Friend request sent. Request ID: ${requestId1}`);

    const pendingRequests = await concept._getAllFriendRequests();
    if ("error" in pendingRequests) throw new Error(pendingRequests.error);
    assertEquals(pendingRequests.length, 1, "There should be one pending friend request.");
    assertObjectMatch(pendingRequests[0], { sender: userA, receiver: userB });

    // 2. Bob accepts Alice's friend request
    console.log(`Action: Bob (${userB}) accepts friend request from Alice (${userA})`);
    const acceptResult = await concept.acceptFriendRequest({ receiver: userB, sender: userA });
    if ("error" in acceptResult) {
      throw new Error(`acceptFriendRequest failed: ${acceptResult.error}`);
    }
    assertEquals(acceptResult.success, true, "Friend request should be accepted successfully.");
    console.log("Effect: Friend request accepted, friendship established.");

    const afterAcceptRequests = await concept._getAllFriendRequests();
    if ("error" in afterAcceptRequests) throw new Error(afterAcceptRequests.error);
    assertEquals(afterAcceptRequests.length, 0, "No pending requests after acceptance.");

    const friendships = await concept._getAllFriendships();
    if ("error" in friendships) throw new Error(friendships.error);
    assertEquals(friendships.length, 1, "There should be one active friendship.");
    assertObjectMatch(this.concept.canonicalizeUsers(userA, userB), { user1: friendships[0].user1, user2: friendships[0].user2 }); // Check canonical form

    // 3. Alice removes Bob from friends list
    console.log(`Action: Alice (${userA}) removes Bob (${userB})`);
    const removeResult = await concept.removeFriend({ user1: userA, user2: userB });
    if ("error" in removeResult) {
      throw new Error(`removeFriend failed: ${removeResult.error}`);
    }
    assertEquals(removeResult.success, true, "Friendship should be removed successfully.");
    console.log("Effect: Friendship removed.");

    const afterRemoveFriendships = await concept._getAllFriendships();
    if ("error" in afterRemoveFriendships) throw new Error(afterRemoveFriendships.error);
    assertEquals(afterRemoveFriendships.length, 0, "No active friendships after removal.");
    console.log("Operational Principle Test Completed: Alice and Bob are no longer friends.");
  });

  // --- Interesting Scenarios ---

  await t.step("Scenario: Duplicate and Reverse Friend Requests", async () => {
    console.log("\n--- Scenario: Duplicate and Reverse Friend Requests ---");

    // Clear state from previous test (testDb handles this by dropping, but good to ensure logic)
    await db.collection(PREFIX + "friendships").deleteMany({});
    await db.collection(PREFIX + "friendRequests").deleteMany({});

    // Alice sends request to Bob
    console.log(`Action: Alice (${userA}) sends friend request to Bob (${userB})`);
    const sendResult1 = await concept.sendFriendRequest({ sender: userA, receiver: userB });
    if ("error" in sendResult1) throw new Error(sendResult1.error);
    assertExists(sendResult1.request);
    console.log(`Effect: Request from ${userA} to ${userB} sent.`);

    // Alice tries to send request to Bob again (should fail)
    console.log(`Action: Alice (${userA}) attempts to send duplicate request to Bob (${userB})`);
    const sendResult2 = await concept.sendFriendRequest({ sender: userA, receiver: userB });
    assertExists(sendResult2.error, "Should return an error for duplicate request.");
    assertEquals(sendResult2.error, "A pending friend request already exists between these users.", "Correct error message for duplicate request.");
    console.log(`Effect: Expected error: ${sendResult2.error}`);

    // Bob tries to send request to Alice (should fail due to existing reverse request)
    console.log(`Action: Bob (${userB}) attempts to send request to Alice (${userA}) while one is pending`);
    const sendResult3 = await concept.sendFriendRequest({ sender: userB, receiver: userA });
    assertExists(sendResult3.error, "Should return an error for existing reverse request.");
    assertEquals(sendResult3.error, "A pending friend request already exists between these users.", "Correct error message for reverse pending request.");
    console.log(`Effect: Expected error: ${sendResult3.error}`);

    // Bob accepts Alice's request
    console.log(`Action: Bob (${userB}) accepts request from Alice (${userA})`);
    const acceptResult = await concept.acceptFriendRequest({ receiver: userB, sender: userA });
    if ("error" in acceptResult) throw new Error(acceptResult.error);
    assertEquals(acceptResult.success, true);
    console.log(`Effect: ${userA} and ${userB} are now friends.`);

    const friendships = await concept._getAllFriendships();
    if ("error" in friendships) throw new Error(friendships.error);
    assertEquals(friendships.length, 1);
    assertObjectMatch(this.concept.canonicalizeUsers(userA, userB), { user1: friendships[0].user1, user2: friendships[0].user2 });

    // Alice tries to send request to Bob again (should fail as they are already friends)
    console.log(`Action: Alice (${userA}) attempts to send request to Bob (${userB}) again (already friends)`);
    const sendResult4 = await concept.sendFriendRequest({ sender: userA, receiver: userB });
    assertExists(sendResult4.error, "Should return an error for already friends.");
    assertEquals(sendResult4.error, "Users are already friends.", "Correct error message for already friends.");
    console.log(`Effect: Expected error: ${sendResult4.error}`);
    console.log("Scenario: Duplicate and Reverse Friend Requests Completed.");
  });

  await t.step("Scenario: Decline and Cancel Friend Requests", async () => {
    console.log("\n--- Scenario: Decline and Cancel Friend Requests ---");

    await db.collection(PREFIX + "friendships").deleteMany({});
    await db.collection(PREFIX + "friendRequests").deleteMany({});

    // Alice sends request to Charlie
    console.log(`Action: Alice (${userA}) sends friend request to Charlie (${userC})`);
    const sendResultAtoC = await concept.sendFriendRequest({ sender: userA, receiver: userC });
    if ("error" in sendResultAtoC) throw new Error(sendResultAtoC.error);
    assertExists(sendResultAtoC.request);
    console.log(`Effect: Request from ${userA} to ${userC} sent.`);

    // Charlie declines Alice's request
    console.log(`Action: Charlie (${userC}) declines request from Alice (${userA})`);
    const declineResult = await concept.declineFriendRequest({ receiver: userC, sender: userA });
    if ("error" in declineResult) throw new Error(declineResult.error);
    assertEquals(declineResult.success, true, "Request should be declined successfully.");
    console.log(`Effect: Request from ${userA} to ${userC} declined.`);

    let pendingRequests = await concept._getAllFriendRequests();
    if ("error" in pendingRequests) throw new Error(pendingRequests.error);
    assertEquals(pendingRequests.length, 0, "No pending requests after decline.");
    console.log("State: No pending requests.");

    // Alice sends request to Bob
    console.log(`Action: Alice (${userA}) sends friend request to Bob (${userB})`);
    const sendResultAtoB = await concept.sendFriendRequest({ sender: userA, receiver: userB });
    if ("error" in sendResultAtoB) throw new Error(sendResultAtoB.error);
    assertExists(sendResultAtoB.request);
    console.log(`Effect: Request from ${userA} to ${userB} sent.`);

    // Alice cancels her request to Bob
    console.log(`Action: Alice (${userA}) cancels request to Bob (${userB})`);
    const cancelResult = await concept.cancelSentRequest({ sender: userA, receiver: userB });
    if ("error" in cancelResult) throw new Error(cancelResult.error);
    assertEquals(cancelResult.success, true, "Request should be cancelled successfully.");
    console.log(`Effect: Request from ${userA} to ${userB} cancelled.`);

    pendingRequests = await concept._getAllFriendRequests();
    if ("error" in pendingRequests) throw new Error(pendingRequests.error);
    assertEquals(pendingRequests.length, 0, "No pending requests after cancel.");
    console.log("State: No pending requests.");
    console.log("Scenario: Decline and Cancel Friend Requests Completed.");
  });

  await t.step("Scenario: Self-Friend Request and Non-existent Operations", async () => {
    console.log("\n--- Scenario: Self-Friend Request and Non-existent Operations ---");

    await db.collection(PREFIX + "friendships").deleteMany({});
    await db.collection(PREFIX + "friendRequests").deleteMany({});

    // Try to send a friend request to self (should fail)
    console.log(`Action: Alice (${userA}) attempts to send friend request to herself.`);
    const selfRequestResult = await concept.sendFriendRequest({ sender: userA, receiver: userA });
    assertExists(selfRequestResult.error, "Should return an error for self-request.");
    assertEquals(selfRequestResult.error, "Cannot send a friend request to yourself.", "Correct error message for self-request.");
    console.log(`Effect: Expected error: ${selfRequestResult.error}`);

    // Attempt to accept a non-existent request
    console.log(`Action: Bob (${userB}) attempts to accept non-existent request from Alice (${userA})`);
    const acceptNonExistent = await concept.acceptFriendRequest({ receiver: userB, sender: userA });
    assertExists(acceptNonExistent.error, "Should return error for non-existent request.");
    assertEquals(acceptNonExistent.error, "No pending friend request from sender to receiver.", "Correct error for accepting non-existent request.");
    console.log(`Effect: Expected error: ${acceptNonExistent.error}`);

    // Attempt to decline a non-existent request
    console.log(`Action: Bob (${userB}) attempts to decline non-existent request from Alice (${userA})`);
    const declineNonExistent = await concept.declineFriendRequest({ receiver: userB, sender: userA });
    assertExists(declineNonExistent.error, "Should return error for non-existent request.");
    assertEquals(declineNonExistent.error, "No pending friend request from sender to receiver found to decline.", "Correct error for declining non-existent request.");
    console.log(`Effect: Expected error: ${declineNonExistent.error}`);

    // Attempt to cancel a non-existent request
    console.log(`Action: Alice (${userA}) attempts to cancel non-existent request to Bob (${userB})`);
    const cancelNonExistent = await concept.cancelSentRequest({ sender: userA, receiver: userB });
    assertExists(cancelNonExistent.error, "Should return error for non-existent request.");
    assertEquals(cancelNonExistent.error, "No pending friend request from sender to receiver found to cancel.", "Correct error for cancelling non-existent request.");
    console.log(`Effect: Expected error: ${cancelNonExistent.error}`);

    // Attempt to remove a non-existent friendship
    console.log(`Action: Alice (${userA}) attempts to remove non-existent friendship with Charlie (${userC})`);
    const removeNonExistent = await concept.removeFriend({ user1: userA, user2: userC });
    assertExists(removeNonExistent.error, "Should return error for non-existent friendship.");
    assertEquals(removeNonExistent.error, "No friendship found between these users.", "Correct error for removing non-existent friendship.");
    console.log(`Effect: Expected error: ${removeNonExistent.error}`);
    console.log("Scenario: Self-Friend Request and Non-existent Operations Completed.");
  });

  // --- Query Tests ---
  await t.step("Queries: Verify retrieval of friendships and requests", async () => {
    console.log("\n--- Query Tests ---");

    await db.collection(PREFIX + "friendships").deleteMany({});
    await db.collection(PREFIX + "friendRequests").deleteMany({});

    // Setup some state for queries
    const req1Result = await concept.sendFriendRequest({ sender: userA, receiver: userB }); // A -> B
    if ("error" in req1Result) throw new Error(req1Result.error);
    const req1Id = req1Result.request;

    const req2Result = await concept.sendFriendRequest({ sender: userC, receiver: userA }); // C -> A
    if ("error" in req2Result) throw new Error(req2Result.error);
    const req2Id = req2Result.request;

    await concept.acceptFriendRequest({ receiver: userB, sender: userA }); // A & B are friends
    await concept.acceptFriendRequest({ receiver: userA, sender: userC }); // C & A are friends

    console.log("State setup: A-B friendship, C-A friendship, no pending requests.");

    // _getAllFriendships
    console.log("Query: _getAllFriendships");
    const allFriendships = await concept._getAllFriendships();
    if ("error" in allFriendships) throw new Error(allFriendships.error);
    assertEquals(allFriendships.length, 2, "Should retrieve all 2 friendships.");
    console.log(`Result: ${JSON.stringify(allFriendships)}`);

    // _getFriendshipsByUser (userA)
    console.log(`Query: _getFriendshipsByUser for ${userA}`);
    const friendshipsForA = await concept._getFriendshipsByUser({ user: userA });
    if ("error" in friendshipsForA) throw new Error(friendshipsForA.error);
    assertEquals(friendshipsForA.length, 2, `Should retrieve 2 friendships for ${userA}.`);
    assertObjectMatch(friendshipsForA[0], this.concept.canonicalizeUsers(userA, userB));
    assertObjectMatch(friendshipsForA[1], this.concept.canonicalizeUsers(userA, userC));
    console.log(`Result: ${JSON.stringify(friendshipsForA)}`);

    // _getFriendshipsByUser (userB)
    console.log(`Query: _getFriendshipsByUser for ${userB}`);
    const friendshipsForB = await concept._getFriendshipsByUser({ user: userB });
    if ("error" in friendshipsForB) throw new Error(friendshipsForB.error);
    assertEquals(friendshipsForB.length, 1, `Should retrieve 1 friendship for ${userB}.`);
    assertObjectMatch(friendshipsForB[0], this.concept.canonicalizeUsers(userA, userB));
    console.log(`Result: ${JSON.stringify(friendshipsForB)}`);

    // _getAllFriendRequests (should be empty)
    console.log("Query: _getAllFriendRequests");
    const allFriendRequests = await concept._getAllFriendRequests();
    if ("error" in allFriendRequests) throw new Error(allFriendRequests.error);
    assertEquals(allFriendRequests.length, 0, "Should retrieve 0 friend requests.");
    console.log(`Result: ${JSON.stringify(allFriendRequests)}`);

    // _getSentFriendRequests (userA, should be empty)
    console.log(`Query: _getSentFriendRequests for ${userA}`);
    const sentRequestsForA = await concept._getSentFriendRequests({ sender: userA });
    if ("error" in sentRequestsForA) throw new Error(sentRequestsForA.error);
    assertEquals(sentRequestsForA.length, 0, `Should retrieve 0 sent requests for ${userA}.`);
    console.log(`Result: ${JSON.stringify(sentRequestsForA)}`);

    // _getReceivedFriendRequests (userB, should be empty)
    console.log(`Query: _getReceivedFriendRequests for ${userB}`);
    const receivedRequestsForB = await concept._getReceivedFriendRequests({ receiver: userB });
    if ("error" in receivedRequestsForB) throw new Error(receivedRequestsForB.error);
    assertEquals(receivedRequestsForB.length, 0, `Should retrieve 0 received requests for ${userB}.`);
    console.log(`Result: ${JSON.stringify(receivedRequestsForB)}`);

    // Test _getFriendshipDetails
    console.log("Query: _getFriendshipDetails (using first friendship ID)");
    const firstFriendship = allFriendships[0];
    const friendshipDetails = await concept._getFriendshipDetails({ friendshipId: firstFriendship._id });
    if ("error" in friendshipDetails) throw new Error(friendshipDetails.error);
    assertEquals(friendshipDetails.length, 1, "Should retrieve one friendship detail.");
    assertObjectMatch(friendshipDetails[0], firstFriendship);
    console.log(`Result: ${JSON.stringify(friendshipDetails)}`);

    // Test _getFriendRequestDetails (should be empty)
    console.log("Query: _getFriendRequestDetails (for a deleted request ID)");
    const requestDetails = await concept._getFriendRequestDetails({ requestId: req1Id });
    if ("error" in requestDetails) throw new Error(requestDetails.error);
    assertEquals(requestDetails.length, 0, "Should retrieve 0 request details for a deleted request.");
    console.log(`Result: ${JSON.stringify(requestDetails)}`);
    
    console.log("Query Tests Completed.");
  });

  await client.close();
  console.log("--- All FriendsListConcept Tests Completed ---");
});
```
