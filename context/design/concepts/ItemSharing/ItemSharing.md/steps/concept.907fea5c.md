---
timestamp: 'Sun Oct 19 2025 17:23:51 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251019_172351.6241d8c4.md]]'
content_id: 907fea5ca119e3da2d064637b0ff04d5cdb82788ee614d14fae7687b6e8c740c
---

# concept: ItemSharing

* **concept** ItemSharing\[User, ItemID, SharedPayload]
  * `User`: A generic type representing the user identities (e.g., from an Authentication concept).
  * `ItemID`: A generic type representing the unique identifier of the external item being shared (e.g., an `EventID` or `TaskID` from `ScheduleGenerator`). `ItemSharing` does not interpret `ItemID` beyond its identity.
  * `SharedPayload`: A generic type representing the mutable, shareable properties of the item. This could be any structured data (e.g., a record containing name, description, dates, priority, etc., depending on the specific application). `ItemSharing` treats this as an opaque value.

* **purpose** Allows users to facilitate collaborative changes to a generic item's mutable properties (`SharedPayload`) with other users, managing participation and consensus on proposed updates.

* **principle** An owner can create a `SharedItem` instance linked to an `ItemID` with an initial `SharedPayload`. They can then invite other users to participate. Invited users can accept the shared item, making its `currentSharedPayload` visible to them. Any `acceptedParticipant` can propose a new `SharedPayload` as a `ChangeRequest`, which the owner can then confirm or reject, updating the globally agreed-upon `currentSharedPayload`.

