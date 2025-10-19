---
timestamp: 'Sun Oct 19 2025 16:03:52 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251019_160352.86bfc363.md]]'
content_id: 4e252c94e56a1c4f21e170985314a0160a70f2326417f6eb2e175a531dc624ff
---

# concept: Notification

* **concept** Notification\[User, Item]
* **purpose** Provides a system to configure, send, and track email notifications for users about specific items, allowing users to customize daily delivery times
* **principle** Notification settings for a specific user and target item are defined, including a preferred daily delivery time. When a request for an email notification for the user and target item is made, an email configured by the settings is sent to the user and logged
* **state**
  * a set of `NotificationSettings` with
    * an `owner` of type `User`
    * an `email` of type `String`
    * a `targetItem` of type `Item`
    * a `notificationType` of type `String`
    * a `dailyTime` of type `Time`
    * a `emailSubjectTemplate` of type `String`
    * a `emailBodyTemplate` of type `String`
    * an `isEnabled` of type `Boolean`
  * a set of `SentNotifications` with
    * a `settingID` of type `NotificationSetting` (references NotificationSetting's ID)
    * a `timestamp` of type `Date`
    * a `wasSent` of type `Boolean`
    * an `errorMessage` of type `String` (optional)
* **actions**
  * `createNotificationConfig (owner: User, email: String, targetItem: Item, notificationType: String, dailyTime: Time, emailSubjectTemplate: String, emailBodyTemplate: String, isEnabled: Flag): (setting: NotificationSetting | error: Error)`
    * **requires**: `owner` is a valid ID (existence check is external to this concept), `email` is a valid format, `dailyTime` is in "HH:MM" format.
    * **effects**: Creates and returns a new `NotificationSetting` document with a unique ID and the given attributes.
  * `editNotificationConfig (settingID: NotificationSetting, email: String, targetItem: Item, notificationType: String, dailyTime: Time, emailSubjectTemplate: String, emailBodyTemplate: String, isEnabled: Flag): (Empty | error: Error)`
    * **requires**: `settingID` exists in the `NotificationSettings` collection, `email` is valid, `dailyTime` is in "HH:MM" format.
    * **effects**: Modifies the `NotificationSetting` document matching `settingID` with the given attributes.
  * `deleteNotificationConfig (settingID: NotificationSetting): (Empty | error: Error)`
    * **requires**: `settingID` exists in the `NotificationSettings` collection.
    * **effects**: Deletes the `NotificationSetting` document matching `settingID` and all associated `SentNotification` documents.
  * `sendNotification(owner: User, targetItem: Item, notificationType: String, contextData: Record<String, String>): (sentNotification: SentNotification | error: Error)`
    * **requires**: `owner` exists (external check), there exists an `isEnabled` `NotificationSetting` matching `owner`, `targetItem`, and `notificationType`. `contextData` is a valid object for templating.
    * **effects**: Finds the specified `NotificationSetting`. Uses `emailSubjectTemplate`, `emailBodyTemplate`, `email`, and `contextData` to "send" a simulated email. Creates a `SentNotification` entry to record the attempt, `timestamp`, `wasSent` (true if simulated success, false otherwise), and `errorMessage` if failure. Returns the `SentNotification` on simulated success, or an `error` if no matching/enabled setting or simulated email delivery fails.

***
