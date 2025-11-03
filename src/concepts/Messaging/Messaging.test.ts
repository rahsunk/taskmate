// // file: src/Messaging/MessagingConcept.test.ts
// import { assert, assertArrayIncludes, assertEquals } from "jsr:@std/assert";
// import { testDb } from "@utils/database.ts";
// import MessagingConcept from "./MessagingConcept.ts";
// import { ID } from "@utils/types.ts";

// // Redeclare interfaces for testing purposes since they are not exported by the concept
// interface ConversationDoc {
//   _id: ID;
//   participant1: ID;
//   participant2: ID;
// }

// interface MessageDoc {
//   _id: ID;
//   conversationId: ID;
//   sender: ID;
//   content: string;
//   sentAt: Date;
// }

// Deno.test("MessagingConcept: Operational Principle", async (t) => {
//   const [db, client] = await testDb();
//   const messagingConcept = new MessagingConcept(db);

//   const userAlice = "user:Alice" as ID;
//   const userBob = "user:Bob" as ID;

//   console.log("\n--- Testing Operational Principle ---");

//   // Trace: Alice and Bob establish a conversation.
//   let conversationId: ID;
//   await t.step(
//     "1. Establish a conversation between Alice and Bob",
//     async () => {
//       console.log(
//         `Action: createConversation({ user1: ${userAlice}, user2: ${userBob} })`,
//       );
//       const createResult = await messagingConcept.createConversation({
//         user1: userAlice,
//         user2: userBob,
//       });
//       assert(
//         "conversationId" in createResult,
//         `Expected conversationId but got error: ${
//           "error" in createResult ? createResult.error : "unknown"
//         }`,
//       );
//       conversationId = createResult.conversationId;
//       console.log(`Result: Created Conversation with ID: ${conversationId}`);

//       // Verify conversation exists with canonicalized participants
//       const getConvResult = await messagingConcept._getConversation({
//         conversationId,
//       });
//       assert(
//         Array.isArray(getConvResult),
//         `Expected array for _getConversation result`,
//       );
//       assertEquals(getConvResult.length, 1);
//       assertEquals((getConvResult[0] as ConversationDoc)._id, conversationId);
//       assertEquals(
//         (getConvResult[0] as ConversationDoc).participant1,
//         userAlice,
//       ); // Assuming sort order Alice, Bob
//       assertEquals((getConvResult[0] as ConversationDoc).participant2, userBob);
//       console.log(
//         "Verification: Conversation found with correct participants.",
//       );
//     },
//   );

//   // Trace: Alice sends a message.
//   let message1: MessageDoc;
//   await t.step("2. Alice sends a message to Bob", async () => {
//     const content = "Hi Bob, how are you?";
//     console.log(
//       `Action: sendMessage({ conversationId: ${conversationId}, sender: ${userAlice}, content: "${content}" })`,
//     );
//     const sendResult = await messagingConcept.sendMessage({
//       conversationId,
//       sender: userAlice,
//       content,
//     });
//     assert(
//       "message" in sendResult,
//       `Expected message but got error: ${
//         "error" in sendResult ? sendResult.error : "unknown"
//       }`,
//     );
//     message1 = sendResult.message;
//     console.log(`Result: Sent message with ID: ${message1._id}`);

//     // Verify message exists in conversation
//     const messages = await messagingConcept._getMessagesInConversation({
//       conversationId,
//     });
//     assert(
//       Array.isArray(messages),
//       `Expected array for _getMessagesInConversation result`,
//     );
//     assertEquals(messages.length, 1);
//     assertEquals((messages[0] as MessageDoc)._id, message1._id);
//     assertEquals((messages[0] as MessageDoc).sender, userAlice);
//     assertEquals((messages[0] as MessageDoc).content, content);
//     console.log(
//       "Verification: Message from Alice found in conversation history.",
//     );
//   });

//   // Trace: Bob sends a reply.
//   let message2: MessageDoc;
//   await t.step("3. Bob sends a reply to Alice", async () => {
//     const content = "I'm good, thanks Alice!";
//     console.log(
//       `Action: sendMessage({ conversationId: ${conversationId}, sender: ${userBob}, content: "${content}" })`,
//     );
//     const sendResult = await messagingConcept.sendMessage({
//       conversationId,
//       sender: userBob,
//       content,
//     });
//     assert(
//       "message" in sendResult,
//       `Expected message but got error: ${
//         "error" in sendResult ? sendResult.error : "unknown"
//       }`,
//     );
//     message2 = sendResult.message;
//     console.log(`Result: Sent message with ID: ${message2._id}`);

