[@ScheduleGenerator](../ScheduleGenerator/ScheduleGenerator.md)

[@concept-rubric](../../background/detailed/concept-rubric.md)

[@concept-state](../../background/detailed/concept-state.md)

[@concept-design-brief](../../background/concept-design-brief.md)

[@concept-design-overview](../../background/concept-design-overview.md)

[@concept-refactoring](../../background/concept-refactoring.md)

[@concept-specifications](../../background/concept-specifications.md)

# concept: Notification

* **concept** Notification\[User, Item]
* **purpose** Provides a system to configure, send, and track email notifications for users about specific items, allowing users to customize daily delivery times
* **principle** Notification settings for a specific user and target item are defined, including a preferred daily delivery time. When a request for an email notification for the user and target item is made, an email configured by the settings is sent to the user and logged
* **state**
    *   a set of `NotificationSettings` with
        * an `owner` of type `User`
        * an `email` of type `String`
        * a `targetItem` of type `Item`
        * a `notificationType` of type `String`
        * a `dailyTime` of type `Time`
        * a `emailSubject` of type `String`
        * a `emailBody` of type `String`
        * an `isEnabled` of type `Boolean`
    *   a set of `SentNotifications` with
        * a `setting` of type `NotificationSetting`
        * a `timestamp` of type `Date`
        * a `wasSent` of type `Boolean`
* **actions**
    * `createNotificationConfig (owner: User, email: String, targetItem: Item, notificationType: String, notificationType: String, dailyTime: Time, emailSubjectTemplate: String, emailBodyTemplate: String, isEnabled: Flag): (setting: NotificationSettings)`
        * **requires**: `owner` exists
        * **effects**: Creates and returns a new `NotificationSettings` for `owner` with the given attributes, with `settingID` incrementing by 1
    * `editNotificationConfig (setting: NotificationSettings, email: String, targetItem: Item, notificationType: String, dailyTime: Time, emailSubjectTemplate: String, emailBodyTemplate: String, isEnabled: Flag)`
        * **requires**: `setting` exists
        * **effects**: Modifies `setting` with the given attributes
    * `deleteNotificationConfig (setting: NotificationSettings)`
        * **requires**: `setting` exists
        * **effects**: Deletes `setting` from `NotificationSettings` and all associated `SentNotifications`
    * `sendNotification(owner: User, targetItem: Item, notificationType: String, contextData: Data): (sentNotification: SentNotification | error: Error)`
        * **requires**: `owner` exists and there exists a `NotificationSettings` entry with the same `owner`, `targetItem`, and `notificationType`, and has `isEnabled` set to true, and `contextData` is valid
        * **effects**: Finds the specified `settings` of type `NotificationSettings`, and uses `settings.emailSubjectTemplate`, `settings.emailBodyTemplate, settings.email`, and `contextData` to send the email to `settings.email`. Creates a `SentNotification` entry to record the attempt, `timestamp`, and `wasSent` (true if success, false otherwise) with `sentNotificationID` incrementing by 1. Returns `sentNotification` on success, or an `error` if no matching and enabled setting was found or email delivery fails.