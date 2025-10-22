---
timestamp: 'Tue Oct 21 2025 12:37:29 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251021_123729.506b79cb.md]]'
content_id: a9733171c92b29ee1b12ba9c9f19e6fba4a4e631ce7f83513f9c299dddb96e01
---

# API Specification: ItemSharing Concept

**Purpose:** Allows collaborative modification of an item's mutable properties by managing invited participants, their acceptance to collaborate, and the lifecycle of proposed and confirmed changes to those properties.

***

## API Endpoints

### POST /api/ItemSharing/makeItemShareable

**Description:** Creates and returns a new `sharedItem` with `sharedItemID` incremented by 1. `sharedItem` is initialized with the given `externalItemID` and `owner` while `participants`, `acceptedParticipants`, and `changeRequests` are initialized as empty sets.

**Requirements:**

* `externalItemID` exists from an external concept, `owner` exists, and `externalItemID` is not already registered for sharing.

**Effects:**

* Creates and returns a new `sharedItem` with `sharedItemID` increments by 1. `sharedItem` is initialized with the given `externalItemID` and `owner` while `participants`, `acceptedParticipants`, and `changeRequests` are initialized as empty sets.

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

**Description:** Adds `targetUser` to `sharedItem.participants`.

**Requirements:**

* `sharedItem` exists, `targetUser` exists, `targetUser` is not already in `sharedItem.participants`.

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

**Description:** Removes `targetUser` from `sharedItem.participants` and from `sharedItem.acceptedParticipants` if they are in that set. Deletes any `ChangeRequests` made by `targetUser` for `sharedItem`.

**Requirements:**

* `sharedItem` exists, `targetUser` is in `sharedItem.participants`.

**Effects:**

* Removes `targetUser` from `sharedItem.participants` and from `sharedItem.acceptedParticipants` if they are in that set. Deletes any `ChangeRequests` made by `targetUser` for `sharedItem`.

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

**Description:** Adds `user` to `sharedItem.acceptedParticipants`.

**Requirements:**

* `sharedItem` exists, `user` is in `sharedItem.participants`, `user` is not already in `sharedItem.acceptedParticipants`.

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

**Description:** Removes `user` from `sharedItem.participants` and, if present, from `sharedItem.acceptedParticipants`. Deletes any `ChangeRequests` made by `user` for this `sharedItem`.

**Requirements:**

* `sharedItem` exists, `user` is in `sharedItem.participants`.

**Effects:**

* Removes `user` from `sharedItem.participants` and, if present, from `sharedItem.acceptedParticipants`. Deletes any `ChangeRequests` made by `user` for this `sharedItem`.

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

**Description:** Creates and returns a new `changeRequest` for `sharedItem` with the `requester` and the proposed `requestedProperties`, with `requestID` incrementing by 1. Adds `changeRequest` to `sharedItem.changeRequests`.

**Requirements:**

* `sharedItem` exists, `requester` exists, `requester` is in `sharedItem.acceptedParticipants`.

**Effects:**

* Creates and returns a new `changeRequest` for `sharedItem` with the `requester` and the proposed `requestedProperties`, with `requestID` incrementing by 1. Adds `changeRequest` to `sharedItem.changeRequests`.

**Request Body:**

```json
{
  "sharedItem": "string",
  "requester": "string",
  "requestedProperties": {
    "propertyName": "any",
    "anotherProperty": "any"
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

**Description:** Deletes `request` from `sharedItem.changeRequests`. (Note: The actual application of properties to the external item is done by a concept sync).

**Requirements:**

* `sharedItem` exists, `owner` is `sharedItem.owner`, `request` is in `sharedItem.changeRequests`.

**Effects:**

* Deletes `request` from `sharedItem.changeRequests`.

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

**Description:** Deletes `request` from `sharedItem.changeRequests`.

**Requirements:**

* `sharedItem` exists, `owner` is `sharedItem.owner`, `request` is in `sharedItem.changeRequests`.

**Effects:**

* Deletes `request` from `sharedItem.changeRequests`.

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
