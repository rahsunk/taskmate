---
timestamp: 'Mon Nov 03 2025 14:08:57 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251103_140857.dbf63cd5.md]]'
content_id: d8f1d0316a564aa3daff88b307129a80a539440f82d4923ea352ef743aba30eb
---

# response:

You are correct to point out those errors. They arise because the `_getAllFriendships` and `_getAllFriendRequests` methods in the `FriendListConcept` implementation were defined to take zero arguments, but the synchronization was calling them with an empty object `{}`.

The fix is to simply call these methods without any arguments.

Here is the fully corrected `src/syncs/FriendList.sync.ts` file, which includes the fix for this issue as well as the previous corrections for type safety.
