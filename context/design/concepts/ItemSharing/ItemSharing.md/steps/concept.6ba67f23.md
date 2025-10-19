---
timestamp: 'Sun Oct 19 2025 17:40:04 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251019_174004.d084f034.md]]'
content_id: 6ba67f238ad66fdfd999fec5690f6f412eca5d2b3f8af4ca7884abe968fca990
---

# concept: ItemSharing

* **concept** ItemSharing\[User, ItemID, SharedPayload]
  * `User`: A generic type representing user identities (e.g., from an Authentication concept).
  * `ItemID`: A generic type representing the unique identifier of the external item being shared (e.g., an `EventID` or `TaskID` from `ScheduleGenerator`). `ItemSharing` does not interpret `ItemID` beyond its identity.
  * `SharedPayload`: A generic type representing the complete set of mutable properties of an item that are subject to collaboration. This could be any structured data (e.g., a record containing name, description, dates, priority, etc., depending on the specific application). `ItemSharing` treats this as an opaque value, facilitating proposals for its change.

* **purpose** Facilitates collaborative modification of a generic item's mutable properties (represented by `SharedPayload`) that **reside in an external concept**, by managing invited participants, their acceptance to collaborate, and the lifecycle of proposed and confirmed changes to those properties.

* **principle** An owner registers an `ItemID` for sharing. They can then invite other users to participate. Invited users can accept to participate in changes to this item. Any `acceptedParticipant` can propose a new `SharedPayload` as a `ChangeRequest`. The owner can then confirm or reject this `ChangeRequest`. Upon confirmation, an external synchronization mechanism applies the `requestedSharedPayload` to the item identified by `ItemID` in its originating concept.

