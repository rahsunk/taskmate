---
timestamp: 'Tue Nov 04 2025 22:08:53 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251104_220853.23563592.md]]'
content_id: 5d6566acbcbc99ea9297dfda627790b662313ec56d193c0b64de7e1b2b3b6c82
---

# file: src/Messaging/MessagingConcept.test.ts

```typescript
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import MessagingConcept from "./MessagingConcept.ts";
import { assert, assertEquals, assertExists } from "jsr:@std/assert";

// Mock user IDs for testing
const alice = "user:alice" as ID;
const bob = "user:bob" as ID;
const carol = "user:carol" as ID;

Deno.test("Messaging Concept: Operational Principle", async () => {
  console.log("\n--- Testing Operational Principle: A successful two-way conversation ---");
  const [db, client] = await testDb();
  try {
    const messaging = new MessagingConcept(db);

    // Principle Step 1: Two users establish a conversation.
    console.log(`ACTION: Alice creates a conversation with Bob.`);
    const createResult = await messaging.createConversation({ user1: alice, user2: bob });
    console.log("RESULT:", createResult);

    assert(!("error" in createResult), "Conversation creation should not fail.");
    if ("error" in createResult) throw new Error("Test setup failed: could not create conversation.");
    const { conversationId } = createResult;
    assertExists(conversationId);

    // Effect verification: The conversation exists and can be retrieved.
    const aliceConvos = await messaging._getConversationsForUser({ user: alice });
    assertEquals(aliceConvos.length, 1);
    assertEquals(aliceConvos[0]._id, conversationId);
    console.log("EFFECT CONFIRMED: Conversation created successfully.");

    // Principle Step 2: Either user can send a message.
    const firstMessageContent = "Hello, Bob!";
    console.log(`ACTION: Alice sends message: "${firstMessageContent}"`);
    const sendResult1 = await messaging.sendMessage({ conversationId, sender: alice, content: firstMessageContent });
    console.log("RESULT:", sendResult1);

    assert(!("error" in sendResult1), "Sending first message should not fail.");
    if ("error" in sendResult1) throw new Error("Test failed: could not send message.");
    const { message: message1 } = sendResult1;
    assertEquals(message1.sender, alice);
    assertEquals(message1.content, firstMessageContent);
    console.log("EFFECT CONFIRMED: First message sent and stored.");

    // Principle Step 3: The other user can reply.
    const replyContent = "Hi, Alice! How are you?";
    console.log(`ACTION: Bob replies: "${replyContent}"`);
    const sendResult2 = await messaging.sendMessage({ conversationId, sender: bob, content: replyContent });
    console.log("RESULT:", sendResult2);

    assert(!("error" in sendResult2), "Sending reply should not fail.");
    if ("error" in sendResult2) throw new Error("Test failed: could not send reply.");
    const { message: message2 } = sendResult2;
    assertEquals(message2.sender, bob);
    assertEquals(message2.content, replyContent);
    console.log("EFFECT CONFIRMED: Reply sent and stored.");

    // Principle Step 4: Building a persistent history of their exchange.
    console.log("QUERY: Retrieving all messages in the conversation to view the history.");
    const history = await messaging._getMessagesInConversation({ conversationId });
    console.log("HISTORY:", history);
    assertEquals(history.length, 2, "Conversation history should have two messages.");
    assertEquals(history[0].content, firstMessageContent);
    assertEquals(history[1].content, replyContent);
    assert(history[1].sentAt >= history[0].sentAt, "Messages should be ordered chronologically.");
    console.log("EFFECT CONFIRMED: Full, ordered conversation history is available.");

    console.log("✅ Operational Principle Test Passed");
  } finally {
    await client.close();
  }
});

Deno.test("Messaging Concept: Interesting Scenarios and Requirements", async (t) => {
  const [db, client] = await testDb();
  const messaging = new MessagingConcept(db);

  await t.step("Scenario 1: User cannot create a conversation with themself", async () => {
    console.log("\n--- Testing Requirement: Cannot create a conversation with oneself ---");
    console.log("ACTION: Alice attempts to create a conversation with herself.");
    const result = await messaging.createConversation({ user1: alice, user2: alice });
    console.log("RESULT:", result);
    assert("error" in result, "Expected an error when creating a self-conversation.");
    assertEquals(result.error, "Cannot create a conversation with yourself.");
    console.log("✅ Requirement met: Action correctly failed as expected.");
  });

  await t.step("Scenario 2: Cannot create a duplicate conversation", async () => {
    console.log("\n--- Testing Requirement: Cannot create a duplicate conversation ---");
    console.log("ACTION: Create an initial conversation between Alice and Bob.");
    const initialResult = await messaging.createConversation({ user1: alice, user2: bob });
    assert(!("error" in initialResult), "Initial conversation creation should succeed.");

    console.log("ACTION: Attempt to create the same conversation again (Bob and Alice).");
    const duplicateResult = await messaging.createConversation({ user1: bob, user2: alice });
    console.log("RESULT:", duplicateResult);
    assert("error" in duplicateResult, "Expected an error when creating a duplicate conversation.");
    assertEquals(duplicateResult.error, "A conversation between these two users already exists.");
    console.log("✅ Requirement met: Action correctly failed as expected.");
  });

  await t.step("Scenario 3: Cannot send a message to a non-existent conversation", async () => {
    console.log("\n--- Testing Requirement: Message requires a valid conversation ---");
    const fakeConversationId = "conv:fake-id" as ID;
    console.log(`ACTION: Alice sends a message to a fake conversation ID: ${fakeConversationId}`);
    const result = await messaging.sendMessage({ conversationId: fakeConversationId, sender: alice, content: "Is anyone there?" });
    console.log("RESULT:", result);
    assert("error" in result, "Expected an error when sending to a non-existent conversation.");
    assert(result.error.includes("not found"), "Error message should indicate conversation not found.");
    console.log("✅ Requirement met: Action correctly failed as expected.");
  });

  await t.step("Scenario 4: A non-participant cannot send a message", async () => {
    console.log("\n--- Testing Requirement: Sender must be a participant ---");
    console.log("ACTION: Create a conversation between Alice and Carol to avoid conflict with previous tests.");
    const createResult = await messaging.createConversation({ user1: alice, user2: carol });
    assert(!("error" in createResult), "Creating a new conversation should succeed.");
    if ("error" in createResult) {
      throw new Error("Test setup failed: could not create conversation.");
    }
    const { conversationId } = createResult;

    console.log("ACTION: Bob (a non-participant) attempts to send a message.");
    const result = await messaging.sendMessage({ conversationId, sender: bob, content: "Let me in!" });
    console.log("RESULT:", result);
    assert("error" in result, "Expected an error when a non-participant sends a message.");
    assertEquals(result.error, "Sender is not a participant in this conversation.");
    console.log("✅ Requirement met: Action correctly failed as expected.");
  });

  await t.step("Scenario 5: Cannot send an empty or whitespace-only message", async () => {
    console.log("\n--- Testing Requirement: Message content cannot be empty ---");
    console.log("ACTION: Create a new conversation between Bob and Carol for an isolated test.");
    const createResult = await messaging.createConversation({ user1: bob, user2: carol });
    assert(!("error" in createResult), "Test setup should succeed.");
    if ("error" in createResult) {
      throw new Error("Test setup failed: could not create conversation.");
    }
    const { conversationId } = createResult;

    console.log("ACTION: Alice attempts to send an empty message.");
    const emptyResult = await messaging.sendMessage({ conversationId, sender: alice, content: "" });
    console.log("RESULT (empty):", emptyResult);
    assert("error" in emptyResult, "Expected an error for empty content.");
    assertEquals(emptyResult.error, "Message content cannot be empty.");

    console.log("ACTION: Alice attempts to send a whitespace-only message.");
    const whitespaceResult = await messaging.sendMessage({ conversationId, sender: alice, content: "   \t\n " });
    console.log("RESULT (whitespace):", whitespaceResult);
    assert("error" in whitespaceResult, "Expected an error for whitespace-only content.");
    assertEquals(whitespaceResult.error, "Message content cannot be empty.");
    console.log("✅ Requirement met: Actions correctly failed as expected.");
  });

  await client.close();
});
```