//     // Verify both messages exist and are in order
//     const messages = await messagingConcept._getMessagesInConversation({
//       conversationId,
//     });
//     assert(
//       Array.isArray(messages),
//       `Expected array for _getMessagesInConversation result`,
//     );
//     assertEquals(messages.length, 2);
//     assertEquals((messages[0] as MessageDoc)._id, message1._id);
//     assertEquals((messages[1] as MessageDoc)._id, message2._id);
//     assertEquals((messages[0] as MessageDoc).sender, userAlice);
//     assertEquals((messages[1] as MessageDoc).sender, userBob);
//     assertEquals((messages[1] as MessageDoc).content, content);
//     console.log(
//       "Verification: Both messages found in conversation history, in correct chronological order.",
//     );
//   });

//   // Trace: Both users can review the full history.
//   await t.step(
//     "4. Both users can review the full history of their exchanges",
//     async () => {
//       const aliceConversations = await messagingConcept
//         ._getConversationsForUser({ user: userAlice });
//       assert(
//         Array.isArray(aliceConversations),
//         `Expected array for _getConversationsForUser result`,
//       );
//       assertArrayIncludes(aliceConversations.map((c) => c._id), [
//         conversationId,
//       ]);
//       console.log(`Verification: Alice sees conversation ${conversationId}.`);

//       const bobConversations = await messagingConcept._getConversationsForUser({
//         user: userBob,
//       });
//       assert(
//         Array.isArray(bobConversations),
//         `Expected array for _getConversationsForUser result`,
//       );
//       assertArrayIncludes(bobConversations.map((c) => c._id), [conversationId]);
//       console.log(`Verification: Bob sees conversation ${conversationId}.`);

//       const aliceHistory = await messagingConcept._getMessagesInConversation({
//         conversationId,
//       });
//       assert(
//         Array.isArray(aliceHistory),
//         `Expected array for _getMessagesInConversation result`,
//       );
//       assertEquals(aliceHistory.length, 2);
//       console.log(
//         `Verification: Alice can access the full history of ${aliceHistory.length} messages.`,
//       );

//       const bobHistory = await messagingConcept._getMessagesInConversation({
//         conversationId,
//       });
//       assert(
//         Array.isArray(bobHistory),
//         `Expected array for _getMessagesInConversation result`,
//       );
//       assertEquals(bobHistory.length, 2);
//       console.log(
//         `Verification: Bob can access the full history of ${bobHistory.length} messages.`,
//       );
//     },
//   );

//   await client.close();
// });

// Deno.test("MessagingConcept: Action `createConversation` Scenarios", async (t) => {
//   const [db, client] = await testDb();
//   const messagingConcept = new MessagingConcept(db);

//   const userAlice = "user:Alice" as ID;
//   const userBob = "user:Bob" as ID;
//   const userCharlie = "user:Charlie" as ID;

//   console.log("\n--- Testing createConversation Scenarios ---");

//   await t.step("1. Create a conversation successfully", async () => {
//     console.log(
//       `Action: createConversation({ user1: ${userAlice}, user2: ${userBob} })`,
//     );
//     const createResult = await messagingConcept.createConversation({
//       user1: userAlice,
//       user2: userBob,
//     });
//     assert(
//       "conversationId" in createResult,
//       "Expected conversationId for successful creation.",
//     );
//     console.log(`Result: Conversation ID: ${createResult.conversationId}`);

//     const conversations = await messagingConcept._getAllConversations();
//     assertEquals(conversations.length, 1);
//     console.log("Verification: One conversation exists in total.");
//   });

//   await t.step(
//     "2. Attempt to create a conversation with yourself (should return error)",
//     async () => {
//       console.log(
//         `Action: createConversation({ user1: ${userAlice}, user2: ${userAlice} })`,
//       );
//       const createResult = await messagingConcept.createConversation({
//         user1: userAlice,
//         user2: userAlice,
//       });
//       assert(
//         "error" in createResult,
//         "Expected error when creating conversation with self.",
//       );
//       assertEquals(
//         createResult.error,
//         "Cannot create a conversation with yourself.",
//       );
//       console.log(`Result: Expected error: "${createResult.error}"`);

