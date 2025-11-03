---
timestamp: 'Mon Nov 03 2025 14:16:42 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251103_141642.89187ff5.md]]'
content_id: 8d34634e7c271ac47cb477fa9c29e1f1cdc0fdf26a45a525f916b239224aeb1d
---

# file: src/FriendList/FriendListConcept.ts

```typescript
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
interface FriendshipDoc {
  _id: ID;
  user1: User;
  user2: User;
}

/**
 * a set of FriendRequests with
 *   a sender User
 *   a receiver User
 */
interface FriendRequestDoc {
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
 */
export default class FriendsListConcept {
  friendships: Collection<FriendshipDoc>;
  friendRequests: Collection<FriendRequestDoc>;

  constructor(private readonly db: Db) {
    this.friendships = this.db.collection(PREFIX + "friendships");
    this.friendRequests = this.db.collection(PREFIX + "friendRequests");
  }

  /** Helper to canonicalize friendship users for consistent storage/lookup. */
  private canonicalizeUsers(u1: User, u2: User): { user1: User; user2: User } {
    return u1 < u2 ? { user1: u1, user2: u2 } : { user1: u2, user2: u1 };
  }

  // --- ACTIONS ---

  /**
   * sendFriendRequest (sender: User, receiver: User): (request: FriendRequest) | (error: String)
   */
  async sendFriendRequest(
    { sender, receiver }: { sender: User; receiver: User },
  ): Promise<SendFriendRequestResult | { error: string }> {
    if (sender === receiver) {
      return { error: "Cannot send a friend request to yourself." };
    }

    const { user1, user2 } = this.canonicalizeUsers(sender, receiver);
    const existingFriendship = await this.friendships.findOne({ user1, user2 });
    if (existingFriendship) {
      return { error: "Users are already friends." };
    }

    const existingRequest = await this.friendRequests.findOne({
      $or: [{ sender, receiver }, { sender: receiver, receiver: sender }],
    });
    if (existingRequest) {
      return { error: "A pending friend request already exists between these users." };
    }

    const newRequestId = freshID();
    await this.friendRequests.insertOne({ _id: newRequestId, sender, receiver });

    return { request: newRequestId };
  }

  /**
   * acceptFriendRequest (receiver: User, sender: User): (success: true) | (error: String)
   */
  async acceptFriendRequest(
    { receiver, sender }: { receiver: User; sender: User },
  ): Promise<ActionSuccessResult | { error: string }> {
    const friendRequest = await this.friendRequests.findOne({ sender, receiver });
    if (!friendRequest) {
      return { error: "No pending friend request from sender to receiver." };
    }

    const { user1, user2 } = this.canonicalizeUsers(sender, receiver);
    const existingFriendship = await this.friendships.findOne({ user1, user2 });
    if (existingFriendship) {
      // Clean up the now-irrelevant friend request
      await this.friendRequests.deleteOne({ _id: friendRequest._id });
      return { error: "Users are already friends." };
    }

    await this.friendRequests.deleteOne({ _id: friendRequest._id });
    await this.friendships.insertOne({ _id: freshID(), user1, user2 });

    return { success: true };
  }

  /**
   * declineFriendRequest (receiver: User, sender: User): (success: true) | (error: String)
   */
  async declineFriendRequest(
    { receiver, sender }: { receiver: User; sender: User },
  ): Promise<ActionSuccessResult | { error: string }> {
    const result = await this.friendRequests.deleteOne({ sender, receiver });
    if (result.deletedCount === 0) {
      return { error: "No pending friend request from sender to receiver found to decline." };
    }
    return { success: true };
  }

  /**
   * cancelSentRequest (sender: User, receiver: User): (success: true) | (error: String)
   */
  async cancelSentRequest(
    { sender, receiver }: { sender: User; receiver: User },
  ): Promise<ActionSuccessResult | { error: string }> {
    const result = await this.friendRequests.deleteOne({ sender, receiver });
    if (result.deletedCount === 0) {
      return { error: "No pending friend request from sender to receiver found to cancel." };
    }
    return { success: true };
  }

  /**
   * removeFriend (user1: User, user2: User): (success: true) | (error: String)
   */
  async removeFriend(
    { user1, user2 }: { user1: User; user2: User },
  ): Promise<ActionSuccessResult | { error: string }> {
    const canonicalUsers = this.canonicalizeUsers(user1, user2);
    const result = await this.friendships.deleteOne(canonicalUsers);
    if (result.deletedCount === 0) {
      return { error: "No friendship found between these users." };
    }
    return { success: true };
  }

  // --- QUERIES ---

  /**
   * _getAllFriendships (): FriendshipDoc[] | { error: string }
   */
  async _getAllFriendships(): Promise<FriendshipDoc[] | { error: string }> {
    try {
      return await this.friendships.find().toArray();
    } catch (e) {
      return { error: `Database error: ${e instanceof Error ? e.message : "Unknown error"}` };
    }
  }

  /**
   * _getFriendshipsByUser (user: User): FriendshipDoc[] | { error: string }
   */
  async _getFriendshipsByUser({ user }: { user: User }): Promise<FriendshipDoc[] | { error: string }> {
    try {
      return await this.friendships.find({ $or: [{ user1: user }, { user2: user }] }).toArray();
    } catch (e) {
      return { error: `Database error: ${e instanceof Error ? e.message : "Unknown error"}` };
    }
  }

  /**
   * _getAllFriendRequests (): FriendRequestDoc[] | { error: string }
   */
  async _getAllFriendRequests(): Promise<FriendRequestDoc[] | { error: string }> {
    try {
      return await this.friendRequests.find().toArray();
    } catch (e) {
      return { error: `Database error: ${e instanceof Error ? e.message : "Unknown error"}` };
    }
  }

  /**
   * _getSentFriendRequests (sender: User): FriendRequestDoc[] | { error: string }
   */
  async _getSentFriendRequests({ sender }: { sender: User }): Promise<FriendRequestDoc[] | { error: string }> {
    try {
      return await this.friendRequests.find({ sender }).toArray();
    } catch (e) {
      return { error: `Database error: ${e instanceof Error ? e.message : "Unknown error"}` };
    }
  }

  /**
   * _getReceivedFriendRequests (receiver: User): FriendRequestDoc[] | { error: string }
   */
  async _getReceivedFriendRequests({ receiver }: { receiver: User }): Promise<FriendRequestDoc[] | { error: string }> {
    try {
      return await this.friendRequests.find({ receiver }).toArray();
    } catch (e) {
      return { error: `Database error: ${e instanceof Error ? e.message : "Unknown error"}` };
    }
  }

  /**
   * _getFriendshipDetails (friendshipId: ID): FriendshipDoc[] | { error: string }
   */
  async _getFriendshipDetails({ friendshipId }: { friendshipId: ID }): Promise<FriendshipDoc[] | { error: string }> {
    try {
      const result = await this.friendships.findOne({ _id: friendshipId });
      return result ? [result] : [];
    } catch (e) {
      return { error: `Database error: ${e instanceof Error ? e.message : "Unknown error"}` };
    }
  }

  /**
   * _getFriendRequestDetails (requestId: ID): FriendRequestDoc[] | { error: string }
   */
  async _getFriendRequestDetails({ requestId }: { requestId: ID }): Promise<FriendRequestDoc[] | { error: string }> {
    try {
      const result = await this.friendRequests.findOne({ _id: requestId });
      return result ? [result] : [];
    } catch (e) {
      return { error: `Database error: ${e instanceof Error ? e.message : "Unknown error"}` };
    }
  }
}
```

### 2. Updated `FriendList.sync.ts`

This version is now fully compatible with the updated concept implementation. The logic remains mostly the same because the previous version was already defensively coded with `Array.isArray` checks. The main change is fixing the calls to `_getAllFriendships` and `_getAllFriendRequests`.
