---
timestamp: 'Fri Oct 31 2025 14:45:19 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251031_144519.9732fddb.md]]'
content_id: 9b8726f84edff4df8cdbcf441684243fd22f787897ad20638bba683e802560e8
---

# API Specification: Messaging Concept

**Purpose:** Enable two specific users to exchange textual communications with one another in a persistent and asynchronous manner.

***

## API Endpoints

### POST /api/Messaging/createConversation

**Description:** Creates a new one-to-one conversation between two specified users.

**Requirements:**

* `user1` and `user2` exist (implicitly, from an external concept).
* `user1` is not the same as `user2`.
* No `Conversation` already exists where `(participant1 = user1 AND participant2 = user2) OR (participant1 = user2 AND participant2 = user1)`.

**Effects:**

* A new `Conversation` is created with `participant1` set to `user1`, `participant2` set to `user2` (canonicalized by ID).
* A fresh `conversationId` is generated and returned.

**Request Body:**

```json
{
  "user1": "string",
  "user2": "string"
}
```

**Success Response Body (Action):**

```json
{
  "conversationId": "string"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Messaging/sendMessage

**Description:** Sends a new message within an existing conversation.

**Requirements:**

* A `Conversation` with the given `conversationId` exists.
* `sender` is either `participant1` or `participant2` of that `Conversation`.
* `content` is not empty.

**Effects:**

* A `message` is created and returned where `message.conversationId` is set to the provided `conversationId`.
* `message.sender` and `message.content` are set to their respective parameters.
* `message.sentAt` is set to the current `Date`.

**Request Body:**

```json
{
  "conversationId": "string",
  "sender": "string",
  "content": "string"
}
```

**Success Response Body (Action):**

```json
{
  "message": {
    "_id": "string",
    "conversationId": "string",
    "sender": "string",
    "content": "string",
    "sentAt": "string (ISO Date)"
  }
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Messaging/\_getConversation

**Description:** Retrieves the details of a specific conversation by its ID.

**Requirements:**

* A conversation with the given `conversationId` exists.

**Effects:**

* Returns an array containing the `Conversation` document.

**Request Body:**

```json
{
  "conversationId": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "_id": "string",
    "participant1": "string",
    "participant2": "string"
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

### POST /api/Messaging/\_getMessagesInConversation

**Description:** Retrieves all messages within a specific conversation, ordered chronologically.

**Requirements:**

* A conversation with the given `conversationId` exists.

**Effects:**

* Returns an array of `Message` documents belonging to the specified conversation, ordered by `sentAt`.

**Request Body:**

```json
{
  "conversationId": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "_id": "string",
    "conversationId": "string",
    "sender": "string",
    "content": "string",
    "sentAt": "string (ISO Date)"
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

### POST /api/Messaging/\_getConversationsForUser

**Description:** Retrieves all conversations in which a given user is a participant.

**Requirements:**

* The `user` exists (implicitly, from an external concept).

**Effects:**

* Returns an array of `Conversation` documents in which the given user is a participant.

**Request Body:**

```json
{
  "user": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "_id": "string",
    "participant1": "string",
    "participant2": "string"
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

### POST /api/Messaging/\_getAllConversations

**Description:** Retrieves an array of all conversation documents in the system.

**Requirements:**

* `true`

**Effects:**

* Returns an array of all `ConversationDoc` objects.

**Request Body:**

```json
{}
```

**Success Response Body (Query):**

```json
[
  {
    "_id": "string",
    "participant1": "string",
    "participant2": "string"
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

### POST /api/Messaging/\_getMessageDetails

**Description:** Retrieves an array containing a specific message document by its ID.

**Requirements:**

* `messageId` exists.

**Effects:**

* Returns an array containing the `Message` document matching the provided ID.

**Request Body:**

```json
{
  "messageId": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "_id": "string",
    "conversationId": "string",
    "sender": "string",
    "content": "string",
    "sentAt": "string (ISO Date)"
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

### POST /api/Messaging/\_getAllMessages

**Description:** Retrieves an array of all message documents in the system.

**Requirements:**

* `true`

**Effects:**

* Returns an array of all `MessageDoc` objects.

**Request Body:**

```json
{}
```

**Success Response Body (Query):**

```json
[
  {
    "_id": "string",
    "conversationId": "string",
    "sender": "string",
    "content": "string",
    "sentAt": "string (ISO Date)"
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
