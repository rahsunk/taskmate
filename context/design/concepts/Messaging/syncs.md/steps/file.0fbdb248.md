---
timestamp: 'Mon Nov 03 2025 15:13:24 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251103_151324.73c009d3.md]]'
content_id: 0fbdb2484e6c45c2d3c0ffca0170a8a0c621b9939354b0d3dab9c99f8db8b937
---

# file: src/syncs/Messaging.sync.ts

This is the corrected synchronization file. It includes local type definitions for casting, which resolves the `type 'unknown'` errors, and now correctly interacts with the updated `MessagingConcept` queries.

```typescript
import { actions, Sync, Frames } from "@engine";
import { Requesting, Sessioning, Messaging } from "@concepts";
import { ID } from "@utils/types.ts";

// Local type definitions for casting frame variables.
// These should match the document structures in MessagingConcept.ts.
type User = ID;
interface ConversationDoc {
  _id: ID;
  participant1: User;
  participant2: User;
}
interface MessageDoc {
  _id: ID;
  conversationId: ID;
  sender: User;
  content: string;
  sentAt: Date;
}

// --- Create Conversation --- //

/**
 * Handles an incoming request to create a new conversation.
 * It authenticates the user making the request via their session.
 * The authenticated user becomes participant 1 (`user1`).
 * The other participant (`user2`) is specified in the request body.
 */
export const CreateConversationRequest: Sync = ({ request, session, user1, user2 }) => ({
  when: actions([Requesting.request, { path: "/Messaging/createConversation", session, user2 }, { request }]),
  where: (frames) => frames.query(Sessioning._getUser, { session }, { user: user1 }),
  then: actions([Messaging.createConversation, { user1, user2 }]),
});

/**
 * Responds to the client when a conversation is successfully created.
 */
export const CreateConversationResponseSuccess: Sync = ({ request, conversationId }) => ({
  when: actions(
    [Requesting.request, { path: "/Messaging/createConversation" }, { request }],
    [Messaging.createConversation, {}, { conversationId }],
  ),
  then: actions([Requesting.respond, { request, conversationId }]),
});

/**
 * Responds to the client when creating a conversation fails.
 */
export const CreateConversationResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Messaging/createConversation" }, { request }],
    [Messaging.createConversation, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- Send Message --- //

/**
 * Handles an incoming request to send a message.
 * It authenticates the sender via their session. The `Messaging` concept itself
 * will verify that the sender is a participant in the conversation.
 */
export const SendMessageRequest: Sync = ({ request, session, sender, conversationId, content }) => ({
  when: actions([Requesting.request, { path: "/Messaging/sendMessage", session, conversationId, content }, { request }]),
  where: (frames) => frames.query(Sessioning._getUser, { session }, { user: sender }),
  then: actions([Messaging.sendMessage, { conversationId, sender, content }]),
});

/**
 * Responds to the client when a message is successfully sent.
 */
export const SendMessageResponseSuccess: Sync = ({ request, message }) => ({
  when: actions(
    [Requesting.request, { path: "/Messaging/sendMessage" }, { request }],
    [Messaging.sendMessage, {}, { message }],
  ),
  then: actions([Requesting.respond, { request, message }]),
});

/**
 * Responds to the client when sending a message fails.
 */
export const SendMessageResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Messaging/sendMessage" }, { request }],
    [Messaging.sendMessage, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- Queries (Authenticated & Authorized) --- //

/**
 * Handles a request to get a specific conversation's details.
 * Requires a valid session and that the logged-in user is a participant
 * in the requested conversation.
 */
export const GetConversationRequest: Sync = ({ request, session, activeUser, conversationId, conversation }) => ({
  when: actions([Requesting.request, { path: "/Messaging/_getConversation", session, conversationId }, { request }]),
  where: async (frames) => {
    frames = await frames.query(Sessioning._getUser, { session }, { user: activeUser });
    if (frames.length === 0) return new Frames(); // Invalid session

    frames = await frames.query(Messaging._getConversation, { conversationId }, { conversation });

    return frames.filter(($) => {
      const conv = $[conversation] as ConversationDoc;
      const user = $[activeUser] as User;
      return conv && (conv.participant1 === user || conv.participant2 === user);
    });
  },
  then: actions([Requesting.respond, { request, conversation }]),
});

/**
 * Handles a request to get all messages in a conversation.
 * Requires a valid session and that the logged-in user is a participant.
 */
export const GetMessagesInConversationRequest: Sync = ({ request, session, activeUser, conversationId, conversation, messages }) => ({
  when: actions([Requesting.request, { path: "/Messaging/_getMessagesInConversation", session, conversationId }, { request }]),
  where: async (frames) => {
    frames = await frames.query(Sessioning._getUser, { session }, { user: activeUser });
    if (frames.length === 0) return new Frames();

    frames = await frames.query(Messaging._getConversation, { conversationId }, { conversation });

    frames = frames.filter(($) => {
      const conv = $[conversation] as ConversationDoc;
      const user = $[activeUser] as User;
      return conv && (conv.participant1 === user || conv.participant2 === user);
    });
    if (frames.length === 0) return new Frames();

    return frames.query(Messaging._getMessagesInConversation, { conversationId }, { messages });
  },
  then: actions([Requesting.respond, { request, messages }]),
});

/**
 * Handles a request to get all conversations for a specific user.
 * Requires a valid session and authorizes that the logged-in user can only
 * request their own conversations.
 */
export const GetConversationsForUserRequest: Sync = ({ request, session, activeUser, userToGet, conversations }) => ({
  when: actions([Requesting.request, { path: "/Messaging/_getConversationsForUser", session, user: userToGet }, { request }]),
  where: async (frames) => {
    frames = await frames.query(Sessioning._getUser, { session }, { user: activeUser });

    frames = frames.filter(($) => $[activeUser] === $[userToGet]);
    if (frames.length === 0) return new Frames();

    return frames.query(Messaging._getConversationsForUser, { user: activeUser }, { conversations });
  },
  then: actions([Requesting.respond, { request, conversations }]),
});

/**
 * Handles a request to get details for a specific message.
 * Requires a valid session and authorizes that the logged-in user is a
 * participant in the conversation to which the message belongs.
 */
export const GetMessageDetailsRequest: Sync = ({ request, session, activeUser, messageId, message, conversationId, conversation }) => ({
  when: actions([Requesting.request, { path: "/Messaging/_getMessageDetails", session, messageId }, { request }]),
  where: async (frames) => {
    frames = await frames.query(Sessioning._getUser, { session }, { user: activeUser });
    if (frames.length === 0) return new Frames();

    frames = await frames.query(Messaging._getMessageDetails, { messageId }, { message });
    if (frames.length === 0) return new Frames();

    const newFrames = frames.map(($) => ({ ...$, [conversationId]: ($[message] as MessageDoc).conversationId }));
    frames = await new Frames(...newFrames).query(Messaging._getConversation, { conversationId }, { conversation });

    return frames.filter(($) => {
      const conv = $[conversation] as ConversationDoc;
      const user = $[activeUser] as User;
      return conv && (conv.participant1 === user || conv.participant2 === user);
    });
  },
  then: actions([Requesting.respond, { request, message }]),
});

/**
 * Handles a request to get ALL conversations. Authenticated-only.
 */
export const GetAllConversationsRequest: Sync = ({ request, session, user, results }) => ({
  when: actions([Requesting.request, { path: "/Messaging/_getAllConversations", session }, { request }]),
  where: async (frames) => {
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) return new Frames();

    const queryResult = await Messaging._getAllConversations();
    if (frames.length > 0) {
      frames[0][results] = queryResult;
    }
    return frames;
  },
  then: actions([Requesting.respond, { request, results }]),
});

/**
 * Handles a request to get ALL messages. Authenticated-only.
 */
export const GetAllMessagesRequest: Sync = ({ request, session, user, results }) => ({
  when: actions([Requesting.request, { path: "/Messaging/_getAllMessages", session }, { request }]),
  where: async (frames) => {
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) return new Frames();

    const queryResult = await Messaging._getAllMessages();
    if (frames.length > 0) {
      frames[0][results] = queryResult;
    }
    return frames;
  },
  then: actions([Requesting.respond, { request, results }]),
});
```