//       const conversations = await messagingConcept._getAllConversations();
//       assertEquals(
//         conversations.length,
//         1,
//         "No new conversation should be created.",
//       );
//       console.log("Verification: No new conversation was created.");
//     },
//   );

//   await t.step(
//     "3. Attempt to create a duplicate conversation (same users, different order - should return error)",
//     async () => {
//       console.log(
//         `Action: createConversation({ user1: ${userBob}, user2: ${userAlice} })`,
//       );
//       const createResult = await messagingConcept.createConversation({
//         user1: userBob,
//         user2: userAlice,
//       });
//       assert(
//         "error" in createResult,
//         "Expected error for duplicate conversation.",
//       );
//       assertEquals(
//         createResult.error,
//         "A conversation between these two users already exists.",
//       );
//       console.log(`Result: Expected error: "${createResult.error}"`);

//       const conversations = await messagingConcept._getAllConversations();
//       assertEquals(
//         conversations.length,
//         1,
//         "No new conversation should be created.",
//       );
//       console.log(
//         "Verification: No new conversation was created due to canonicalization.",
//       );
//     },
//   );

//   await t.step(
//     "4. Create another valid conversation (Alice and Charlie)",
//     async () => {
//       console.log(
//         `Action: createConversation({ user1: ${userAlice}, user2: ${userCharlie} })`,
//       );
//       const createResult = await messagingConcept.createConversation({
//         user1: userAlice,
//         user2: userCharlie,
//       });
//       assert(
//         "conversationId" in createResult,
//         "Expected conversationId for successful creation.",
//       );
//       console.log(`Result: Conversation ID: ${createResult.conversationId}`);

//       const conversations = await messagingConcept._getAllConversations();
//       assertEquals(conversations.length, 2);
//       console.log("Verification: Two conversations exist in total.");
//     },
//   );

//   await client.close();
// });

// Deno.test("MessagingConcept: Action `sendMessage` Scenarios", async (t) => {
//   const [db, client] = await testDb();
//   const messagingConcept = new MessagingConcept(db);

//   const userAlice = "user:Alice" as ID;
//   const userBob = "user:Bob" as ID;
//   const userCharlie = "user:Charlie" as ID;
//   const nonExistentId = "conv:NonExistent" as ID;

//   console.log("\n--- Testing sendMessage Scenarios ---");

//   // Setup: Create a conversation for testing
//   const createResult = await messagingConcept.createConversation({
//     user1: userAlice,
//     user2: userBob,
//   });
//   assert(
//     "conversationId" in createResult,
//     "Setup failed: Could not create conversation.",
//   );
//   const conversationId = createResult.conversationId;
//   console.log(
//     `Setup: Created conversation ${conversationId} between ${userAlice} and ${userBob}`,
//   );

//   await t.step("1. Send a message successfully", async () => {
//     const content = "Test message from Alice.";
//     console.log(
//       `Action: sendMessage({ conversationId: ${conversationId}, sender: ${userAlice}, content: "${content}" })`,
//     );
//     const sendResult = await messagingConcept.sendMessage({
//       conversationId,
//       sender: userAlice,
//       content,
//     });
//     assert("message" in sendResult, "Expected message for successful send.");
//     assertEquals(sendResult.message.sender, userAlice);
//     assertEquals(sendResult.message.content, content);
//     console.log(`Result: Message sent with ID: ${sendResult.message._id}`);

//     const messages = await messagingConcept._getMessagesInConversation({
//       conversationId,
//     });
//     assert(
//       Array.isArray(messages),
//       `Expected array for _getMessagesInConversation result`,
//     );
//     assertEquals(messages.length, 1);
//     console.log("Verification: Message found in conversation.");
//   });

//   await t.step(
//     "2. Attempt to send an empty message (should return error)",
//     async () => {
//       const content = "";
//       console.log(
//         `Action: sendMessage({ conversationId: ${conversationId}, sender: ${userBob}, content: "${content}" })`,
//       );
//       const sendResult = await messagingConcept.sendMessage({
//         conversationId,
//         sender: userBob,
//         content,
//       });
//       assert("error" in sendResult, "Expected error for empty content.");
//       assertEquals(sendResult.error, "Message content cannot be empty.");
//       console.log(`Result: Expected error: "${sendResult.error}"`);

