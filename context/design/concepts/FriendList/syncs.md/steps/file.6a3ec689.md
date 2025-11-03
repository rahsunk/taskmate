---
timestamp: 'Mon Nov 03 2025 14:04:06 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251103_140406.9333eaa6.md]]'
content_id: 6a3ec6893c9070a29f3b5a506a8d6c827fdc98b4d221dd5773b83699699c5b47
---

# file: src/syncs/FriendList.sync.ts

```typescript
import { actions, Frames, Sync } from "@engine";
import { FriendList, Requesting, Sessioning } from "@concepts";

// --- Helper for Authorization ---
// A reusable function for the 'where' clause to verify a session and get the active user.
const authorized = (
  frames: Frames,
  session: symbol,
  activeUser: symbol,
): Promise<Frames> => {
  if (frames.length === 0) return Promise.resolve(new Frames());
  // The 'session' variable is bound from the 'when' clause.
  // The 'activeUser' variable is a new variable to be bound with the user ID from the session.
  return frames.query(Sessioning._getUser, { session }, { user: activeUser });
};

// --- Send Friend Request ---

export const SendFriendRequest: Sync = ({ request, session, receiver, sender }) => ({
  when: actions([
    Requesting.request,
    { path: "/api/FriendList/sendFriendRequest", session, receiver },
    { request },
  ]),
  where: (frames) => authorized(frames, session, sender), // The logged-in user is the sender
  then: actions([FriendList.sendFriendRequest, { sender, receiver }]),
});

export const SendFriendRequestResponseSuccess: Sync = ({ request, friendRequest }) => ({
  when: actions(
    [Requesting.request, { path: "/api/FriendList/sendFriendRequest" }, { request }],
    [FriendList.sendFriendRequest, {}, { request: friendRequest }], // FriendList returns { request: ID } on success
  ),
  then: actions([Requesting.respond, { request, friendRequest }]),
});

export const SendFriendRequestResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/api/FriendList/sendFriendRequest" }, { request }],
    [FriendList.sendFriendRequest, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- Accept Friend Request ---

export const AcceptFriendRequest: Sync = ({ request, session, sender, receiver }) => ({
  when: actions([
    Requesting.request,
    { path: "/api/FriendList/acceptFriendRequest", session, sender },
    { request },
  ]),
  where: (frames) => authorized(frames, session, receiver), // The logged-in user is the receiver
  then: actions([FriendList.acceptFriendRequest, { receiver, sender }]),
});

export const AcceptFriendRequestResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/api/FriendList/acceptFriendRequest" }, { request }],
    [FriendList.acceptFriendRequest, {}, { success: true }],
  ),
  then: actions([Requesting.respond, { request, status: "accepted" }]),
});

export const AcceptFriendRequestResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/api/FriendList/acceptFriendRequest" }, { request }],
    [FriendList.acceptFriendRequest, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- Decline Friend Request ---

export const DeclineFriendRequest: Sync = ({ request, session, sender, receiver }) => ({
  when: actions([
    Requesting.request,
    { path: "/api/FriendList/declineFriendRequest", session, sender },
    { request },
  ]),
  where: (frames) => authorized(frames, session, receiver), // The logged-in user is the receiver
  then: actions([FriendList.declineFriendRequest, { receiver, sender }]),
});

export const DeclineFriendRequestResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/api/FriendList/declineFriendRequest" }, { request }],
    [FriendList.declineFriendRequest, {}, { success: true }],
  ),
  then: actions([Requesting.respond, { request, status: "declined" }]),
});

export const DeclineFriendRequestResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/api/FriendList/declineFriendRequest" }, { request }],
    [FriendList.declineFriendRequest, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- Cancel Sent Request ---

export const CancelSentRequest: Sync = ({ request, session, receiver, sender }) => ({
  when: actions([
    Requesting.request,
    { path: "/api/FriendList/cancelSentRequest", session, receiver },
    { request },
  ]),
  where: (frames) => authorized(frames, session, sender), // The logged-in user is the sender
  then: actions([FriendList.cancelSentRequest, { sender, receiver }]),
});

export const CancelSentRequestResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/api/FriendList/cancelSentRequest" }, { request }],
    [FriendList.cancelSentRequest, {}, { success: true }],
  ),
  then: actions([Requesting.respond, { request, status: "canceled" }]),
});

export const CancelSentRequestResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/api/FriendList/cancelSentRequest" }, { request }],
    [FriendList.cancelSentRequest, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- Remove Friend ---

export const RemoveFriendRequest: Sync = ({ request, session, friendToRemove, remover }) => ({
  when: actions([
    Requesting.request,
    { path: "/api/FriendList/removeFriend", session, user2: friendToRemove },
    { request },
  ]),
  where: (frames) => authorized(frames, session, remover), // The logged-in user is the remover
  then: actions([FriendList.removeFriend, { user1: remover, user2: friendToRemove }]),
});

export const RemoveFriendResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/api/FriendList/removeFriend" }, { request }],
    [FriendList.removeFriend, {}, { success: true }],
  ),
  then: actions([Requesting.respond, { request, status: "removed" }]),
});

export const RemoveFriendResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/api/FriendList/removeFriend" }, { request }],
    [FriendList.removeFriend, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- QUERIES (with Authorization) ---

// --- Query: Get Friendships By User (logged-in user's friends) ---
export const GetMyFriendshipsRequest: Sync = ({ request, session, activeUser, results }) => ({
  when: actions([
    Requesting.request,
    { path: "/api/FriendList/_getFriendshipsByUser", session },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames.at(0)!;
    const authedFrames = await authorized(frames, session, activeUser);

    if (authedFrames.length === 0) {
      return new Frames({ ...originalFrame, [results]: { error: "Unauthorized" } });
    }

    const userForQuery = authedFrames.at(0)![activeUser];
    const friendships = await FriendList._getFriendshipsByUser({ user: userForQuery });
    authedFrames.at(0)![results] = friendships;
    return authedFrames;
  },
  then: actions([Requesting.respond, { request, results }]),
});

// --- Query: Get Sent Friend Requests (for logged-in user) ---
export const GetSentFriendRequestsRequest: Sync = ({ request, session, activeUser, results }) => ({
  when: actions([
    Requesting.request,
    { path: "/api/FriendList/_getSentFriendRequests", session },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames.at(0)!;
    const authedFrames = await authorized(frames, session, activeUser);

    if (authedFrames.length === 0) {
      return new Frames({ ...originalFrame, [results]: { error: "Unauthorized" } });
    }

    const sender = authedFrames.at(0)![activeUser];
    const sentRequests = await FriendList._getSentFriendRequests({ sender });
    authedFrames.at(0)![results] = sentRequests;
    return authedFrames;
  },
  then: actions([Requesting.respond, { request, results }]),
});

// --- Query: Get Received Friend Requests (for logged-in user) ---
export const GetReceivedFriendRequestsRequest: Sync = ({ request, session, activeUser, results }) => ({
  when: actions([
    Requesting.request,
    { path: "/api/FriendList/_getReceivedFriendRequests", session },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames.at(0)!;
    const authedFrames = await authorized(frames, session, activeUser);

    if (authedFrames.length === 0) {
      return new Frames({ ...originalFrame, [results]: { error: "Unauthorized" } });
    }

    const receiver = authedFrames.at(0)![activeUser];
    const receivedRequests = await FriendList._getReceivedFriendRequests({ receiver });
    authedFrames.at(0)![results] = receivedRequests;
    return authedFrames;
  },
  then: actions([Requesting.respond, { request, results }]),
});

// --- Query: Get Friendship Details ---
export const GetFriendshipDetailsRequest: Sync = ({ request, session, friendshipId, activeUser, results }) => ({
  when: actions([
    Requesting.request,
    { path: "/api/FriendList/_getFriendshipDetails", session, friendshipId },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames.at(0)!;
    const authedFrames = await authorized(frames, session, activeUser);

    if (authedFrames.length === 0) {
      return new Frames({ ...originalFrame, [results]: { error: "Unauthorized" } });
    }

    const friendshipDetails = await FriendList._getFriendshipDetails({ friendshipId });
    const user = authedFrames.at(0)![activeUser];

    // Secondary Authorization: Is the active user part of this friendship?
    if (friendshipDetails.length > 0 &&
      friendshipDetails[0].user1 !== user &&
      friendshipDetails[0].user2 !== user) {
      authedFrames.at(0)![results] = { error: "Forbidden: You are not part of this friendship." };
    } else {
      authedFrames.at(0)![results] = friendshipDetails;
    }

    return authedFrames;
  },
  then: actions([Requesting.respond, { request, results }]),
});

// --- Query: Get Friend Request Details ---
export const GetFriendRequestDetailsRequest: Sync = ({ request, session, requestId, activeUser, results }) => ({
  when: actions([
    Requesting.request,
    { path: "/api/FriendList/_getFriendRequestDetails", session, requestId },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames.at(0)!;
    const authedFrames = await authorized(frames, session, activeUser);

    if (authedFrames.length === 0) {
      return new Frames({ ...originalFrame, [results]: { error: "Unauthorized" } });
    }

    const requestDetails = await FriendList._getFriendRequestDetails({ requestId });
    const user = authedFrames.at(0)![activeUser];

    // Secondary Authorization: Is the active user the sender or receiver?
    if (requestDetails.length > 0 &&
      requestDetails[0].sender !== user &&
      requestDetails[0].receiver !== user) {
      authedFrames.at(0)![results] = { error: "Forbidden: You are not part of this friend request." };
    } else {
      authedFrames.at(0)![results] = requestDetails;
    }

    return authedFrames;
  },
  then: actions([Requesting.respond, { request, results }]),
});

// The following are assumed to be admin-only and are left without specific secondary authorization
// for brevity, but a similar pattern could be used to check for an admin role.

// --- Query: Get All Friendships ---
export const GetAllFriendshipsRequest: Sync = ({ request, session, activeUser, results }) => ({
  when: actions([
    Requesting.request,
    { path: "/api/FriendList/_getAllFriendships", session },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames.at(0)!;
    const authedFrames = await authorized(frames, session, activeUser);
    if (authedFrames.length === 0) {
      return new Frames({ ...originalFrame, [results]: { error: "Unauthorized" } });
    }
    const friendships = await FriendList._getAllFriendships({});
    authedFrames.at(0)![results] = friendships;
    return authedFrames;
  },
  then: actions([Requesting.respond, { request, results }]),
});

// --- Query: Get All Friend Requests ---
export const GetAllFriendRequestsRequest: Sync = ({ request, session, activeUser, results }) => ({
  when: actions([
    Requesting.request,
    { path: "/api/FriendList/_getAllFriendRequests", session },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames.at(0)!;
    const authedFrames = await authorized(frames, session, activeUser);
    if (authedFrames.length === 0) {
      return new Frames({ ...originalFrame, [results]: { error: "Unauthorized" } });
    }
    const friendRequests = await FriendList._getAllFriendRequests({});
    authedFrames.at(0)![results] = friendRequests;
    return authedFrames;
  },
  then: actions([Requesting.respond, { request, results }]),
});
```

There are various Typescript errors; here is an example of each type:

* Type 'unknown' is not assignable to type 'ID'.  Type 'unknown' is not assignable to type 'string'.deno-ts(2322)
* Element implicitly has an 'any' type because expression of type '0' can't be used to index type 'FriendRequestDoc\[] | { error: string; }'.  Property '0' does not exist on type 'FriendRequestDoc\[] | { error: string; }'.deno-ts(7053)
