Check file:///Users/rahsunkomatsuzaki-fields/Desktop/MIT/academic/Y3/Fall/6.1040/taskmate/src/concepts/ItemSharing/ItemSharing.test.ts
running 1 test from ./src/concepts/ItemSharing/ItemSharing.test.ts
ItemSharing Concept Tests ...
  Operational Principle: Successful collaborative item modification lifecycle ...
------- output -------

--- Starting Operational Principle Test: Successful collaborative item modification lifecycle ---

--- Action: makeItemShareable (owner: user:f8kt2f9za, externalItemID: item:ild58cgh7) ---

--- Result: ---
{ sharedItem: "0199fe98-7691-749d-9346-19de3f8ae4e5" }

--- State after makeItemShareable: ---
{
  _id: "0199fe98-7691-749d-9346-19de3f8ae4e5",
  sharedItemID: 1,
  externalItemID: "item:ild58cgh7",
  owner: "user:f8kt2f9za",
  participants: [],
  acceptedParticipants: [],
  changeRequests: []
}

--- Action: shareItemWith (sharedItem: 0199fe98-7691-749d-9346-19de3f8ae4e5, targetUser: user:ctavrui3b) ---

--- Result: ---
{}

--- State after shareItemWith: ---
{
  _id: "0199fe98-7691-749d-9346-19de3f8ae4e5",
  sharedItemID: 1,
  externalItemID: "item:ild58cgh7",
  owner: "user:f8kt2f9za",
  participants: [ "user:ctavrui3b" ],
  acceptedParticipants: [],
  changeRequests: []
}

--- Action: acceptToCollaborate (sharedItem: 0199fe98-7691-749d-9346-19de3f8ae4e5, user: user:ctavrui3b) ---

--- Result: ---
{}

--- State after acceptToCollaborate: ---
{
  _id: "0199fe98-7691-749d-9346-19de3f8ae4e5",
  sharedItemID: 1,
  externalItemID: "item:ild58cgh7",
  owner: "user:f8kt2f9za",
  participants: [ "user:ctavrui3b" ],
  acceptedParticipants: [ "user:ctavrui3b" ],
  changeRequests: []
}

--- Action: requestChange (sharedItem: 0199fe98-7691-749d-9346-19de3f8ae4e5, requester: user:ctavrui3b, requestedProperties: {"title":"New Title A","content":"Updated content A"}) ---

--- Result: ---
{ changeRequest: "0199fe98-7783-72a7-9373-757925e51ecc" }

--- State after requestChange (SharedItem): ---
{
  _id: "0199fe98-7691-749d-9346-19de3f8ae4e5",
  sharedItemID: 1,
  externalItemID: "item:ild58cgh7",
  owner: "user:f8kt2f9za",
  participants: [ "user:ctavrui3b" ],
  acceptedParticipants: [ "user:ctavrui3b" ],
  changeRequests: [ "0199fe98-7783-72a7-9373-757925e51ecc" ]
}

--- State after requestChange (ChangeRequest): ---
{
  _id: "0199fe98-7783-72a7-9373-757925e51ecc",
  requestID: 1,
  sharedItemPointer: "0199fe98-7691-749d-9346-19de3f8ae4e5",
  requester: "user:ctavrui3b",
  requestedProperties: { title: "New Title A", content: "Updated content A" }
}

--- Action: confirmChange (owner: user:f8kt2f9za, sharedItem: 0199fe98-7691-749d-9346-19de3f8ae4e5, request: 0199fe98-7783-72a7-9373-757925e51ecc) ---

--- Result: ---
{}

--- State after confirmChange (SharedItem): ---
{
  _id: "0199fe98-7691-749d-9346-19de3f8ae4e5",
  sharedItemID: 1,
  externalItemID: "item:ild58cgh7",
  owner: "user:f8kt2f9za",
  participants: [ "user:ctavrui3b" ],
  acceptedParticipants: [ "user:ctavrui3b" ],
  changeRequests: []
}
----- output end -----
  Operational Principle: Successful collaborative item modification lifecycle ... ok (543ms)
  makeItemShareable: error when item already shared ...
------- output -------

--- Testing makeItemShareable error: item already shared ---

--- Result (expected error): ---
{
  error: "Item with externalItemID item:ydwo3lvz8 is already registered for sharing."
}
----- output end -----
  makeItemShareable: error when item already shared ... ok (83ms)
  shareItemWith: error cases ...
------- output -------

--- Testing shareItemWith error cases ---

--- Result (non-existent sharedItem): ---
{ error: "Shared item sharedItem:vkvt2nza4 not found." }

--- Result (already participant): ---
{
  error: "User user:ctavrui3b is already a participant for shared item 0199fe98-78e6-78fe-9bb4-a578fdc267f2."
}
----- output end -----
  shareItemWith: error cases ... ok (167ms)
  unshareItemWith: removes participant, accepted status, and their change requests ...
------- output -------

--- Testing unshareItemWith: removes participant, accepted status, and their change requests ---