//       const messages = await messagingConcept._getMessagesInConversation({
//         conversationId,
//       });
//       assert(
//         Array.isArray(messages),
//         `Expected array for _getMessagesInConversation result`,
//       );
//       assertEquals(messages.length, 1, "No new message should be added.");
//       console.log("Verification: No new message was added.");
//     },
//   );

//   await t.step(
//     "3. Attempt to send a message with only whitespace (should return error)",
//     async () => {
//       const content = "   ";
//       console.log(
//         `Action: sendMessage({ conversationId: ${conversationId}, sender: ${userBob}, content: "${content}" })`,
//       );
//       const sendResult = await messagingConcept.sendMessage({
//         conversationId,
//         sender: userBob,
//         content,
//       });
//       assert(
//         "error" in sendResult,
//         "Expected error for whitespace-only content.",
//       );
//       assertEquals(sendResult.error, "Message content cannot be empty.");
//       console.log(`Result: Expected error: "${sendResult.error}"`);

//       const messages = await messagingConcept._getMessagesInConversation({
//         conversationId,
//       });
//       assert(
//         Array.isArray(messages),
//         `Expected array for _getMessagesInConversation result`,
//       );
//       assertEquals(messages.length, 1, "No new message should be added.");
//       console.log("Verification: No new message was added.");
//     },
//   );

//   await t.step(
//     "4. Attempt to send a message to a non-existent conversation (should return error)",
//     async () => {
//       const content = "Message to nowhere.";
//       console.log(
//         `Action: sendMessage({ conversationId: ${nonExistentId}, sender: ${userAlice}, content: "${content}" })`,
//       );
//       const sendResult = await messagingConcept.sendMessage({
//         conversationId: nonExistentId,
//         sender: userAlice,
//         content,
//       });
//       assert(
//         "error" in sendResult,
//         "Expected error for non-existent conversation.",
//       );
//       assertEquals(
//         sendResult.error,
//         `Conversation with ID ${nonExistentId} not found.`,
//       );
//       console.log(`Result: Expected error: "${sendResult.error}"`);
//     },
//   );

//   await t.step(
//     "5. Attempt to send a message by a non-participant (should return error)",
//     async () => {
//       const content = "I am not part of this chat.";
//       console.log(
//         `Action: sendMessage({ conversationId: ${conversationId}, sender: ${userCharlie}, content: "${content}" })`,
//       );
//       const sendResult = await messagingConcept.sendMessage({
//         conversationId,
//         sender: userCharlie,
//         content,
//       });
//       assert(
//         "error" in sendResult,
//         "Expected error for non-participant sender.",
//       );
//       assertEquals(
//         sendResult.error,
//         "Sender is not a participant in this conversation.",
//       );
//       console.log(`Result: Expected error: "${sendResult.error}"`);

//       const messages = await messagingConcept._getMessagesInConversation({
//         conversationId,
//       });
//       assert(
//         Array.isArray(messages),
//         `Expected array for _getMessagesInConversation result`,
//       );
//       assertEquals(messages.length, 1, "No new message should be added.");
//       console.log("Verification: No new message was added by non-participant.");
//     },
//   );

//   await client.close();
// });

// Deno.test("MessagingConcept: Query Scenarios", async (t) => {
//   const [db, client] = await testDb();
//   const messagingConcept = new MessagingConcept(db);

//   const userAlice = "user:Alice" as ID;
//   const userBob = "user:Bob" as ID;
//   const userCharlie = "user:Charlie" as ID;
//   const userDavid = "user:David" as ID;

//   console.log("\n--- Testing Query Scenarios ---");

//   // Setup: Create two conversations and some messages
//   const createConv1Result = await messagingConcept.createConversation({
//     user1: userAlice,
//     user2: userBob,
//   });
//   assert("conversationId" in createConv1Result, "Setup failed.");
//   const conv1Id = createConv1Result.conversationId;
//   await messagingConcept.sendMessage({
//     conversationId: conv1Id,
//     sender: userAlice,
//     content: "Hi Bob (from Conv1)",
//   });
//   const sendBobConv1Result = await messagingConcept.sendMessage({
//     conversationId: conv1Id,
//     sender: userBob,
//     content: "Hi Alice (from Conv1)",
//   });
//   assert("message" in sendBobConv1Result, "Setup failed.");
//   const msgBobConv1Id = sendBobConv1Result.message._id;

