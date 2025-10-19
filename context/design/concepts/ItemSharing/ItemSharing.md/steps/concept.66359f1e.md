---
timestamp: 'Sun Oct 19 2025 17:14:09 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251019_171409.78a4cbb3.md]]'
content_id: 66359f1ec9f98ca80af248e959fee46345b785ae3942f30d7d97ea47282de64d
---

# concept: ItemSharing

* **concept** ItemSharing\[User, Item, RepeatConfiguration]

* **purpose** Allows users to share generic items, including their associated time slots, with other users, enabling collaboration on shared activities or information.

* **principle** An owner can make an item shareable with an initial time. They can then invite other users to participate. Participants can accept the shared item, making its current time visible to them. Any participant can propose a change to the shared item's time, which the owner can then confirm or reject.

* **state**
  * a set of `SharedItems` with
    * an `sharedItemID` of type `Number` (static attribute, initially -1)
    * an `item` of type `Item` (the generic item being shared)
    * an `owner` of type `User`
    * a set of `participants` of type `User` (users with whom the item has been shared, but not necessarily accepted by yet)
    * a set of `acceptedParticipants` of type `User` (users who have explicitly accepted the shared item)
    * a `currentStartTime` of type `Date` (the currently agreed-upon shared start time)
    * a `currentEndTime` of type `Date` (the currently agreed-upon shared end time)
    * a `currentRepeatConfig` of type `RepeatConfiguration` (the currently agreed-upon shared repeat configuration)
    * a set of `timeChangeRequests`
  * a set of `TimeChangeRequests` with
    * a `requestID` of type `Number` (static attribute, initially -1)
    * a `sharedItem` of type `SharedItem` (points back to the item this request is for)
    * a `requester` of type `User`
    * a `requestedStartTime` of type `Date`
    * a `requestedEndTime` of type `Date`
    * a `requestedRepeatConfig` of type `RepeatConfiguration`

* **actions**
  * `makeItemShareable(owner: User, item: Item, initialStartTime: Date, initialEndTime: Date, initialRepeatConfig: RepeatConfiguration): (sharedItem: SharedItem)`
    * **requires**: `item` exists (externally), `owner` exists (externally)
    * **effects**: creates and returns a new `sharedItem` with the given `item`, `owner`, `initialStartTime`, `initialEndTime`, and `initialRepeatConfig`. `sharedItemID` increments by 1. `participants` and `acceptedParticipants` are initialized as empty sets, and `timeChangeRequests` is an empty set.
  * `shareItemWith(sharedItem: SharedItem, targetUser: User)`
    * **requires**: `sharedItem` exists, `targetUser` exists (externally), `targetUser` is not already in `sharedItem.participants`.
    * **effects**: adds `targetUser` to `sharedItem.participants`.
  * `unshareItemWith(sharedItem: SharedItem, targetUser: User)`
    * **requires**: `sharedItem` exists, `targetUser` is in `sharedItem.participants`.
    * **effects**: removes `targetUser` from `sharedItem.participants` and, if present, from `sharedItem.acceptedParticipants`. Deletes any `TimeChangeRequests` made by `targetUser` for this `sharedItem`.
  * `acceptSharedItem(sharedItem: SharedItem, user: User)`
    * **requires**: `sharedItem` exists, `user` is in `sharedItem.participants`, `user` is not already in `sharedItem.acceptedParticipants`.
    * **effects**: adds `user` to `sharedItem.acceptedParticipants`.
  * `rejectSharedItem(sharedItem: SharedItem, user: User)`
    * **requires**: `sharedItem` exists, `user` is in `sharedItem.participants`.
    * **effects**: removes `user` from `sharedItem.participants` and, if present, from `sharedItem.acceptedParticipants`. Deletes any `TimeChangeRequests` made by `user` for this `sharedItem`.
  * `requestNewTime(sharedItem: SharedItem, requester: User, newStartTime: Date, newEndTime: Date, newRepeatConfig: RepeatConfiguration): (timeChangeRequest: TimeChangeRequest)`
    * **requires**: `sharedItem` exists, `requester` exists (externally), `requester` is in `sharedItem.participants`.
    * **effects**: creates and returns a new `timeChangeRequest` for `sharedItem` with the `requester` and the proposed `newStartTime`, `newEndTime`, `newRepeatConfig`. `requestID` increments by 1. Adds it to `sharedItem.timeChangeRequests`.
  * `confirmTimeChange(owner: User, sharedItem: SharedItem, request: TimeChangeRequest)`
    * **requires**: `sharedItem` exists, `owner` is `sharedItem.owner`, `request` is in `sharedItem.timeChangeRequests`.
    * **effects**: updates `sharedItem.currentStartTime` to `request.requestedStartTime`, `sharedItem.currentEndTime` to `request.requestedEndTime`, and `sharedItem.currentRepeatConfig` to `request.requestedRepeatConfig`. Deletes `request` from `sharedItem.timeChangeRequests`.
  * `rejectTimeChange(owner: User, sharedItem: SharedItem, request: TimeChangeRequest)`
    * **requires**: `sharedItem` exists, `owner` is `sharedItem.owner`, `request` is in `sharedItem.timeChangeRequests`.
    * **effects**: deletes `request` from `sharedItem.timeChangeRequests`.

