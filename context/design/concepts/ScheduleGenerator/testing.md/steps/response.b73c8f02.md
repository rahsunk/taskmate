---
timestamp: 'Sun Oct 19 2025 13:30:29 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251019_133029.0dd90843.md]]'
content_id: b73c8f02563d42f3d748827ae9d2b6e977957701625b9c6f7142eb39d2f30314
---

# response:

The concept specification, implementation, and test file have been updated to allow the `addTask` action to initialize tasks with any given `completionLevel` (between 0 and 100 inclusive).

Here are the changes:

1. **Concept Specification (`ScheduleGenerator`)**:
   * The `addTask` action signature has been updated to include `completionLevel: Percent` as an input parameter.
   * A `requires` clause has been added to `addTask` to ensure `completionLevel` is between 0 and 100.
   * The `effects` clause for `addTask` now indicates that `completionLevel` is set to the provided value, rather than always 0%.

2. **Implementation File (`ScheduleGeneratorConcept.ts`)**:
   * The `addTask` method's parameters have been updated to accept `completionLevel`.
   * Validation for `completionLevel` (0-100%) has been added within the `addTask` method's preconditions.
   * The `newTaskDoc` creation in `addTask` now uses the `completionLevel` provided in the arguments.

3. **Test File (`ScheduleGeneratorConcept.test.ts`)**:
   * All existing calls to `addTask` have been updated to include `completionLevel: 0` (or `50` for the partial task, as it was previously).
   * A new test step has been added to `Basic CRUD` to verify that `addTask` fails when provided an invalid `completionLevel` (e.g., `101`).

These changes ensure that the concept is more flexible by allowing initial progress to be set when a task is created, while maintaining data integrity through validation.

***
