---
timestamp: 'Fri Oct 31 2025 05:59:33 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251031_055933.af61eadd.md]]'
content_id: b1ba9e3e4aaeb9db2a05e67264662890ead77de087e83903abd8566710638b6b
---

# response:

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
      return { error: "A pending friend request already exists between these users." };
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
   * **effects** The `FriendRequest` from `sender` to `receiver` is deleted and a new `Friendship` is created between `sender` and `receiver` (canonicalized)
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
      return { error: "No pending friend request from sender to receiver found to decline." };
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
      return { error: "No pending friend request from sender to receiver found to cancel." };
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
}
```
