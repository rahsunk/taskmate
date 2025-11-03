---
timestamp: 'Mon Nov 03 2025 15:04:24 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251103_150424.0a015642.md]]'
content_id: 84a043c33eb65a4cdb0244c9ec58849ece0292b825c97c8951fbe4f033b91568
---

# response:

```typescript
import { Collection, Db } from "npm:mongodb";

import { Empty, ID } from "@utils/types.ts";

import { freshID } from "@utils/database.ts";

  

// Declare collection prefix, use concept name

const PREFIX = "Messaging" + ".";

  

// Generic types of this concept

type User = ID; // Represents an external user identifier

type ConversationId = ID; // Represents the ID of a conversation (assigned by this concept)

  

/**

* a set of Conversations with

* a participant1 of type User

* a participant2 of type User

* a conversationId of type Number (this is the _id in MongoDB)

*/

interface ConversationDoc {

_id: ConversationId;

participant1: User;

participant2: User;

}

  

/**

* a set of Messages with

* a conversationId of type Number

* a sender of type User

* a content of type String

* a sentAt of type Date

*/

interface MessageDoc {

_id: ID; // Unique ID for each message

conversationId: ConversationId;

sender: User;

content: string;

sentAt: Date;

}

  

export default class MessagingConcept {

conversations: Collection<ConversationDoc>;

messages: Collection<MessageDoc>;

  

constructor(private readonly db: Db) {

this.conversations = this.db.collection(PREFIX + "conversations");

this.messages = this.db.collection(PREFIX + "messages");

}

  

/**

* createConversation (user1: User, user2: User): (conversationId: ID)

*

* **requires** `user1` and `user2` exist (implicitly, from an external concept).

* `user1` is not the same as `user2`.

* No `Conversation` already exists where `(participant1 = user1 AND participant2 = user2) OR (participant1 = user2 AND participant2 = user1)`.

*

* **effects** A new `Conversation` is created with `participant1` set to `user1`,

* `participant2` set to `user2` (canonicalized by ID), and a fresh `conversationId` is generated and returned.

*/

async createConversation({

user1,

user2,

}: {

user1: User;

user2: User;

}): Promise<{ conversationId: ConversationId } | { error: string }> {

if (user1 === user2) {

return { error: "Cannot create a conversation with yourself." };

}

  

// Canonicalize participant order to prevent duplicate conversations (A,B) vs (B,A)

const [p1, p2] = [user1, user2].sort();

  

// Check if a conversation already exists

const existingConversation = await this.conversations.findOne({

participant1: p1,

participant2: p2,

});

  

if (existingConversation) {

return {

error: "A conversation between these two users already exists.",

};

}

  

const newConversationId: ConversationId = freshID();

const result = await this.conversations.insertOne({

_id: newConversationId,

participant1: p1,

participant2: p2,

});

  

if (!result.acknowledged) {

return { error: "Failed to create conversation." };

}

  

return { conversationId: newConversationId };

}

  

/**

* sendMessage (conversationId: ID, sender: User, content: String): (message: MessageDoc)

*

* **requires** A `Conversation` with the given `conversationId` exists.

* `sender` is either `participant1` or `participant2` of that `Conversation`.

* `content` is not empty.

*

* **effects** A `message` is created and returned where `message.conversationId` is set

* to the provided `conversationId`, `message.sender` and `message.content` are set to their

* respective parameters, with `message.sentAt` is set to the current `Date`.

*/

async sendMessage({

conversationId,

sender,

content,

}: {

conversationId: ConversationId;

sender: User;

content: string;

}): Promise<{ message: MessageDoc } | { error: string }> {

if (!content || content.trim() === "") {

return { error: "Message content cannot be empty." };

}

  

const conversation = await this.conversations.findOne({

_id: conversationId,

});

  

if (!conversation) {

return { error: `Conversation with ID ${conversationId} not found.` };

}

  

// Check if sender is a participant of the conversation

if (

sender !== conversation.participant1 &&

sender !== conversation.participant2

) {

return {

error: "Sender is not a participant in this conversation.",

};

}

  

const newMessageId: ID = freshID();

const newMessage: MessageDoc = {

_id: newMessageId,

conversationId: conversationId,

sender: sender,

content: content.trim(),

sentAt: new Date(),

};

  

const result = await this.messages.insertOne(newMessage);

  

if (!result.acknowledged) {

return { error: "Failed to send message." };

}

  

return { message: newMessage };

}

  

/**

* _getConversation (conversationId: ID): (conversation: ConversationDoc)

*

* **requires** A conversation with the given `conversationId` exists.

*

* **effects** Returns the `Conversation` document.

*/

async _getConversation({

conversationId,

}: {

conversationId: ConversationId;

}): Promise<ConversationDoc[] | { error: string }> {

const conversation = await this.conversations.findOne({

_id: conversationId,

});

if (!conversation) {

return { error: `Conversation with ID ${conversationId} not found.` };

}

return [conversation];

}

  

/**

* _getMessagesInConversation (conversationId: ID): (messages: MessageDoc)

*

* **requires** A conversation with the given `conversationId` exists.

*

* **effects** Returns an array of `Message` documents belonging to the specified conversation, ordered by `sentAt`.

*/

async _getMessagesInConversation({

conversationId,

}: {

conversationId: ConversationId;

}): Promise<MessageDoc[] | { error: string }> {

const conversationExists = await this.conversations.findOne({

_id: conversationId,

});

if (!conversationExists) {

return { error: `Conversation with ID ${conversationId} not found.` };

}

  

const messages = await this.messages

.find({ conversationId: conversationId })

.sort({ sentAt: 1 }) // Order messages chronologically

.toArray();

return messages;

}

  

/**

* _getConversationsForUser (user: User): (conversations: ConversationDoc)

*

* **requires** The `user` exists (implicitly, from an external concept).

*

* **effects** Returns an array of `Conversation` documents in which the given user is a participant.

*/

async _getConversationsForUser({

user,

}: {

user: User;

}): Promise<ConversationDoc[] | { error: string }> {

const conversations = await this.conversations

.find({

$or: [{ participant1: user }, { participant2: user }],

})

.toArray();

return conversations;

}

  

/**

* _getAllConversations (): (conversations: ConversationDoc)

*

* **requires** `true`

*

* **effects** Returns an array of all `Conversation` documents in the system.

*/

async _getAllConversations(): Promise<ConversationDoc[]> {

const conversations = await this.conversations.find({}).toArray();

return conversations;

}

  

/**

* _getMessageDetails (messageId: ID): (message: MessageDoc)

*

* **requires** A message with the given `messageId` exists.

*

* **effects** Returns an array containing the `Message` document matching the provided ID.

*/

async _getMessageDetails({

messageId,

}: {

messageId: ID;

}): Promise<MessageDoc[] | { error: string }> {

const message = await this.messages.findOne({ _id: messageId });

if (!message) {

return { error: `Message with ID ${messageId} not found.` };

}

return [message];

}

  

/**

* _getAllMessages (): (messages: MessageDoc)

*

* **requires** `true`

*

* **effects** Returns an array of all `Message` documents in the system.

*/

async _getAllMessages(): Promise<MessageDoc[]> {

const messages = await this.messages.find({}).toArray();

return messages;

}

}
```
