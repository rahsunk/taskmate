Check file:///Users/rahsunkomatsuzaki-fields/Desktop/MIT/academic/Y3/Fall/6.1040/taskmate/src/concepts/Messaging/Messaging.test.ts
running 4 tests from ./src/concepts/Messaging/Messaging.test.ts
MessagingConcept: Operational Principle ...
------- output -------

--- Testing Operational Principle ---
----- output end -----
  1. Establish a conversation between Alice and Bob ...
------- output -------
Action: createConversation({ user1: user:Alice, user2: user:Bob })
Result: Created Conversation with ID: 019a3cf0-d693-7d66-a41e-09916a3d2855
Verification: Conversation found with correct participants.
----- output end -----
  1. Establish a conversation between Alice and Bob ... ok (98ms)
  2. Alice sends a message to Bob ...
------- output -------
Action: sendMessage({ conversationId: 019a3cf0-d693-7d66-a41e-09916a3d2855, sender: user:Alice, content: "Hi Bob, how are you?" })
Result: Sent message with ID: 019a3cf0-d6f4-7bb8-99e3-28498f808111
Verification: Message from Alice found in conversation history.
----- output end -----
  2. Alice sends a message to Bob ... ok (123ms)
  3. Bob sends a reply to Alice ...
------- output -------
Action: sendMessage({ conversationId: 019a3cf0-d693-7d66-a41e-09916a3d2855, sender: user:Bob, content: "I'm good, thanks Alice!" })
Result: Sent message with ID: 019a3cf0-d770-79b1-8627-eb60bfdcaa32
Verification: Both messages found in conversation history, in correct chronological order.
----- output end -----
  3. Bob sends a reply to Alice ... ok (81ms)
  4. Both users can review the full history of their exchanges ...
------- output -------
Verification: Alice sees conversation 019a3cf0-d693-7d66-a41e-09916a3d2855.
Verification: Bob sees conversation 019a3cf0-d693-7d66-a41e-09916a3d2855.
Verification: Alice can access the full history of 2 messages.
Verification: Bob can access the full history of 2 messages.
----- output end -----
  4. Both users can review the full history of their exchanges ... ok (113ms)
MessagingConcept: Operational Principle ... ok (1s)
MessagingConcept: Action `createConversation` Scenarios ...
------- output -------

--- Testing createConversation Scenarios ---
----- output end -----
  1. Create a conversation successfully ...
------- output -------
Action: createConversation({ user1: user:Alice, user2: user:Bob })
Result: Conversation ID: 019a3cf0-da36-7a77-b580-a78dd4b3afef
Verification: One conversation exists in total.
----- output end -----
  1. Create a conversation successfully ... ok (66ms)
  2. Attempt to create a conversation with yourself (should return error) ...
------- output -------
Action: createConversation({ user1: user:Alice, user2: user:Alice })
Result: Expected error: "Cannot create a conversation with yourself."
Verification: No new conversation was created.
----- output end -----
  2. Attempt to create a conversation with yourself (should return error) ... ok (17ms)
  3. Attempt to create a duplicate conversation (same users, different order - should return error) ...
------- output -------
Action: createConversation({ user1: user:Bob, user2: user:Alice })
Result: Expected error: "A conversation between these two users already exists."
Verification: No new conversation was created due to canonicalization.
----- output end -----
  3. Attempt to create a duplicate conversation (same users, different order - should return error) ... ok (33ms)
  4. Create another valid conversation (Alice and Charlie) ...
------- output -------
Action: createConversation({ user1: user:Alice, user2: user:Charlie })
Result: Conversation ID: 019a3cf0-daaa-7fb4-8221-cc50e2e1162f
Verification: Two conversations exist in total.
----- output end -----
  4. Create another valid conversation (Alice and Charlie) ... ok (54ms)
MessagingConcept: Action `createConversation` Scenarios ... ok (686ms)
MessagingConcept: Action `sendMessage` Scenarios ...
------- output -------

--- Testing sendMessage Scenarios ---
Setup: Created conversation 019a3cf0-dcfc-71c5-9e2a-08702112b275 between user:Alice and user:Bob
----- output end -----
  1. Send a message successfully ...
------- output -------
Action: sendMessage({ conversationId: 019a3cf0-dcfc-71c5-9e2a-08702112b275, sender: user:Alice, content: "Test message from Alice." })
Result: Message sent with ID: 019a3cf0-dd2e-77b7-bc61-9b31a4f28eed
Verification: Message found in conversation.
----- output end -----
  1. Send a message successfully ... ok (86ms)
  2. Attempt to send an empty message (should return error) ...
------- output -------
Action: sendMessage({ conversationId: 019a3cf0-dcfc-71c5-9e2a-08702112b275, sender: user:Bob, content: "" })
Result: Expected error: "Message content cannot be empty."
Verification: No new message was added.
----- output end -----
  2. Attempt to send an empty message (should return error) ... ok (34ms)
  3. Attempt to send a message with only whitespace (should return error) ...
