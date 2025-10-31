[@concept-design-overview](../../background/concept-design-overview.md)

[@concept-specifications](../../background/concept-specifications.md)

[@implementing-concepts](../../background/implementing-concepts.md)

[@FriendList](FriendList.md)

[@implementation](implementation.md)

# API Specification: FriendList Concept 

**Purpose:** Enable users to establish and manage mutual social connections with others in the application.

  

---

  

## API Endpoints

  

### POST /api/FriendList/sendFriendRequest

  

**Description:** Creates a new friend request from one user to another.

  

**Requirements:**

  

- `sender` is not equal to `receiver`.

- No `Friendship` exists between `sender` and `receiver`.

- No `FriendRequest` exists from `sender` to `receiver`.

- No `FriendRequest` exists from `receiver` to `sender`.

  

**Effects:**

  

- A new `FriendRequest` is created with the given `sender` and `receiver`.

- Returns the ID of the newly created `FriendRequest`.

  

**Request Body:**

  

```json

{

"sender": "string",

"receiver": "string"

}

```

  

**Success Response Body (Action):**

  

```json

{

"request": "string"

}

```

  

**Error Response Body:**

  

```json

{

"error": "string"

}

```

  

---

  

### POST /api/FriendList/acceptFriendRequest

  

**Description:** Accepts an existing friend request, establishing a mutual friendship.

  

**Requirements:**

  

- A `FriendRequest` exists from `sender` to `receiver`.

- No `Friendship` exists between `sender` and `receiver`.

  

**Effects:**

  

- The `FriendRequest` from `sender` to `receiver` is deleted.

- A new `Friendship` is created between `sender` and `receiver` (canonicalized).

  

**Request Body:**

  

```json

{

"receiver": "string",

"sender": "string"

}

```

  

**Success Response Body (Action):**

  

```json

{

"success": true

}

```

  

**Error Response Body:**

  

```json

{

"error": "string"

}

```

  

---

  

### POST /api/FriendList/declineFriendRequest

  

**Description:** Declines an existing friend request.

  

**Requirements:**

  

- A `FriendRequest` exists from `sender` to `receiver`.

  

**Effects:**

  

- The `FriendRequest` from `sender` to `receiver` is deleted.

  

**Request Body:**

  

```json

{

"receiver": "string",

"sender": "string"

}

```

  

**Success Response Body (Action):**

  

```json

{

"success": true

}

```

  

**Error Response Body:**

  

```json

{

"error": "string"

}

```

  

---

  

### POST /api/FriendList/cancelSentRequest

  

**Description:** Cancels a previously sent friend request.

  

**Requirements:**

  

- A `FriendRequest` exists from `sender` to `receiver`.

  

**Effects:**

  

- The `FriendRequest` from `sender` to `receiver` is deleted.

  

**Request Body:**

  

```json

{

"sender": "string",

"receiver": "string"

}

```

  

**Success Response Body (Action):**

  

```json

{

"success": true

}

```

  

**Error Response Body:**

  

```json

{

"error": "string"

}

```

  

---

  

### POST /api/FriendList/removeFriend

  

**Description:** Removes an existing mutual friendship between two users.

  

**Requirements:**

  

- A `Friendship` exists between `user1` and `user2`.

  

**Effects:**

  

- The `Friendship` between `user1` and `user2` is deleted.

  

**Request Body:**

  

```json

{

"user1": "string",

"user2": "string"

}

```

  

**Success Response Body (Action):**

  

```json

{

"success": true

}

```

  

**Error Response Body:**

  

```json

{

"error": "string"

}

```

  

---

  

### POST /api/FriendList/\_getAllFriendships

  

**Description:** Retrieves all active friendships in the system.

  

**Requirements:**

  

- `true`

  

**Effects:**

  

- Returns an array of all `FriendshipDoc` objects, including `_id`, `user1`, and `user2`.

  

**Request Body:**

  

```json

{}

```

  

**Success Response Body (Query):**

  

```json

[

{

"_id": "string",

"user1": "string",

"user2": "string"

}

]

```

  

**Error Response Body:**

  