--- Initial state: ---
{
  _id: "0199fe98-798e-7eea-80e4-ac9b1976201d",
  sharedItemID: 4,
  externalItemID: "item:rep39xhek",
  owner: "user:f8kt2f9za",
  participants: [ "user:ctavrui3b", "user:vwcmjkof8" ],
  acceptedParticipants: [ "user:ctavrui3b", "user:vwcmjkof8" ],
  changeRequests: [
    "0199fe98-7a8b-7273-b207-024253a55177",
    "0199fe98-7af3-7c8d-b55a-59a51e81e7f4"
  ]
}

--- Action: unshareItemWith (sharedItem: 0199fe98-798e-7eea-80e4-ac9b1976201d, targetUser: user:ctavrui3b) ---

--- State after unsharing Participant A: ---
{
  _id: "0199fe98-798e-7eea-80e4-ac9b1976201d",
  sharedItemID: 4,
  externalItemID: "item:rep39xhek",
  owner: "user:f8kt2f9za",
  participants: [ "user:vwcmjkof8" ],
  acceptedParticipants: [ "user:vwcmjkof8" ],
  changeRequests: [ "0199fe98-7af3-7c8d-b55a-59a51e81e7f4" ]
}

--- Action: unshareItemWith (sharedItem: 0199fe98-798e-7eea-80e4-ac9b1976201d, targetUser: user:e5k60f0zk) ---

--- Result (unshare non-participant): ---
{
  error: "User user:e5k60f0zk is not a participant for shared item 0199fe98-798e-7eea-80e4-ac9b1976201d."
}
----- output end -----
  unshareItemWith: removes participant, accepted status, and their change requests ... ok (668ms)
  rejectCollaboration: removes participant, accepted status, and their change requests ...
------- output -------

--- Testing rejectCollaboration: removes participant, accepted status, and their change requests ---

--- Initial state: ---
{
  _id: "0199fe98-7c27-7f7c-8d7d-46594306d8a4",
  sharedItemID: 5,
  externalItemID: "item:evqjdwme9",
  owner: "user:f8kt2f9za",
  participants: [ "user:ctavrui3b", "user:vwcmjkof8" ],
  acceptedParticipants: [ "user:ctavrui3b" ],
  changeRequests: [ "0199fe98-7cdf-7e6d-b573-2c65d89a9fe2" ]
}

--- Action: rejectCollaboration (sharedItem: 0199fe98-7c27-7f7c-8d7d-46594306d8a4, user: user:ctavrui3b) ---

--- State after rejecting Participant A: ---
{
  _id: "0199fe98-7c27-7f7c-8d7d-46594306d8a4",
  sharedItemID: 5,
  externalItemID: "item:evqjdwme9",
  owner: "user:f8kt2f9za",
  participants: [ "user:vwcmjkof8" ],
  acceptedParticipants: [],
  changeRequests: []
}

--- Action: rejectCollaboration (sharedItem: 0199fe98-7c27-7f7c-8d7d-46594306d8a4, user: user:e5k60f0zk) ---

--- Result (reject non-participant): ---
{
  error: "User user:e5k60f0zk is not a participant for shared item 0199fe98-7c27-7f7c-8d7d-46594306d8a4."
}
----- output end -----
  rejectCollaboration: removes participant, accepted status, and their change requests ... ok (447ms)
  requestChange: error if requester not an accepted participant ...
------- output -------

--- Testing requestChange error: requester not accepted participant ---

--- Action: requestChange (requester not accepted: user:ctavrui3b) ---

--- Result (expected error): ---
{
  error: "User user:ctavrui3b has not accepted collaboration for shared item 0199fe98-7de8-75cb-a951-8716b9ad6e40."
}
----- output end -----
  requestChange: error if requester not an accepted participant ... ok (129ms)
  confirmChange / rejectChange: error cases ...
------- output -------

--- Testing confirmChange / rejectChange error cases ---

--- Action: confirmChange (wrong owner: user:ctavrui3b) ---

--- Result (confirmChange, wrong owner): ---
{
  error: "User user:ctavrui3b is not the owner of shared item 0199fe98-7e6a-73a4-8203-c64f03ac359c."
}

--- Action: confirmChange (non-existent shared item: sharedItem:wh7ccplff) ---

--- Result (confirmChange, non-existent shared item): ---
{ error: "Shared item sharedItem:wh7ccplff not found." }

--- Action: confirmChange (non-existent change request: changeRequest:v75iss8sq) ---

--- Result (confirmChange, non-existent change request): ---
{ error: "Change request changeRequest:v75iss8sq not found." }

--- Action: rejectChange (wrong owner: user:ctavrui3b) ---

--- Result (rejectChange, wrong owner): ---
{
  error: "User user:ctavrui3b is not the owner of shared item 0199fe98-7e6a-73a4-8203-c64f03ac359c."
}

--- Action: rejectChange (non-existent shared item: sharedItem:wh7ccplff) ---

--- Result (rejectChange, non-existent shared item): ---
{ error: "Shared item sharedItem:wh7ccplff not found." }

--- Action: rejectChange (non-existent change request: changeRequest:v75iss8sq) ---

--- Result (rejectChange, non-existent change request): ---
{ error: "Change request changeRequest:v75iss8sq not found." }
----- output end -----
  confirmChange / rejectChange: error cases ... ok (398ms)
ItemSharing Concept Tests ... ok (2s)

ok | 1 passed (7 steps) | 0 failed (3s)