------- output -------
Action: sendMessage({ conversationId: 019a3cf0-dcfc-71c5-9e2a-08702112b275, sender: user:Bob, content: "   " })
Result: Expected error: "Message content cannot be empty."
Verification: No new message was added.
----- output end -----
  3. Attempt to send a message with only whitespace (should return error) ... ok (35ms)
  4. Attempt to send a message to a non-existent conversation (should return error) ...
------- output -------
Action: sendMessage({ conversationId: conv:NonExistent, sender: user:Alice, content: "Message to nowhere." })
Result: Expected error: "Conversation with ID conv:NonExistent not found."
----- output end -----
  4. Attempt to send a message to a non-existent conversation (should return error) ... ok (17ms)
  5. Attempt to send a message by a non-participant (should return error) ...
------- output -------
Action: sendMessage({ conversationId: 019a3cf0-dcfc-71c5-9e2a-08702112b275, sender: user:Charlie, content: "I am not part of this chat." })
Result: Expected error: "Sender is not a participant in this conversation."
Verification: No new message was added by non-participant.
----- output end -----
  5. Attempt to send a message by a non-participant (should return error) ... ok (51ms)
MessagingConcept: Action `sendMessage` Scenarios ... ok (810ms)
MessagingConcept: Query Scenarios ...
------- output -------

--- Testing Query Scenarios ---
Setup complete: 3 conversations, 4 messages.
----- output end -----
  1. _getConversation for an existing conversation ...
------- output -------
Query: _getConversation({ conversationId: 019a3cf0-e042-7470-b86a-d093ebdccbb9 })
Result: Found conversation 1 details.
----- output end -----
  1. _getConversation for an existing conversation ... ok (20ms)
  2. _getConversation for a non-existent conversation (should return error) ...
------- output -------
Query: _getConversation({ conversationId: conv:nonexistent })
Result: Expected error: "Conversation with ID conv:nonexistent not found."
----- output end -----
  2. _getConversation for a non-existent conversation (should return error) ... ok (20ms)
  3. _getMessagesInConversation for an existing conversation ...
------- output -------
Query: _getMessagesInConversation({ conversationId: 019a3cf0-e042-7470-b86a-d093ebdccbb9 })
Result: Found 2 messages in conversation 1, ordered by time.
----- output end -----
  3. _getMessagesInConversation for an existing conversation ... ok (39ms)
  4. _getMessagesInConversation for an empty conversation (should return empty array) ...
------- output -------
Query: _getMessagesInConversation({ conversationId: 019a3cf0-e153-7996-9945-3b814561e351 })
Result: Found 0 messages in the empty conversation.
----- output end -----
  4. _getMessagesInConversation for an empty conversation (should return empty array) ... ok (38ms)
  5. _getConversationsForUser for Alice (should find two conversations) ...
------- output -------
Query: _getConversationsForUser({ user: user:Alice })
Result: Alice found in 2 conversations.
----- output end -----
  5. _getConversationsForUser for Alice (should find two conversations) ... ok (33ms)
  6. _getConversationsForUser for David (should find one conversation) ...
------- output -------
Query: _getConversationsForUser({ user: user:David })
Result: David found in 1 conversation.
----- output end -----
  6. _getConversationsForUser for David (should find one conversation) ... ok (19ms)
  7. _getConversationsForUser for a user with no conversations (should return empty array) ...
------- output -------
Query: _getConversationsForUser({ user: user:Zoe })
Result: Zoe found in 0 conversations.
----- output end -----
  7. _getConversationsForUser for a user with no conversations (should return empty array) ... ok (19ms)
  8. _getAllConversations (should find all three conversations) ...
------- output -------
Query: _getAllConversations()
Result: Found all 3 conversations.
----- output end -----
  8. _getAllConversations (should find all three conversations) ... ok (18ms)
  9. _getMessageDetails for an existing message ...
------- output -------
Query: _getMessageDetails({ messageId: 019a3cf0-e0b0-7e05-be03-d8a5d85cd5bd })
Result: Found message details for message from Bob in Conv1.
----- output end -----
  9. _getMessageDetails for an existing message ... ok (18ms)
  10. _getMessageDetails for a non-existent message (should return error) ...
------- output -------
Query: _getMessageDetails({ messageId: msg:nonexistent })
Result: Expected error: "Message with ID msg:nonexistent not found."
----- output end -----
  10. _getMessageDetails for a non-existent message (should return error) ... ok (18ms)
  11. _getAllMessages (should find all 4 messages) ...
------- output -------
Query: _getAllMessages()
Result: Found all 4 messages.
----- output end -----
  11. _getAllMessages (should find all 4 messages) ... ok (19ms)
MessagingConcept: Query Scenarios ... ok (1s)

ok | 4 passed (24 steps) | 0 failed (3s)
