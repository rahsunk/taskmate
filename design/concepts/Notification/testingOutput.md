Check file:///Users/rahsunkomatsuzaki-fields/Desktop/MIT/academic/Y3/Fall/6.1040/taskmate/src/concepts/Notification/Notification.test.ts
running 1 test from ./src/concepts/Notification/Notification.test.ts\
Notification Concept Scenarios ...\
  Operational Principle: Configure, Send, and Log Notification ...\
------- output -------\
\
--- Test Setup: New NotificationConcept instance for step "Notification Concept Scenarios" ---\
\
Action: createNotificationConfig\
Input: {\
  owner: "user:Alice",\
  email: "alice@example.com",\
  targetItem: "post:123",\
  notificationType: "new_comment_alert",\
  dailyTime: "09:00",\
  emailSubjectTemplate: "New comment on your post: {{postTitle}}",\
  emailBodyTemplate: `Hi {{userName}}, {{commentAuthor}} commented on your post '{{postTitle}}': "{{commentContent}}"`,\
  isEnabled: true\
}\
Output: {\
  setting: {\
    _id: "0199fe29-efc6-7b8a-87c0-6c45afd7cb51",\
    owner: "user:Alice",\
    email: "alice@example.com",\
    targetItem: "post:123",\
    notificationType: "new_comment_alert",\
    dailyTime: "09:00",\
    emailSubjectTemplate: "New comment on your post: {{postTitle}}",\
    emailBodyTemplate: `Hi {{userName}}, {{commentAuthor}} commented on your post '{{postTitle}}': "{{commentContent}}"`,\
    isEnabled: true\
  }\
}\
Created NotificationSetting with ID: 0199fe29-efc6-7b8a-87c0-6c45afd7cb51\
\
Action: sendNotification\
Input: {\
  owner: "user:Alice",\
  targetItem: "post:123",\
  notificationType: "new_comment_alert",\
  contextData: {\
    userName: "Alice",\
    commentAuthor: "Bob",\
    postTitle: "My Awesome Post",\
    commentContent: "Great post!"\
  }\
}\
--- Simulating Email Send ---\
To: alice@example.com\
Subject: New comment on your post: My Awesome Post\
Body:\
Hi Alice, Bob commented on your post 'My Awesome Post': "Great post!"\
-----------------------------\
Output: {\
  sentNotification: {\
    _id: "0199fe29-f011-7e9f-8d2f-96deb5eaae92",\
    settingID: "0199fe29-efc6-7b8a-87c0-6c45afd7cb51",\
    timestamp: 2025-10-19T20:29:45.361Z,\
    wasSent: true,\
    errorMessage: undefined\
  }\
}\
Logged SentNotification with ID: 0199fe29-f011-7e9f-8d2f-96deb5eaae92\
\
Query: _getSentNotificationsForSetting\
Input: { settingID: "0199fe29-efc6-7b8a-87c0-6c45afd7cb51" }\
Output: [\
  {\
    _id: "0199fe29-f011-7e9f-8d2f-96deb5eaae92",\
    settingID: "0199fe29-efc6-7b8a-87c0-6c45afd7cb51",\
    timestamp: 2025-10-19T20:29:45.361Z,\
    wasSent: true,\
    errorMessage: null\
  }\
]\
Scenario successful: Notification configured, sent, and logged as per operational principle.\
--- Test Teardown: DB client closed for step "Notification Concept Scenarios" ---\
----- output end -----\
  Operational Principle: Configure, Send, and Log Notification ... ok (645ms)\
  Scenario: Editing an existing notification configuration ...\
