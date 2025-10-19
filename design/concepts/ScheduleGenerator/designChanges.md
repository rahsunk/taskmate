
## Spec changes:
- Added `initializeSchedule` so that a user can create a `Schedule`
- Fixed `editTask` so that its postcondition refers to modifying `oldTask` in the set of `Tasks` in `schedule`.
- Modified `Event` and `Task` states to have a `name` of type `String`, which `addEvent`, `editEvent`, `addTask`, `editTask` now include as a parameter.
- `generateSchedule` is no longer a system action, and can now be invoked manually. 
- Changed `schedulePointer` attributes in `Event` and `Task` states to be `scheduleID` to correspond to the unique ID number of a `Schedule`.
- Added `eventID` and `taskID` attributes to `Event` and `Task` states, respectively.
- Changed `startTime` and `endTime` to generic type `Date` and `repeat` to generic type `RepeatConfig` to emphasize that `events` can be scheduled for different days as well as times.

## Frequent issues:
- When generating tests using the LLM, the tests would frequently assume the type of declared union type variables, so I had to declare them as one specific type.
- LLM-generated tests did not account for the possibility that some declared variables could be null or undefined, so I had to add assertions that these variables exist for the tests to proceed.
- For the `completionLevel` attribute for `Tasks`, the LLM-generated tests would try to add `tasks` with a `completionLevel`, despite the spec stating that all created tasks have a `completionLevel` of 0. This prompted me to change the spec so that you can create a `task` with any `completionLevel` 
- The LLM-generated test cases for `generateSchedule` actions were often too strict, that is, it would check to see if all of the scheduled tasks were ordered by sooner deadline, higher priority level, higher expectedCompletionTime, and higher completionLevel first. Since the spec specified that these are general, and not strict constraints, I asked the LLM to loosen the assertions for these test cases.