---
timestamp: 'Thu Oct 30 2025 11:02:07 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251030_110207.27b49008.md]]'
content_id: 00cb29c5ca9f8024c685486ec4a04d982ac1d77e412120170e2f687571942f78
---

# API Specification: ItemSharing Concept

**Purpose:** Allows collaborative modification of an item's mutable properties by managing invited participants, their acceptance to collaborate, and the lifecycle of proposed and confirmed changes to those properties.

***

## API Endpoints

### POST /api/ItemSharing/makeItemShareable

**Description:** Makes an external item shareable, creating a new shared item record.

**Requirements:**

* `externalItemID` exists from an external concept.
* `owner` exists (external to this concept).
* `externalItemID` is not already registered for sharing.

**Effects:**

* Creates and returns a new `sharedItem` document.
* `sharedItemID` increments by 1.
* `sharedItem` is initialized with the given `externalItemID` and `owner`.
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

**Description:** Invites a target user to participate in changes to a shared item.

**Requirements:**

* `sharedItem` exists.
* `targetUser` exists (external to this concept).
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

**Description:** Removes a user's participation from a shared item.

**Requirements:**

* `sharedItem` exists.
* `targetUser` is in `sharedItem.participants`.

**Effects:**

* Removes `targetUser` from `sharedItem.participants`.
* Removes `targetUser` from `sharedItem.acceptedParticipants` if they are in that set.
* Deletes any `ChangeRequests` made by `targetUser` for `sharedItem` and removes their IDs from `sharedItem.changeRequests`.

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

**Description:** Allows an invited user to accept collaboration on a shared item.

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

**Description:** Allows a participant to reject collaboration on a shared item, also removing them from participation.

**Requirements:**

* `sharedItem` exists.
* `user` is in `sharedItem.participants`.

**Effects:**

* Removes `user` from `sharedItem.participants`.
* Removes `user` from `sharedItem.acceptedParticipants` if present.
* Deletes any `ChangeRequests` made by `user` for this `sharedItem` and removes their IDs from `sharedItem.changeRequests`.

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

**Description:** A participant proposes changes to an item's properties by creating a change request.

**Requirements:**

* `sharedItem` exists.
* `requester` exists (external to this concept).
* `requester` is in `sharedItem.acceptedParticipants`.

**Effects:**

* Creates and returns a new `changeRequest` for `sharedItem` with the `requester` and the proposed `requestedProperties`.
* `requestID` increments by 1.
* Adds `changeRequest` to `sharedItem.changeRequests`.

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

**Description:** The owner confirms a proposed change request.

**Requirements:**

* `sharedItem` exists.
* `owner` is `sharedItem.owner`.
* `request` exists and is in `sharedItem.changeRequests`.

**Effects:**

* Deletes `request` from `sharedItem.changeRequests` and removes the `ChangeRequest` document itself.
* (Note: The actual application of properties to the external item is done by a concept sync, external to this API).

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

**Description:** The owner rejects a proposed change request.

**Requirements:**

* `sharedItem` exists.
* `owner` is `sharedItem.owner`.
* `request` exists and is in `sharedItem.changeRequests`.

**Effects:**

* Deletes `request` from `sharedItem.changeRequests` and removes the `ChangeRequest` document itself.

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

### POST /api/ItemSharing/\_getAllSharedItems

**Description:** Retrieves an array of all shared item documents.

**Requirements:**

* `true`

**Effects:**

* Returns an array of all `SharedItemDoc` objects.

**Request Body:**

```json
{}
```

**Success Response Body (Query):**

```json
[
  {
    "sharedItem": [
      {
        "_id": "string",
        "sharedItemID": "number",
        "externalItemID": "string",
        "owner": "string",
        "participants": ["string"],
        "acceptedParticipants": ["string"],
        "changeRequests": ["string"]
      }
    ]
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/ItemSharing/\_getSharedItemDetails

**Description:** Retrieves an array containing the specific shared item document by its ID.

**Requirements:**

* `sharedItem` exists.

**Effects:**

* Returns an array containing the specific `SharedItemDoc` object.

**Request Body:**

```json
{
  "sharedItem": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "sharedItemDetails": [
      {
        "_id": "string",
        "sharedItemID": "number",
        "externalItemID": "string",
        "owner": "string",
        "participants": ["string"],
        "acceptedParticipants": ["string"],
        "changeRequests": ["string"]
      }
    ]
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/ItemSharing/\_getAllChangeRequests

**Description:** Retrieves an array of all change request documents.

**Requirements:**

* `true`

**Effects:**

* Returns an array of all `ChangeRequestDoc` objects.

**Request Body:**

```json
{}
```

**Success Response Body (Query):**

```json
[
  {
    "changeRequest": [
      {
        "_id": "string",
        "requestID": "number",
        "sharedItemPointer": "string",
        "requester": "string",
        "requestedProperties": {
          "property1": "any",
          "property2": "any"
        }
      }
    ]
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/ItemSharing/\_getChangeRequestDetails

**Description:** Retrieves an array containing the specific change request document by its ID.

**Requirements:**

* `changeRequest` exists.

**Effects:**

* Returns an array containing the specific `ChangeRequestDoc` object.

**Request Body:**

```json
{
  "changeRequest": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "changeRequestDetails": [
      {
        "_id": "string",
        "requestID": "number",
        "sharedItemPointer": "string",
        "requester": "string",
        "requestedProperties": {
          "property1": "any",
          "property2": "any"
        }
      }
    ]
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```
