---
timestamp: 'Sun Oct 19 2025 16:17:51 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251019_161751.485dffa1.md]]'
content_id: 98b64a361c7e81b8214a9679d5524a7e0cdb04a59ab69eac4349342c1b0b372c
---

# response:

You are absolutely correct! The error `Property 'sentNotifications' does not exist on type 'WithId< SentNotification >[]'` means that you are trying to destructure a property named `sentNotifications` from an array, when `toArray()` returns an array directly, not an object containing an array.

The line:
`const { sentNotifications: allFrankSent } = await db.collection<SentNotification>(PREFIX + "sentNotifications").find({}).toArray();`
should simply assign the array to `allFrankSent`.

Here's the corrected test file:

***