------- output -------\
\
--- Test Setup: New NotificationConcept instance for step "Notification Concept Scenarios" ---\
\
Action: createNotificationConfig (initial)\
Input: {\
  owner: "user:Bob",\
  email: "bob@example.com",\
  targetItem: "article:456",\
  notificationType: "daily_digest",\
  dailyTime: "17:00",\
  emailSubjectTemplate: "Daily Digest",\
  emailBodyTemplate: "Daily articles...",\
  isEnabled: true\
}\
Output: {\
  setting: {\
    _id: "0199fe29-f22b-7e70-8da9-1d882eff70aa",\
    owner: "user:Bob",\
    email: "bob@example.com",\
    targetItem: "article:456",\
    notificationType: "daily_digest",\
    dailyTime: "17:00",\
    emailSubjectTemplate: "Daily Digest",\
    emailBodyTemplate: "Daily articles...",\
    isEnabled: true\
  }\
}\
Created initial setting ID: 0199fe29-f22b-7e70-8da9-1d882eff70aa\
\
Action: editNotificationConfig\
Input: {\
  settingID: "0199fe29-f22b-7e70-8da9-1d882eff70aa",\
  email: "bob.updated@example.com",\
  targetItem: "article:456",\
  notificationType: "weekly_summary",\
  dailyTime: "18:00",\
  emailSubjectTemplate: "Weekly Summary",\
  emailBodyTemplate: "Weekly articles...",\
  isEnabled: false\
}\
Output: {}\
\
Query: _getNotificationSettingsForUser\
Input: { owner: "user:Bob" }\
Output: [\
  {\
    _id: "0199fe29-f22b-7e70-8da9-1d882eff70aa",\
    owner: "user:Bob",\
    email: "bob.updated@example.com",\
    targetItem: "article:456",\
    notificationType: "weekly_summary",\
    dailyTime: "18:00",\
    emailSubjectTemplate: "Weekly Summary",\
    emailBodyTemplate: "Weekly articles...",\
    isEnabled: false\
  }\
]\
Scenario successful: Configuration edited and verified.\
--- Test Teardown: DB client closed for step "Notification Concept Scenarios" ---\
----- output end -----\
  Scenario: Editing an existing notification configuration ... ok (604ms)\
  Scenario: Deleting a notification configuration and associated logs ...\
------- output -------\
\
--- Test Setup: New NotificationConcept instance for step "Notification Concept Scenarios" ---\
\
Action: createNotificationConfig\
Input: {\
  owner: "user:Carol",\
  email: "carol@example.com",\
  targetItem: "product:789",\
  notificationType: "promo_offer",\
  dailyTime: "10:00",\
  emailSubjectTemplate: "Special Offer!",\
  emailBodyTemplate: "Don't miss out on {{discount}}!",\
  isEnabled: true\
}\
Output: {\
  setting: {\
    _id: "0199fe29-f446-79b0-bf33-8bc750cef803",\
    owner: "user:Carol",\
    email: "carol@example.com",\
    targetItem: "product:789",\
    notificationType: "promo_offer",\
    dailyTime: "10:00",\
    emailSubjectTemplate: "Special Offer!",\
    emailBodyTemplate: "Don't miss out on {{discount}}!",\
    isEnabled: true\
  }\
}\
Created setting ID: 0199fe29-f446-79b0-bf33-8bc750cef803\
\
Action: sendNotification (to create log)\
Input: {\
  owner: "user:Carol",\
  targetItem: "product:789",\
  notificationType: "promo_offer",\
  contextData: { discount: "20% off" }\
}\
--- Simulating Email Send ---\
To: carol@example.com\
Subject: Special Offer!\
Body:\
Don't miss out on 20% off!\
-----------------------------\
Output: {\
  sentNotification: {\
    _id: "0199fe29-f47d-77ba-bf8c-89244ea9d96d",\
    settingID: "0199fe29-f446-79b0-bf33-8bc750cef803",\
    timestamp: 2025-10-19T20:29:46.493Z,\
    wasSent: true,\
    errorMessage: undefined\
  }\
}\
Created sent notification ID: 0199fe29-f47d-77ba-bf8c-89244ea9d96d\
\
Action: deleteNotificationConfig\
Input: { settingID: "0199fe29-f446-79b0-bf33-8bc750cef803" }\
Output: {}\
\
Query: _getNotificationSettingsForUser (after delete)\
Input: { owner: "user:Carol" }\
Output: []\
\
Query: _getSentNotificationsForSetting (after delete)\
Input: { settingID: "0199fe29-f446-79b0-bf33-8bc750cef803" }\
Output: []\
Scenario successful: Configuration and associated logs deleted.\
--- Test Teardown: DB client closed for step "Notification Concept Scenarios" ---\
----- output end -----\
  Scenario: Deleting a notification configuration and associated logs ... ok (650ms)\
  Scenario: Sending notification with disabled or non-existent configuration ...\
------- output -------\
\
--- Test Setup: New NotificationConcept instance for step "Notification Concept Scenarios" ---\
\
Action: sendNotification (no config)\
Input: {\
  owner: "user:David",\
  targetItem: "doc:XYZ",\
  notificationType: "document_review",\
  contextData: { docName: "Report" }\
}\
Output: {\
  error: "No matching and enabled notification setting found for this owner, item, and type."\
}\
Result (no config): No matching and enabled notification setting found for this owner, item, and type.\
\
Action: createNotificationConfig (disabled)\
Input: {\
  owner: "user:David",\
  email: "david@example.com",\
  targetItem: "doc:XYZ",\
  notificationType: "document_review",\
  dailyTime: "11:00",\
  emailSubjectTemplate: "Review Needed for {{docName}}",\
  emailBodyTemplate: "Please review document {{docName}}.",\
  isEnabled: false\
}\
Output: {\
  setting: {\
    _id: "0199fe29-f751-7712-bc7b-a41721386707",\
    owner: "user:David",\
    email: "david@example.com",\
    targetItem: "doc:XYZ",\
    notificationType: "document_review",\
    dailyTime: "11:00",\
    emailSubjectTemplate: "Review Needed for {{docName}}",\
    emailBodyTemplate: "Please review document {{docName}}.",\
    isEnabled: false\
  }\
}\
Created disabled setting ID: 0199fe29-f751-7712-bc7b-a41721386707\
\
Action: sendNotification (disabled config)\
Input: {\
  owner: "user:David",\
  targetItem: "doc:XYZ",\
  notificationType: "document_review",\
  contextData: { docName: "Report" }\
}\
Output: {\
  error: "No matching and enabled notification setting found for this owner, item, and type."\
}\
Result (disabled config): No matching and enabled notification setting found for this owner, item, and\ type.
\
Query: _getSentNotificationsForSetting\
Input: { settingID: "0199fe29-f751-7712-bc7b-a41721386707" }\
Output: []\
Scenario successful: Sending with disabled/non-existent configs handled correctly.\
--- Test Teardown: DB client closed for step "Notification Concept Scenarios" ---\
----- output end -----\
  Scenario: Sending notification with disabled or non-existent configuration ... ok (642ms)\
  Scenario: Precondition failures and error returns for actions ...\
