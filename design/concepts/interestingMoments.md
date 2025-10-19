## ScheduleGenerator
- LLM-generated implementation uses a placeholder algorithm for `generateSchedule`
	- [@response.95b88f1b](../../context/design/concepts/ScheduleGenerator/implementation.md/steps/response.95b88f1b.md)
	- I was expecting the LLM to generate an implementation for `generateSchedule` that satisfies its spec, but instead, all it does is map the events and tasks into the schedule by order of their creation time, ignoring all constraints regarding task priority, deadline, and expected completion time, which was far below my expectations for this action.
- LLM-generated implementation assumes that events are all scheduled on a single day
	- [@response.95b88f1b](../../context/design/concepts/ScheduleGenerator/implementation.md/steps/response.95b88f1b.md)
	- I noticed that in the implementation, the LLM decides to represent the start and end times of events in HH:MM format, which does not specify the dates of events. Hence, I had to specify that ScheduleGenerator should be able to schedule events at any date, just like with Tasks.
- LLM-generated implementation for `generateSchedule` enforces a constraint that tasks are to be scheduled from 9AM to 5PM.
	- [file.da8b4f41](../../context/design/concepts/ScheduleGenerator/implementation.md/steps/file.da8b4f41.md)
	- In my prompt, I only specified how the tasks should be ordered, not ideal times they should be schedule in. I think it's interesting that the LLM knew to schedule tasks during active hours, just from the given spec.

## Notification
- LLM-modified concept specified to use JSON for the `contextData` in `sendNotification`
	- [concept.11d649f7](../../context/design/concepts/Notification/implementation.md/steps/concept.11d649f7.md)
	- When I first implemented this concept using the LLM, the LLM suggested I update the concept so that the spec more accurately reflects its outputted implementation. Most of these changes were trivial, but I found the change of `contextData` from `String` to `JSON` to be smart, since I was unsure of how the `sendNotification` action could be implemented. Despite this, I decided to use a generic parameter type `Data` in the concept spec so that it could be represented by more data structures in the implementation.