---
timestamp: 'Thu Oct 30 2025 10:59:27 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251030_105927.54e03087.md]]'
content_id: f9d6e8c459a8a8ed452b527218d25a4f9a50f2fcf474c05ac80a20d828a74a29
---

# concept: UserAuthentication (Updated Specification)

* **concept** UserAuthentication \[User]
* **purpose** identify and authenticate users
* **principle** If you register with a user name and password, and then you login with that same user name and password, you will be authenticated as the user who registered.
* **state**
  * a set of `Users` with
    * a `username` String
    * a `password` String
  * a set of `Sessions` with
    * a `user` User
    * a `sessionID` String
    * a `createdAt` DateTime
    * an `expiresAt` DateTime
* **actions**
  * `register (username: String, password: String): (user: User | error: String)`
    * **requires**: no user with that `username` already exists
    * **effects**: creates a new `User` `u` with the given `username` and `password`; returns `u`
  * `login (username: String, password: String): (session: Session | error: String)`
    * **requires**: a `User` with that `username` and `password` exists
    * **effects**: if successful, creates a new `Session` linked to the `User` and returns its `sessionID`; otherwise, returns an `error`
  * `logout (session: Session): (Empty | error: String)`
    * **requires**: `session` exists and is valid
    * **effects**: deletes the `session`
* **queries**
  * `_getUsers(): (user: {id: User, username: String}[])`
    * **requires**: `true`
    * **effects**: returns a list of all users with their IDs and usernames.
  * `_getUserDetails(user: User): (userDetails: {id: User, username: String}[] | error: String)`
    * **requires**: `user` exists
    * **effects**: returns the ID and username of a specific user. Password is not returned for security reasons.
  * `_getSessions(): (session: {id: Session, userId: User, sessionID: String, createdAt: Date, expiresAt: Date}[])`
    * **requires**: `true`
    * **effects**: returns a list of all active sessions, including their ID, associated user ID, session string, creation and expiry times.
  * `_getSessionDetails(session: Session): (sessionDetails: {id: Session, userId: User, sessionID: String, createdAt: Date, expiresAt: Date}[] | error: String)`
    * **requires**: `session` exists
    * **effects**: returns the details of a specific session (ID, associated user ID, session string, creation and expiry times) or an error if not found.

***
