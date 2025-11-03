---
timestamp: 'Mon Nov 03 2025 15:05:31 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251103_150531.058e3c6b.md]]'
content_id: 33d390aa1f237742811d5c5f58937238822611fc485b51e2ef43af17783f0df4
---

# file: src/syncs/Messaging.sync.ts

```typescript
import { actions, Sync, Frames } from "@engine";
import { Requesting, Sessioning, Messaging } from "@concepts";

// --- Create Conversation --- //

/**
 * Handles an incoming request to create a new conversation.
 * It authenticates the user making the request via their session.
 * The authenticated user becomes participant 1 (`user1`).
 * The other participant (`user2`) is specified in the request body.
 */
export const CreateConversationRequest: Sync = ({ request, session, user1, user2 }) => ({
  when: actions([
    Requesting.request,
    { path: "/Messaging/createConversation", session, user2 }, // user2 is the other participant
    { request },
  ]),
  where: (frames) => frames.query(Sessioning._getUser, { session }, { user: user1 }), // Authenticate session, get user1
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
  when: actions([
    Requesting.request,
    { path: "/Messaging/sendMessage", session, conversationId, content },
    { request },
  ]),
  where: (frames) => frames.query(Sessioning._getUser, { session }, { user: sender }), // Authenticate session, get sender
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
  when: actions([
    Requesting.request,
    { path: "/Messaging/_getConversation", session, conversationId },
    { request },
  ]),
  where: async (frames) => {
    // 1. Authenticate user
    frames = await frames.query(Sessioning._getUser, { session }, { user: activeUser });
    if (frames.length === 0) return new Frames(); // Invalid session

    // 2. Fetch the conversation
    frames = await frames.query(Messaging._getConversation, { conversationId }, { conversation });

    // 3. Authorize: ensure the active user is a participant
    return frames.filter(($) => {
      const conv = $[conversation];
      const user = $[activeUser];
      return conv.participant1 === user || conv.participant2 === user;
    });
  },
  then: actions([Requesting.respond, { request, conversation }]),
});

/**
 * Handles a request to get all messages in a conversation.
 * Requires a valid session and that the logged-in user is a participant.
 */
export const GetMessagesInConversationRequest: Sync = ({ request, session, activeUser, conversationId, conversation, messages }) => ({
  when: actions([
    Requesting.request,
    { path: "/Messaging/_getMessagesInConversation", session, conversationId },
    { request },
  ]),
  where: async (frames) => {
    // 1. Authenticate user
    frames = await frames.query(Sessioning._getUser, { session }, { user: activeUser });
    if (frames.length === 0) return new Frames();

    // 2. Fetch the conversation to verify participation
    frames = await frames.query(Messaging._getConversation, { conversationId }, { conversation });

    // 3. Authorize user against the conversation
    frames = frames.filter(($) => {
      const conv = $[conversation];
      const user = $[activeUser];
      return conv.participant1 === user || conv.participant2 === user;
    });
    if (frames.length === 0) return new Frames(); // Not a participant

    // 4. If authorized, fetch the messages
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
  when: actions([
    Requesting.request,
    { path: "/Messaging/_getConversationsForUser", session, user: userToGet },
    { request },
  ]),
  where: async (frames) => {
    // 1. Authenticate user
    frames = await frames.query(Sessioning._getUser, { session }, { user: activeUser });

    // 2. Authorize: logged-in user must be the same as the user they are querying for
    frames = frames.filter(($) => $[activeUser] === $[userToGet]);
    if (frames.length === 0) return new Frames(); // Unauthorized attempt

    // 3. If authorized, fetch the conversations
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
  when: actions([
    Requesting.request,
    { path: "/Messaging/_getMessageDetails", session, messageId },
    { request },
  ]),
  where: async (frames) => {
    // 1. Authenticate user
    frames = await frames.query(Sessioning._getUser, { session }, { user: activeUser });
    if (frames.length === 0) return new Frames();

    // 2. Fetch message details
    frames = await frames.query(Messaging._getMessageDetails, { messageId }, { message });
    if (frames.length === 0) return new Frames();

    // 3. Extract conversationId from message to fetch the conversation for authorization
    const newFrames = frames.map(($) => ({ ...$, [conversationId]: $[message].conversationId }));
    frames = await new Frames(...newFrames).query(Messaging._getConversation, { conversationId }, { conversation });

    // 4. Authorize: ensure active user is a participant
    return frames.filter(($) => {
      const conv = $[conversation];
      const user = $[activeUser];
      return conv.participant1 === user || conv.participant2 === user;
    });
  },
  // Respond with the original message details, not the conversation used for auth
  then: actions([Requesting.respond, { request, message }]),
});

/**
 * Handles a request to get ALL conversations.
 * This is a sensitive query that should ideally be restricted to admins.
 * For now, it just requires any valid user session.
 */
export const GetAllConversationsRequest: Sync = ({ request, session, user, results }) => ({
  when: actions([
    Requesting.request,
    { path: "/Messaging/_getAllConversations", session },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) return new Frames(); // Not authenticated

    // Manually call query and attach results to the frame
    const queryResult = await Messaging._getAllConversations();
    if (frames.length > 0) { // Check again in case of race conditions
      frames[0][results] = queryResult;
    }
    return frames;
  },
  then: actions([Requesting.respond, { request, results }]),
});

/**
 * Handles a request to get ALL messages.
 * This is a sensitive query that should ideally be restricted to admins.
 * For now, it just requires any valid user session.
 */
export const GetAllMessagesRequest: Sync = ({ request, session, user, results }) => ({
  when: actions([
    Requesting.request,
    { path: "/Messaging/_getAllMessages", session },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) return new Frames(); // Not authenticated

    // Manually call query and attach results to the frame
    const queryResult = await Messaging._getAllMessages();
    if (frames.length > 0) {
      frames[0][results] = queryResult;
    }
    return frames;
  },
  then: actions([Requesting.respond, { request, results }]),
});
```