***

**Rationale for Refactoring and Changes Made:**

1. **Generic Parameters:**
   * The concept name changed from `EventSharing` to `ItemSharing` to reflect its generic nature.
   * `Event` was replaced with `Item` as a generic type parameter. This means `ItemSharing` no longer knows or cares what `Item` actually is (e.g., an event, a task, a document). It just manages the sharing *of* an `Item`.
   * `Schedule` was removed from the generic parameters and action arguments. `ItemSharing` should not interact directly with a user's `Schedule`. If an accepted shared item needs to be added to a user's schedule, this would be handled via an external *synchronization* mechanism between `ItemSharing` and `ScheduleGenerator`.
   * `Time` and `RepeatTime` (which became `Date` and `RepeatConfig` in the updated `ScheduleGenerator`) were further abstracted to `Date` (a primitive) and `RepeatConfiguration` (a generic type parameter). This allows the concept to be flexible to different ways repetition might be defined.

2. **State Changes:**
   * `Schedules` and `Events` from `ScheduleGenerator` are no longer referenced.
   * `SharedEvents` was renamed to `SharedItems` and its `event` field now points to the generic `Item` type.
   * The `startTime`, `endTime`, `repeat` attributes on `SharedItems` are now explicitly `currentStartTime`, `currentEndTime`, `currentRepeatConfig` to clarify that they represent the *shared, agreed-upon* time for this item within the sharing context.
   * `sharedWith` was split into `participants` (those invited) and `acceptedParticipants` (those who have accepted the current shared terms). This provides better clarity on the state of a user's involvement.
   * `Requests` was renamed to `TimeChangeRequests` and now explicitly links back to the `SharedItem` it belongs to. This ensures multiple requests for different items can exist independently.
   * Unique IDs (`sharedItemID`, `requestID`) were added for consistency and to serve as stable identifiers for these entities within the `ItemSharing` concept.

3. **Action Changes:**
   * **`initializeSchedule`**: This action belonged to `ScheduleGenerator` and is not relevant to `ItemSharing`.
   * **`makeEventShareable` -> `makeItemShareable`**: Now takes `item: Item` and explicitly requires `initialStartTime`, `initialEndTime`, `initialRepeatConfig` as arguments, since the generic `Item` cannot be assumed to have these properties itself.
   * **`shareEventWith` / `unshareEventWith`**: Renamed to `shareItemWith` / `unshareItemWith` and updated to use `targetUser` and `participants`.
   * **`acceptNewEvent` / `rejectNewEvent` -> `acceptSharedItem` / `rejectSharedItem`**: These actions no longer reference `schedule`. Their effect is limited to updating the `acceptedParticipants` set within the `ItemSharing` concept. The actual integration into a user's personal schedule (e.g., in `ScheduleGenerator`) would be managed by an external synchronization.
   * **`requestNewTime`**: Updated to reflect the new state structure for `TimeChangeRequests`.
   * **`confirmNewTime` -> `confirmTimeChange`**:
     * The `schedule` argument was removed to break the dependency on `ScheduleGenerator`.
     * The `owner` argument was added to explicitly denote who is confirming the change (consistent with the original intent that the owner confirms requests).
     * The effects are restricted to updating the `currentStartTime`, `currentEndTime`, `currentRepeatConfig` of the `SharedItem` itself and deleting the request.
   * **`rejectNewTime` -> `rejectTimeChange`**: The `schedule` argument was removed, and `owner` was added for consistency. Effects are restricted to deleting the `TimeChangeRequest`.

This refactored `ItemSharing` concept is now fully independent, reusable for sharing any `Item` with associated time data, and cleanly separates its concerns from how those items might be stored or scheduled by other concepts like `ScheduleGenerator`.