------- output -------\
\
--- Test Setup: New NotificationConcept instance for step "Notification Concept Scenarios" ---\
\
Action: createNotificationConfig (missing owner)\
Input: {\
  owner: "",\
  email: "eve@example.com",\
  targetItem: "project:1",\
  notificationType: "project_update",\
  dailyTime: "12:00",\
  emailSubjectTemplate: "Project {{projectName}} Update",\
  emailBodyTemplate: "Update for {{projectName}}.",\
  isEnabled: true\
}\
Output: {\
  error: "Missing or invalid required parameters for notification configuration."\
}\
Result: Missing or invalid required parameters for notification configuration.\
\
Action: createNotificationConfig (invalid dailyTime)\
Input: {\
  owner: "user:Eve",\
  email: "eve@example.com",\
  targetItem: "project:1",\
  notificationType: "project_update",\
  dailyTime: "25:00",\
  emailSubjectTemplate: "Sub",\
  emailBodyTemplate: "Body",\
  isEnabled: true\
}\
Output: { error: "Invalid dailyTime format. Expected HH:MM (e.g., '09:00')." }\
Result: Invalid dailyTime format. Expected HH:MM (e.g., '09:00').\
\
Action: createNotificationConfig (invalid email)\
Input: {\
  owner: "user:Eve",\
  email: "invalid-email",\
  targetItem: "project:1",\
  notificationType: "project_update",\
  dailyTime: "12:00",\
  emailSubjectTemplate: "Sub",\
  emailBodyTemplate: "Body",\
  isEnabled: true\
}\
Output: { error: "Invalid email address format." }\
Result: Invalid email address format.\
Created valid setting ID: 0199fe29-f9ae-7544-bcf2-e40f23ae2df2 for subsequent tests.\
\
Action: editNotificationConfig (non-existent ID)\
Input: {\
  settingID: "0199fe29-f9df-7d5d-9e2d-60b460b523a0",\
  email: "eve@example.com",\
  targetItem: "project:1",\
  notificationType: "project_update",\
  dailyTime: "13:00",\
  emailSubjectTemplate: "Project Update",\
  emailBodyTemplate: "New update.",\
  isEnabled: true\
}\
Output: {\
  error: "Notification setting with ID 0199fe29-f9df-7d5d-9e2d-60b460b523a0 not found."\
}\
Result: Notification setting with ID 0199fe29-f9df-7d5d-9e2d-60b460b523a0 not found.\
\
Action: deleteNotificationConfig (non-existent ID)\
Input: { settingID: "0199fe29-f9ff-73ef-a03b-9ee1698918b7" }\
Output: {\
  error: "Notification setting with ID 0199fe29-f9ff-73ef-a03b-9ee1698918b7 not found."\
}\
Result: Notification setting with ID 0199fe29-f9ff-73ef-a03b-9ee1698918b7 not found.\
\
Action: sendNotification (invalid contextData type)\
Input: {\
  owner: "user:Eve",\
  targetItem: "project:1",\
  notificationType: "project_update",\
  contextData: "this is a string, not an object"\
}\
Output: { error: "Invalid contextData format. Expected a dictionary/object." }\
Result: Invalid contextData format. Expected a dictionary/object.\
Scenario successful: Precondition failures handled with errors.\
--- Test Teardown: DB client closed for step "Notification Concept Scenarios" ---\
----- output end -----\
  Scenario: Precondition failures and error returns for actions ... ok (614ms)\
  Scenario: Multiple notification settings for different items/types for one user ...\