* **state**
  * a set of `SharedItems` with
    * a `sharedItemID` of type `Number` (static attribute, initially -1)
    * an `externalItemID` of type `ItemID` (the identifier of the original item in an external concept)
    * an `owner` of type `User`
    * a set of `participants` of type `User` (users invited to share the item)
    * a set of `acceptedParticipants` of type `User` (users who have accepted the shared item and its current payload)
    * a `currentSharedPayload` of type `SharedPayload` (the currently agreed-upon mutable properties of the shared item)
    * a set of `changeRequests`
  * a set of `ChangeRequests` with
    * a `requestID` of type `Number` (static attribute, initially -1)
    * a `sharedItem` of type `SharedItem` (points back to the `SharedItem` this request is for)
    * a `requester` of type `User`
    * a `requestedSharedPayload` of type `SharedPayload` (the proposed new state for the shared item's properties)

* **actions**
  * `makeItemShareable(owner: User, externalItemID: ItemID, initialPayload: SharedPayload): (sharedItem: SharedItem)`
    * **requires**: `externalItemID` exists (in its originating concept), `owner` exists (externally)
    * **effects**: creates and returns a new `sharedItem` instance. `sharedItemID` increments by 1. The `sharedItem` is initialized with the given `externalItemID`, `owner`, and `initialPayload`. `participants`, `acceptedParticipants`, and `changeRequests` are initialized as empty sets.
  * `shareItemWith(sharedItem: SharedItem, targetUser: User)`
    * **requires**: `sharedItem` exists, `targetUser` exists (externally), `targetUser` is not already in `sharedItem.participants`.
    * **effects**: adds `targetUser` to `sharedItem.participants`.
  * `unshareItemWith(sharedItem: SharedItem, targetUser: User)`
    * **requires**: `sharedItem` exists, `targetUser` is in `sharedItem.participants`.
    * **effects**: removes `targetUser` from `sharedItem.participants` and, if present, from `sharedItem.acceptedParticipants`. Deletes any `ChangeRequests` made by `targetUser` for this `sharedItem`.
  * `acceptSharedItem(sharedItem: SharedItem, user: User)`
    * **requires**: `sharedItem` exists, `user` is in `sharedItem.participants`, `user` is not already in `sharedItem.acceptedParticipants`.
    * **effects**: adds `user` to `sharedItem.acceptedParticipants`.
  * `rejectSharedItem(sharedItem: SharedItem, user: User)`
    * **requires**: `sharedItem` exists, `user` is in `sharedItem.participants`.
    * **effects**: removes `user` from `sharedItem.participants` and, if present, from `sharedItem.acceptedParticipants`. Deletes any `ChangeRequests` made by `user` for this `sharedItem`.
  * `requestChange(sharedItem: SharedItem, requester: User, newPayload: SharedPayload): (changeRequest: ChangeRequest)`
    * **requires**: `sharedItem` exists, `requester` exists (externally), `requester` is in `sharedItem.acceptedParticipants` (only accepted participants can propose changes to the item's content).
    * **effects**: creates and returns a new `changeRequest` for `sharedItem` with the `requester` and the proposed `newPayload`. `requestID` increments by 1. Adds it to `sharedItem.changeRequests`.
  * `confirmChange(owner: User, sharedItem: SharedItem, request: ChangeRequest)`
    * **requires**: `sharedItem` exists, `owner` is `sharedItem.owner`, `request` is in `sharedItem.changeRequests`.
    * **effects**: updates `sharedItem.currentSharedPayload` to `request.requestedSharedPayload`. Deletes `request` from `sharedItem.changeRequests`.
  * `rejectChange(owner: User, sharedItem: SharedItem, request: ChangeRequest)`
    * **requires**: `sharedItem` exists, `owner` is `sharedItem.owner`, `request` is in `sharedItem.changeRequests`.
    * **effects**: deletes `request` from `sharedItem.changeRequests`.

***

**Key Changes and Rationale for Further Genericity:**

1. **New Generic Parameter `SharedPayload`:**
   * Instead of hardcoding `Date` or `RepeatConfiguration` types, a new generic type parameter `SharedPayload` has been introduced. This parameter represents the *actual data* of the item that is being shared and can be modified.
   * `ItemSharing` now treats `SharedPayload` as an opaque type. It doesn't know what fields are inside it (e.g., `startTime`, `name`, `deadline`, etc.), only that it can store and transmit values of this type.
   * When instantiating `ItemSharing` (e.g., for `ScheduleGenerator` events), `SharedPayload` could be defined as `{ name: String, startTime: Date, endTime: Date, repeat: RepeatConfig }`. For tasks, it could be `{ name: String, deadline: Date, expectedCompletionTime: Number, priority: Percent }`.

2. **Removal of Time/Date References:**
   * All specific fields like `currentStartTime`, `currentEndTime`, `currentRepeatConfig`, `initialStartTime`, `initialEndTime`, `initialRepeatConfig`, `requestedStartTime`, `requestedEndTime`, `requestedRepeatConfig` have been removed from the `SharedItems` state and action signatures.
   * They are now implicitly part of the `SharedPayload` parameter.

3. **Generic Change Requests:**
   * `TimeChangeRequests` has been renamed to `ChangeRequests`.
   * Each `ChangeRequest` now holds a `requestedSharedPayload` of type `SharedPayload`, allowing participants to propose any change to the item's content, not just its time.
   * The `confirmChange` action updates `currentSharedPayload` with the `requestedSharedPayload` from an accepted `ChangeRequest`.

4. **`externalItemID` field in `SharedItems`:**
   * The field previously named `item` (of type `Item`) in `SharedItems` is now explicitly `externalItemID` (of type `ItemID`). This clarifies that `ItemSharing` stores a reference to an *external* item, and manages the *shared state* (`currentSharedPayload`) of that item *within its own concept*. The actual `Item` content might reside in another concept like `ScheduleGenerator`.

5. **Refined `requestChange` precondition:**
   * Changed from `requester is in sharedItem.participants` to `requester is in sharedItem.acceptedParticipants`. This enforces a stronger collaboration model where only users who have actively accepted the shared item can propose changes to its core content, preventing premature or unwanted proposals from passively invited users.

This refactored `ItemSharing` concept is now much more broadly applicable beyond just scheduling. It can be used for sharing and collaborating on any mutable data structure, as long as that structure can be represented by `SharedPayload`. The actual interpretation and processing of the `SharedPayload` would happen in other concepts (e.g., `ScheduleGenerator`) through synchronizations.
