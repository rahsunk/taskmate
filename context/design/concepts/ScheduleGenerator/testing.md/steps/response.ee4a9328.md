---
timestamp: 'Sun Oct 19 2025 13:14:45 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251019_131445.b2d28fe6.md]]'
content_id: ee4a93289fa6ec8ebcc3293415ae981d263d649431f2621fada40119d44a9e29
---

# response:

The TypeScript error `Object literal may only specify known properties, and 'completionLevel' does not exist in type '{ schedule: ID; name: string; deadline: Date; expectedCompletionTime: number; priority: number; }'` indicates that the type checker believes the `editTask` method's argument object does not include `completionLevel` (and also implicitly, `oldTask`, as it's missing from the reported type).

Upon reviewing the provided concept specification for `ScheduleGenerator (Revised)`, there is a **typographical error** in the `editTask` action definition:

**Original concept spec:**
`editTask(schedule: Schedule, name: String, oldTask: Task, deadline: Date, expectedCompletionTime: Number, completionLevel: Percent priority: Percent)`

The missing comma between `completionLevel: Percent` and `priority: Percent` makes this part of the specification ambiguous or syntactically incorrect in the concept language. While the TypeScript implementation correctly defines these as separate parameters:

**TypeScript `editTask` signature (correctly implemented):**

```typescript
  async editTask({
    schedule,
    oldTask,
    name,
    deadline,
    expectedCompletionTime,
    completionLevel,
    priority,
  }: {
    schedule: Schedule;
    oldTask: Task;
    name: string;
    deadline: Date;
    expectedCompletionTime: number;
    completionLevel: Percent;
    priority: Percent;
  }): Promise<Empty | { error: string }> {
    // ...
  }
```

The TypeScript implementation of the `ScheduleGeneratorConcept` already correctly includes `oldTask` and `completionLevel` in its parameters. The error you encountered likely stems from the TypeScript compiler (or a development environment feature like a language server) being confused by the incorrect concept specification, or, less likely, a caching issue where it's not picking up the latest correct definition from your `.ts` file.

**Fix:**
The primary fix is to correct the concept specification to properly separate the `completionLevel` and `priority` parameters. The TypeScript implementation of `editTask` as provided is already correct and aligns with the *intended* corrected specification.

***
