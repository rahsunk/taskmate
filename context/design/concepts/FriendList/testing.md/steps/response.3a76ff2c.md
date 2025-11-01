---
timestamp: 'Fri Oct 31 2025 20:43:42 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251031_204342.89b3b99a.md]]'
content_id: 3a76ff2c1294ff57767b70b9d75641b0479162c055bf2fdd2d6bd1a1b6dade40
---

# response:

You're absolutely right! My apologies. The `FriendshipDoc` and `FriendRequestDoc` interfaces were defined within the `FriendsListConcept.ts` file but were not explicitly `export`ed, which is why TypeScript couldn't find them when you tried to import them in the test file.

Let's correct that.

First, **update `src/FriendsList/FriendsListConcept.ts`** to export the interfaces:

```typescript
// file: src/FriendsList/FriendsListConcept.ts
import { Collection, Db } from "npm:mongodb";
import { ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Declare collection prefix, use concept name
const PREFIX = "FriendsList" + ".";

// Generic types of this concept
type User = ID; // User identity is an external generic type

/**
 * a set of Friendships with
 *   a user1 User
 *   a user2 User
 *
 * NOTE: For canonical representation, user1 < user2 lexicographically
 */
export interface FriendshipDoc { // <--- Added 'export' here
  _id: ID;
  user1: User;
  user2: User;
}

/**
 * a set of FriendRequests with
 *   a sender User
 *   a receiver User
 */
export interface FriendRequestDoc { // <--- Added 'export' here
  _id: ID;
  sender: User;
  receiver: User;
}

// Result type for sendFriendRequest
interface SendFriendRequestResult {
  request: ID; // ID of the created FriendRequest
}

// Generic success result for actions that don't return specific data
interface ActionSuccessResult {
  success: true;
}

/**
 * concept FriendsList [User]
 * purpose Enable users to establish and manage mutual social connections with others in the application.
 * principle If user 1 sends a friend request to user 2, and user 2 accepts it, then user 1 and user 2 will become mutual friends.
 *           Later, either user 1 or user 2 can remove the other from their friends list, thereby ending the mutual connection.
 * state
 *   a set of Friendships with
 *     a user1 User
 *     a user2 User
 *   a set of FriendRequests with
 *     a sender User
 *     a receiver User
 * actions
 *   sendFriendRequest (sender: User, receiver: User): (request: FriendRequest)
 *   acceptFriendRequest (receiver: User, sender: User)
 *   declineFriendRequest (receiver: User, sender: User)
 *   cancelSentRequest (sender: User, receiver: User)
 *   removeFriend (user1: User, user2: User)
 */
export default class FriendsListConcept {
  friendships: Collection<FriendshipDoc>;
  friendRequests: Collection<FriendRequestDoc>;

  constructor(private readonly db: Db) {
    this.friendships = this.db.collection(PREFIX + "friendships");
    this.friendRequests = this.db.collection(PREFIX + "friendRequests");
  }

  /**
   * Helper to canonicalize friendship users for consistent storage/lookup.
   * Ensures user1 is always lexicographically smaller than user2.
   */
  private canonicalizeUsers(u1: User, u2: User): { user1: User; user2: User } {
    return u1 < u2 ? { user1: u1, user2: u2 } : { user1: u2, user2: u1 };
  }

  /**
   * sendFriendRequest (sender: User, receiver: User): (request: FriendRequest)
   *
   * **requires** `sender` is not equal to `receiver`, no `Friendship` exists between `sender` and `receiver,
   *              no `FriendRequest` exists from `sender` to `receiver`, no `FriendRequest` exists from `receiver` to `sender`
   *
   * **effects** A new `FriendRequest` is created with the given `sender` and `receiver`.
   * Returns the ID of the newly created `FriendRequest`.
   */
  async sendFriendRequest(
    { sender, receiver }: { sender: User; receiver: User },
  ): Promise<SendFriendRequestResult | { error: string }> {
    // Precondition: `sender` is not equal to `receiver`
    if (sender === receiver) {
      return { error: "Cannot send a friend request to yourself." };
    }

    // Precondition: no `Friendship` exists between `sender` and `receiver`
    const { user1, user2 } = this.canonicalizeUsers(sender, receiver);
    const existingFriendship = await this.friendships.findOne({
      user1: user1,
      user2: user2,
    });
    if (existingFriendship) {
      return { error: "Users are already friends." };
    }

    // Precondition: no `FriendRequest` exists from `sender` to `receiver` or `receiver` to `sender`
    const existingRequest = await this.friendRequests.findOne({
      $or: [
        { sender: sender, receiver: receiver },
        { sender: receiver, receiver: sender }, // Check for request in reverse direction
      ],
    });
    if (existingRequest) {
      return {
        error: "A pending friend request already exists between these users.",
      };
    }

    // Effects: Create a new `FriendRequest`
    const newRequestId = freshID();
    await this.friendRequests.insertOne({
      _id: newRequestId,
      sender: sender,
      receiver: receiver,
    });

    return { request: newRequestId };
  }

  /**
   * acceptFriendRequest (receiver: User, sender: User): (success: true)
   *
   * **requires** A `FriendRequest` exists from `sender` to `receiver`, no `Friendship` exists between `sender` and `receiver`
   *
   * **effects** The `FriendRequest` from `sender` to `receiver` is deleted and a new `Friendship` is created between `sender` and `receiver` (canonicalized).
   */
  async acceptFriendRequest(
    { receiver, sender }: { receiver: User; sender: User },
  ): Promise<ActionSuccessResult | { error: string }> {
    // Precondition: A `FriendRequest` exists from `sender` to `receiver`
    const friendRequest = await this.friendRequests.findOne({
      sender: sender,
      receiver: receiver,
    });
    if (!friendRequest) {
      return { error: "No pending friend request from sender to receiver." };
    }

    // Precondition: no `Friendship` exists between `sender` and `receiver`
    const { user1, user2 } = this.canonicalizeUsers(sender, receiver);
    const existingFriendship = await this.friendships.findOne({
      user1: user1,
      user2: user2,
    });
    if (existingFriendship) {
      return { error: "Users are already friends." };
    }

    // Effects: Delete the `FriendRequest`
    await this.friendRequests.deleteOne({ _id: friendRequest._id });

    // Effects: Create a new `Friendship`
    await this.friendships.insertOne({
      _id: freshID(),
      user1: user1,
      user2: user2,
    });

    return { success: true };
  }

  /**
   * declineFriendRequest (receiver: User, sender: User): (success: true)
   *
   * **requires** A `FriendRequest` exists from `sender` to `receiver`
   *
   * **effects** The `FriendRequest` from `sender` to `receiver` is deleted.
   */
  async declineFriendRequest(
    { receiver, sender }: { receiver: User; sender: User },
  ): Promise<ActionSuccessResult | { error: string }> {
    // Precondition: A `FriendRequest` exists from `sender` to `receiver`
    const result = await this.friendRequests.deleteOne({
      sender: sender,
      receiver: receiver,
    });

    if (result.deletedCount === 0) {
      return {
        error: "No pending friend request from sender to receiver found to decline.",
      };
    }

    return { success: true };
  }

  /**
   * cancelSentRequest (sender: User, receiver: User): (success: true)
   *
   * **requires** A `FriendRequest` exists from `sender` to `receiver`
   *
   * **effects** The `FriendRequest` from `sender` to `receiver` is deleted.
   */
  async cancelSentRequest(
    { sender, receiver }: { sender: User; receiver: User },
  ): Promise<ActionSuccessResult | { error: string }> {
    // Precondition: A `FriendRequest` exists from `sender` to `receiver`
    const result = await this.friendRequests.deleteOne({
      sender: sender,
      receiver: receiver,
    });

    if (result.deletedCount === 0) {
      return {
        error: "No pending friend request from sender to receiver found to cancel.",
      };
    }

    return { success: true };
  }

  /**
   * removeFriend (user1: User, user2: User): (success: true)
   *
   * **requires** A `Friendship` exists between `user1` and `user2`
   *
   * **effects** The `Friendship` between `user1` and `user2` is deleted.
   */
  async removeFriend(
    { user1, user2 }: { user1: User; user2: User },
  ): Promise<ActionSuccessResult | { error: string }> {
    // Precondition: A `Friendship` exists between `user1` and `user2`
    const canonicalUsers = this.canonicalizeUsers(user1, user2);
    const result = await this.friendships.deleteOne(canonicalUsers);

    if (result.deletedCount === 0) {
      return { error: "No friendship found between these users." };
    }

    return { success: true };
  }

  /**
   * _getAllFriendships (): (friendship: FriendshipDoc)
   *
   * **requires** true
   *
   * **effects** Returns an array of all `FriendshipDoc` objects, including `_id`, `user1`, and `user2`.
   */
  async _getAllFriendships(): Promise<FriendshipDoc[] | { error: string }> {
    try {
      return await this.friendships.find({}).toArray();
    } catch (e) {
      // Safely access error message
      const errorMessage = e instanceof Error ? e.message : String(e);
      return { error: `Failed to retrieve all friendships: ${errorMessage}` };
    }
  }

  /**
   * _getFriendshipsByUser (user: User): (friendship: FriendshipDoc)
   *
   * **requires** `user` exists (external to this concept).
   *
   * **effects** Returns an array of `FriendshipDoc` objects where `user1` or `user2` matches the input `user`.
   */
  async _getFriendshipsByUser(
    { user }: { user: User },
  ): Promise<FriendshipDoc[] | { error: string }> {
    try {
      return await this.friendships.find({
        $or: [{ user1: user }, { user2: user }],
      }).toArray();
    } catch (e) {
      // Safely access error message
      const errorMessage = e instanceof Error ? e.message : String(e);
      return {
        error:
          `Failed to retrieve friendships for user ${user}: ${errorMessage}`,
      };
    }
  }

  /**
   * _getAllFriendRequests (): (request: FriendRequestDoc)
   *
   * **requires** true
   *
   * **effects** Returns an array of all `FriendRequestDoc` objects, including `_id`, `sender`, and `receiver`.
   */
  async _getAllFriendRequests(): Promise<
    FriendRequestDoc[] | { error: string }
  > {
    try {
      return await this.friendRequests.find({}).toArray();
    } catch (e) {
      // Safely access error message
      const errorMessage = e instanceof Error ? e.message : String(e);
      return {
        error: `Failed to retrieve all friend requests: ${errorMessage}`,
      };
    }
  }

  /**
   * _getSentFriendRequests (sender: User): (request: FriendRequestDoc)
   *
   * **requires** `sender` exists (external to this concept).
   *
   * **effects** Returns an array of `FriendRequestDoc` objects sent by the `sender`.
   */
  async _getSentFriendRequests(
    { sender }: { sender: User },
  ): Promise<FriendRequestDoc[] | { error: string }> {
    try {
      return await this.friendRequests.find({ sender: sender }).toArray();
    } catch (e) {
      // Safely access error message
      const errorMessage = e instanceof Error ? e.message : String(e);
      return {
        error:
          `Failed to retrieve sent friend requests for sender ${sender}: ${errorMessage}`,
      };
    }
  }

  /**
   * _getReceivedFriendRequests (receiver: User): (request: FriendRequestDoc)
   *
   * **requires** `receiver` exists (external to this concept).
   *
   * **effects** Returns an array of `FriendRequestDoc` objects received by the `receiver`.
   */
  async _getReceivedFriendRequests(
    { receiver }: { receiver: User },
  ): Promise<FriendRequestDoc[] | { error: string }> {
    try {
      return await this.friendRequests.find({ receiver: receiver }).toArray();
    } catch (e) {
      // Safely access error message
      const errorMessage = e instanceof Error ? e.message : String(e);
      return {
        error:
          `Failed to retrieve received friend requests for receiver ${receiver}: ${errorMessage}`,
      };
    }
  }

  /**
   * _getFriendshipDetails (friendshipId: ID): (friendship: FriendshipDoc)
   *
   * **requires** `friendshipId` exists.
   *
   * **effects** Returns an array containing the `FriendshipDoc` object matching the provided ID.
   */
  async _getFriendshipDetails(
    { friendshipId }: { friendshipId: ID },
  ): Promise<FriendshipDoc[] | { error: string }> {
    try {
      // FindOne will return null if not found, we ensure it's an array for consistency
      const result = await this.friendships.findOne({ _id: friendshipId });
      return result ? [result] : [];
    } catch (e) {
      // Safely access error message
      const errorMessage = e instanceof Error ? e.message : String(e);
      return {
        error:
          `Failed to retrieve friendship details for ID ${friendshipId}: ${errorMessage}`,
      };
    }
  }

  /**
   * _getFriendRequestDetails (requestId: ID): (request: FriendRequestDoc)
   *
   * **requires** `requestId` exists.
   *
   * **effects** Returns an array containing the `FriendRequestDoc` object matching the provided ID.
   */
  async _getFriendRequestDetails(
    { requestId }: { requestId: ID },
  ): Promise<FriendRequestDoc[] | { error: string }> {
    try {
      // FindOne will return null if not found, we ensure it's an array for consistency
      const result = await this.friendRequests.findOne({ _id: requestId });
      return result ? [result] : [];
    } catch (e) {
      // Safely access error message
      const errorMessage = e instanceof Error ? e.message : String(e);
      return {
        error:
          `Failed to retrieve friend request details for ID ${requestId}: ${errorMessage}`,
      };
    }
  }
}
```

Then, **update `src/FriendsList/FriendsListConcept.test.ts`** to import them correctly:

```typescript
// file: src/FriendsList/FriendsListConcept.test.ts
import { assertEquals, assertExists, assertObjectMatch } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import FriendsListConcept from "./FriendsListConcept.ts";
import { ID } from "@utils/types.ts";
import { FriendshipDoc, FriendRequestDoc } from "./FriendsListConcept.ts"; // Corrected import for named exports

