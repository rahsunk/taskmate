---
timestamp: 'Thu Oct 30 2025 10:59:27 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251030_105927.54e03087.md]]'
content_id: 9962ac62ec79846d26ce257ac8dc9b93185d4b975c5a5c02d570be8ee2ec5a1b
---

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