------- output -------\
\
--- Test Setup: New NotificationConcept instance for step "Notification Concept Scenarios" ---\
\
Action: createNotificationConfig (Daily News)\
Input: {\
  owner: "user:Frank",\
  email: "frank@example.com",\
  targetItem: "feed:daily",\
  notificationType: "daily_news",\
  dailyTime: "08:00",\
  emailSubjectTemplate: "Your Daily News: {{date}}",\
  emailBodyTemplate: "Here's what's new today.",\
  isEnabled: true\
}\
Output: {\
  setting: {\
    _id: "0199fe29-fc2f-7ae0-94fc-196638a45d58",\
    owner: "user:Frank",\
    email: "frank@example.com",\
    targetItem: "feed:daily",\
    notificationType: "daily_news",\
    dailyTime: "08:00",\
    emailSubjectTemplate: "Your Daily News: {{date}}",\
    emailBodyTemplate: "Here's what's new today.",\
    isEnabled: true\
  }\
}\
Created News Feed setting ID: 0199fe29-fc2f-7ae0-94fc-196638a45d58\
\
Action: createNotificationConfig (Critical Alerts)\
Input: {\
  owner: "user:Frank",\
  email: "frank@example.com",\
  targetItem: "alerts:critical",\
  notificationType: "critical_alert",\
  dailyTime: "14:00",\
  emailSubjectTemplate: "CRITICAL ALERT: {{alertReason}}",\
  emailBodyTemplate: "Action required: {{alertDetails}}",\
  isEnabled: true\
}\
Output: {\
  setting: {\
    _id: "0199fe29-fc52-7659-b80d-016dd7bff2b9",\
    owner: "user:Frank",\
    email: "frank@example.com",\
    targetItem: "alerts:critical",\
    notificationType: "critical_alert",\
    dailyTime: "14:00",\
    emailSubjectTemplate: "CRITICAL ALERT: {{alertReason}}",\
    emailBodyTemplate: "Action required: {{alertDetails}}",\
    isEnabled: true\
  }\
}\
Created Critical Alert setting ID: 0199fe29-fc52-7659-b80d-016dd7bff2b9\
\
Action: sendNotification (Daily News)\
Input: {\
  owner: "user:Frank",\
  targetItem: "feed:daily",\
  notificationType: "daily_news",\
  contextData: { date: "10/19/2025" }\
}\
--- Simulating Email Send ---\
To: frank@example.com\
Subject: Your Daily News: 10/19/2025\
Body:\
Here's what's new today.\
-----------------------------\
Output: {\
  sentNotification: {\
    _id: "0199fe29-fc8c-77db-93e7-0a2e5a53c292",\
    settingID: "0199fe29-fc2f-7ae0-94fc-196638a45d58",\
    timestamp: 2025-10-19T20:29:48.556Z,\
    wasSent: true,\
    errorMessage: undefined\
  }\
}\
Sent Daily News notification successfully.\
\
Action: sendNotification (Critical Alert)\
Input: {\
  owner: "user:Frank",\
  targetItem: "alerts:critical",\
  notificationType: "critical_alert",\
  contextData: {\
    alertReason: "System Downtime",\
    alertDetails: "System will be down for maintenance."\
  }\
}\
--- Simulating Email Send ---\
To: frank@example.com\
Subject: CRITICAL ALERT: System Downtime\
Body:\
Action required: System will be down for maintenance.\
-----------------------------\
Output: {\
  sentNotification: {\
    _id: "0199fe29-fcc4-73f0-bf7e-88e497ebd265",\
    settingID: "0199fe29-fc52-7659-b80d-016dd7bff2b9",\
    timestamp: 2025-10-19T20:29:48.612Z,\
    wasSent: true,\
    errorMessage: undefined\
  }\
}\
Sent Critical Alert notification successfully.\
\
Querying all sent notifications for Frank across all settings.\
Output (all sent notifications for Frank): [\
  {\
    _id: "0199fe29-fc8c-77db-93e7-0a2e5a53c292",\
    settingID: "0199fe29-fc2f-7ae0-94fc-196638a45d58",\
    wasSent: true\
  },\
  {\
    _id: "0199fe29-fcc4-73f0-bf7e-88e497ebd265",\
    settingID: "0199fe29-fc52-7659-b80d-016dd7bff2b9",\
    wasSent: true\
  }\
]\
Scenario successful: Multiple settings handled and targeted sends verified.\
--- Test Teardown: DB client closed for step "Notification Concept Scenarios" ---\
----- output end -----\
  Scenario: Multiple notification settings for different items/types for one user ... ok (722ms)\
  Scenario: Querying functionality for notification settings and logs ...\