```json

{

"error": "string"

}

```

  

---

  

### POST /api/FriendList/\_getFriendshipsByUser

  

**Description:** Retrieves all active friendships involving a specific user.

  

**Requirements:**

  

- `user` exists (external to this concept).

  

**Effects:**

  

- Returns an array of `FriendshipDoc` objects where `user1` or `user2` matches the input `user`.

  

**Request Body:**

  

```json

{

"user": "string"

}

```

  

**Success Response Body (Query):**

  

```json

[

{

"_id": "string",

"user1": "string",

"user2": "string"

}

]

```

  

**Error Response Body:**

  

```json

{

"error": "string"

}

```

  

---

  

### POST /api/FriendList/\_getAllFriendRequests

  

**Description:** Retrieves all pending friend requests in the system.

  

**Requirements:**

  

- `true`

  

**Effects:**

  

- Returns an array of all `FriendRequestDoc` objects, including `_id`, `sender`, and `receiver`.

  

**Request Body:**

  

```json

{}

```

  

**Success Response Body (Query):**

  

```json

[

{

"_id": "string",

"sender": "string",

"receiver": "string"

}

]

```

  

**Error Response Body:**

  

```json

{

"error": "string"

}

```

  

---

  

### POST /api/FriendList/\_getSentFriendRequests

  

**Description:** Retrieves all friend requests sent by a specific user.

  

**Requirements:**

  

- `sender` exists (external to this concept).

  

**Effects:**

  

- Returns an array of `FriendRequestDoc` objects sent by the `sender`.

  

**Request Body:**

  

```json

{

"sender": "string"

}

```

  

**Success Response Body (Query):**

  

```json

[

{

"_id": "string",

"sender": "string",

"receiver": "string"

}

]

```

  

**Error Response Body:**

  

```json

{

"error": "string"

}

```

  

---

  

### POST /api/FriendList/\_getReceivedFriendRequests

  

**Description:** Retrieves all friend requests received by a specific user.

  

**Requirements:**

  

- `receiver` exists (external to this concept).

  

**Effects:**

  

- Returns an array of `FriendRequestDoc` objects received by the `receiver`.

  

**Request Body:**

  

```json

{

"receiver": "string"

}

```

  

**Success Response Body (Query):**

  

```json

[

{

"_id": "string",

"sender": "string",

"receiver": "string"

}

]

```

  

**Error Response Body:**

  

```json

{

"error": "string"

}

```

  

---

  

### POST /api/FriendList/\_getFriendshipDetails

  

**Description:** Retrieves the details of a specific friendship by its ID.

  

**Requirements:**

  

- `friendshipId` exists.

  

**Effects:**

  

- Returns an array containing the `FriendshipDoc` object matching the provided ID.

  

**Request Body:**

  

```json

{

"friendshipId": "string"

}

```

  

**Success Response Body (Query):**

  

```json

[

{

"_id": "string",

"user1": "string",

"user2": "string"

}

]

```

  

**Error Response Body:**

  

```json

{

"error": "string"

}

```

  

---

  

### POST /api/FriendList/\_getFriendRequestDetails

  

**Description:** Retrieves the details of a specific friend request by its ID.

  

**Requirements:**

  

- `requestId` exists.

  

**Effects:**

  

- Returns an array containing the `FriendRequestDoc` object matching the provided ID.

  

**Request Body:**

  

```json

{

"requestId": "string"

}

```

  

**Success Response Body (Query):**

  

```json

[

{

"_id": "string",

"sender": "string",

"receiver": "string"

}

]

```

  

**Error Response Body:**

  

```json

{

"error": "string"

}

```



