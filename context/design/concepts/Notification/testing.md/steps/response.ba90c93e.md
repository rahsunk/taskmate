---
timestamp: 'Sun Oct 19 2025 16:08:35 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251019_160835.2fded0da.md]]'
content_id: ba90c93ea100842f216ef50a596679e38220d5fc615ee1562225fae34e8cdb0b
---

# response:

The TypeScript errors you're encountering, "Property 'setting' does not exist on type '{ setting: NotificationSetting; } | { error: string; }'. Property 'setting' does not exist on type '{ error: string; }'." occur because TypeScript sees that the return type of your asynchronous actions (like `createNotificationConfig` or `sendNotification`) is a *union type*. This union indicates that the function could return either a successful result (e.g., `{ setting: NotificationSetting }`) or an error result (e.g., `{ error: string }`).

When you try to access `createResult.setting` directly, TypeScript correctly points out that if the function returned the error variant, the `setting` property wouldn't exist on that object.

To resolve this, you need to either:

1. **Use a type guard** to narrow the type: `if (createResult.setting) { /* ... */ }` or `if ('error' in createResult) { /* ... */ } else { /* ... */ }`.
2. **Use a non-null assertion (`!`)** after you've already asserted its existence: After `assertExists(createResult.setting)`, you can tell TypeScript, "I know for sure `createResult.setting` exists here," by writing `createResult.setting!`. This is suitable for test cases where you expect success and have an assertion to back it up.

I will apply the non-null assertion (`!`) after `assertExists` checks for the successful paths. For error paths, the existing checks for `error` will remain the primary assertions.

Here's the corrected test file:

***
