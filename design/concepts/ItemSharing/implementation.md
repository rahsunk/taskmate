[@concept-design-overview](../../background/concept-design-overview.md)

[@concept-specifications](../../background/concept-specifications.md)

[@implementing-concepts](../../background/implementing-concepts.md)

[@ItemSharing](ItemSharing.md)

# implement: ItemSharing

```typescript
// file: src/ItemSharing/ItemSharingConcept.ts
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "../../utils/types.ts";
import { freshID } from "../../utils/database.ts";

// Declare collection prefix, use concept name
const PREFIX = "ItemSharing" + ".";

// Generic type parameters for this concept
type User = ID;
type ItemID = ID; // Refers to an item managed by an external concept
type Properties = Record<string, any>; // Generic type for mutable properties of an external item

// Internal ID types for the concept's own entities
type SharedItem = ID; // The ID for a document in the 'sharedItems' collection
type ChangeRequest = ID; // The ID for a document in the 'changeRequests' collection

/**
 * Interface for documents in the "ItemSharing.sharedItems" collection.
 * Represents an item that has been made shareable, including its owner,
 * participants, and proposed changes.
 *
 * State declaration:
 * a set of `SharedItems` with
 *   a `sharedItemID` of type `Number` (static attribute, initially -1)
 *   an `externalItemID` of type `ItemID`
 *   an `owner` of type `User`
 *   a set of `participants` of type `User`
 *   a set of `acceptedParticipants` of type `User`
 *   a set of `changeRequests`
 */
interface SharedItemDoc {
  _id: SharedItem; // Unique ID for this shared item record
  sharedItemID: number; // Auto-incrementing internal ID for human reference/ordering
  externalItemID: ItemID; // The ID of the actual item in its original concept
  owner: User; // The user ID who initiated sharing
  participants: User[]; // Users invited to collaborate
  acceptedParticipants: User[]; // Users who have accepted the invitation
  changeRequests: ChangeRequest[]; // Array of ChangeRequest IDs associated with this shared item
}

/**
 * Interface for documents in the "ItemSharing.changeRequests" collection.
 * Represents a proposed change to an item's properties by a participant.
 *
 * State declaration:
 * a set of `ChangeRequests` with
 *   a `requestID` of type `Number` (static attribute, initially -1)
 *   a `sharedItemPointer` of type `SharedItem`
 *   a `requester` of type `User`
 *   a `requestedProperties` of type `Properties`
 */
interface ChangeRequestDoc {
  _id: ChangeRequest; // Unique ID for this change request record
  requestID: number; // Auto-incrementing internal ID for human reference/ordering
  sharedItemPointer: SharedItem; // Reference to the SharedItem this request is for
  requester: User; // The user ID who proposed the change
  requestedProperties: Properties; // The properties proposed for change
}

/**
 * Interface for documents in the "ItemSharing.counters" collection.
 * Used to manage auto-incrementing IDs within the concept.
 */
interface CounterDoc {
  _id: string; // Name of the counter, e.g., "sharedItemID", "requestID"
  sequence_value: number; // The current sequence value
}

/**
 * ItemSharing Concept:
 * **purpose** Allows collaborative modification of an item's mutable properties by managing
 *             invited participants, their acceptance to collaborate, and the lifecycle
 *             of proposed and confirmed changes to those properties.
 *
 * **principle** An owner of an item makes the item sharable through its ID. They can then invite
 *               other users to participate. Invited users can accept to participate in changes
 *               to this item. They can then propose new arguments for the item's properties
 *               as a `ChangeRequest`. The owner can then confirm or reject this `ChangeRequest`.
 *               Upon confirmation, a concept sync will apply the `requestedProperties` to the item
 *               identified by `ItemID` in its original concept.
 */
export default class ItemSharingConcept {
  // MongoDB collections for the concept's state
  sharedItems: Collection<SharedItemDoc>;
  changeRequests: Collection<ChangeRequestDoc>;
  counters: Collection<CounterDoc>; // Manages auto-incrementing sequence values

  /**
   * Constructs the ItemSharingConcept, initializing its MongoDB collections.
   * @param db The MongoDB database instance.
   */
  constructor(private readonly db: Db) {
    this.sharedItems = this.db.collection(PREFIX + "sharedItems");
    this.changeRequests = this.db.collection(PREFIX + "changeRequests");
    this.counters = this.db.collection(PREFIX + "counters");
  }

  /**
   * Helper method to get the next sequence value for auto-incrementing IDs.
   * Uses MongoDB's findOneAndUpdate with $inc for atomic increment.
   * @param name The name of the counter (e.g., "sharedItemID", "requestID").
   * @returns The next sequence number.
   */
  private async getNextSequence(name: string): Promise<number> {
    const result = await this.counters.findOneAndUpdate(
      { _id: name },
      { $inc: { sequence_value: 1 } },
      { upsert: true, returnDocument: "after" }, // Create counter if it doesn't exist, return updated doc
    );

    // Based on the error messages, 'result' is interpreted as 'WithId<CounterDoc> | null' directly.
    // We access 'sequence_value' directly on 'result' after checking for null.
    // The nullish coalescing operator (??) provides a fallback value if 'result' is null or undefined.
    return result?.sequence_value ?? 1; 
  }

  /**
   * Action: makeItemShareable
   *
   * **requires**: `externalItemID` exists from an external concept, `owner` exists,
   *               and `externalItemID` is not already registered for sharing.
   * **effects**: Creates and returns a new `sharedItem` with `sharedItemID` incremented by 1.
   *              `sharedItem` is initialized with the given `externalItemID` and `owner`.
   *              `participants`, `acceptedParticipants`, and `changeRequests` are initialized as empty sets.
   * @param owner The ID of the user who owns the item.
   * @param externalItemID The ID of the item from an external concept.
   * @returns An object containing the `sharedItem` ID or an `error`.
   */
  async makeItemShareable({
    owner,
    externalItemID,
  }: {
    owner: User;
    externalItemID: ItemID;
  }): Promise<{ sharedItem: SharedItem } | { error: string }> {
    // Precondition: externalItemID is not already registered for sharing.
    const existingSharedItem = await this.sharedItems.findOne({ externalItemID });
    if (existingSharedItem) {
      return { error: `Item with externalItemID ${externalItemID} is already registered for sharing.` };
    }

    // Effects: Create a new shared item document.
    const sharedItemID = await this.getNextSequence("sharedItemID");
    const newSharedItemDoc: SharedItemDoc = {
      _id: freshID() as SharedItem, // Generate unique _id for the document
      sharedItemID: sharedItemID,
      externalItemID: externalItemID,
      owner: owner,
      participants: [],
      acceptedParticipants: [],
      changeRequests: [],
    };

    await this.sharedItems.insertOne(newSharedItemDoc);
    return { sharedItem: newSharedItemDoc._id };
  }

  /**
   * Action: shareItemWith
   *
   * **requires**: `sharedItem` exists, `targetUser` exists,
   *               `targetUser` is not already in `sharedItem.participants`.
   * **effects**: Adds `targetUser` to `sharedItem.participants`.
   * @param sharedItem The ID of the shared item.
   * @param targetUser The ID of the user to invite.
   * @returns An empty object on success or an `error`.
   */
  async shareItemWith({
    sharedItem,
    targetUser,
  }: {
    sharedItem: SharedItem;
    targetUser: User;
  }): Promise<Empty | { error: string }> {
    // Precondition: sharedItem exists.
    const existingSharedItem = await this.sharedItems.findOne({ _id: sharedItem });
    if (!existingSharedItem) {
      return { error: `Shared item ${sharedItem} not found.` };
    }

    // Precondition: targetUser is not already in sharedItem.participants.
    if (existingSharedItem.participants.includes(targetUser)) {
      return { error: `User ${targetUser} is already a participant for shared item ${sharedItem}.` };
    }

    // Effects: Add targetUser to sharedItem.participants.
    await this.sharedItems.updateOne(
      { _id: sharedItem },
      { $addToSet: { participants: targetUser } },
    );
    return {};
  }

  /**
   * Action: unshareItemWith
   *
   * **requires**: `sharedItem` exists, `targetUser` is in `sharedItem.participants`.
   * **effects**: Removes `targetUser` from `sharedItem.participants` and
   *              from `sharedItem.acceptedParticipants` if they are in that set.
   *              Deletes any `ChangeRequests` made by `targetUser` for `sharedItem`.
   * @param sharedItem The ID of the shared item.
   * @param targetUser The ID of the user to unshare.
   * @returns An empty object on success or an `error`.
   */
  async unshareItemWith({
    sharedItem,
    targetUser,
  }: {
    sharedItem: SharedItem;
    targetUser: User;
  }): Promise<Empty | { error: string }> {
    // Precondition: sharedItem exists.
    const existingSharedItem = await this.sharedItems.findOne({ _id: sharedItem });
    if (!existingSharedItem) {
      return { error: `Shared item ${sharedItem} not found.` };
    }

    // Precondition: targetUser is in sharedItem.participants.
    if (!existingSharedItem.participants.includes(targetUser)) {
      return { error: `User ${targetUser} is not a participant for shared item ${sharedItem}.` };
    }

    // Find all change requests by targetUser for this sharedItem before deleting them
    const changeRequestsToDelete = await this.changeRequests.find({
      sharedItemPointer: sharedItem,
      requester: targetUser,
    }).project({ _id: 1 }).toArray();

    const deletedChangeRequestIds = changeRequestsToDelete.map((cr) => cr._id);

    // Effects: Remove targetUser from sharedItem.participants.
    const updateOperations: any = { $pull: { participants: targetUser } };

    // Effects: Remove from sharedItem.acceptedParticipants if present.
    if (existingSharedItem.acceptedParticipants.includes(targetUser)) {
      // Correctly add to $pull object: { $pull: { participants: user, acceptedParticipants: user } }
      (updateOperations.$pull as any).acceptedParticipants = targetUser;
    }
    
    // Effects: Remove IDs of deleted change requests from sharedItem.changeRequests.
    if (deletedChangeRequestIds.length > 0) {
        updateOperations.$pullAll = { changeRequests: deletedChangeRequestIds };
    }

    // Perform the update on the shared item document
    await this.sharedItems.updateOne(
      { _id: sharedItem },
      updateOperations,
    );

    // Effects: Delete any ChangeRequests made by targetUser for sharedItem.
    if (deletedChangeRequestIds.length > 0) {
        await this.changeRequests.deleteMany({ _id: { $in: deletedChangeRequestIds } });
    }

    return {};
  }

  /**
   * Action: acceptToCollaborate
   *
   * **requires**: `sharedItem` exists, `user` is in `sharedItem.participants`,
   *               `user` is not already in `sharedItem.acceptedParticipants`.
   * **effects**: Adds `user` to `sharedItem.acceptedParticipants`.
   * @param sharedItem The ID of the shared item.
   * @param user The ID of the user accepting.
   * @returns An empty object on success or an `error`.
   */
  async acceptToCollaborate({
    sharedItem,
    user,
  }: {
    sharedItem: SharedItem;
    user: User;
  }): Promise<Empty | { error: string }> {
    // Precondition: sharedItem exists.
    const existingSharedItem = await this.sharedItems.findOne({ _id: sharedItem });
    if (!existingSharedItem) {
      return { error: `Shared item ${sharedItem} not found.` };
    }

    // Precondition: user is in sharedItem.participants.
    if (!existingSharedItem.participants.includes(user)) {
      return { error: `User ${user} is not a participant for shared item ${sharedItem}.` };
    }

    // Precondition: user is not already in sharedItem.acceptedParticipants.
    if (existingSharedItem.acceptedParticipants.includes(user)) {
      return { error: `User ${user} has already accepted collaboration for shared item ${sharedItem}.` };
    }

    // Effects: Add user to sharedItem.acceptedParticipants.
    await this.sharedItems.updateOne(
      { _id: sharedItem },
      { $addToSet: { acceptedParticipants: user } },
    );
    return {};
  }

  /**
   * Action: rejectCollaboration
   *
   * **requires**: `sharedItem` exists, `user` is in `sharedItem.participants`.
   * **effects**: Removes `user` from `sharedItem.participants` and, if present,
   *              from `sharedItem.acceptedParticipants`. Deletes any `ChangeRequests`
   *              made by `user` for this `sharedItem`.
   * @param sharedItem The ID of the shared item.
   * @param user The ID of the user rejecting.
   * @returns An empty object on success or an `error`.
   */
  async rejectCollaboration({
    sharedItem,
    user,
  }: {
    sharedItem: SharedItem;
    user: User;
  }): Promise<Empty | { error: string }> {
    // Precondition: sharedItem exists.
    const existingSharedItem = await this.sharedItems.findOne({ _id: sharedItem });
    if (!existingSharedItem) {
      return { error: `Shared item ${sharedItem} not found.` };
    }

    // Precondition: user is in sharedItem.participants.
    if (!existingSharedItem.participants.includes(user)) {
      return { error: `User ${user} is not a participant for shared item ${sharedItem}.` };
    }

    // Find all change requests by user for this sharedItem before deleting them
    const changeRequestsToDelete = await this.changeRequests.find({
      sharedItemPointer: sharedItem,
      requester: user,
    }).project({ _id: 1 }).toArray();

    const deletedChangeRequestIds = changeRequestsToDelete.map((cr) => cr._id);

    // Effects: Remove user from sharedItem.participants.
    const updateOperations: any = { $pull: { participants: user } };

    // Effects: Remove from sharedItem.acceptedParticipants if present.
    if (existingSharedItem.acceptedParticipants.includes(user)) {
        // Correctly add to $pull object: { $pull: { participants: user, acceptedParticipants: user } }
        (updateOperations.$pull as any).acceptedParticipants = user;
    }

    // Effects: Remove IDs of deleted change requests from sharedItem.changeRequests.
    if (deletedChangeRequestIds.length > 0) {
        updateOperations.$pullAll = { changeRequests: deletedChangeRequestIds };
    }

    // Perform the update on the shared item document
    await this.sharedItems.updateOne(
      { _id: sharedItem },
      updateOperations,
    );

    // Effects: Delete any ChangeRequests made by user for this sharedItem.
    if (deletedChangeRequestIds.length > 0) {
        await this.changeRequests.deleteMany({ _id: { $in: deletedChangeRequestIds } });
    }

    return {};
  }

  /**
   * Action: requestChange
   *
   * **requires**: `sharedItem` exists, `requester` exists,
   *               `requester` is in `sharedItem.acceptedParticipants`.
   * **effects**: Creates and returns a new `changeRequest` for `sharedItem`
   *              with the `requester` and the proposed `requestedProperties`,
   *              with `requestID` incrementing by 1.
   *              Adds `changeRequest` to `sharedItem.changeRequests`.
   * @param sharedItem The ID of the shared item.
   * @param requester The ID of the user proposing the change.
   * @param requestedProperties The properties proposed for change.
   * @returns An object containing the `changeRequest` ID or an `error`.
   */
  async requestChange({
    sharedItem,
    requester,
    requestedProperties,
  }: {
    sharedItem: SharedItem;
    requester: User;
    requestedProperties: Properties;
  }): Promise<{ changeRequest: ChangeRequest } | { error: string }> {
    // Precondition: sharedItem exists.
    const existingSharedItem = await this.sharedItems.findOne({ _id: sharedItem });
    if (!existingSharedItem) {
      return { error: `Shared item ${sharedItem} not found.` };
    }

    // Precondition: requester is in sharedItem.acceptedParticipants.
    if (!existingSharedItem.acceptedParticipants.includes(requester)) {
      return { error: `User ${requester} has not accepted collaboration for shared item ${sharedItem}.` };
    }

    // Effects: Create a new change request document.
    const requestID = await this.getNextSequence("requestID");
    const newChangeRequestDoc: ChangeRequestDoc = {
      _id: freshID() as ChangeRequest,
      requestID: requestID,
      sharedItemPointer: sharedItem,
      requester: requester,
      requestedProperties: requestedProperties,
    };

    await this.changeRequests.insertOne(newChangeRequestDoc);

    // Effects: Add changeRequest to sharedItem.changeRequests.
    await this.sharedItems.updateOne(
      { _id: sharedItem },
      { $addToSet: { changeRequests: newChangeRequestDoc._id } },
    );

    return { changeRequest: newChangeRequestDoc._id };
  }

  /**
   * Action: confirmChange
   *
   * **requires**: `sharedItem` exists, `owner` is `sharedItem.owner`,
   *               `request` is in `sharedItem.changeRequests` (and is valid).
   * **effects**: Deletes `request` from `sharedItem.changeRequests` (and the `ChangeRequest` document itself).
   *              (Note: The actual application of properties to the external item is done by a concept sync).
   * @param owner The ID of the owner confirming the change.
   * @param sharedItem The ID of the shared item.
   * @param request The ID of the change request to confirm.
   * @returns An empty object on success or an `error`.
   */
  async confirmChange({
    owner,
    sharedItem,
    request,
  }: {
    owner: User;
    sharedItem: SharedItem;
    request: ChangeRequest;
  }): Promise<Empty | { error: string }> {
    // Precondition: sharedItem exists.
    const existingSharedItem = await this.sharedItems.findOne({ _id: sharedItem });
    if (!existingSharedItem) {
      return { error: `Shared item ${sharedItem} not found.` };
    }

    // Precondition: owner is sharedItem.owner.
    if (existingSharedItem.owner !== owner) {
      return { error: `User ${owner} is not the owner of shared item ${sharedItem}.` };
    }

    // Precondition: request exists and is associated with sharedItem.
    const existingChangeRequest = await this.changeRequests.findOne({ _id: request });
    if (!existingChangeRequest) {
      return { error: `Change request ${request} not found.` };
    }
    if (existingChangeRequest.sharedItemPointer !== sharedItem) {
        return { error: `Change request ${request} is not for shared item ${sharedItem}.` };
    }
    if (!existingSharedItem.changeRequests.includes(request)) {
        return { error: `Change request ${request} is not listed in shared item ${sharedItem}'s changeRequests.` };
    }

    // Effects: Delete request from sharedItem.changeRequests.
    await this.sharedItems.updateOne(
      { _id: sharedItem },
      { $pull: { changeRequests: request } },
    );

    // Effects: Also delete the ChangeRequest document itself.
    await this.changeRequests.deleteOne({ _id: request });

    return {};
  }

  /**
   * Action: rejectChange
   *
   * **requires**: `sharedItem` exists, `owner` is `sharedItem.owner`,
   *               `request` is in `sharedItem.changeRequests` (and is valid).
   * **effects**: Deletes `request` from `sharedItem.changeRequests` (and the `ChangeRequest` document itself).
   * @param owner The ID of the owner rejecting the change.
   * @param sharedItem The ID of the shared item.
   * @param request The ID of the change request to reject.
   * @returns An empty object on success or an `error`.
   */
  async rejectChange({
    owner,
    sharedItem,
    request,
  }: {
    owner: User;
    sharedItem: SharedItem;
    request: ChangeRequest;
  }): Promise<Empty | { error: string }> {
    // Precondition: sharedItem exists.
    const existingSharedItem = await this.sharedItems.findOne({ _id: sharedItem });
    if (!existingSharedItem) {
      return { error: `Shared item ${sharedItem} not found.` };
    }

    // Precondition: owner is sharedItem.owner.
    if (existingSharedItem.owner !== owner) {
      return { error: `User ${owner} is not the owner of shared item ${sharedItem}.` };
    }

    // Precondition: request exists and is associated with sharedItem.
    const existingChangeRequest = await this.changeRequests.findOne({ _id: request });
    if (!existingChangeRequest) {
      return { error: `Change request ${request} not found.` };
    }
    if (existingChangeRequest.sharedItemPointer !== sharedItem) {
        return { error: `Change request ${request} is not for shared item ${sharedItem}.` };
    }
    if (!existingSharedItem.changeRequests.includes(request)) {
        return { error: `Change request ${request} is not listed in shared item ${sharedItem}'s changeRequests.` };
    }

    // Effects: Delete request from sharedItem.changeRequests.
    await this.sharedItems.updateOne(
      { _id: sharedItem },
      { $pull: { changeRequests: request } },
    );

    // Effects: Also delete the ChangeRequest document itself.
    await this.changeRequests.deleteOne({ _id: request });

    return {};
  }
}
```