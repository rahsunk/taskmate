---
timestamp: 'Sun Oct 19 2025 15:01:52 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251019_150152.8e25eb74.md]]'
content_id: d55a8eabcc90f7b5e27e790a9ff6eae7789aa8cb86d6b35201f6d70bb7757f8a
---

# concept: Notification

* **concept** Notification\[User, TargetItem]
  * **User**: Represents the recipient of the notification.
  * **TargetItem**: A generic identifier for the entity or object the notification pertains to (e.g., a `Schedule` ID, a `Task` ID, an `Event` ID from `ScheduleGenerator`, a `Post` ID from another concept, etc.).
* **purpose** Provide a robust and generic mechanism to configure, send, and track email notifications for users about specific items, allowing users to customize daily delivery times.
* **principle** A user or another concept defines notification settings for a specific user and target item, including a preferred daily delivery time. When an external trigger (from another concept or a system event) requests an email notification for that user and target item, the `Notification` concept sends the email according to the configured settings and logs the attempt.
* **state**
  * a set of `NotificationSettings` with
    * an `owner` of type `User`
    * a `targetItem` of type `TargetItem` (the ID of the entity this setting applies to)
    * a `notificationType` of type `String` (categorizes the purpose of the notification, e.g., "DAILY\_PROGRESS\_PROMPT", "DEADLINE\_ALERT", "EVENT\_REMINDER")
    * an `optional dailyNotificationTime` of type `Time` (e.g., "17:00" for 5 PM; for notifications intended to be delivered daily)
    * a `emailSubjectTemplate` of type `String` (a string template for the email subject)
    * a `emailBodyTemplate` of type `String` (a string template for the email body message, e.g., "Time to update progress for {{itemName}}!")
    * an `isEnabled` Flag (initially true, allows the owner to enable/disable specific notifications)
    * a `settingID` of type `Number` (static attribute, initially -1, uniquely identifies this setting)
  * a set of `SentNotifications` with
    * a `settingID` of type `NotificationSettings` (reference to the specific configuration that led to this notification)
    * a `sentTimestamp` of type `Date`
    * a `deliveryStatus` of `SUCCESS` or `FAILED`
    * a `sentNotificationID` of type `Number` (static attribute, initially -1, uniquely identifies a sent notification)
* **actions**
  * `createNotificationConfig(owner: User, targetItem: TargetItem, notificationType: String, dailyNotificationTime: Time, emailSubjectTemplate: String, emailBodyTemplate: String, isEnabled: Flag): (setting: NotificationSettings)`
    * **requires**: `owner` exists. `notificationType`, `emailSubjectTemplate`, and `emailBodyTemplate` are non-empty strings. `dailyNotificationTime` is a valid `Time`.
    * **effects**: Creates a new `NotificationSettings` entry for the specified `owner`, `targetItem`, and `notificationType` with the given attributes. `settingID` increments by 1. Returns the created `setting`.
  * `updateNotificationConfig(setting: NotificationSettings, notificationType: String, dailyNotificationTime: Time, emailSubjectTemplate: String, emailBodyTemplate: String, isEnabled: Flag)`
    * **requires**: `setting` exists.
    * **effects**: Modifies the `setting` with the given attributes. If `emailSubjectTemplate` or `emailBodyTemplate` are empty, they remain unchanged.
  * `deleteNotificationConfig(setting: NotificationSettings)`
    * **requires**: `setting` exists.
    * **effects**: Deletes the `setting` from `NotificationSettings` and all associated `SentNotifications`.
  * `triggerNotification(owner: User, targetItem: TargetItem, notificationType: String, contextData: String): (sentNotification: SentNotification | error: String)`
    * **requires**: `owner` exists. There exists at least one `NotificationSettings` entry that matches the `owner`, `targetItem`, and `notificationType` and has `isEnabled` set to true.
    * **effects**: Finds the relevant `NotificationSettings`. Renders the `emailSubjectTemplate` and `emailBodyTemplate` by incorporating information from `contextData` (e.g., using a templating engine). Attempts to send the email. Creates a `SentNotification` entry to record the attempt, `sentTimestamp`, and `deliveryStatus` (SUCCESS/FAILED). `sentNotificationID` increments by 1. Returns the `sentNotification` on success, or an `error` string if no matching enabled setting is found or email delivery fails.

***

### How `ScheduleGenerator` would use `Notification` (via synchronization):

1. **Configuration**: When a user initializes a schedule or explicitly sets up a daily progress reminder within `ScheduleGenerator`, a `NotificationSettings` entry is created in the `Notification` concept:

   ```
   // Example: ScheduleGenerator (or an orchestrating concept) sets up a notification config
   // This happens when a user initializes their schedule or opts into reminders.
   Notification.createNotificationConfig(
       owner: userId,
       targetItem: scheduleId, // The ID of the schedule being managed by ScheduleGenerator
       notificationType: "DAILY_PROGRESS_PROMPT",
       dailyNotificationTime: "20:00", // User's preferred time, e.g., 8 PM
       emailSubjectTemplate: "Daily Progress Reminder for {{scheduleName}}",
       emailBodyTemplate: "Hey, {{userName}}! It's 8PM. Don't forget to update your task progress for your schedule {{scheduleName}}!",
       isEnabled: true
   )
   ```

2. **Triggering (via a System Action and Synchronization)**: A system action (potentially within `ScheduleGenerator` itself or a dedicated `Scheduler` orchestrating concept) would be responsible for checking the current time and user preferences, then triggering the `Notification` concept.

   ```
   // (Hypothetical system action within an orchestrator or ScheduleGenerator for triggering daily emails)
   system checkAndTriggerDailyProgressEmail(schedule: Schedule, currentTime: Time, currentDate: Date)
       **requires**: `schedule` exists. There is a `NotificationSettings` with `owner = schedule.owner`, `targetItem = schedule.scheduleID`, `notificationType = "DAILY_PROGRESS_PROMPT"`, and `isEnabled = true`, whose `dailyNotificationTime` matches `currentTime`.
       **effects**: Triggers a notification via the Notification concept.
                   // This `effects` clause is realized by a synchronization rule (example below):

   // Example Synchronization Rule:
   sync DailyProgressReminderSync
   when
       ScheduleGenerator.checkAndTriggerDailyProgressEmail(schedule: s, currentTime: t, currentDate: d)
   where
       in Notification:
           setting.owner is s.owner
           setting.targetItem is s.scheduleID
           setting.notificationType is "DAILY_PROGRESS_PROMPT"
           setting.dailyNotificationTime is t // Matches the specific time
           setting.isEnabled is true
   then
       Notification.triggerNotification(
           owner: s.owner,
           targetItem: s.scheduleID,
           notificationType: "DAILY_PROGRESS_PROMPT",
           contextData: JSON.stringify({ userName: "Alice", scheduleName: "My Study Plan", current_date: d }) // Dynamic data for template
       )
   ```

This revised `Notification` concept is highly generic and reusable, as it only handles the *mechanism* of sending configured email notifications. The `ScheduleGenerator` concept remains focused on managing events and tasks and generating schedules, relying on `Notification` (via synchronizations) for its communication needs. The responsibility of *when* to send a notification (e.g., daily at a specific user-defined time) is now clearly delegated to the orchestrating logic that invokes `Notification.triggerNotification`.
