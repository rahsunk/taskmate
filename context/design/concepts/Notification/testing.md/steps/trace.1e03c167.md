---
timestamp: 'Sun Oct 19 2025 16:03:52 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251019_160352.86bfc363.md]]'
content_id: 1e03c16759cc5f7564c724a223dccd905ffed2715cd4f926f2827e1ffb3bc6be
---

# trace: Operational Principle: Configure, Send, and Log Notification

This trace outlines the execution flow for the primary scenario that demonstrates how the `Notification` concept fulfills its purpose, as described in its operational principle.

**Scenario Description:** A user (`user:Alice`) wants to receive notifications about new comments on her posts (`post:123`). She configures a notification setting for this. Later, when a new comment occurs, the system triggers a notification request, and an email is simulated to be sent and recorded.

1. **Action: `createNotificationConfig`**
   * **Input:**
     ```json
     {
       "owner": "user:Alice",
       "email": "alice@example.com",
       "targetItem": "post:123",
       "notificationType": "new_comment_alert",
       "dailyTime": "09:00",
       "emailSubjectTemplate": "New comment on your post: {{postTitle}}",
       "emailBodyTemplate": "Hi {{userName}}, {{commentAuthor}} commented on your post '{{postTitle}}': \"{{commentContent}}\"",
       "isEnabled": true
     }
     ```
   * **Requires (checked by concept):** `owner` (as `ID`), `email` (valid format), `targetItem` (as `ID`), `notificationType` (string), `dailyTime` ("HH:MM" format), `emailSubjectTemplate` (string), `emailBodyTemplate` (string), `isEnabled` (boolean) are all provided and valid.
   * **Effects:**
     * A new `NotificationSetting` document is created in the `Notification.notificationSettings` MongoDB collection.
     * This document is assigned a unique `_id` (e.g., `"notification_setting:abc-123"`).
     * All input attributes (`owner`, `email`, `targetItem`, `notificationType`, `dailyTime`, `emailSubjectTemplate`, `emailBodyTemplate`, `isEnabled`) are stored in this document.
   * **Output:**
     ```json
     {
       "setting": {
         "_id": "notification_setting:abc-123",
         "owner": "user:Alice",
         "email": "alice@example.com",
         "targetItem": "post:123",
         "notificationType": "new_comment_alert",
         "dailyTime": "09:00",
         "emailSubjectTemplate": "New comment on your post: {{postTitle}}",
         "emailBodyTemplate": "Hi {{userName}}, {{commentAuthor}} commented on your post '{{postTitle}}': \"{{commentContent}}\"",
         "isEnabled": true
       }
     }
     ```
   * **Verification:**
     * The `createResult.setting` object is not null and contains the expected properties.
     * A query (`_getNotificationSettingsForUser` or direct collection lookup) confirms that one `NotificationSetting` exists for `user:Alice` in the database, matching the created `_id` and details.

2. **Action: `sendNotification`**
   * **Input:**
     ```json
     {
       "owner": "user:Alice",
       "targetItem": "post:123",
       "notificationType": "new_comment_alert",
       "contextData": {
         "userName": "Alice",
         "commentAuthor": "Bob",
         "postTitle": "My Awesome Post",
         "commentContent": "Great post!"
       }
     }
     ```
   * **Requires (checked by concept):**
     * An `isEnabled` `NotificationSetting` exists in the database for `owner: "user:Alice"`, `targetItem: "post:123"`, and `notificationType: "new_comment_alert"`. (This was created in the previous step).
     * `contextData` is a valid `Record<string, string>` object.
   * **Effects:**
     * The matching `NotificationSetting` (e.g., `_id: "notification_setting:abc-123"`) is retrieved.
     * The `emailSubjectTemplate` and `emailBodyTemplate` from the setting are processed using the provided `contextData`.
       * Simulated Subject: "New comment on your post: My Awesome Post"
       * Simulated Body: "Hi Alice, Bob commented on your post 'My Awesome Post': "Great post!""
     * A simulated email is "sent" (represented by a console log indicating destination and content).
     * A new `SentNotification` document is created in the `Notification.sentNotifications` MongoDB collection.
     * This document is assigned a unique `_id` (e.g., `"sent_notification:xyz-456"`).
     * It references the `settingID` (`"notification_setting:abc-123"`), records the current `timestamp`, and sets `wasSent` to `true` (for simulated success). `errorMessage` is `undefined`.
   * **Output:**
     ```json
     {
       "sentNotification": {
         "_id": "sent_notification:xyz-456",
         "settingID": "notification_setting:abc-123",
         "timestamp": "2023-10-27T10:30:00.000Z", // Example timestamp
         "wasSent": true,
         "errorMessage": null
       }
     }
     ```
   * **Console Output (Simulated Email Send):**
     ```
     --- Simulating Email Send ---
     To: alice@example.com
     Subject: New comment on your post: My Awesome Post
     Body:
     Hi Alice, Bob commented on your post 'My Awesome Post': "Great post!"
     -----------------------------
     ```
   * **Verification:**
     * The `sendResult.sentNotification` object is not null and contains the expected properties.
     * `sentResult.sentNotification.settingID` matches the `_id` of the `NotificationSetting` created in step 1.
     * `sentResult.sentNotification.wasSent` is `true`.
     * The console logs show the templated email being "sent".

3. **Query: `_getSentNotificationsForSetting`**
   * **Input:**
     ```json
     {
       "settingID": "notification_setting:abc-123" // The ID of the setting created in step 1
     }
     ```
   * **Effects:** Retrieves all `SentNotification` records from the `Notification.sentNotifications` collection that reference the provided `settingID`.
   * **Output:**
     ```json
     {
       "sentNotifications": [
         {
           "_id": "sent_notification:xyz-456",
           "settingID": "notification_setting:abc-123",
           "timestamp": "2023-10-27T10:30:00.000Z",
           "wasSent": true,
           "errorMessage": null
         }
       ]
     }
     ```
   * **Verification:**
     * The `loggedNotifications` array contains exactly one entry.
     * The `_id` of the returned `SentNotification` matches the one obtained from the `sendNotification` action.
     * The `wasSent` flag of the logged notification is `true`.

This trace confirms that the `Notification` concept successfully allows users to configure notification settings, triggers the sending of templated emails (simulated), and maintains a persistent log of these sent notifications, thus fulfilling its core purpose and principle.
