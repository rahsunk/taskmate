
## Spec changes:
- The original spec, `ProgressNotification` was dependent on the `ScheduleGenerator` concept, so I refactored it into a generic `Notification` concept to improve modularity and separation of concerns.
- `Tasks` are no longer referenced in the state, instead a generic `Item` relating to the notification is referenced
- For the sake of completeness, I expanded the state and actions of `Notification` so that `users` can configure settings into `NotificationSettings` and each notification is recorded into `SentNotifications`
	- Specified that notifications are sent to a specified `email`
	- `createNotificationConfig`, `editNotificationConfig`, `deleteNotificationConfig` manages notification settings for a `User` and `Item`.
	- `sendNotification` which was derived from the original `notifyForProgess` action is no longer a system action, allowing it to be called manually either by the user or another concept action


## Frequent issues:
- The original LLM-generated code for the tests placed them all in one file alongside the implementation; after asking the LLM to separate these into two files, I experienced many errors involving importing and exporting modules between them.
- The LLM-generated test cases would frequently assume an object that is defined to be a union type to be one of those types, so I had to ask the LLM to assert that all of these objects were one of those types.