------- output -------\
\
--- Test Setup: New NotificationConcept instance for step "Notification Concept Scenarios" ---\
Created 3 settings for Grace: S1(0199fe29-febf-7bc7-8e63-7c9e1d2e6f73, enabled), S2(0199fe29-fee1-7be9\-867e-a093e224c761, enabled), S3(0199fe29-fef5-7336-8806-afd22dbd3ab8, disabled)
--- Simulating Email Send ---\
To: grace@example.com\
Subject: S1\
Body:\
B1\
-----------------------------\
Sent one notification for setting S1.\
\
Query: _getNotificationSettingsForUser\
Input: { owner: "user:Grace" }\
Output (Grace's settings): [\
  {\
    _id: "0199fe29-febf-7bc7-8e63-7c9e1d2e6f73",\
    type: "type1",\
    enabled: true\
  },\
  {\
    _id: "0199fe29-fee1-7be9-867e-a093e224c761",\
    type: "type2",\
    enabled: true\
  },\
  {\
    _id: "0199fe29-fef5-7336-8806-afd22dbd3ab8",\
    type: "type3",\
    enabled: false\
  }\
]\
\
Query: _getSentNotificationsForSetting\
Input (settingID S1): { settingID: "0199fe29-febf-7bc7-8e63-7c9e1d2e6f73" }\
Output (S1 sent logs): [ "0199fe29-ff1f-70e0-91c5-48bfb39aa4f4" ]\
Input (settingID S2): { settingID: "0199fe29-fee1-7be9-867e-a093e224c761" }\
Output (S2 sent logs): []\
\
Query: _getEnabledSetting\
Input: {\
  owner: "user:Grace",\
  targetItem: "item:A",\
  notificationType: "type1"\
}\
Output: { _id: "0199fe29-febf-7bc7-8e63-7c9e1d2e6f73", isEnabled: true }\
Input: {\
  owner: "user:Grace",\
  targetItem: "item:A",\
  notificationType: "type3"\
}\
Output: null\
Input: {\
  owner: "user:Grace",\
  targetItem: "item:B",\
  notificationType: "non_existent_type"\
}\
Output: null\
Scenario successful: Queries functioning as expected.\
--- Test Teardown: DB client closed for step "Notification Concept Scenarios" ---\
----- output end -----\
  Scenario: Querying functionality for notification settings and logs ... ok (711ms)\
Notification Concept Scenarios ... ok (4s)\
\
ok | 1 passed (7 steps) | 0 failed (4s)\
