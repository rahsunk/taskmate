```
Check file:///Users/rahsunkomatsuzaki-fields/Desktop/MIT/academic/Y3/Fall/6.1040/taskmate/src/concepts/Messaging/Messaging.test.ts
running 2 tests from ./src/concepts/Messaging/Messaging.test.ts
Messaging Concept: Operational Principle ...
------- output -------

--- Testing Operational Principle: A successful two-way conversation ---
ACTION: Alice creates a conversation with Bob.
RESULT: { conversationId: "019a51fe-0a66-7db8-b139-d266ccdbc8d5" }
EFFECT CONFIRMED: Conversation created successfully.
ACTION: Alice sends message: "Hello, Bob!"
RESULT: {
  message: {
    _id: "019a51fe-0abf-73c5-b8ed-bde1bc1342d0",
    conversationId: "019a51fe-0a66-7db8-b139-d266ccdbc8d5",
    sender: "user:alice",
    content: "Hello, Bob!",
    sentAt: 2025-11-05T03:09:54.751Z
  }
}
EFFECT CONFIRMED: First message sent and stored.
ACTION: Bob replies: "Hi, Alice! How are you?"
RESULT: {
  message: {
    _id: "019a51fe-0af6-7c1e-99d1-f6483cad43d8",
    conversationId: "019a51fe-0a66-7db8-b139-d266ccdbc8d5",
    sender: "user:bob",
    content: "Hi, Alice! How are you?",
    sentAt: 2025-11-05T03:09:54.806Z
  }
}
EFFECT CONFIRMED: Reply sent and stored.
QUERY: Retrieving all messages in the conversation to view the history.
HISTORY: [
  {
    _id: "019a51fe-0abf-73c5-b8ed-bde1bc1342d0",
    conversationId: "019a51fe-0a66-7db8-b139-d266ccdbc8d5",
    sender: "user:alice",
    content: "Hello, Bob!",
    sentAt: 2025-11-05T03:09:54.751Z
  },
  {
    _id: "019a51fe-0af6-7c1e-99d1-f6483cad43d8",
    conversationId: "019a51fe-0a66-7db8-b139-d266ccdbc8d5",
    sender: "user:bob",
    content: "Hi, Alice! How are you?",
    sentAt: 2025-11-05T03:09:54.806Z
  }
]
EFFECT CONFIRMED: Full, ordered conversation history is available.
✅ Operational Principle Test Passed
----- output end -----
Messaging Concept: Operational Principle ... ok (787ms)
Messaging Concept: Interesting Scenarios and Requirements ...
  Scenario 1: User cannot create a conversation with themself ...
------- output -------

--- Testing Requirement: Cannot create a conversation with oneself ---
ACTION: Alice attempts to create a conversation with herself.
RESULT: { error: "Cannot create a conversation with yourself." }
✅ Requirement met: Action correctly failed as expected.
----- output end -----
  Scenario 1: User cannot create a conversation with themself ... ok (1ms)
  Scenario 2: Cannot create a duplicate conversation ...
------- output -------

--- Testing Requirement: Cannot create a duplicate conversation ---
ACTION: Create an initial conversation between Alice and Bob.
ACTION: Attempt to create the same conversation again (Bob and Alice).
RESULT: { error: "A conversation between these two users already exists." }
✅ Requirement met: Action correctly failed as expected.
----- output end -----
  Scenario 2: Cannot create a duplicate conversation ... ok (69ms)
  Scenario 3: Cannot send a message to a non-existent conversation ...
------- output -------

--- Testing Requirement: Message requires a valid conversation ---
ACTION: Alice sends a message to a fake conversation ID: conv:fake-id
RESULT: { error: "Conversation with ID conv:fake-id not found." }
✅ Requirement met: Action correctly failed as expected.
----- output end -----
  Scenario 3: Cannot send a message to a non-existent conversation ... ok (17ms)
  Scenario 4: A non-participant cannot send a message ...
------- output -------

--- Testing Requirement: Sender must be a participant ---
ACTION: Create a conversation between Alice and Carol to avoid conflict with previous tests.
ACTION: Bob (a non-participant) attempts to send a message.
RESULT: { error: "Sender is not a participant in this conversation." }
✅ Requirement met: Action correctly failed as expected.
----- output end -----
  Scenario 4: A non-participant cannot send a message ... ok (54ms)
  Scenario 5: Cannot send an empty or whitespace-only message ...
------- output -------

--- Testing Requirement: Message content cannot be empty ---
ACTION: Create a new conversation between Bob and Carol for an isolated test.
ACTION: Alice attempts to send an empty message.
RESULT (empty): { error: "Message content cannot be empty." }
ACTION: Alice attempts to send a whitespace-only message.
RESULT (whitespace): { error: "Message content cannot be empty." }
✅ Requirement met: Actions correctly failed as expected.
----- output end -----
  Scenario 5: Cannot send an empty or whitespace-only message ... ok (37ms)
Messaging Concept: Interesting Scenarios and Requirements ... ok (671ms)

ok | 2 passed (5 steps) | 0 failed (1s)
```