* **state**
  * a set of `SharedItems` with
    * a `sharedItemID` of type `Number` (static attribute, initially -1)
    * an `externalItemID` of type `ItemID` (the identifier of the original item in an external concept whose mutable properties are being coordinated)
    * an `owner` of type `User`
    * a set of `participants` of type `User` (users invited to collaborate on the item)
    * a set of `acceptedParticipants` of type `User` (users who have explicitly agreed to collaborate on the item)
    * a set of `changeRequests`
  * a set of `ChangeRequests` with
    * a `requestID` of type `Number` (static attribute, initially -1)
    * a `sharedItem` of type `SharedItem` (points back to the `SharedItem` this request is for)
    * a `requester` of type `User`
    * a `requestedSharedPayload` of type `SharedPayload` (the proposed new state for the shared item's properties)

* **actions**
  * `registerItemForSharing(owner: User, externalItemID: ItemID): (sharedItem: SharedItem)`
    * **requires**: `externalItemID` exists (in its originating concept), `owner` exists (externally). `externalItemID` is not already registered for sharing.
    * **effects**: creates and returns a new `sharedItem` instance. `sharedItemID` increments by 1. The `sharedItem` is initialized with the given `externalItemID` and `owner`. `participants`, `acceptedParticipants`, and `changeRequests` are initialized as empty sets.
    * *Note: The initial state of the item's `SharedPayload` is assumed to reside in the external concept identified by `externalItemID`.*
  * `shareItemWith(sharedItem: SharedItem, targetUser: User)`
    * **requires**: `sharedItem` exists, `targetUser` exists (externally), `targetUser` is not already in `sharedItem.participants`.
    * **effects**: adds `targetUser` to `sharedItem.participants`.
  * `unshareItemWith(sharedItem: SharedItem, targetUser: User)`
    * **requires**: `sharedItem` exists, `targetUser` is in `sharedItem.participants`.
    * **effects**: removes `targetUser` from `sharedItem.participants` and, if present, from `sharedItem.acceptedParticipants`. Deletes any `ChangeRequests` made by `targetUser` for this `sharedItem`.
  * `acceptToCollaborate(sharedItem: SharedItem, user: User)`
    * **requires**: `sharedItem` exists, `user` is in `sharedItem.participants`, `user` is not already in `sharedItem.acceptedParticipants`.
    * **effects**: adds `user` to `sharedItem.acceptedParticipants`.
    * *Note: The user agrees to participate in the change process for the item identified by `sharedItem.externalItemID`. They would query the originating concept to see its current state.*
  * `rejectCollaboration(sharedItem: SharedItem, user: User)`
    * **requires**: `sharedItem` exists, `user` is in `sharedItem.participants`.
    * **effects**: removes `user` from `sharedItem.participants` and, if present, from `sharedItem.acceptedParticipants`. Deletes any `ChangeRequests` made by `user` for this `sharedItem`.
  * `requestChange(sharedItem: SharedItem, requester: User, newPayload: SharedPayload): (changeRequest: ChangeRequest)`
    * **requires**: `sharedItem` exists, `requester` exists (externally), `requester` is in `sharedItem.acceptedParticipants`.
    * **effects**: creates and returns a new `changeRequest` for `sharedItem` with the `requester` and the proposed `newPayload`. `requestID` increments by 1. Adds it to `sharedItem.changeRequests`.
  * `confirmChange(owner: User, sharedItem: SharedItem, request: ChangeRequest)`
    * **requires**: `sharedItem` exists, `owner` is `sharedItem.owner`, `request` is in `sharedItem.changeRequests`.
    * **effects**: Deletes `request` from `sharedItem.changeRequests`.
    * *Note: This action signals a confirmed change. An external synchronization mechanism would typically read `request.requestedSharedPayload` and apply it to `sharedItem.externalItemID` in its originating concept.*
  * `rejectChange(owner: User, sharedItem: SharedItem, request: ChangeRequest)`
    * **requires**: `sharedItem` exists, `owner` is `sharedItem.owner`, `request` is in `sharedItem.changeRequests`.
    * **effects**: deletes `request` from `sharedItem.changeRequests`.

***

**Key Changes and Rationale for Maximum Genericity and Simplification:**

1. **Removal of `currentSharedPayload` from `SharedItems`:**
   * This is the most significant simplification. The `ItemSharing` concept no longer stores or manages the *actual current state* (`SharedPayload`) of the item. Its responsibility is now purely limited to coordinating the *process* of sharing, proposing, and confirming *changes* to that state.
   * This makes `ItemSharing` a "workflow" or "consensus" engine, entirely decoupled from the persistence and interpretation of the `SharedPayload` itself.

2. **`makeItemShareable` renamed to `registerItemForSharing` and simplified:**
   * The action no longer takes an `initialPayload` argument, as `ItemSharing` does not store the current payload. It simply registers an `externalItemID` as being open for collaborative changes.
   * The initial `SharedPayload` is implicitly the current state of `externalItemID` in its originating concept.

3. **`acceptSharedItem` renamed to `acceptToCollaborate`:**
   * This name more accurately reflects that the user is agreeing to participate in the change process, rather than accepting a specific payload from *this* concept.

4. **`confirmChange` effects simplified:**
   * The `confirmChange` action no longer modifies `sharedItem.currentSharedPayload` because that field no longer exists within `ItemSharing`.
   * Its sole effect is to delete the `ChangeRequest`, signaling that the proposal has been approved. The *application* of `request.requestedSharedPayload` to the `externalItemID` (in its original concept) is now explicitly a task for an external *synchronization*. This is crucial for maintaining independence and separation of concerns.

**Implications for Usage and Synchronizations:**

With this highly generic `ItemSharing` concept, its interaction with concrete concepts like `ScheduleGenerator` would be entirely managed through synchronizations:

* **To register an `Event` for sharing:**
  ```
  sync RegisterEventForSharing
  when ScheduleGenerator.addEvent (schedule, name, startTime, endTime, repeat) returns (event: Event)
  then ItemSharing.registerItemForSharing (owner: schedule.owner, externalItemID: event.eventID)
  ```

* **To propose a change to a shared `Event`:**
  A user would call `ItemSharing.requestChange` with the `sharedItem` and a `SharedPayload` representing the new `name`, `startTime`, `endTime`, `repeat` for the event.

* **To apply a confirmed `Event` change:**
  ```
  sync ApplyConfirmedEventChange
  when ItemSharing.confirmChange (owner, sharedItem, request)
  then ScheduleGenerator.editEvent (
      schedule: <get schedule for sharedItem.owner>,
      oldEvent: <get event by sharedItem.externalItemID>,
      name: request.requestedSharedPayload.name,
      startTime: request.requestedSharedPayload.startTime,
      endTime: request.requestedSharedPayload.endTime,
      repeat: request.requestedSharedPayload.repeat
  )
  ```
  (Note: `<get schedule for sharedItem.owner>` and `<get event by sharedItem.externalItemID>` represent queries that would resolve the necessary context for the `ScheduleGenerator` action, often handled by the synchronization mechanism implicitly or with additional `where` clauses).

This design ensures `ItemSharing` is maximally reusable and independent, focusing solely on the collaboration workflow.
