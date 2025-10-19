---
timestamp: 'Sun Oct 19 2025 14:30:28 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251019_143028.24e7595b.md]]'
content_id: 8b3d759e9652acf61c466d7ead884144184bed22c7de71f01902267f00945b0a
---

# concept: Notification

* **concept** Notification\[User, TargetItem]
  * **User**: Represents the recipient of the notification.
  * **TargetItem**: A generic identifier for the entity or object the notification pertains to (e.g., a `Schedule` ID, a `Task` ID from `ScheduleGenerator`, a `Post` ID from another concept, etc.).
* **purpose** Provide a robust and generic mechanism to configure, send, and track various types of notifications for users about specific items.
* **principle** A user or another concept defines notification settings for a specific user and target item. When an external trigger (from another concept or a system event) requests a notification for that user and target item, the `Notification` concept sends the message according to the configured settings and logs the attempt.
* **state**
  * a set of `NotificationSettings` with
    * an `owner` of type `User`
    * a `targetItem` of type `TargetItem` (the ID of the entity this setting applies to)
    * a `notificationType` of `REMINDER` or `ALERT` or `PROMPT` or `INFO` (categorizes the purpose of the notification, e.g., "DAILY\_PROGRESS\_PROMPT", "DEADLINE\_ALERT")
    * a `deliveryMethod` of `EMAIL` or `PUSH` or `SMS` (or a set of these, defining how the notification is sent)
    * a `notificationTextTemplate` of type `String` (a string template for the notification message, e.g., "Time to update progress for {{itemName}}!")
    * an `isEnabled` Flag (initially true, allows the owner to enable/disable specific notifications)
    * a `settingID` of type `Number` (static attribute, initially -1, uniquely identifies this setting)
  * a set of `SentNotifications` with
    * a `settingID` of type `NotificationSettings` (reference to the specific configuration that led to this notification)
    * a `sentTimestamp` of type `Date`
    * a `deliveryStatus` of `SUCCESS` or `FAILED`
    * an `optional acknowledgementTimestamp` of type `Date` (records when/if the user interacted with or dismissed the notification)
    * a `sentNotificationID` of type `Number` (static attribute, initially -1, uniquely identifies a sent notification)
* **actions**
  * `createNotificationConfig(owner: User, targetItem: TargetItem, notificationType: String, deliveryMethod: String, notificationTextTemplate: String, isEnabled: Flag): (setting: NotificationSettings)`
    * **requires**: `owner` exists. `notificationType` and `deliveryMethod` are valid types for this concept. `notificationTextTemplate` is a non-empty string.
    * **effects**: Creates a new `NotificationSettings` entry for the specified `owner`, `targetItem`, and `notificationType` with the given attributes. `settingID` increments by 1. Returns the created `setting`.
  * `updateNotificationConfig(setting: NotificationSettings, notificationType: String, deliveryMethod: String, notificationTextTemplate: String, isEnabled: Flag)`
    * **requires**: `setting` exists.
    * **effects**: Modifies the `setting` with the given attributes. If `notificationTextTemplate` is empty, it remains unchanged.
  * `deleteNotificationConfig(setting: NotificationSettings)`
    * **requires**: `setting` exists.
    * **effects**: Deletes the `setting` from `NotificationSettings` and all associated `SentNotifications`.
  * `triggerNotification(owner: User, targetItem: TargetItem, notificationType: String, contextData: String): (sentNotification: SentNotification | error: String)`
    * **requires**: `owner` exists. There exists at least one `NotificationSettings` entry that matches the `owner`, `targetItem`, and `notificationType` and has `isEnabled` set to true.
    * **effects**: Finds the relevant `NotificationSettings`. Renders the `notificationTextTemplate` by incorporating information from `contextData` (e.g., using a templating engine). Attempts to send the notification via the configured `deliveryMethod`. Creates a `SentNotification` entry to record the attempt, `sentTimestamp`, and `deliveryStatus` (SUCCESS/FAILED). `sentNotificationID` increments by 1. Returns the `sentNotification` on success, or an `error` string if no matching enabled setting is found or delivery fails.
  * `acknowledgeNotification(sentNotification: SentNotification)`
    * **requires**: `sentNotification` exists and `sentNotification.acknowledgementTimestamp` is not yet set.
    * **effects**: Sets `sentNotification.acknowledgementTimestamp` to the current `Date`.

***

### How `ScheduleGenerator` would use `Notification` (via synchronization):

With the refactored `Notification` concept, `ScheduleGenerator` (or an orchestrating concept) would be responsible for determining *when* to trigger a notification and *what* content to provide.

First, `ScheduleGenerator` (or a user setting within `ScheduleGenerator`) would need to set up a notification configuration using `Notification.createNotificationConfig`. For instance, to configure daily progress reminders:

```
// Example: ScheduleGenerator sets up a notification config for a user's schedule
// This might happen when a user initializes their schedule or opts into reminders.
Notification.createNotificationConfig(
    owner: userId,
    targetItem: scheduleId, // The ID of the schedule being managed
    notificationType: "PROGRESS_PROMPT",
    deliveryMethod: "PUSH", // Or "EMAIL", "SMS"
    notificationTextTemplate: "Hey, {{userName}}! It's 8PM. Don't forget to update your task progress for your schedule {{scheduleName}}!",
    isEnabled: true
)
```

Then, to actually send the daily progress prompt, `ScheduleGenerator` would have a system-level action (or be part of a larger `Scheduler` concept) that, at the appropriate time (e.g., every day at 8 PM), triggers the `Notification` concept:

```
// (Hypothetical system action within ScheduleGenerator or an orchestrator)
// This action runs daily to check if a progress prompt is needed
system checkAndTriggerDailyProgressPrompt(schedule: Schedule)
  **requires**: Current time is 8PM, and the `schedule` exists.
               No `SentNotification` of `PROGRESS_PROMPT` for this `schedule.owner` and `schedule.scheduleID` has been sent today.
  **effects**: Triggers a notification via the Notification concept.
              // This `effects` clause is realized by a synchronization rule:
              // sync DailyProgressReminderSync
              // when 
              //   ScheduleGenerator.checkAndTriggerDailyProgressPrompt(schedule: s)
              // then
              //   Notification.triggerNotification(
              //     owner: s.owner,
              //     targetItem: s.scheduleID,
              //     notificationType: "PROGRESS_PROMPT",
              //     contextData: JSON.stringify({ userName: "...", scheduleName: "..." }) // Dynamic data for template
              //   )
```

The user's subsequent action of updating their progress (e.g., `ScheduleGenerator.editTask`) and the `ScheduleGenerator.generateSchedule` actions remain entirely within the `ScheduleGenerator` concept, independent of `Notification`.

This refactoring fully separates the concerns: `Notification` handles *how* to notify, and `ScheduleGenerator` (or an orchestrator) handles *what* to schedule and *when* to trigger related notifications.
