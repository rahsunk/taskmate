---
timestamp: 'Fri Oct 31 2025 05:48:13 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251031_054813.b9db5851.md]]'
content_id: b29cf9a51133e3511dc8bc308ff42bcf1c102f857879a54cf0af242b7e7be6c4
---

# response:

Here's a concept design for a Friends List, following the provided rubric and Simple State Form for the state definition.

***

**concept** FriendsList \[User]

**purpose** Enable users to establish and manage mutual social connections with others in the application.

**principle** If User A sends a friend request to User B, and User B accepts it, then User A and User B will become mutual friends. Later, either User A or User B can remove the other from their friends list, thereby ending the mutual connection.

**state**

```
a set of Friendships with
  a userA User
  a userB User

a set of FriendRequests with
  a sender User
  a receiver User
```

*Note*: For `Friendships`, `userA` and `userB` represent the two users in a mutual connection. The actions below ensure that for any given friendship, there is only one record (e.g., by canonically ordering `userA` and `userB` based on their unique User IDs to prevent duplicate entries like `(Alice, Bob)` and `(Bob, Alice)`).

**actions**

  **sendFriendRequest** (sender: User, receiver: User): (request: FriendRequest)
    **requires**
      sender is not equal to receiver
      no Friendship exists between sender and receiver
      no FriendRequest exists from sender to receiver
      no FriendRequest exists from receiver to sender
    **effects**
      A new FriendRequest is created with the given sender and receiver.

  **acceptFriendRequest** (receiver: User, sender: User)
    **requires**
      A FriendRequest exists from sender to receiver
      No Friendship exists between sender and receiver
    **effects**
      The FriendRequest from sender to receiver is deleted.
      A new Friendship is created between sender and receiver (canonicalized).

  **declineFriendRequest** (receiver: User, sender: User)
    **requires**
      A FriendRequest exists from sender to receiver
    **effects**
      The FriendRequest from sender to receiver is deleted.

  **cancelSentRequest** (sender: User, receiver: User)
    **requires**
      A FriendRequest exists from sender to receiver
    **effects**
      The FriendRequest from sender to receiver is deleted.

  **removeFriend** (user1: User, user2: User)
    **requires**
      A Friendship exists between user1 and user2
    **effects**
      The Friendship between user1 and user2 is deleted.

***