// The PREFIX constant is internal to the concept implementation and not exported,
// so it's not directly accessible or needed in the test file.

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
    const requestId1 = sendResult.request; // Type is narrowed here to SendFriendRequestResult
    assertExists(requestId1, "Request ID should be returned on successful sendFriendRequest.");
    console.log(`Effect: Friend request sent. Request ID: ${requestId1}`);

    const pendingRequests = await concept._getAllFriendRequests();
    if ("error" in pendingRequests) throw new Error(pendingRequests.error); // Type is narrowed here
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
    if ("error" in afterAcceptRequests) throw new Error(afterAcceptRequests.error); // Type is narrowed here
    assertEquals(afterAcceptRequests.length, 0, "No pending requests after acceptance.");

    const friendships = await concept._getAllFriendships();
    if ("error" in friendships) throw new Error(friendships.error); // Type is narrowed here
    assertEquals(friendships.length, 1, "There should be one active friendship.");
    // Fix: Access canonicalizeUsers directly from the 'concept' instance, not 'this.concept'
    assertObjectMatch(concept.canonicalizeUsers(userA, userB), { user1: friendships[0].user1, user2: friendships[0].user2 }); // Check canonical form

    // 3. Alice removes Bob from friends list
    console.log(`Action: Alice (${userA}) removes Bob (${userB})`);
    const removeResult = await concept.removeFriend({ user1: userA, user2: userB });
    if ("error" in removeResult) {
      throw new Error(`removeFriend failed: ${removeResult.error}`);
    }
    assertEquals(removeResult.success, true, "Friendship should be removed successfully.");
    console.log("Effect: Friendship removed.");

    const afterRemoveFriendships = await concept._getAllFriendships();
    if ("error" in afterRemoveFriendships) throw new Error(afterRemoveFriendships.error); // Type is narrowed here
    assertEquals(afterRemoveFriendships.length, 0, "No active friendships after removal.");
    console.log("Operational Principle Test Completed: Alice and Bob are no longer friends.");
  });

  // --- Interesting Scenarios ---

  await t.step("Scenario: Duplicate and Reverse Friend Requests", async () => {
    console.log("\n--- Scenario: Duplicate and Reverse Friend Requests ---");

    // Fix: Clear state using concept's collections directly
    await concept.friendships.deleteMany({});
    await concept.friendRequests.deleteMany({});

    // Alice sends request to Bob
    console.log(`Action: Alice (${userA}) sends friend request to Bob (${userB})`);
    const sendResult1 = await concept.sendFriendRequest({ sender: userA, receiver: userB });
    if ("error" in sendResult1) throw new Error(sendResult1.error);
    assertExists(sendResult1.request);
    console.log(`Effect: Request from ${userA} to ${userB} sent.`);

    // Alice tries to send request to Bob again (should fail)
    console.log(`Action: Alice (${userA}) attempts to send duplicate request to Bob (${userB})`);
    const sendResult2 = await concept.sendFriendRequest({ sender: userA, receiver: userB });
    if (!("error" in sendResult2)) throw new Error("Expected an error for duplicate request, but got success."); // Ensure sendResult2 is error type
    assertExists(sendResult2.error, "Should return an error for duplicate request.");
    assertEquals(sendResult2.error, "A pending friend request already exists between these users.", "Correct error message for duplicate request.");
    console.log(`Effect: Expected error: ${sendResult2.error}`);

    // Bob tries to send request to Alice (should fail due to existing reverse request)
    console.log(`Action: Bob (${userB}) attempts to send request to Alice (${userA}) while one is pending`);
    const sendResult3 = await concept.sendFriendRequest({ sender: userB, receiver: userA });
    if (!("error" in sendResult3)) throw new Error("Expected an error for reverse request, but got success."); // Ensure sendResult3 is error type
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
    assertObjectMatch(concept.canonicalizeUsers(userA, userB), { user1: friendships[0].user1, user2: friendships[0].user2 });

    // Alice tries to send request to Bob again (should fail as they are already friends)
    console.log(`Action: Alice (${userA}) attempts to send request to Bob (${userB}) again (already friends)`);
    const sendResult4 = await concept.sendFriendRequest({ sender: userA, receiver: userB });
    if (!("error" in sendResult4)) throw new Error("Expected an error for already friends, but got success."); // Ensure sendResult4 is error type
    assertExists(sendResult4.error, "Should return an error for already friends.");
    assertEquals(sendResult4.error, "Users are already friends.", "Correct error message for already friends.");
    console.log(`Effect: Expected error: ${sendResult4.error}`);
    console.log("Scenario: Duplicate and Reverse Friend Requests Completed.");
  });

  await t.step("Scenario: Decline and Cancel Friend Requests", async () => {
    console.log("\n--- Scenario: Decline and Cancel Friend Requests ---");

    // Fix: Clear state using concept's collections directly
    await concept.friendships.deleteMany({});
    await concept.friendRequests.deleteMany({});

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
    if ("error" in pendingRequests) throw new Error(pendingRequests.error); // Type is narrowed here
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
    if ("error" in pendingRequests) throw new Error(pendingRequests.error); // Type is narrowed here
    assertEquals(pendingRequests.length, 0, "No pending requests after cancel.");
    console.log("State: No pending requests.");
    console.log("Scenario: Decline and Cancel Friend Requests Completed.");
  });

  await t.step("Scenario: Self-Friend Request and Non-existent Operations", async () => {
    console.log("\n--- Scenario: Self-Friend Request and Non-existent Operations ---");

    // Fix: Clear state using concept's collections directly
    await concept.friendships.deleteMany({});
    await concept.friendRequests.deleteMany({});

    // Try to send a friend request to self (should fail)
    console.log(`Action: Alice (${userA}) attempts to send friend request to herself.`);
    const selfRequestResult = await concept.sendFriendRequest({ sender: userA, receiver: userA });
    if (!("error" in selfRequestResult)) throw new Error("Expected an error for self-request, but got success."); // Ensure selfRequestResult is error type
    assertExists(selfRequestResult.error, "Should return an error for self-request.");
    assertEquals(selfRequestResult.error, "Cannot send a friend request to yourself.", "Correct error message for self-request.");
    console.log(`Effect: Expected error: ${selfRequestResult.error}`);

    // Attempt to accept a non-existent request
    console.log(`Action: Bob (${userB}) attempts to accept non-existent request from Alice (${userA})`);
    const acceptNonExistent = await concept.acceptFriendRequest({ receiver: userB, sender: userA });
    if (!("error" in acceptNonExistent)) throw new Error("Expected an error for non-existent request, but got success."); // Ensure acceptNonExistent is error type
    assertExists(acceptNonExistent.error, "Should return error for non-existent request.");
    assertEquals(acceptNonExistent.error, "No pending friend request from sender to receiver.", "Correct error for accepting non-existent request.");
    console.log(`Effect: Expected error: ${acceptNonExistent.error}`);

    // Attempt to decline a non-existent request
    console.log(`Action: Bob (${userB}) attempts to decline non-existent request from Alice (${userA})`);
    const declineNonExistent = await concept.declineFriendRequest({ receiver: userB, sender: userA });
    if (!("error" in declineNonExistent)) throw new Error("Expected an error for non-existent decline, but got success."); // Ensure declineNonExistent is error type
    assertExists(declineNonExistent.error, "Should return error for non-existent request.");
    assertEquals(declineNonExistent.error, "No pending friend request from sender to receiver found to decline.", "Correct error for declining non-existent request.");
    console.log(`Effect: Expected error: ${declineNonExistent.error}`);

    // Attempt to cancel a non-existent request
    console.log(`Action: Alice (${userA}) attempts to cancel non-existent request to Bob (${userB})`);
    const cancelNonExistent = await concept.cancelSentRequest({ sender: userA, receiver: userB });
    if (!("error" in cancelNonExistent)) throw new Error("Expected an error for non-existent cancel, but got success."); // Ensure cancelNonExistent is error type
    assertExists(cancelNonExistent.error, "Should return error for non-existent request.");
    assertEquals(cancelNonExistent.error, "No pending friend request from sender to receiver found to cancel.", "Correct error for cancelling non-existent request.");
    console.log(`Effect: Expected error: ${cancelNonExistent.error}`);

    // Attempt to remove a non-existent friendship
    console.log(`Action: Alice (${userA}) attempts to remove non-existent friendship with Charlie (${userC})`);
    const removeNonExistent = await concept.removeFriend({ user1: userA, user2: userC });
    if (!("error" in removeNonExistent)) throw new Error("Expected an error for non-existent friendship, but got success."); // Ensure removeNonExistent is error type
    assertExists(removeNonExistent.error, "Should return error for non-existent friendship.");
    assertEquals(removeNonExistent.error, "No friendship found between these users.", "Correct error for removing non-existent friendship.");
    console.log(`Effect: Expected error: ${removeNonExistent.error}`);
    console.log("Scenario: Self-Friend Request and Non-existent Operations Completed.");
  });

  // --- Query Tests ---
  await t.step("Queries: Verify retrieval of friendships and requests", async () => {
    console.log("\n--- Query Tests ---");

    // Fix: Clear state using concept's collections directly
    await concept.friendships.deleteMany({});
    await concept.friendRequests.deleteMany({});

    // Setup some state for queries
    const req1Result = await concept.sendFriendRequest({ sender: userA, receiver: userB }); // A -> B
    if ("error" in req1Result) throw new Error(req1Result.error);
    const req1Id = req1Result.request;

    const req2Result = await concept.sendFriendRequest({ sender: userC, receiver: userA }); // C -> A
    if ("error" in req2Result) throw new Error(req2Result.error);
    // const req2Id = req2Result.request; // Not strictly needed, but kept for consistency if queries by ID are added

    const accept1Result = await concept.acceptFriendRequest({ receiver: userB, sender: userA }); // A & B are friends
    if ("error" in accept1Result) throw new Error(accept1Result.error);

    const accept2Result = await concept.acceptFriendRequest({ receiver: userA, sender: userC }); // C & A are friends
    if ("error" in accept2Result) throw new Error(accept2Result.error);


    console.log("State setup: A-B friendship, C-A friendship, no pending requests.");

    // _getAllFriendships
    console.log("Query: _getAllFriendships");
    const allFriendships = await concept._getAllFriendships();
    if ("error" in allFriendships) throw new Error(allFriendships.error); // Type narrowing works
    assertEquals(allFriendships.length, 2, "Should retrieve all 2 friendships.");
    console.log(`Result: ${JSON.stringify(allFriendships)}`);

    // _getFriendshipsByUser (userA)
    console.log(`Query: _getFriendshipsByUser for ${userA}`);
    const friendshipsForA = await concept._getFriendshipsByUser({ user: userA });
    if ("error" in friendshipsForA) throw new Error(friendshipsForA.error); // Type narrowing works
    assertEquals(friendshipsForA.length, 2, `Should retrieve 2 friendships for ${userA}.`);
    // Explicitly type 'f' in the find callback
    assertExists(friendshipsForA.find((f: FriendshipDoc) => concept.canonicalizeUsers(userA, userB).user1 === f.user1 && concept.canonicalizeUsers(userA, userB).user2 === f.user2), "A-B friendship missing");
    assertExists(friendshipsForA.find((f: FriendshipDoc) => concept.canonicalizeUsers(userA, userC).user1 === f.user1 && concept.canonicalizeUsers(userA, userC).user2 === f.user2), "A-C friendship missing");
    console.log(`Result: ${JSON.stringify(friendshipsForA)}`);

    // _getFriendshipsByUser (userB)
    console.log(`Query: _getFriendshipsByUser for ${userB}`);
    const friendshipsForB = await concept._getFriendshipsByUser({ user: userB });
    if ("error" in friendshipsForB) throw new Error(friendshipsForB.error); // Type is narrowed here
    assertEquals(friendshipsForB.length, 1, `Should retrieve 1 friendship for ${userB}.`);
    assertObjectMatch(friendshipsForB[0], concept.canonicalizeUsers(userA, userB));
    console.log(`Result: ${JSON.stringify(friendshipsForB)}`);

    // _getAllFriendRequests (should be empty after accepting all)
    console.log("Query: _getAllFriendRequests");
    const allFriendRequests = await concept._getAllFriendRequests();
    if ("error" in allFriendRequests) throw new Error(allFriendRequests.error); // Type is narrowed here
    assertEquals(allFriendRequests.length, 0, "Should retrieve 0 friend requests.");
    console.log(`Result: ${JSON.stringify(allFriendRequests)}`);

    // _getSentFriendRequests (userA, should be empty)
    console.log(`Query: _getSentFriendRequests for ${userA}`);
    const sentRequestsForA = await concept._getSentFriendRequests({ sender: userA });
    if ("error" in sentRequestsForA) throw new Error(sentRequestsForA.error); // Type is narrowed here
    assertEquals(sentRequestsForA.length, 0, `Should retrieve 0 sent requests for ${userA}.`);
    console.log(`Result: ${JSON.stringify(sentRequestsForA)}`);

    // _getReceivedFriendRequests (userB, should be empty)
    console.log(`Query: _getReceivedFriendRequests for ${userB}`);
    const receivedRequestsForB = await concept._getReceivedFriendRequests({ receiver: userB });
    if ("error" in receivedRequestsForB) throw new Error(receivedRequestsForB.error); // Type is narrowed here
    assertEquals(receivedRequestsForB.length, 0, `Should retrieve 0 received requests for ${userB}.`);
    console.log(`Result: ${JSON.stringify(receivedRequestsForB)}`);

    // Test _getFriendshipDetails
    console.log("Query: _getFriendshipDetails (using first friendship ID)");
    // Need to get the actual IDs after insertion.
    const currentFriendships = await concept._getAllFriendships();
    if ("error" in currentFriendships) throw new Error(currentFriendships.error);
    assertExists(currentFriendships[0], "There should be at least one friendship to query details for.");
    const firstFriendshipId = currentFriendships[0]._id;


    const friendshipDetails = await concept._getFriendshipDetails({ friendshipId: firstFriendshipId });
    if ("error" in friendshipDetails) throw new Error(friendshipDetails.error); // Type is narrowed here
    assertEquals(friendshipDetails.length, 1, "Should retrieve one friendship detail.");
    assertObjectMatch(friendshipDetails[0], currentFriendships[0]);
    console.log(`Result: ${JSON.stringify(friendshipDetails)}`);

    // Test _getFriendRequestDetails (should be empty for req1Id, as it was accepted and deleted)
    console.log("Query: _getFriendRequestDetails (for a deleted request ID)");
    const requestDetails = await concept._getFriendRequestDetails({ requestId: req1Id });
    if ("error" in requestDetails) throw new Error(requestDetails.error); // Type is narrowed here
    assertEquals(requestDetails.length, 0, "Should retrieve 0 request details for a deleted request.");
    console.log(`Result: ${JSON.stringify(requestDetails)}`);
    
    console.log("Query Tests Completed.");
  });

  await client.close();
  console.log("--- All FriendsListConcept Tests Completed ---");
});
```