//   const createConv2Result = await messagingConcept.createConversation({
//     user1: userAlice,
//     user2: userCharlie,
//   });
//   assert("conversationId" in createConv2Result, "Setup failed.");
//   const conv2Id = createConv2Result.conversationId;
//   await messagingConcept.sendMessage({
//     conversationId: conv2Id,
//     sender: userAlice,
//     content: "Hey Charlie (from Conv2)",
//   });
//   const sendCharlieConv2Result = await messagingConcept.sendMessage({
//     conversationId: conv2Id,
//     sender: userCharlie,
//     content: "Hey Alice (from Conv2)",
//   });
//   assert("message" in sendCharlieConv2Result, "Setup failed.");
//   const msgCharlieConv2Id = sendCharlieConv2Result.message._id;

//   // Setup: Create an empty conversation
//   const createEmptyConvResult = await messagingConcept.createConversation({
//     user1: userDavid,
//     user2: userBob,
//   });
//   assert(
//     "conversationId" in createEmptyConvResult,
//     "Setup failed for empty conv.",
//   );
//   const emptyConvId = createEmptyConvResult.conversationId;

//   console.log("Setup complete: 3 conversations, 4 messages.");

//   await t.step("1. _getConversation for an existing conversation", async () => {
//     console.log(`Query: _getConversation({ conversationId: ${conv1Id} })`);
//     const convResult = await messagingConcept._getConversation({
//       conversationId: conv1Id,
//     });
//     assert(
//       Array.isArray(convResult),
//       `Expected array for _getConversation result`,
//     );
//     assertEquals(convResult.length, 1);
//     assertEquals((convResult[0] as ConversationDoc)._id, conv1Id);
//     assertEquals((convResult[0] as ConversationDoc).participant1, userAlice);
//     assertEquals((convResult[0] as ConversationDoc).participant2, userBob);
//     console.log("Result: Found conversation 1 details.");
//   });

//   await t.step(
//     "2. _getConversation for a non-existent conversation (should return error)",
//     async () => {
//       const nonExistentId = "conv:nonexistent" as ID;
//       console.log(
//         `Query: _getConversation({ conversationId: ${nonExistentId} })`,
//       );
//       const convResult = await messagingConcept._getConversation({
//         conversationId: nonExistentId,
//       });
//       assert(
//         "error" in convResult,
//         "Expected error for non-existent conversation.",
//       );
//       assertEquals(
//         convResult.error,
//         `Conversation with ID ${nonExistentId} not found.`,
//       );
//       console.log(`Result: Expected error: "${convResult.error}"`);
//     },
//   );

//   await t.step(
//     "3. _getMessagesInConversation for an existing conversation",
//     async () => {
//       console.log(
//         `Query: _getMessagesInConversation({ conversationId: ${conv1Id} })`,
//       );
//       const messages = await messagingConcept._getMessagesInConversation({
//         conversationId: conv1Id,
//       });
//       assert(
//         Array.isArray(messages),
//         `Expected array for _getMessagesInConversation result`,
//       );
//       assertEquals(messages.length, 2);
//       assertEquals((messages[0] as MessageDoc).sender, userAlice);
//       assertEquals((messages[1] as MessageDoc).sender, userBob);
//       console.log(
//         "Result: Found 2 messages in conversation 1, ordered by time.",
//       );
//     },
//   );

//   await t.step(
//     "4. _getMessagesInConversation for an empty conversation (should return empty array)",
//     async () => {
//       console.log(
//         `Query: _getMessagesInConversation({ conversationId: ${emptyConvId} })`,
//       );
//       const messages = await messagingConcept._getMessagesInConversation({
//         conversationId: emptyConvId,
//       });
//       assert(
//         Array.isArray(messages),
//         `Expected array for _getMessagesInConversation result`,
//       );
//       assertEquals(messages.length, 0);
//       console.log("Result: Found 0 messages in the empty conversation.");
//     },
//   );

