---
timestamp: 'Sun Oct 19 2025 15:28:49 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251019_152849.31752e21.md]]'
content_id: a8783f5d6972afd33698c5476b4dd8347c7f44c82ddd6fbe00ed00b12fa392ce
---

# concept: Notification

* **concept** Notification\[User, Item]
* **purpose** Provides a system to configure, send, and track email notifications for users about specific items, allowing users to customize daily delivery times
* **principle** Notification settings for a specific user and target item are defined, including a preferred daily delivery time. When a request for an email notification for the user and target item is made, an email configured by the settings is sent to the user and logged
* **state**
  * a set of `NotificationSettings` with
    * an `owner` of type `User`
    * an `email` of type `Email`
    * a `settingID` of type `Number` (static attribute, initially -1)
    * a `targetItem` of type `Item`
    * a `dailyTime` of type `Time`
    * a `emailSubject` of type `String`
    * a `emailBody` of type `String`
    * an `isEnabled` of type `Boolean`
  * a set of `SentNotifications` with
    * a `sentNotificationID` of type `Number` (static attribute, initially -1)
    * a `settingID` of type Number
    * a `timestamp` of type `Date`
    * a `wasSent` of type `Boolean`
* **actions**
  * `createNotificationConfig (owner: User, email: Email, targetItem: Item, notificationType: String, dailyTime: Time, emailSubjectTemplate: String, emailBodyTemplate: String, isEnabled: Flag): (setting: NotificationSettings)`
    * **requires**: `owner` exists
    * **effects**: Creates and returns a new `NotificationSettings` for `owner` with the given attributes, with `settingID` incrementing by 1
  * `editNotificationConfig (setting: NotificationSettings, email: Email, targetItem: Item, notificationType: String, dailyTime: Time, emailSubjectTemplate: String, emailBodyTemplate: String, isEnabled: Flag)`
    * **requires**: `setting` exists
    * **effects**: Modifies `setting` with the given attributes
  * `deleteNotificationConfig (setting: NotificationSettings)`
    * **requires**: `setting` exists
    * **effects**: Deletes `setting` from `NotificationSettings` and all associated `SentNotifications`
  * `sendNotification(owner: User, targetItem: Item, notificationType: String, contextData: String): (sentNotification: SentNotification | error: Error)`
    * **requires**: `owner` exists and there exists a `NotificationSettings` entry with the same `owner`, `targetItem`, and `notificationType`, and has `isEnabled` set to true.
    * **effects**: Finds the specified `settings` of type `NotificationSettings`, and uses `settings.emailSubjectTemplate`, `settings.emailBodyTemplate, settings.email` to send the email to `settings.email`. Creates a `SentNotification` entry to record the attempt, `timestamp`, and `wasSent` (true if success, false otherwise) with `sentNotificationID` incrementing by 1. Returns `sentNotification` on success, or an `error` string if no matching and enabled setting was found or email delivery fails.