# implement: FriendList, given the new API spec
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
 *   acceptFriendRequest (receiver: User, sender: User): (success: true)
 *   declineFriendRequest (receiver: User, sender: User): (success: true)
 *   cancelSentRequest (sender: User, receiver: User): (success: true)
 *   removeFriend (user1: User, user2: User): (success: true)
 * queries
 *   _getAllFriendships (): (friendship: FriendshipDoc)
 *   _getFriendshipsByUser (user: User): (friendship: FriendshipDoc)
 *   _getAllFriendRequests (): (request: FriendRequestDoc)
 *   _getSentFriendRequests (sender: User): (request: FriendRequestDoc)
 *   _getReceivedFriendRequests (receiver: User): (request: FriendRequestDoc)
 *   _getFriendshipDetails (friendshipId: ID): (friendship: FriendshipDoc)
 *   _getFriendRequestDetails (requestId: ID): (request: FriendRequestDoc)
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
      return { error: `Failed to retrieve all friendships: ${e.message}` };
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
      return { error: `Failed to retrieve friendships for user ${user}: ${e.message}` };
    }
  }

  /**
   * _getAllFriendRequests (): (request: FriendRequestDoc)
   *
   * **requires** true
   *
   * **effects** Returns an array of all `FriendRequestDoc` objects, including `_id`, `sender`, and `receiver`.
   */
  async _getAllFriendRequests(): Promise<FriendRequestDoc[] | { error: string }> {
    try {
      return await this.friendRequests.find({}).toArray();
    } catch (e) {
      return { error: `Failed to retrieve all friend requests: ${e.message}` };
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
      return { error: `Failed to retrieve sent friend requests for sender ${sender}: ${e.message}` };
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
      return { error: `Failed to retrieve received friend requests for receiver ${receiver}: ${e.message}` };
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
      // FindOne will return null if not found, toArray ensures it's an array for consistency
      const result = await this.friendships.findOne({ _id: friendshipId });
      return result ? [result] : [];
    } catch (e) {
      return { error: `Failed to retrieve friendship details for ID ${friendshipId}: ${e.message}` };
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
      // FindOne will return null if not found, toArray ensures it's an array for consistency
      const result = await this.friendRequests.findOne({ _id: requestId });
      return result ? [result] : [];
    } catch (e) {
      return { error: `Failed to retrieve friend request details for ID ${requestId}: ${e.message}` };
    }
  }
}
```

# prompt: Error: e is of type Unknown when referencing e.message
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
 *   acceptFriendRequest (receiver: User, sender: User): (success: true)
 *   declineFriendRequest (receiver: User, sender: User): (success: true)
 *   cancelSentRequest (sender: User, receiver: User): (success: true)
 *   removeFriend (user1: User, user2: User): (success: true)
 * queries
 *   _getAllFriendships (): (friendship: FriendshipDoc)
 *   _getFriendshipsByUser (user: User): (friendship: FriendshipDoc)
 *   _getAllFriendRequests (): (request: FriendRequestDoc)
 *   _getSentFriendRequests (sender: User): (request: FriendRequestDoc)
 *   _getReceivedFriendRequests (receiver: User): (request: FriendRequestDoc)
 *   _getFriendshipDetails (friendshipId: ID): (friendship: FriendshipDoc)
 *   _getFriendRequestDetails (requestId: ID): (request: FriendRequestDoc)
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
      return { error: `Failed to retrieve friendships for user ${user}: ${errorMessage}` };
    }
  }

  /**
   * _getAllFriendRequests (): (request: FriendRequestDoc)
   *
   * **requires** true
   *
   * **effects** Returns an array of all `FriendRequestDoc` objects, including `_id`, `sender`, and `receiver`.
   */
  async _getAllFriendRequests(): Promise<FriendRequestDoc[] | { error: string }> {
    try {
      return await this.friendRequests.find({}).toArray();
    } catch (e) {
      // Safely access error message
      const errorMessage = e instanceof Error ? e.message : String(e);
      return { error: `Failed to retrieve all friend requests: ${errorMessage}` };
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
      return { error: `Failed to retrieve sent friend requests for sender ${sender}: ${errorMessage}` };
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
      return { error: `Failed to retrieve received friend requests for receiver ${receiver}: ${errorMessage}` };
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
      return { error: `Failed to retrieve friendship details for ID ${friendshipId}: ${errorMessage}` };
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
      return { error: `Failed to retrieve friend request details for ID ${requestId}: ${errorMessage}` };
    }
  }
}
```