//   await t.step(
//     "5. _getConversationsForUser for Alice (should find two conversations)",
//     async () => {
//       console.log(`Query: _getConversationsForUser({ user: ${userAlice} })`);
//       const conversations = await messagingConcept._getConversationsForUser({
//         user: userAlice,
//       });
//       assert(
//         Array.isArray(conversations),
//         `Expected array for _getConversationsForUser result`,
//       );
//       assertEquals(conversations.length, 2);
//       assertArrayIncludes(conversations.map((c) => c._id), [conv1Id, conv2Id]);
//       console.log("Result: Alice found in 2 conversations.");
//     },
//   );

//   await t.step(
//     "6. _getConversationsForUser for David (should find one conversation)",
//     async () => {
//       console.log(`Query: _getConversationsForUser({ user: ${userDavid} })`);
//       const conversations = await messagingConcept._getConversationsForUser({
//         user: userDavid,
//       });
//       assert(
//         Array.isArray(conversations),
//         `Expected array for _getConversationsForUser result`,
//       );
//       assertEquals(conversations.length, 1);
//       assertArrayIncludes(conversations.map((c) => c._id), [emptyConvId]);
//       console.log("Result: David found in 1 conversation.");
//     },
//   );

//   await t.step(
//     "7. _getConversationsForUser for a user with no conversations (should return empty array)",
//     async () => {
//       const userZoe = "user:Zoe" as ID;
//       console.log(`Query: _getConversationsForUser({ user: ${userZoe} })`);
//       const conversations = await messagingConcept._getConversationsForUser({
//         user: userZoe,
//       });
//       assert(
//         Array.isArray(conversations),
//         `Expected array for _getConversationsForUser result`,
//       );
//       assertEquals(conversations.length, 0);
//       console.log("Result: Zoe found in 0 conversations.");
//     },
//   );

//   await t.step(
//     "8. _getAllConversations (should find all three conversations)",
//     async () => {
//       console.log(`Query: _getAllConversations()`);
//       const allConversations = await messagingConcept._getAllConversations();
//       assertEquals(allConversations.length, 3); // conv1, conv2, emptyConvId
//       console.log("Result: Found all 3 conversations.");
//     },
//   );

//   await t.step("9. _getMessageDetails for an existing message", async () => {
//     console.log(`Query: _getMessageDetails({ messageId: ${msgBobConv1Id} })`);
//     const msgDetails = await messagingConcept._getMessageDetails({
//       messageId: msgBobConv1Id,
//     });
//     assert(
//       Array.isArray(msgDetails),
//       `Expected array for _getMessageDetails result`,
//     );
//     assertEquals(msgDetails.length, 1);
//     assertEquals((msgDetails[0] as MessageDoc)._id, msgBobConv1Id);
//     assertEquals((msgDetails[0] as MessageDoc).sender, userBob);
//     assertEquals(
//       (msgDetails[0] as MessageDoc).content,
//       "Hi Alice (from Conv1)",
//     );
//     console.log("Result: Found message details for message from Bob in Conv1.");
//   });

//   await t.step(
//     "10. _getMessageDetails for a non-existent message (should return error)",
//     async () => {
//       const nonExistentMessageId = "msg:nonexistent" as ID;
//       console.log(
//         `Query: _getMessageDetails({ messageId: ${nonExistentMessageId} })`,
//       );
//       const msgDetails = await messagingConcept._getMessageDetails({
//         messageId: nonExistentMessageId,
//       });
//       assert("error" in msgDetails, "Expected error for non-existent message.");
//       assertEquals(
//         msgDetails.error,
//         `Message with ID ${nonExistentMessageId} not found.`,
//       );
//       console.log(`Result: Expected error: "${msgDetails.error}"`);
//     },
//   );

//   await t.step("11. _getAllMessages (should find all 4 messages)", async () => {
//     console.log(`Query: _getAllMessages()`);
//     const allMessages = await messagingConcept._getAllMessages();
//     assertEquals(allMessages.length, 4);
//     assertArrayIncludes(allMessages.map((m) => m.sender), [
//       userAlice,
//       userBob,
//       userAlice,
//       userCharlie,
//     ]);
//     console.log("Result: Found all 4 messages.");
//   });

//   await client.close();
// });
