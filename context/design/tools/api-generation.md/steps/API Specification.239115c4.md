---
timestamp: 'Tue Oct 21 2025 12:29:31 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251021_122931.fcb5e987.md]]'
content_id: 239115c4843ac88b46869edced82fe103e52ab70d40e386684d67abaf4f148b3
---

# API Specification: ItemSharing Concept

**Purpose:** Allows collaborative modification of an item's mutable properties by managing invited participants, their acceptance to collaborate, and the lifecycle of proposed and confirmed changes to those properties.

***

## API Endpoints

### POST /api/ItemSharing/makeItemShareable

**Description:** Makes an external item shareable within this concept.

**Requirements:**

* `externalItemID` exists from an external concept (verification is external).
* `owner` exists (verification is external).
* `externalItemID` is not already registered for sharing within this concept.

**Effects:**

* Creates and returns a new `SharedItem` with an incremented `sharedItemID`.
* `SharedItem` is initialized with the given `externalItemID` and `owner`.
* `participants`, `acceptedParticipants`, and `changeRequests` are initialized as empty sets.

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
  "sharedItem": "string"
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

**Description:** Invites another user to participate in changes to a shared item.

**Requirements:**

* `sharedItem` exists.
* `targetUser` exists (verification is external).
* `targetUser` is not already in `sharedItem.participants`.

**Effects:**

* Adds `targetUser` to `sharedItem.participants`.

**Request Body:**

```json
{
  "sharedItem": "string",
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

**Description:** Removes a user from the participants of a shared item.

**Requirements:**

* `sharedItem` exists.
* `targetUser` is in `sharedItem.participants`.

**Effects:**

* Removes `targetUser` from `sharedItem.participants`.
* Removes `targetUser` from `sharedItem.acceptedParticipants` if they are in that set.
* Deletes any `ChangeRequests` made by `targetUser` for `sharedItem`.

**Request Body:**

```json
{
  "sharedItem": "string",
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

**Description:** Allows an invited user to accept participation in a shared item.

**Requirements:**

* `sharedItem` exists.
* `user` is in `sharedItem.participants`.
* `user` is not already in `sharedItem.acceptedParticipants`.

**Effects:**

* Adds `user` to `sharedItem.acceptedParticipants`.

**Request Body:**

```json
{
  "sharedItem": "string",
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

**Description:** Allows a user to reject or withdraw from collaboration on a shared item.

**Requirements:**

* `sharedItem` exists.
* `user` is in `sharedItem.participants`.

**Effects:**

* Removes `user` from `sharedItem.participants`.
* Removes `user` from `sharedItem.acceptedParticipants` if present.
* Deletes any `ChangeRequests` made by `user` for this `sharedItem`.

**Request Body:**

```json
{
  "sharedItem": "string",
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

**Description:** Allows an accepted participant to propose changes to a shared item's properties.

**Requirements:**

* `sharedItem` exists.
* `requester` exists (verification is external).
* `requester` is in `sharedItem.acceptedParticipants`.

**Effects:**

* Creates and returns a new `ChangeRequest` document with an incremented `requestID`.
* `ChangeRequest` is initialized with the `sharedItem`, `requester`, and `requestedProperties`.
* Adds the new `ChangeRequest`'s ID to `sharedItem.changeRequests`.

**Request Body:**

```json
{
  "sharedItem": "string",
  "requester": "string",
  "requestedProperties": {
    "property1": "any",
    "property2": "any"
  }
}
```

**Success Response Body (Action):**

```json
{
  "changeRequest": "string"
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

**Description:** Allows the owner to confirm a proposed change request.

**Requirements:**

* `sharedItem` exists.
* `owner` is `sharedItem.owner`.
* `request` exists and is in `sharedItem.changeRequests`.
* `request` must be specifically for the given `sharedItem`.

**Effects:**

* Deletes `request` from `sharedItem.changeRequests`.
* Deletes the `ChangeRequest` document itself.
* (Note: The actual application of properties to the external item is expected to be handled by a concept synchronization outside of this concept.)

**Request Body:**

```json
{
  "owner": "string",
  "sharedItem": "string",
  "request": "string"
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

**Description:** Allows the owner to reject a proposed change request.

**Requirements:**

* `sharedItem` exists.
* `owner` is `sharedItem.owner`.
* `request` exists and is in `sharedItem.changeRequests`.
* `request` must be specifically for the given `sharedItem`.

**Effects:**

* Deletes `request` from `sharedItem.changeRequests`.
* Deletes the `ChangeRequest` document itself.

**Request Body:**

```json
{
  "owner": "string",
  "sharedItem": "string",
  "request": "string"
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
