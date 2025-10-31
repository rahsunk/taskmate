---
timestamp: 'Fri Oct 31 2025 06:03:20 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251031_060320.64a0bb0c.md]]'
content_id: 3ee865d7f9c2d2e837b77ea7234365d2ed5d7900c4e914742a2f2902269aa208
---

# concept: Sharing

* **concept** Sharing\[User, SharedEntityID]

* **purpose** Enables users to manage access and participation for a generic shared entity, facilitating collaboration or communication within a defined group.

* **principle** An owner registers an `externalEntityID` for sharing, creating a `SharedEntity`. They can then invite other `User`s to be `participants`. Invited users can `acceptCollaboration` to become `acceptedParticipants`. `acceptedParticipants` form the active group for the shared entity, allowing for activities like messaging. The owner can also `removeParticipant` or an invited user can `declineCollaboration`.

* **state**
  * a set of `SharedEntities` with
    * a `sharedEntityID` of type `Number` (static attribute, initially -1)
    * an `externalEntityID` of type `SharedEntityID`
    * an `owner` of type `User`
    * a `participants` set of `User`
    * an `acceptedParticipants` set of `User`

* **actions**
  * `createSharedEntity (owner: User, externalEntityID: SharedEntityID): (sharedEntity: SharedEntity)`
    * **requires**: `externalEntityID` exists (from an external concept), `owner` exists, and `externalEntityID` is not already registered as an `externalEntityID` in any `SharedEntity`.
    * **effects**: creates and returns a new `sharedEntity` with `sharedEntityID` incrementing by 1. `sharedEntity` is initialized with the given `externalEntityID` and `owner`. `participants` and `acceptedParticipants` are initialized as empty sets.
  * `inviteParticipant (sharedEntity: SharedEntity, targetUser: User)`
    * **requires**: `sharedEntity` exists, `targetUser` exists, `targetUser` is not already in `sharedEntity.participants`.
    * **effects**: adds `targetUser` to `sharedEntity.participants`.
  * `removeParticipant (sharedEntity: SharedEntity, targetUser: User)`
    * **requires**: `sharedEntity` exists, `targetUser` is in `sharedEntity.participants`.
    * **effects**: removes `targetUser` from `sharedEntity.participants` and from `sharedEntity.acceptedParticipants` if they are in that set.
  * `acceptCollaboration (sharedEntity: SharedEntity, user: User)`
    * **requires**: `sharedEntity` exists, `user` is in `sharedEntity.participants`, `user` is not already in `sharedEntity.acceptedParticipants`.
    * **effects**: adds `user` to `sharedEntity.acceptedParticipants`.
  * `declineCollaboration (sharedEntity: SharedEntity, user: User)`
    * **requires**: `sharedEntity` exists, `user` is in `sharedEntity.participants`.
    * **effects**: removes `user` from `sharedEntity.participants` and, if present, from `sharedEntity.acceptedParticipants`.
