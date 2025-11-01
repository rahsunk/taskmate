---
timestamp: 'Fri Oct 31 2025 20:52:37 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251031_205237.6e3755a3.md]]'
content_id: b506b72b6f7305b2f72358cc938d5de406ac2b92d66241e93366e0bfa27005ee
---

# response:

```typescript
// file: src/Messaging/MessagingConcept.test.ts
import { assertEquals, assertNotEquals, assertArrayIncludes } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import MessagingConcept from "@concepts/Messaging/MessagingConcept.ts";
import { ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts"; // Assuming freshID is needed for dummy IDs

Deno.test("Messaging Concept Tests", async (test) => {
  const [db, client] = await testDb();
  const messagingConcept = new MessagingConcept(db);

  const userAlice: ID = "user:Alice" as ID;
  const userBob: ID = "user:Bob" as ID;
  const userCharlie: ID = "user:Charlie" as ID; // For non-participant tests

  console.log("--- Starting Messaging Concept Tests ---");

  // Test 1: Operational Principle Trace
  await test.step("Operational Principle: Two users exchange messages", async () => {
    console.log("\n--- Trace: Operational Principle ---");

    // 1. Create Conversation
    console.log(`Action: createConversation(${userAlice}, ${userBob})`);
    const createResult = await messagingConcept.createConversation({ user1: userAlice, user2: userBob });
    assertNotEquals("error" in createResult, true, `createConversation should not return an error: ${createResult.error}`);
    const { conversationId } = createResult as { conversationId: ID };
    assertEquals(typeof conversationId, "string");
    console.log(`  Output: New Conversation ID: ${conversationId}`);

    // Verify conversation exists
    const getConvResult = await messagingConcept._getConversation({ conversationId });
    assertNotEquals("error" in getConvResult, true, `_getConversation should not return an error: ${getConvResult.error}`);
    const conversations = getConvResult as any[];
    assertEquals(conversations.length, 1);
    const createdConversation = conversations[0];
    assertEquals(createdConversation._id, conversationId);
    console.log(`  Query: Conversation ${conversationId} found.`);

    // 2. Alice sends a message
    const messageContent1 = "Hello Bob, how are you?";
    console.log(`Action: sendMessage(${conversationId}, ${userAlice}, "${messageContent1}")`);
    const sendMessageResult1 = await messagingConcept.sendMessage({
      conversationId,
      sender: userAlice,
      content: messageContent1,
    });
    assertNotEquals("error" in sendMessageResult1, true, `sendMessage should not return an error: ${sendMessageResult1.error}`);
    const { message: message1 } = sendMessageResult1 as { message: any };
    assertEquals(message1.sender, userAlice);
    assertEquals(message1.content, messageContent1);
    console.log(`  Output: Message 1 sent by ${userAlice}: "${message1.content}"`);

    // 3. Bob sends a reply
    const messageContent2 = "I'm doing great, Alice! Thanks for asking.";
    console.log(`Action: sendMessage(${conversationId}, ${userBob}, "${messageContent2}")`);
    const sendMessageResult2 = await messagingConcept.sendMessage({
      conversationId,
      sender: userBob,
      content: messageContent2,
    });
    assertNotEquals("error" in sendMessageResult2, true, `sendMessage should not return an error: ${sendMessageResult2.error}`);
    const { message: message2 } = sendMessageResult2 as { message: any };
    assertEquals(message2.sender, userBob);
    assertEquals(message2.content, messageContent2);
    console.log(`  Output: Message 2 sent by ${userBob}: "${message2.content}"`);

    // 4. Both users review the history (via _getMessagesInConversation)
    console.log(`Query: _getMessagesInConversation(${conversationId})`);
    const messagesInConvResult = await messagingConcept._getMessagesInConversation({ conversationId });
    assertNotEquals("error" in messagesInConvResult, true, `_getMessagesInConversation should not return an error: ${messagesInConvResult.error}`);
    const messagesInConversation = messagesInConvResult as any[];
    assertEquals(messagesInConversation.length, 2);
    assertEquals(messagesInConversation[0].content, messageContent1);
    assertEquals(messagesInConversation[1].content, messageContent2);
    console.log(`  Output: Conversation history retrieved. Messages:`, messagesInConversation.map(m => m.content));

    // 5. Verify conversations for users
    console.log(`Query: _getConversationsForUser(${userAlice})`);
    const aliceConversations = await messagingConcept._getConversationsForUser({ user: userAlice });
    assertEquals(aliceConversations.length, 1);
    assertEquals(aliceConversations[0]._id, conversationId);
    console.log(`  Output: ${userAlice} has 1 conversation.`);

    console.log(`Query: _getConversationsForUser(${userBob})`);
    const bobConversations = await messagingConcept._getConversationsForUser({ user: userBob });
    assertEquals(bobConversations.length, 1);
    assertEquals(bobConversations[0]._id, conversationId);
    console.log(`  Output: ${userBob} has 1 conversation.`);

    console.log("--- End Trace: Operational Principle ---");
  });

  // Test 2: createConversation - Error cases
  await test.step("createConversation: Error cases", async () => {
    console.log("\n--- Testing createConversation Error Cases ---");

    // Attempt to create conversation with self
    console.log(`Action: createConversation(${userAlice}, ${userAlice})`);
    const selfConversationResult = await messagingConcept.createConversation({ user1: userAlice, user2: userAlice });
    assertEquals("error" in selfConversationResult, true);
    assertEquals((selfConversationResult as { error: string }).error, "Cannot create a conversation with yourself.");
    console.log(`  Output (expected error): ${selfConversationResult.error}`);

    // Attempt to create duplicate conversation (userA, userBob)
    console.log(`Action: createConversation(${userAlice}, ${userBob}) (duplicate)`);
    const duplicateConversationResult = await messagingConcept.createConversation({ user1: userAlice, user2: userBob });
    assertEquals("error" in duplicateConversationResult, true);
    assertEquals((duplicateConversationResult as { error: string }).error, "A conversation between these two users already exists.");
    console.log(`  Output (expected error): ${duplicateConversationResult.error}`);

    // Attempt to create duplicate conversation (userBob, userA) - canonicalization check
    console.log(`Action: createConversation(${userBob}, ${userAlice}) (duplicate - reversed order)`);
    const reversedDuplicateResult = await messagingConcept.createConversation({ user1: userBob, user2: userAlice });
    assertEquals("error" in reversedDuplicateResult, true);
    assertEquals((reversedDuplicateResult as { error: string }).error, "A conversation between these two users already exists.");
    console.log(`  Output (expected error): ${reversedDuplicateResult.error}`);

    console.log("--- End createConversation Error Cases ---");
  });

  // Test 3: sendMessage - Error cases
  await test.step("sendMessage: Error cases", async () => {
    console.log("\n--- Testing sendMessage Error Cases ---");

    // Create a fresh conversation for this test
    const createResult = await messagingConcept.createConversation({ user1: userAlice, user2: userCharlie });
    assertNotEquals("error" in createResult, true);
    const { conversationId: newConvId } = createResult as { conversationId: ID };
    console.log(`  New conversation for error testing: ${newConvId}`);

    // Send message with empty content
    console.log(`Action: sendMessage(${newConvId}, ${userAlice}, "") (empty content)`);
    const emptyContentResult = await messagingConcept.sendMessage({
      conversationId: newConvId,
      sender: userAlice,
      content: "",
    });
    assertEquals("error" in emptyContentResult, true);
    assertEquals((emptyContentResult as { error: string }).error, "Message content cannot be empty.");
    console.log(`  Output (expected error): ${emptyContentResult.error}`);

    // Send message with only whitespace content
    console.log(`Action: sendMessage(${newConvId}, ${userAlice}, "   ") (whitespace content)`);
    const whitespaceContentResult = await messagingConcept.sendMessage({
      conversationId: newConvId,
      sender: userAlice,
      content: "   ",
    });
    assertEquals("error" in whitespaceContentResult, true);
    assertEquals((whitespaceContentResult as { error: string }).error, "Message content cannot be empty.");
    console.log(`  Output (expected error): ${whitespaceContentResult.error}`);

    // Send message to non-existent conversation
    const nonExistentConversationId: ID = freshID(); // A new, non-existent ID
    console.log(`Action: sendMessage(${nonExistentConversationId}, ${userAlice}, "Test") (non-existent conversation)`);
    const nonExistentConvResult = await messagingConcept.sendMessage({
      conversationId: nonExistentConversationId,
      sender: userAlice,
      content: "This message should fail.",
    });
    assertEquals("error" in nonExistentConvResult, true);
    assertEquals((nonExistentConvResult as { error: string }).error, `Conversation with ID ${nonExistentConversationId} not found.`);
    console.log(`  Output (expected error): ${nonExistentConvResult.error}`);

    // Send message by non-participant
    console.log(`Action: sendMessage(${newConvId}, ${userBob}, "Test") (non-participant sender)`);
    const nonParticipantResult = await messagingConcept.sendMessage({
      conversationId: newConvId,
      sender: userBob, // userBob is not in conversation with userAlice and userCharlie
      content: "I'm not part of this chat.",
    });
    assertEquals("error" in nonParticipantResult, true);
    assertEquals((nonParticipantResult as { error: string }).error, "Sender is not a participant in this conversation.");
    console.log(`  Output (expected error): ${nonParticipantResult.error}`);

    console.log("--- End sendMessage Error Cases ---");
  });

  // Test 4: Query functionality and state verification
  await test.step("Query functionality and state verification", async () => {
    console.log("\n--- Testing Query Functionality ---");

    // Create more conversations and messages for rich query testing
    const createResultAB = await messagingConcept.createConversation({ user1: userAlice, user2: userBob });
    assertNotEquals("error" in createResultAB, true);
    const { conversationId: convIdAB } = createResultAB as { conversationId: ID };
    await messagingConcept.sendMessage({ conversationId: convIdAB, sender: userAlice, content: "Msg 1 AB" });
    await messagingConcept.sendMessage({ conversationId: convIdAB, sender: userBob, content: "Msg 2 AB" });
    console.log(`  Conversation AB (${convIdAB}) created with 2 messages.`);

    const createResultAC = await messagingConcept.createConversation({ user1: userAlice, user2: userCharlie });
    assertNotEquals("error" in createResultAC, true);
    const { conversationId: convIdAC } = createResultAC as { conversationId: ID };
    await messagingConcept.sendMessage({ conversationId: convIdAC, sender: userAlice, content: "Msg 1 AC" });
    console.log(`  Conversation AC (${convIdAC}) created with 1 message.`);

    const createResultBC = await messagingConcept.createConversation({ user1: userBob, user2: userCharlie });
    assertNotEquals("error" in createResultBC, true);
    const { conversationId: convIdBC } = createResultBC as { conversationId: ID };
    await messagingConcept.sendMessage({ conversationId: convIdBC, sender: userBob, content: "Msg 1 BC" });
    await messagingConcept.sendMessage({ conversationId: convIdBC, sender: userCharlie, content: "Msg 2 BC" });
    await messagingConcept.sendMessage({ conversationId: convIdBC, sender: userBob, content: "Msg 3 BC" });
    console.log(`  Conversation BC (${convIdBC}) created with 3 messages.`);

    // _getAllConversations
    console.log(`Query: _getAllConversations()`);
    const allConversations = await messagingConcept._getAllConversations();
    // The previous Principle test already created one conversation, plus these 3.
    assertEquals(allConversations.length, 4);
    assertArrayIncludes(allConversations.map(c => c._id), [convIdAB, convIdAC, convIdBC]);
    console.log(`  Output: Total ${allConversations.length} conversations found.`);

    // _getAllMessages
    console.log(`Query: _getAllMessages()`);
    const allMessages = await messagingConcept._getAllMessages();
    // Principle trace: 2 messages
    // convIdAB: 2 messages
    // convIdAC: 1 message
    // convIdBC: 3 messages
    // Total: 2 + 2 + 1 + 3 = 8 messages
    assertEquals(allMessages.length, 8);
    console.log(`  Output: Total ${allMessages.length} messages found.`);

    // _getConversationsForUser
    console.log(`Query: _getConversationsForUser(${userAlice})`);
    const aliceConvs = await messagingConcept._getConversationsForUser({ user: userAlice });
    // Alice is in the Principle conversation, convIdAB, convIdAC. So 3 conversations.
    assertEquals(aliceConvs.length, 3);
    assertArrayIncludes(aliceConvs.map(c => c._id), [convIdAB, convIdAC]); // Principle conv ID not known here, but it was tested earlier.
    console.log(`  Output: ${userAlice} is in ${aliceConvs.length} conversations.`);

    console.log(`Query: _getConversationsForUser(${userBob})`);
    const bobConvs = await messagingConcept._getConversationsForUser({ user: userBob });
    // Bob is in the Principle conversation, convIdAB, convIdBC. So 3 conversations.
    assertEquals(bobConvs.length, 3);
    assertArrayIncludes(bobConvs.map(c => c._id), [convIdAB, convIdBC]);
    console.log(`  Output: ${userBob} is in ${bobConvs.length} conversations.`);

    console.log(`Query: _getConversationsForUser(nonExistentUser)`);
    const nonExistentUser: ID = "user:NonExistent" as ID;
    const nonExistentUserConvs = await messagingConcept._getConversationsForUser({ user: nonExistentUser });
    assertEquals(nonExistentUserConvs.length, 0);
    console.log(`  Output: ${nonExistentUser} is in ${nonExistentUserConvs.length} conversations.`);

    // _getMessagesInConversation
    console.log(`Query: _getMessagesInConversation(${convIdBC})`);
    const bcMessagesResult = await messagingConcept._getMessagesInConversation({ conversationId: convIdBC });
    assertNotEquals("error" in bcMessagesResult, true);
    const bcMessages = bcMessagesResult as any[];
    assertEquals(bcMessages.length, 3);
    assertEquals(bcMessages[0].content, "Msg 1 BC");
    assertEquals(bcMessages[1].content, "Msg 2 BC");
    assertEquals(bcMessages[2].content, "Msg 3 BC");
    console.log(`  Output: ${convIdBC} has ${bcMessages.length} messages.`);

    console.log(`Query: _getMessagesInConversation(nonExistentConvId)`);
    const nonExistentConvMessagesResult = await messagingConcept._getMessagesInConversation({ conversationId: freshID() });
    assertEquals("error" in nonExistentConvMessagesResult, true);
    assertEquals((nonExistentConvMessagesResult as { error: string }).error.includes("not found."), true);
    console.log(`  Output (expected error): ${nonExistentConvMessagesResult.error}`);


    // _getMessageDetails
    const firstMessageInAB = (await messagingConcept._getMessagesInConversation({ conversationId: convIdAB }) as any[])[0];
    assertNotEquals(firstMessageInAB, undefined);
    console.log(`Query: _getMessageDetails(${firstMessageInAB._id})`);
    const messageDetailsResult = await messagingConcept._getMessageDetails({ messageId: firstMessageInAB._id });
    assertNotEquals("error" in messageDetailsResult, true);
    const messageDetails = messageDetailsResult as any[];
    assertEquals(messageDetails.length, 1);
    assertEquals(messageDetails[0]._id, firstMessageInAB._id);
    assertEquals(messageDetails[0].content, "Msg 1 AB");
    console.log(`  Output: Details for message ${firstMessageInAB._id} retrieved.`);

    console.log(`Query: _getMessageDetails(nonExistentMessageId)`);
    const nonExistentMessageId: ID = freshID();
    const nonExistentMessageDetailsResult = await messagingConcept._getMessageDetails({ messageId: nonExistentMessageId });
    assertEquals("error" in nonExistentMessageDetailsResult, true);
    assertEquals((nonExistentMessageDetailsResult as { error: string }).error, `Message with ID ${nonExistentMessageId} not found.`);
    console.log(`  Output (expected error): ${nonExistentMessageDetailsResult.error}`);

    console.log("--- End Query Functionality Testing ---");
  });

  console.log("\n--- All Messaging Concept Tests Completed ---");
  await client.close();
});
```
