---
timestamp: 'Fri Oct 31 2025 06:03:20 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251031_060320.64a0bb0c.md]]'
content_id: a0d2d5d86d03799565b5620e0e433573e34cdc59d4baaa9d88be041cc581ffc7
---

# response:

* **concept** FriendsList \[User]
* **purpose** Enable users to establish and manage mutual social connections with others in the application.
* **principle** If user 1 sends a friend request to user 2, and user 2 accepts it, then user 1 and user 2 will become mutual friends. Later, either user 1 or user 2 can remove the other from their friends list, thereby ending the mutual connection.
* **state**
  * a set of `Friendships` with
    * a `user1` `User`
    * a `user2` `User`
  * a set of `FriendRequests` with
    * a `sender` `User`
    * a `receiver` `User`
* **actions**
  * `sendFriendRequest (sender: User, receiver: User): (request: FriendRequest)`
    * **requires** `sender` is not equal to `receiver`, no `Friendship` exists between `sender` and `receiver, no `FriendRequest`exists from`sender`to`receiver\`, no FriendRequest exists from receiver to sender
    * **effects** A new `FriendRequest` is created with the given `sender` and `receiver`.
  * `acceptFriendRequest (receiver: User, sender: User)`
    * **requires** A `FriendRequest` exists from `sender` to `receiver`, no `Friendship` exists between `sender` and `receiver`
    * **effects** The `FriendRequest` from sender to receiver is deleted and a new `Friendship` is created between `sender` and `receiver` (canonicalized)
  * `declineFriendRequest (receiver: User, sender: User)`
    * **requires** A `FriendRequest` exists from `sender` to `receiver`
    * **effects** The `FriendRequest` from `sender` to `receiver` is deleted.
  * `cancelSentRequest (sender: User, receiver: User)`
    * **requires** A `FriendRequest` exists from `sender` to `receiver`
    * **effects** The `FriendRequest` from `sender` to `receiver` is deleted.
  * `removeFriend (user1: User, user2: User)`
    * **requires** A `Friendship` exists between `user1` and `user2`
    * **effects** The `Friendship` between `user1` and `user2` is deleted.
