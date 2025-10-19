[@implementation](implementation.md)

[@testing-concepts](../../background/testing-concepts.md)

[@testing-concepts-rubric](../../background/testing-concepts-rubric.md)

# test: ItemSharing

```typescript
// file: src/ItemSharing/ItemSharingConcept.test.ts
import { assertEquals, assertExists, assertObjectMatch } from "jsr:@std/assert";
import { testDb } from "../../utils/database.ts";
import ItemSharingConcept from "./ItemSharingConcept.ts";
import { ID, Empty } from "../../utils/types.ts"; // Assuming Empty is correctly imported from utils/types.ts

// Helper function to create dummy IDs for testing external entities
const createDummyId = (prefix: string) => `${prefix}:${Math.random().toString(36).substring(2, 11)}` as ID;

// Dummy User IDs for testing
const USER_OWNER = createDummyId("user");
const USER_PARTICIPANT_A = createDummyId("user");
const USER_PARTICIPANT_B = createDummyId("user");
const USER_NON_PARTICIPANT = createDummyId("user"); // For error cases

// Dummy Item IDs for testing (external to this concept)
const EXTERNAL_ITEM_1 = createDummyId("item");
const EXTERNAL_ITEM_2 = createDummyId("item");
const EXTERNAL_ITEM_3 = createDummyId("item");
const EXTERNAL_ITEM_4 = createDummyId("item");
const EXTERNAL_ITEM_5 = createDummyId("item");
// const EXTERNAL_ITEM_6 = createDummyId("item"); // Removed, will reuse EXTERNAL_ITEM_1 with unique suffix

// Dummy properties for changes
const PROPERTIES_A = { title: "New Title A", content: "Updated content A" };
const PROPERTIES_B = { status: "completed", dueDate: "2024-12-31" };
const PROPERTIES_C = { priority: "high", tags: ["urgent", "review"] };

// Helper function for cleaner console output
const log = (message: string, obj?: any) => {
  console.log(`\n--- ${message} ---`);
  if (obj) console.dir(obj, { depth: null, colors: true });
};

Deno.test("ItemSharing Concept Tests", async (t) => {
  const [db, client] = await testDb();
  const itemSharing = new ItemSharingConcept(db);

  // --- Operational Principle Test ---
  await t.step("Operational Principle: Successful collaborative item modification lifecycle", async () => {
    log("Starting Operational Principle Test: Successful collaborative item modification lifecycle");

    // 1. Owner makes an item shareable
    log(`Action: makeItemShareable (owner: ${USER_OWNER}, externalItemID: ${EXTERNAL_ITEM_1})`);
    const makeShareableResult = await itemSharing.makeItemShareable({
      owner: USER_OWNER,
      externalItemID: EXTERNAL_ITEM_1,
    });
    assertExists((makeShareableResult as { sharedItem: ID }).sharedItem, "makeItemShareable should return a shared item ID");
    const sharedItem1Id = (makeShareableResult as { sharedItem: ID }).sharedItem;
    log("Result:", makeShareableResult);

    let sharedItemDoc = await itemSharing.sharedItems.findOne({ _id: sharedItem1Id });
    assertExists(sharedItemDoc, "Shared item document should exist after creation");
    assertEquals(sharedItemDoc.owner, USER_OWNER, "Owner should be correctly set");
    assertEquals(sharedItemDoc.externalItemID, EXTERNAL_ITEM_1, "External item ID should be correctly set");
    assertEquals(sharedItemDoc.participants.length, 0, "Participants list should be empty initially");
    assertEquals(sharedItemDoc.acceptedParticipants.length, 0, "Accepted participants list should be empty initially");
    assertEquals(sharedItemDoc.changeRequests.length, 0, "Change requests list should be empty initially");
    log("State after makeItemShareable:", sharedItemDoc);

    // 2. Owner invites a participant
    log(`Action: shareItemWith (sharedItem: ${sharedItem1Id}, targetUser: ${USER_PARTICIPANT_A})`);
    const shareResult = await itemSharing.shareItemWith({
      sharedItem: sharedItem1Id,
      targetUser: USER_PARTICIPANT_A,
    });
    assertEquals(shareResult, {}, "shareItemWith should return an empty object on success");
    log("Result:", shareResult);

    sharedItemDoc = await itemSharing.sharedItems.findOne({ _id: sharedItem1Id });
    assertExists(sharedItemDoc);
    assertEquals(sharedItemDoc.participants, [USER_PARTICIPANT_A], "Participant A should be added to participants list");
    log("State after shareItemWith:", sharedItemDoc);

    // 3. Participant accepts to collaborate
    log(`Action: acceptToCollaborate (sharedItem: ${sharedItem1Id}, user: ${USER_PARTICIPANT_A})`);
    const acceptResult = await itemSharing.acceptToCollaborate({
      sharedItem: sharedItem1Id,
      user: USER_PARTICIPANT_A,
    });
    assertEquals(acceptResult, {}, "acceptToCollaborate should return an empty object on success");
    log("Result:", acceptResult);

    sharedItemDoc = await itemSharing.sharedItems.findOne({ _id: sharedItem1Id });
    assertExists(sharedItemDoc);
    assertEquals(sharedItemDoc.participants, [USER_PARTICIPANT_A], "Participants list should remain unchanged");
    assertEquals(sharedItemDoc.acceptedParticipants, [USER_PARTICIPANT_A], "Participant A should be added to accepted participants list");
    log("State after acceptToCollaborate:", sharedItemDoc);

    // 4. Participant requests a change
    log(`Action: requestChange (sharedItem: ${sharedItem1Id}, requester: ${USER_PARTICIPANT_A}, requestedProperties: ${JSON.stringify(PROPERTIES_A)})`);
    const requestChangeResult = await itemSharing.requestChange({
      sharedItem: sharedItem1Id,
      requester: USER_PARTICIPANT_A,
      requestedProperties: PROPERTIES_A,
    });
    assertExists((requestChangeResult as { changeRequest: ID }).changeRequest, "requestChange should return a change request ID");
    const changeRequest1Id = (requestChangeResult as { changeRequest: ID }).changeRequest;
    log("Result:", requestChangeResult);

    sharedItemDoc = await itemSharing.sharedItems.findOne({ _id: sharedItem1Id });
    assertExists(sharedItemDoc);
    assertEquals(sharedItemDoc.changeRequests, [changeRequest1Id], "Change request ID should be added to shared item's changeRequests list");
    const changeRequestDoc = await itemSharing.changeRequests.findOne({ _id: changeRequest1Id });
    assertExists(changeRequestDoc, "Change request document should exist");
    assertEquals(changeRequestDoc.sharedItemPointer, sharedItem1Id, "Change request should point to the correct shared item");
    assertEquals(changeRequestDoc.requester, USER_PARTICIPANT_A, "Change request requester should be Participant A");
    assertObjectMatch(changeRequestDoc.requestedProperties, PROPERTIES_A, "Requested properties should match");
    log("State after requestChange (SharedItem):", sharedItemDoc);
    log("State after requestChange (ChangeRequest):", changeRequestDoc);

    // 5. Owner confirms the change
    log(`Action: confirmChange (owner: ${USER_OWNER}, sharedItem: ${sharedItem1Id}, request: ${changeRequest1Id})`);
    const confirmResult = await itemSharing.confirmChange({
      owner: USER_OWNER,
      sharedItem: sharedItem1Id,
      request: changeRequest1Id,
    });
    assertEquals(confirmResult, {}, "confirmChange should return an empty object on success");
    log("Result:", confirmResult);

    sharedItemDoc = await itemSharing.sharedItems.findOne({ _id: sharedItem1Id });
    assertExists(sharedItemDoc);
    assertEquals(sharedItemDoc.changeRequests.length, 0, "Change request should be removed from shared item's list after confirmation");
    const deletedChangeRequest = await itemSharing.changeRequests.findOne({ _id: changeRequest1Id });
    assertEquals(deletedChangeRequest, null, "Change request document should be deleted after confirmation");
    log("State after confirmChange (SharedItem):", sharedItemDoc);
  });

  // --- Interesting Scenarios & Edge Cases ---

  await t.step("makeItemShareable: error when item already shared", async () => {
    log("Testing makeItemShareable error: item already shared");
    const itemToShare = EXTERNAL_ITEM_2;
    await itemSharing.makeItemShareable({ owner: USER_OWNER, externalItemID: itemToShare });
    const result = await itemSharing.makeItemShareable({ owner: USER_OWNER, externalItemID: itemToShare });
    assertObjectMatch(result, { error: `Item with externalItemID ${itemToShare} is already registered for sharing.` });
    log("Result (expected error):", result);
  });

  await t.step("shareItemWith: error cases", async () => {
    log("Testing shareItemWith error cases");
    const sharedItemResult = await itemSharing.makeItemShareable({ owner: USER_OWNER, externalItemID: EXTERNAL_ITEM_3 });
    const sharedItem3Id = (sharedItemResult as { sharedItem: ID }).sharedItem;

    // Error: Non-existent shared item
    const nonExistentSharedItem = createDummyId("sharedItem");
    const result1 = await itemSharing.shareItemWith({ sharedItem: nonExistentSharedItem, targetUser: USER_PARTICIPANT_A });
    assertObjectMatch(result1, { error: `Shared item ${nonExistentSharedItem} not found.` });
    log("Result (non-existent sharedItem):", result1);

    // Error: Target user already a participant
    await itemSharing.shareItemWith({ sharedItem: sharedItem3Id, targetUser: USER_PARTICIPANT_A });
    const result2 = await itemSharing.shareItemWith({ sharedItem: sharedItem3Id, targetUser: USER_PARTICIPANT_A });
    assertObjectMatch(result2, { error: `User ${USER_PARTICIPANT_A} is already a participant for shared item ${sharedItem3Id}.` });
    log("Result (already participant):", result2);
  });

  await t.step("unshareItemWith: removes participant, accepted status, and their change requests", async () => {
    log("Testing unshareItemWith: removes participant, accepted status, and their change requests");
    const sharedItemResult = await itemSharing.makeItemShareable({ owner: USER_OWNER, externalItemID: EXTERNAL_ITEM_4 });
    const sharedItem4Id = (sharedItemResult as { sharedItem: ID }).sharedItem;

    await itemSharing.shareItemWith({ sharedItem: sharedItem4Id, targetUser: USER_PARTICIPANT_A });
    await itemSharing.shareItemWith({ sharedItem: sharedItem4Id, targetUser: USER_PARTICIPANT_B });
    await itemSharing.acceptToCollaborate({ sharedItem: sharedItem4Id, user: USER_PARTICIPANT_A }); // A accepts
    await itemSharing.acceptToCollaborate({ sharedItem: sharedItem4Id, user: USER_PARTICIPANT_B }); // B accepts

    const requestResultA = await itemSharing.requestChange({ sharedItem: sharedItem4Id, requester: USER_PARTICIPANT_A, requestedProperties: PROPERTIES_A });
    const changeRequestAId = (requestResultA as { changeRequest: ID }).changeRequest;
    const requestResultB = await itemSharing.requestChange({ sharedItem: sharedItem4Id, requester: USER_PARTICIPANT_B, requestedProperties: PROPERTIES_B });
    const changeRequestBId = (requestResultB as { changeRequest: ID }).changeRequest;

    // Verify initial state
    let sharedItemDoc = await itemSharing.sharedItems.findOne({ _id: sharedItem4Id });
    assertExists(sharedItemDoc);
    assertEquals(sharedItemDoc.participants.length, 2);
    assertEquals(sharedItemDoc.acceptedParticipants.length, 2);
    assertEquals(sharedItemDoc.changeRequests.length, 2);
    assertExists(await itemSharing.changeRequests.findOne({ _id: changeRequestAId }));
    assertExists(await itemSharing.changeRequests.findOne({ _id: changeRequestBId }));
    log("Initial state:", sharedItemDoc);

    // Unshare USER_PARTICIPANT_A
    log(`Action: unshareItemWith (sharedItem: ${sharedItem4Id}, targetUser: ${USER_PARTICIPANT_A})`);
    await itemSharing.unshareItemWith({ sharedItem: sharedItem4Id, targetUser: USER_PARTICIPANT_A });
    sharedItemDoc = await itemSharing.sharedItems.findOne({ _id: sharedItem4Id });
    assertExists(sharedItemDoc);
    assertEquals(sharedItemDoc.participants, [USER_PARTICIPANT_B], "Participant A should be removed from participants");
    assertEquals(sharedItemDoc.acceptedParticipants, [USER_PARTICIPANT_B], "Participant A should be removed from accepted participants");
    assertEquals(sharedItemDoc.changeRequests, [changeRequestBId], "Participant A's change requests should be removed from shared item");
    assertEquals(await itemSharing.changeRequests.findOne({ _id: changeRequestAId }), null, "Participant A's change request document should be deleted");
    assertExists(await itemSharing.changeRequests.findOne({ _id: changeRequestBId }), "Participant B's change request should still exist");
    log("State after unsharing Participant A:", sharedItemDoc);

    // Error: Unshare a non-participant
    log(`Action: unshareItemWith (sharedItem: ${sharedItem4Id}, targetUser: ${USER_NON_PARTICIPANT})`);
    const unshareNonParticipantResult = await itemSharing.unshareItemWith({ sharedItem: sharedItem4Id, targetUser: USER_NON_PARTICIPANT });
    assertObjectMatch(unshareNonParticipantResult, { error: `User ${USER_NON_PARTICIPANT} is not a participant for shared item ${sharedItem4Id}.` });
    log("Result (unshare non-participant):", unshareNonParticipantResult);
  });

  await t.step("rejectCollaboration: removes participant, accepted status, and their change requests", async () => {
    log("Testing rejectCollaboration: removes participant, accepted status, and their change requests");
    const sharedItemResult = await itemSharing.makeItemShareable({ owner: USER_OWNER, externalItemID: EXTERNAL_ITEM_5 });
    const sharedItem5Id = (sharedItemResult as { sharedItem: ID }).sharedItem;

    await itemSharing.shareItemWith({ sharedItem: sharedItem5Id, targetUser: USER_PARTICIPANT_A });
    await itemSharing.shareItemWith({ sharedItem: sharedItem5Id, targetUser: USER_PARTICIPANT_B });
    await itemSharing.acceptToCollaborate({ sharedItem: sharedItem5Id, user: USER_PARTICIPANT_A }); // A accepts
    const requestResultA = await itemSharing.requestChange({ sharedItem: sharedItem5Id, requester: USER_PARTICIPANT_A, requestedProperties: PROPERTIES_C });
    const changeRequestAId = (requestResultA as { changeRequest: ID }).changeRequest;

    // Verify initial state
    let sharedItemDoc = await itemSharing.sharedItems.findOne({ _id: sharedItem5Id });
    assertExists(sharedItemDoc);
    assertEquals(sharedItemDoc.participants.length, 2);
    assertEquals(sharedItemDoc.acceptedParticipants.length, 1);
    assertEquals(sharedItemDoc.changeRequests.length, 1);
    assertExists(await itemSharing.changeRequests.findOne({ _id: changeRequestAId }));
    log("Initial state:", sharedItemDoc);

    // Reject USER_PARTICIPANT_A (who accepted and made a request)
    log(`Action: rejectCollaboration (sharedItem: ${sharedItem5Id}, user: ${USER_PARTICIPANT_A})`);
    await itemSharing.rejectCollaboration({ sharedItem: sharedItem5Id, user: USER_PARTICIPANT_A });
    sharedItemDoc = await itemSharing.sharedItems.findOne({ _id: sharedItem5Id });
    assertExists(sharedItemDoc);
    assertEquals(sharedItemDoc.participants, [USER_PARTICIPANT_B], "Participant A should be removed from participants");
    assertEquals(sharedItemDoc.acceptedParticipants.length, 0, "Participant A should be removed from accepted participants");
    assertEquals(sharedItemDoc.changeRequests.length, 0, "Participant A's change requests should be removed from shared item");
    assertEquals(await itemSharing.changeRequests.findOne({ _id: changeRequestAId }), null, "Participant A's change request document should be deleted");
    log("State after rejecting Participant A:", sharedItemDoc);

    // Error: Reject a non-participant
    log(`Action: rejectCollaboration (sharedItem: ${sharedItem5Id}, user: ${USER_NON_PARTICIPANT})`);
    const rejectNonParticipantResult = await itemSharing.rejectCollaboration({ sharedItem: sharedItem5Id, user: USER_NON_PARTICIPANT });
    assertObjectMatch(rejectNonParticipantResult, { error: `User ${USER_NON_PARTICIPANT} is not a participant for shared item ${sharedItem5Id}.` });
    log("Result (reject non-participant):", rejectNonParticipantResult);
  });


  await t.step("requestChange: error if requester not an accepted participant", async () => {
    log("Testing requestChange error: requester not accepted participant");
    const uniqueExternalItem = createDummyId("item"); // Create a new unique ID for this test step
    const sharedItemResult = await itemSharing.makeItemShareable({ owner: USER_OWNER, externalItemID: uniqueExternalItem });
    const sharedItem6Id = (sharedItemResult as { sharedItem: ID }).sharedItem;

    // Invite but don't accept
    await itemSharing.shareItemWith({ sharedItem: sharedItem6Id, targetUser: USER_PARTICIPANT_A });

    log(`Action: requestChange (requester not accepted: ${USER_PARTICIPANT_A})`);
    const result = await itemSharing.requestChange({
      sharedItem: sharedItem6Id,
      requester: USER_PARTICIPANT_A,
      requestedProperties: PROPERTIES_A,
    });
    assertObjectMatch(result, { error: `User ${USER_PARTICIPANT_A} has not accepted collaboration for shared item ${sharedItem6Id}.` });
    log("Result (expected error):", result);
  });

  await t.step("confirmChange / rejectChange: error cases", async () => {
    log("Testing confirmChange / rejectChange error cases");
    // FIX: Correctly cast the concatenated string to ItemID
    const sharedItemResult = await itemSharing.makeItemShareable({ owner: USER_OWNER, externalItemID: (EXTERNAL_ITEM_1 + "unique") as ID });
    const sharedItem7Id = (sharedItemResult as { sharedItem: ID }).sharedItem;
    await itemSharing.shareItemWith({ sharedItem: sharedItem7Id, targetUser: USER_PARTICIPANT_A });
    await itemSharing.acceptToCollaborate({ sharedItem: sharedItem7Id, user: USER_PARTICIPANT_A });
    const requestResult = await itemSharing.requestChange({ sharedItem: sharedItem7Id, requester: USER_PARTICIPANT_A, requestedProperties: PROPERTIES_A });
    const changeRequestAId = (requestResult as { changeRequest: ID }).changeRequest;

    const nonExistentSharedItem = createDummyId("sharedItem");
    const nonExistentChangeRequest = createDummyId("changeRequest");

    // confirmChange: wrong owner
    log(`Action: confirmChange (wrong owner: ${USER_PARTICIPANT_A})`);
    let result = await itemSharing.confirmChange({ owner: USER_PARTICIPANT_A, sharedItem: sharedItem7Id, request: changeRequestAId });
    assertObjectMatch(result, { error: `User ${USER_PARTICIPANT_A} is not the owner of shared item ${sharedItem7Id}.` });
    log("Result (confirmChange, wrong owner):", result);

    // confirmChange: non-existent shared item
    log(`Action: confirmChange (non-existent shared item: ${nonExistentSharedItem})`);
    result = await itemSharing.confirmChange({ owner: USER_OWNER, sharedItem: nonExistentSharedItem, request: changeRequestAId });
    assertObjectMatch(result, { error: `Shared item ${nonExistentSharedItem} not found.` });
    log("Result (confirmChange, non-existent shared item):", result);

    // confirmChange: non-existent change request
    log(`Action: confirmChange (non-existent change request: ${nonExistentChangeRequest})`);
    result = await itemSharing.confirmChange({ owner: USER_OWNER, sharedItem: sharedItem7Id, request: nonExistentChangeRequest });
    assertObjectMatch(result, { error: `Change request ${nonExistentChangeRequest} not found.` });
    log("Result (confirmChange, non-existent change request):", result);

    // rejectChange: wrong owner
    log(`Action: rejectChange (wrong owner: ${USER_PARTICIPANT_A})`);
    result = await itemSharing.rejectChange({ owner: USER_PARTICIPANT_A, sharedItem: sharedItem7Id, request: changeRequestAId });
    assertObjectMatch(result, { error: `User ${USER_PARTICIPANT_A} is not the owner of shared item ${sharedItem7Id}.` });
    log("Result (rejectChange, wrong owner):", result);

    // rejectChange: non-existent shared item
    log(`Action: rejectChange (non-existent shared item: ${nonExistentSharedItem})`);
    result = await itemSharing.rejectChange({ owner: USER_OWNER, sharedItem: nonExistentSharedItem, request: changeRequestAId });
    assertObjectMatch(result, { error: `Shared item ${nonExistentSharedItem} not found.` });
    log("Result (rejectChange, non-existent shared item):", result);

    // rejectChange: non-existent change request
    log(`Action: rejectChange (non-existent change request: ${nonExistentChangeRequest})`);
    result = await itemSharing.rejectChange({ owner: USER_OWNER, sharedItem: sharedItem7Id, request: nonExistentChangeRequest });
    assertObjectMatch(result, { error: `Change request ${nonExistentChangeRequest} not found.` });
    log("Result (rejectChange, non-existent change request):", result);
  });

  await client.close();
});

// --- Trace for Operational Principle ---
/*
* trace: Successful collaborative item modification
  1. User OWNER calls makeItemShareable(owner: USER_OWNER, externalItemID: EXTERNAL_ITEM_1)
     - Preconditions: EXTERNAL_ITEM_1 is not already registered for sharing, USER_OWNER exists.
     - Effects: A new sharedItem document is created with a fresh sharedItem ID, externalItemID: EXTERNAL_ITEM_1, owner: USER_OWNER.
                participants, acceptedParticipants, and changeRequests arrays are initialized as empty.
     - Expected Console Output: "Action: makeItemShareable (owner: user:..., externalItemID: item:...) Result: { sharedItem: 'sharedItem:...' }"
     - Expected State: `sharedItems` collection contains one document:
       `{ _id: <sharedItem1Id>, sharedItemID: 1, externalItemID: EXTERNAL_ITEM_1, owner: USER_OWNER, participants: [], acceptedParticipants: [], changeRequests: [] }`

  2. User OWNER calls shareItemWith(sharedItem: sharedItem1Id, targetUser: USER_PARTICIPANT_A)
     - Preconditions: `sharedItem1Id` exists, `USER_PARTICIPANT_A` exists, `USER_PARTICIPANT_A` is not in `sharedItem1Id.participants`.
     - Effects: `USER_PARTICIPANT_A` is added to `sharedItem1Id.participants`.
     - Expected Console Output: "Action: shareItemWith (sharedItem: sharedItem:..., targetUser: user:...) Result: {}"
     - Expected State: `sharedItems` document for `sharedItem1Id` updated:
       `{ ..., participants: [USER_PARTICIPANT_A], ... }`

  3. User USER_PARTICIPANT_A calls acceptToCollaborate(sharedItem: sharedItem1Id, user: USER_PARTICIPANT_A)
     - Preconditions: `sharedItem1Id` exists, `USER_PARTICIPANT_A` is in `sharedItem1Id.participants`, `USER_PARTICIPANT_A` is not in `sharedItem1Id.acceptedParticipants`.
     - Effects: `USER_PARTICIPANT_A` is added to `sharedItem1Id.acceptedParticipants`.
     - Expected Console Output: "Action: acceptToCollaborate (sharedItem: sharedItem:..., user: user:...) Result: {}"
     - Expected State: `sharedItems` document for `sharedItem1Id` updated:
       `{ ..., acceptedParticipants: [USER_PARTICIPANT_A], ... }`

  4. User USER_PARTICIPANT_A calls requestChange(sharedItem: sharedItem1Id, requester: USER_PARTICIPANT_A, requestedProperties: PROPERTIES_A)
     - Preconditions: `sharedItem1Id` exists, `USER_PARTICIPANT_A` exists, `USER_PARTICIPANT_A` is in `sharedItem1Id.acceptedParticipants`.
     - Effects: A new `changeRequest` document is created with a fresh `requestID`, `sharedItemPointer: sharedItem1Id`, `requester: USER_PARTICIPANT_A`, and `requestedProperties: PROPERTIES_A`.
                The ID of this new `changeRequest` is added to `sharedItem1Id.changeRequests`.
     - Expected Console Output: "Action: requestChange (sharedItem: sharedItem:..., requester: user:..., requestedProperties: ...) Result: { changeRequest: 'changeRequest:...' }"
     - Expected State: `changeRequests` collection contains one document:
       `{ _id: <changeRequest1Id>, requestID: 1, sharedItemPointer: sharedItem1Id, requester: USER_PARTICIPANT_A, requestedProperties: PROPERTIES_A }`
       `sharedItems` document for `sharedItem1Id` updated:
       `{ ..., changeRequests: [<changeRequest1Id>], ... }`

  5. User OWNER calls confirmChange(owner: USER_OWNER, sharedItem: sharedItem1Id, request: changeRequest1Id)
     - Preconditions: `sharedItem1Id` exists, `USER_OWNER` is `sharedItem1Id.owner`, `changeRequest1Id` is in `sharedItem1Id.changeRequests` and exists.
     - Effects: `changeRequest1Id` is removed from `sharedItem1Id.changeRequests`.
                The `changeRequest` document with `_id: changeRequest1Id` is deleted from the `changeRequests` collection.
     - Expected Console Output: "Action: confirmChange (owner: user:..., sharedItem: sharedItem:..., request: changeRequest:...) Result: {}"
     - Expected State: `sharedItems` document for `sharedItem1Id` updated:
       `{ ..., changeRequests: [], ... }`
       `changeRequests` collection is empty (or does not contain `changeRequest1Id`).
     - Note: The actual application of `PROPERTIES_A` to `EXTERNAL_ITEM_1` in its original concept is handled by a synchronization rule, external to this concept's direct actions.
*/
```