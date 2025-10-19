---
timestamp: 'Sun Oct 19 2025 15:33:03 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251019_153303.1ce37085.md]]'
content_id: 11d649f74dec7f6e209bfc6dae88948b0322158fd77c712f1e1f0f9640985f4f
---

# concept: Notification (Updated Specification)

* **concept** Notification\[User, Item]

* **purpose** Provides a system to configure, send, and track email notifications for users about specific items, allowing users to customize daily delivery times.

* **principle** Notification settings for a specific user, specific item, and specific notification type are defined, including a preferred daily delivery time and templated content. When a request for an email notification matching these criteria is made, an email configured by the settings is sent to the user and the attempt is logged, allowing for success tracking or error reporting.

* **state**
  * a set of `NotificationSettings` with
    * an `owner` of type `User`
    * an `email` of type `String` (representing the recipient's email address)
    * a `targetItem` of type `Item`
    * a `notificationType` of type `String` (e.g., "reminder", "alert")
    * a `dailyTime` of type `String` (in "HH:MM" format, specifying a preferred daily delivery time)
    * an `emailSubjectTemplate` of type `String`
    * an `emailBodyTemplate` of type `String`
    * an `isEnabled` of type `Boolean`
  * a set of `SentNotifications` with
    * a `setting` of type `NotificationSetting` (references the specific notification configuration)
    * a `timestamp` of type `Date`
    * a `wasSent` of type `Boolean`
    * an `optional errorMessage` of type `String` (details if sending failed)

* **actions**
  * `createNotificationConfig (owner: User, email: String, targetItem: Item, notificationType: String, dailyTime: String, emailSubjectTemplate: String, emailBodyTemplate: String, isEnabled: Boolean): (setting: NotificationSetting | error: String)`
    * **requires**: `owner` exists (its identity is valid), and `email`, `targetItem`, `notificationType`, `dailyTime`, `emailSubjectTemplate`, `emailBodyTemplate`, `isEnabled` are valid and present. `dailyTime` is in "HH:MM" format.
    * **effects**: Creates and returns a new `NotificationSetting` (identified by its unique ID) with the given attributes. If any parameter is invalid or missing, returns an `error`.
  * `editNotificationConfig (settingID: NotificationSetting, email: String, targetItem: Item, notificationType: String, dailyTime: String, emailSubjectTemplate: String, emailBodyTemplate: String, isEnabled: Boolean): Empty | (error: String)`
    * **requires**: `settingID` exists in the set of `NotificationSettings`, and `email`, `targetItem`, `notificationType`, `dailyTime`, `emailSubjectTemplate`, `emailBodyTemplate`, `isEnabled` are valid and present. `dailyTime` is in "HH:MM" format.
    * **effects**: Modifies the `NotificationSetting` identified by `settingID` with the given attributes. If `settingID` is not found or parameters are invalid, returns an `error`.
  * `deleteNotificationConfig (settingID: NotificationSetting): Empty | (error: String)`
    * **requires**: `settingID` exists in the set of `NotificationSettings`.
    * **effects**: Deletes the `NotificationSetting` identified by `settingID` and all `SentNotification` entries that reference it. If `settingID` is not found, returns an `error`.
  * `sendNotification(owner: User, targetItem: Item, notificationType: String, contextData: JSON): (sentNotification: SentNotification | error: String)`
    * **requires**: `owner` exists (its identity is valid), and there exists an enabled `NotificationSetting` in the state that matches the given `owner`, `targetItem`, and `notificationType`. `contextData` is a valid JSON object.
    * **effects**: Finds the matching `NotificationSetting`. Constructs an email using `emailSubjectTemplate`, `emailBodyTemplate`, and `contextData` for templating, and attempts to send it to `NotificationSetting.email`. Creates a `SentNotification` entry to record the attempt, including its timestamp, whether `wasSent` is true or false, and an `errorMessage` if delivery failed. Returns the created `SentNotification` on success, or an `error` string if no matching/enabled setting was found or email delivery fails.

* **queries**
  * `_getNotificationSettingsForUser (owner: User): (settings: set of NotificationSetting)`
    * **effects**: Returns all `NotificationSetting` entries associated with the given `owner`.
  * `_getSentNotificationsForSetting (settingID: NotificationSetting): (sentNotifications: set of SentNotification)`
    * **effects**: Returns all `SentNotification` entries that reference the given `settingID`.
  * `_getEnabledSetting (owner: User, targetItem: Item, notificationType: String): (setting: NotificationSetting | null)`
    * **effects**: Returns a single enabled `NotificationSetting` that matches the given `owner`, `targetItem`, and `notificationType`, or `null` if no such setting is found.
