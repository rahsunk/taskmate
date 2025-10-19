---
timestamp: 'Sun Oct 19 2025 16:22:19 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251019_162219.8a66f0f1.md]]'
content_id: b71bd0af822ca098a73c039e8dcd623e4b6b9d58e406f725c79ff9b1513779d6
---

# response:

You are absolutely right to point out that relying on non-null assertions (`!`) after an `assertExists` check, without a prior type guard, is still problematic for union types. While `assertExists` checks for runtime existence (i.e., not `null` or `undefined`), it doesn't always guarantee that the *type* is narrowed by TypeScript if the original variable is a union that *might not* have that property in one of its forms.

The error message `Property 'setting' does not exist on type '{ setting: NotificationSetting; } | { error: string; }'. Property 'setting' does not exist on type '{ error: string; }'.` specifically indicates that TypeScript still considers the variable (e.g., `createResult`) to be the full union type at the point where `createResult.setting` is accessed.

To address this robustly, we need to ensure that the variable holding the union type is *explicitly narrowed* using a type guard (`if ('error' in result)`) *before* attempting to access properties that might only exist on one part of the union.

I've refactored the test file `src/notification/NotificationConcept.test.ts` to use this more explicit type-guarding pattern consistently. For each action that returns a union type:

1. I declare the variables (e.g., `setting`, `sentNotif`, `settingID`) that will hold the narrowed successful result *outside* the `if/else` block.
2. Inside the `if ('error' in result)` block, I fail the test immediately if an unexpected error occurs.
3. Inside the `else` block (where TypeScript has successfully narrowed the type to the success variant), I assign the relevant property (e.g., `result.setting`) to the previously declared variable.
4. Subsequent assertions then use this newly assigned, type-narrowed variable, making the code much safer and clearer to TypeScript.

This pattern ensures that at compile-time, TypeScript knows exactly what shape the object is before properties are accessed, eliminating the union type errors.

***
