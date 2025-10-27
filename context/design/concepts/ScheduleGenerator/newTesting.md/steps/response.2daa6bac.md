---
timestamp: 'Mon Oct 27 2025 16:20:39 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251027_162039.bd67a3b2.md]]'
content_id: 2daa6bac9f522cab505b84231829adc2a0324e05ba5ad9be6f9507c6ee34d23f
---

# response:

You are absolutely correct! My apologies. I made a mistake by assuming `nonExistentId` from `Scenario 4` would implicitly be available in `Scenario 5`. In Deno's `t.step` blocks, variables declared within one step are not automatically scoped to other steps unless declared at a higher level.

To fix this, `nonExistentId` needs to be declared within the `Scenario 5` block (or, if it were truly a global constant for all tests, at the top level of the test file). Since its purpose is specific to demonstrating error handling with non-existent IDs in various query calls, it's best to declare it locally within `Scenario 5`.

Here's the corrected `src/ScheduleGenerator/ScheduleGeneratorConcept.test.ts` file with `nonExistentId` declared correctly within `Scenario 5`.

***
