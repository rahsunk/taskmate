[@ScheduleGenerator](../ScheduleGenerator/ScheduleGenerator.md)

[@concept-rubric](../../background/detailed/concept-rubric.md)

[@concept-state](../../background/detailed/concept-state.md)

[@concept-design-brief](../../background/concept-design-brief.md)

[@concept-design-overview](../../background/concept-design-overview.md)

[@concept-refactoring](../../background/concept-refactoring.md)

[@concept-specifications](../../background/concept-specifications.md)

# concept: ItemSharing

* **concept** ItemSharing\[User, ItemID, Properties]
* **purpose** Allows collaborative modification of an item's mutable properties by managing invited participants, their acceptance to collaborate, and the lifecycle of proposed and confirmed changes to those properties.
* **principle** An owner of an item makes the item sharable through its ID. They can then invite other users to participate. Invited users can accept to participate in changes to this item. They can then propose new arguments for the item's properties as a `ChangeRequest`. The owner can then confirm or reject this `ChangeRequest`. Upon confirmation, a concept sync will apply the `requestedProperties` to the item identified by `ItemID` in its origina concept.

* **state**
  * a set of `SharedItems` with
    * a `sharedItemID` of type `Number` (static attribute, initially -1)
    * an `externalItemID` of type `ItemID`
    * an `owner` of type `User`
    * a set of `participants` of type `User`
    * a set of `acceptedParticipants` of type `User`
    * a set of `changeRequests`
  * a set of `ChangeRequests` with
    * a `requestID` of type `Number` (static attribute, initially -1)
    * a `sharedItemPointer` of type `SharedItem`
    * a `requester` of type `User`
    * a `requestedProperties` of type `Properties`

* **actions**
  * `makeItemShareable (owner: User, externalItemID: ItemID): (sharedItem: SharedItem)`
    * **requires**: `externalItemID` exists from an external concept, `owner` exists, and `externalItemID` is not already registered for sharing.
    * **effects**: creates and returns a new `sharedItem` with `sharedItemID` increments by 1.  `sharedItem` is initialized with the given `externalItemID` and `owner` while `participants`, `acceptedParticipants`, and `changeRequests` are initialized as empty sets.
  * `shareItemWith (sharedItem: SharedItem, targetUser: User)`
    * **requires**: `sharedItem` exists, `targetUser` exists, `targetUser` is not already in `sharedItem.participants`
    * **effects**: adds `targetUser` to `sharedItem.participants`
  * `unshareItemWith (sharedItem: SharedItem, targetUser: User)`
    * **requires**: `sharedItem` exists, `targetUser` is in `sharedItem.participants`
    * **effects**: removes `targetUser` from `sharedItem.participants` and from `sharedItem.acceptedParticipants` if they are in that set. Deletes any `ChangeRequests` made by `targetUser` for `sharedItem`
  * `acceptToCollaborate(sharedItem: SharedItem, user: User)`
    * **requires**: `sharedItem` exists, `user` is in `sharedItem.participants`, `user` is not already in `sharedItem.acceptedParticipants`
    * **effects**: adds `user` to `sharedItem.acceptedParticipants`
  * `rejectCollaboration(sharedItem: SharedItem, user: User)`
    * **requires**: `sharedItem` exists, `user` is in `sharedItem.participants`
    * **effects**: removes `user` from `sharedItem.participants` and, if present, from `sharedItem.acceptedParticipants`. Deletes any `ChangeRequests` made by `user` for this `sharedItem`
  * `requestChange (sharedItem: SharedItem, requester: User, requestedProperties: Properties): (changeRequest: ChangeRequest)`
    * **requires**: `sharedItem` exists, `requester` exists, `requester` is in `sharedItem.acceptedParticipants`
    * **effects**: creates and returns a new `changeRequest` for `sharedItem` with the `requester` and the proposed `requestedProperties`, with `requestID` incrementing by 1. Adds `changeRequest` to `sharedItem.changeRequests`.
  * `confirmChange (owner: User, sharedItem: SharedItem, request: ChangeRequest)`
    * **requires**: `sharedItem` exists, `owner` is `sharedItem.owner`, `request` is in `sharedItem.changeRequests`
    * **effects**: Deletes `request` from `sharedItem.changeRequests`
  * `rejectChange (owner: User, sharedItem: SharedItem, request: ChangeRequest)`
    * **requires**: `sharedItem` exists, `owner` is `sharedItem.owner`, `request` is in `sharedItem.changeRequests`
    * **effects**: deletes `request` from `sharedItem.changeRequests`
      
# prompt: Given the current concept for ItemSharing, simplify it to a generic concept Sharing that has no notion of requests, and can be used to implement a messaging service between users
# response:

Here's the simplified `Sharing` concept, adapted from `ItemSharing` to be generic and suitable for implementing group membership for a messaging service:

# concept: Sharing

*   **concept** Sharing\[User, SharedEntityID]

*   **purpose** Enables users to manage access and participation for a generic shared entity, facilitating collaboration or communication within a defined group.

*   **principle** An owner registers an `externalEntityID` for sharing, creating a `SharedEntity`. They can then invite other `User`s to be `participants`. Invited users can `acceptCollaboration` to become `acceptedParticipants`. `acceptedParticipants` form the active group for the shared entity, allowing for activities like messaging. The owner can also `removeParticipant` or an invited user can `declineCollaboration`.

*   **state**
    *   a set of `SharedEntities` with
        *   a `sharedEntityID` of type `Number` (static attribute, initially -1)
        *   an `externalEntityID` of type `SharedEntityID`
        *   an `owner` of type `User`
        *   a `participants` set of `User`
        *   an `acceptedParticipants` set of `User`

*   **actions**
    *   `createSharedEntity (owner: User, externalEntityID: SharedEntityID): (sharedEntity: SharedEntity)`
        *   **requires**: `externalEntityID` exists (from an external concept), `owner` exists, and `externalEntityID` is not already registered as an `externalEntityID` in any `SharedEntity`.
        *   **effects**: creates and returns a new `sharedEntity` with `sharedEntityID` incrementing by 1. `sharedEntity` is initialized with the given `externalEntityID` and `owner`. `participants` and `acceptedParticipants` are initialized as empty sets.
    *   `inviteParticipant (sharedEntity: SharedEntity, targetUser: User)`
        *   **requires**: `sharedEntity` exists, `targetUser` exists, `targetUser` is not already in `sharedEntity.participants`.
        *   **effects**: adds `targetUser` to `sharedEntity.participants`.
    *   `removeParticipant (sharedEntity: SharedEntity, targetUser: User)`
        *   **requires**: `sharedEntity` exists, `targetUser` is in `sharedEntity.participants`.
        *   **effects**: removes `targetUser` from `sharedEntity.participants` and from `sharedEntity.acceptedParticipants` if they are in that set.
    *   `acceptCollaboration (sharedEntity: SharedEntity, user: User)`
        *   **requires**: `sharedEntity` exists, `user` is in `sharedEntity.participants`, `user` is not already in `sharedEntity.acceptedParticipants`.
        *   **effects**: adds `user` to `sharedEntity.acceptedParticipants`.
    *   `declineCollaboration (sharedEntity: SharedEntity, user: User)`
        *   **requires**: `sharedEntity` exists, `user` is in `sharedEntity.participants`.
        *   **effects**: removes `user` from `sharedEntity.participants` and, if present, from `sharedEntity.acceptedParticipants`.