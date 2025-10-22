---
timestamp: 'Mon Oct 20 2025 17:16:49 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251020_171649.6eb73be8.md]]'
content_id: 920319130fb4db157f4ff525fdb9ecb8ae3b74481c514c745a3482816a3d7d20
---

# API Specification: ItemSharing Concept

**Purpose:** Allows collaborative modification of an item's mutable properties by managing invited participants, their acceptance to collaborate, and the lifecycle of proposed and confirmed changes to those properties.

***

## API Endpoints

### POST /api/ItemSharing/makeItemShareable

**Description:** Registers an external item to be shareable, establishing its owner.

**Requirements:**

* `externalItemID` exists from an external concept
* `owner` exists
* `externalItemID` is not already registered for sharing

**Effects:**

* creates and returns a new `sharedItem` with `sharedItemID` increments by 1. `sharedItem` is initialized with the given `externalItemID` and `owner` while `participants`, `acceptedParticipants`, and `changeRequests` are initialized as empty sets.

**Request Body:**

```json
{
  "owner": "string",
  "externalItemID": "string"
}
```

**Success Response Body (Action):**

```json
{
  "sharedItem": "number"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/ItemSharing/shareItemWith

**Description:** Invites a user to participate in sharing an item.

**Requirements:**

* `sharedItem` exists
* `targetUser` exists
* `targetUser` is not already in `sharedItem.participants`

**Effects:**

* adds `targetUser` to `sharedItem.participants`

**Request Body:**

```json
{
  "sharedItem": "number",
  "targetUser": "string"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/ItemSharing/unshareItemWith

**Description:** Revokes a user's invitation or participation in sharing an item.

**Requirements:**

* `sharedItem` exists
* `targetUser` is in `sharedItem.participants`

**Effects:**

* removes `targetUser` from `sharedItem.participants` and from `sharedItem.acceptedParticipants` if they are in that set. Deletes any `ChangeRequests` made by `targetUser` for `sharedItem`

**Request Body:**

```json
{
  "sharedItem": "number",
  "targetUser": "string"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/ItemSharing/acceptToCollaborate

**Description:** A user accepts to collaborate on a shared item.

**Requirements:**

* `sharedItem` exists
* `user` is in `sharedItem.participants`
* `user` is not already in `sharedItem.acceptedParticipants`

**Effects:**

* adds `user` to `sharedItem.acceptedParticipants`

**Request Body:**

```json
{
  "sharedItem": "number",
  "user": "string"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/ItemSharing/rejectCollaboration

**Description:** A user rejects collaboration on a shared item, also removing their participation.

**Requirements:**

* `sharedItem` exists
* `user` is in `sharedItem.participants`

**Effects:**

* removes `user` from `sharedItem.participants` and, if present, from `sharedItem.acceptedParticipants`. Deletes any `ChangeRequests` made by `user` for this `sharedItem`

**Request Body:**

```json
{
  "sharedItem": "number",
  "user": "string"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/ItemSharing/requestChange

**Description:** A participant proposes changes to an item's properties.

**Requirements:**

* `sharedItem` exists
* `requester` exists
* `requester` is in `sharedItem.acceptedParticipants`

**Effects:**

* creates and returns a new `changeRequest` for `sharedItem` with the `requester` and the proposed `requestedProperties`, with `requestID` incrementing. Adds `changeRequest` to `sharedItem.changeRequests`.

**Request Body:**

```json
{
  "sharedItem": "number",
  "requester": "string",
  "requestedProperties": "object"
}
```

**Success Response Body (Action):**

```json
{
  "changeRequest": "number"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/ItemSharing/confirmChange

**Description:** The owner confirms a proposed change request.

**Requirements:**

* `sharedItem` exists
* `owner` is `sharedItem.owner`
* `request` is in `sharedItem.changeRequests`

**Effects:**

* Deletes `request` from `sharedItem.changeRequests`

**Request Body:**

```json
{
  "owner": "string",
  "sharedItem": "number",
  "request": "number"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/ItemSharing/rejectChange

**Description:** The owner rejects a proposed change request.

**Requirements:**

* `sharedItem` exists
* `owner` is `sharedItem.owner`
* `request` is in `sharedItem.changeRequests`

**Effects:**

* deletes `request` from `sharedItem.changeRequests`

**Request Body:**

```json
{
  "owner": "string",
  "sharedItem": "number",
  "request": "number"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***
