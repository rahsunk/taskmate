---
timestamp: 'Mon Nov 03 2025 15:13:24 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251103_151324.73c009d3.md]]'
content_id: 9c8b3fbdc7e8b960d55a85bbd5cb31a9b3d7aa4379dab478f7bf42fff30b0f1d
---

# solution:

The provided `Messaging.sync.ts` file has two primary issues that cause the reported errors:

1. **Incorrect Query Return Types:** The `frames.query()` method in the synchronization engine expects that all concept queries (`_` prefixed methods) will *always* return a `Promise` that resolves to an array (e.g., `Promise<SomeDoc[]>`). If a query finds no results, it must return an empty array `[]`. The existing `MessagingConcept` implementation incorrectly returns an error object (e.g., `{ error: "Not found" }`), which is a pattern reserved for actions, not queries. This mismatch in return types causes the "No overload matches this call" error.

2. **Lack of Type Safety in Frames:** Variables retrieved from a `Frame` (`$[someSymbol]`) are of type `unknown` by default. Accessing properties like `conv.participant1` on an `unknown` type is unsafe and results in a TypeScript error.

To fix these issues, we will perform two steps:

1. Update the `MessagingConcept` implementation to ensure all its queries return `Promise<Doc[]>` as required.
2. Update the `Messaging.sync.ts` file to add the necessary type assertions inside the `where` clauses, making property access safe and explicit.

Here are the corrected file implementations:
