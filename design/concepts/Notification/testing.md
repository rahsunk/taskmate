[@implementation](implementation.md)

[@testing-concepts](../../background/testing-concepts.md)

[@testing-concepts-rubric](../../background/testing-concepts-rubric.md)

# file: src/notification/NotificationConcept.test.ts

```typescript
import { Db, MongoClient } from "npm:mongodb";
import { assertEquals, assertExists, assertInstanceOf, assertFalse } from "jsr:@std/assert";
import { testDb, freshID } from "@utils/database.ts";
import { ID, Empty } from "@utils/types.ts";
import NotificationConcept from "./NotificationConcept.ts";

// Re-declare types for testing context to ensure consistency with the concept implementation
type User = ID;
type Item = ID;
type EmailAddress = string;
type DailyTime = string;

// Define interfaces for state structure, matching NotificationConcept.ts
interface NotificationSetting {
  _id: ID;
  owner: User;
  email: EmailAddress;
  targetItem: Item;
  notificationType: string;
  dailyTime: DailyTime;
  emailSubjectTemplate: string;
  emailBodyTemplate: string;
  isEnabled: boolean;
}

interface SentNotification {
  _id: ID;
  settingID: ID;
  timestamp: Date;
  wasSent: boolean;
  errorMessage?: string;
}

// Define the MongoDB collection prefix used in the concept
const PREFIX = "Notification" + ".";

Deno.test("Notification Concept Scenarios", async (t) => {
  // Removed Deno.test.beforeEach and Deno.test.afterEach hooks.
  // Setup and teardown are now handled directly within each t.step.

  await t.step("Operational Principle: Configure, Send, and Log Notification", async () => {
    // Setup for this individual test step
    const [db, client] = await testDb();
    const notificationConcept = new NotificationConcept(db);
    console.log(`\n--- Test Setup: New NotificationConcept instance for step "${t.name}" ---`);

    const userAlice: User = "user:Alice" as ID;
    const itemPost123: Item = "post:123" as ID;
    const notificationTypeComment = "new_comment_alert";
    const dailyTimeMorning = "09:00";
    const subjectTemplate = "New comment on your post: {{postTitle}}";
    const bodyTemplate = "Hi {{userName}}, {{commentAuthor}} commented on your post '{{postTitle}}': \"{{commentContent}}\"";
    const initialEnabled = true;

    // 1. Action: createNotificationConfig
    console.log("\nAction: createNotificationConfig");
    const createConfigInput = {
      owner: userAlice,
      email: "alice@example.com",
      targetItem: itemPost123,
      notificationType: notificationTypeComment,
      dailyTime: dailyTimeMorning,
      emailSubjectTemplate: subjectTemplate,
      emailBodyTemplate: bodyTemplate,
      isEnabled: initialEnabled,
    };
    console.log("Input:", createConfigInput);
    const createResult = await notificationConcept.createNotificationConfig(createConfigInput);
    console.log("Output:", createResult);

    let setting: NotificationSetting;
    if ("error" in createResult) {
      await client.close(); // Ensure client is closed on early exit
      assertFalse(true, `Failed to create notification config: ${createResult.error}`);
      return;
    } else {
      setting = createResult.setting;
    }
    assertExists(setting, "Expected setting to be created.");
    assertEquals(setting.owner, userAlice, "Setting owner should match input.");
    assertEquals(setting.targetItem, itemPost123, "Setting targetItem should match input.");
    assertEquals(setting.notificationType, notificationTypeComment, "Setting notificationType should match input.");
    assertEquals(setting.emailSubjectTemplate, subjectTemplate, "Setting subject template should match input.");
    assertEquals(setting.isEnabled, initialEnabled, "Setting isEnabled should match input.");
    console.log(`Created NotificationSetting with ID: ${setting._id}`);

    // Verification step: Use query to confirm the setting is present in the database.
    const { settings: fetchedSettings } = await notificationConcept._getNotificationSettingsForUser({ owner: userAlice });
    assertEquals(fetchedSettings.length, 1, "Expected one setting for Alice in the database.");
    assertEquals(fetchedSettings[0]._id, setting._id, "Fetched setting ID from DB should match the created one.");

    // 2. Action: sendNotification
    console.log("\nAction: sendNotification");
    const contextData = {
      userName: "Alice",
      commentAuthor: "Bob",
      postTitle: "My Awesome Post",
      commentContent: "Great post!",
    };
    const sendNotificationInput = {
      owner: userAlice,
      targetItem: itemPost123,
      notificationType: notificationTypeComment,
      contextData: contextData,
    };
    console.log("Input:", sendNotificationInput);
    const sendResult = await notificationConcept.sendNotification(sendNotificationInput);
    console.log("Output:", sendResult);

    let sentNotif: SentNotification;
    if ("error" in sendResult) {
      await client.close(); // Ensure client is closed on early exit
      assertFalse(true, `Failed to send notification: ${sendResult.error}`);
      return;
    } else {
      sentNotif = sendResult.sentNotification;
    }
    assertExists(sentNotif, "Expected notification to be sent and logged.");
    assertEquals(sentNotif.settingID, setting._id, "Sent notification should reference the correct setting ID.");
    assertEquals(sentNotif.wasSent, true, "Expected email to be marked as sent successfully.");
    assertInstanceOf(sentNotif.timestamp, Date, "Expected timestamp to be a Date object.");
    console.log(`Logged SentNotification with ID: ${sentNotif._id}`);

    // 3. Query: _getSentNotificationsForSetting
    console.log("\nQuery: _getSentNotificationsForSetting");
    console.log("Input:", { settingID: setting._id });
    const { sentNotifications: loggedNotifications } = await notificationConcept._getSentNotificationsForSetting({ settingID: setting._id });
    console.log("Output:", loggedNotifications);

    assertEquals(loggedNotifications.length, 1, "Expected one logged notification for this setting in the database.");
    assertEquals(loggedNotifications[0]._id, sentNotif._id, "Logged notification ID from DB should match the sent one.");
    assertEquals(loggedNotifications[0].wasSent, true, "Logged notification in DB should indicate success.");

    console.log("Scenario successful: Notification configured, sent, and logged as per operational principle.");

    // Teardown for this individual test step
    await client.close();
    console.log(`--- Test Teardown: DB client closed for step "${t.name}" ---`);
  });

  await t.step("Scenario: Editing an existing notification configuration", async () => {
    // Setup for this individual test step
    const [db, client] = await testDb();
    const notificationConcept = new NotificationConcept(db);
    console.log(`\n--- Test Setup: New NotificationConcept instance for step "${t.name}" ---`);

    const userBob: User = "user:Bob" as ID;
    const itemArticle456: Item = "article:456" as ID;
    const initialType = "daily_digest";
    const updatedType = "weekly_summary";
    const initialSubject = "Daily Digest";
    const updatedSubject = "Weekly Summary";

    // Create initial config
    console.log("\nAction: createNotificationConfig (initial)");
    const createInput = {
      owner: userBob, email: "bob@example.com", targetItem: itemArticle456,
      notificationType: initialType, dailyTime: "17:00",
      emailSubjectTemplate: initialSubject, emailBodyTemplate: "Daily articles...",
      isEnabled: true,
    };
    console.log("Input:", createInput);
    const createRes = await notificationConcept.createNotificationConfig(createInput);
    console.log("Output:", createRes);
    
    let settingID: ID;
    if ("error" in createRes) {
      await client.close(); // Ensure client is closed on early exit
      assertFalse(true, `Failed to create initial notification config: ${createRes.error}`);
      return;
    } else {
      settingID = createRes.setting._id;
    }
    console.log("Created initial setting ID:", settingID);

    // Edit the config
    console.log("\nAction: editNotificationConfig");
    const editInput = {
      settingID: settingID,
      email: "bob.updated@example.com", // Updated email
      targetItem: itemArticle456,
      notificationType: updatedType, // Updated type
      dailyTime: "18:00",
      emailSubjectTemplate: updatedSubject, // Updated subject
      emailBodyTemplate: "Weekly articles...",
      isEnabled: false, // Disabled
    };
    console.log("Input:", editInput);
    const editRes = await notificationConcept.editNotificationConfig(editInput);
    console.log("Output:", editRes);
    
    if ("error" in editRes) {
      await client.close(); // Ensure client is closed on early exit
      assertFalse(true, `Failed to edit notification config: ${editRes.error}`);
      return;
    }
    // Type is now narrowed to Empty
    assertEquals(editRes, {} as Empty, "Expected empty result for successful edit.");

    // Verify changes using a query
    console.log("\nQuery: _getNotificationSettingsForUser");
    console.log("Input:", { owner: userBob });
    const { settings: updatedSettings } = await notificationConcept._getNotificationSettingsForUser({ owner: userBob });
    console.log("Output:", updatedSettings);
    assertEquals(updatedSettings.length, 1, "Expected one setting for Bob after edit.");
    const updatedSetting = updatedSettings[0];
    assertEquals(updatedSetting.email, "bob.updated@example.com", "Email should be updated.");
    assertEquals(updatedSetting.notificationType, updatedType, "Notification type should be updated.");
    assertEquals(updatedSetting.emailSubjectTemplate, updatedSubject, "Subject template should be updated.");
    assertEquals(updatedSetting.isEnabled, false, "Setting should be disabled.");
    console.log("Scenario successful: Configuration edited and verified.");

    // Teardown for this individual test step
    await client.close();
    console.log(`--- Test Teardown: DB client closed for step "${t.name}" ---`);
  });

  await t.step("Scenario: Deleting a notification configuration and associated logs", async () => {
    // Setup for this individual test step
    const [db, client] = await testDb();
    const notificationConcept = new NotificationConcept(db);
    console.log(`\n--- Test Setup: New NotificationConcept instance for step "${t.name}" ---`);

    const userCarol: User = "user:Carol" as ID;
    const itemProduct789: Item = "product:789" as ID;
    const notificationTypePromo = "promo_offer";

    // Create config
    console.log("\nAction: createNotificationConfig");
    const createInput = {
      owner: userCarol, email: "carol@example.com", targetItem: itemProduct789,
      notificationType: notificationTypePromo, dailyTime: "10:00",
      emailSubjectTemplate: "Special Offer!", emailBodyTemplate: "Don't miss out on {{discount}}!",
      isEnabled: true,
    };
    console.log("Input:", createInput);
    const createRes = await notificationConcept.createNotificationConfig(createInput);
    console.log("Output:", createRes);
    let settingID: ID;
    if ("error" in createRes) {
      await client.close(); // Ensure client is closed on early exit
      assertFalse(true, `Failed to create notification config for deletion test: ${createRes.error}`);
      return;
    } else {
      settingID = createRes.setting._id;
    }
    console.log("Created setting ID:", settingID);

    // Send a notification to create a log entry associated with this setting
    console.log("\nAction: sendNotification (to create log)");
    const sendInput = {
      owner: userCarol, targetItem: itemProduct789,
      notificationType: notificationTypePromo, contextData: { discount: "20% off" },
    };
    console.log("Input:", sendInput);
    const sendRes = await notificationConcept.sendNotification(sendInput);
    console.log("Output:", sendRes);
    let sentNotifID: ID;
    if ("error" in sendRes) {
      await client.close(); // Ensure client is closed on early exit
      assertFalse(true, `Failed to send notification for deletion test: ${sendRes.error}`);
      return;
    } else {
      sentNotifID = sendRes.sentNotification._id;
    }
    console.log("Created sent notification ID:", sentNotifID);

    // Verify initial state: one setting and one sent log
    const { settings: initialSettings } = await notificationConcept._getNotificationSettingsForUser({ owner: userCarol });
    assertEquals(initialSettings.length, 1, "Expected one setting for Carol initially.");
    const { sentNotifications: initialSentLogs } = await notificationConcept._getSentNotificationsForSetting({ settingID: settingID });
    assertEquals(initialSentLogs.length, 1, "Expected one sent log for the setting initially.");

    // Delete the config
    console.log("\nAction: deleteNotificationConfig");
    const deleteInput = { settingID: settingID };
    console.log("Input:", deleteInput);
    const deleteRes = await notificationConcept.deleteNotificationConfig(deleteInput);
    console.log("Output:", deleteRes);
    if ("error" in deleteRes) {
      await client.close(); // Ensure client is closed on early exit
      assertFalse(true, `Failed to delete notification config: ${deleteRes.error}`);
      return;
    }
    assertEquals(deleteRes, {} as Empty, "Expected empty result for successful deletion.");

    // Verify state after deletion: no settings and no associated sent logs
    console.log("\nQuery: _getNotificationSettingsForUser (after delete)");
    console.log("Input:", { owner: userCarol });
    const { settings: afterDeleteSettings } = await notificationConcept._getNotificationSettingsForUser({ owner: userCarol });
    console.log("Output:", afterDeleteSettings);
    assertEquals(afterDeleteSettings.length, 0, "Expected no settings for Carol after deletion.");

    console.log("\nQuery: _getSentNotificationsForSetting (after delete)");
    console.log("Input:", { settingID: settingID });
    const { sentNotifications: afterDeleteSentLogs } = await notificationConcept._getSentNotificationsForSetting({ settingID: settingID });
    console.log("Output:", afterDeleteSentLogs);
    assertEquals(afterDeleteSentLogs.length, 0, "Expected no sent notifications for this setting after deletion.");
    console.log("Scenario successful: Configuration and associated logs deleted.");

    // Teardown for this individual test step
    await client.close();
    console.log(`--- Test Teardown: DB client closed for step "${t.name}" ---`);
  });

  await t.step("Scenario: Sending notification with disabled or non-existent configuration", async () => {
    // Setup for this individual test step
    const [db, client] = await testDb();
    const notificationConcept = new NotificationConcept(db);
    console.log(`\n--- Test Setup: New NotificationConcept instance for step "${t.name}" ---`);

    const userDavid: User = "user:David" as ID;
    const itemDocXYZ: Item = "doc:XYZ" as ID;
    const notificationTypeReview = "document_review";
    const contextData = { docName: "Report" };

    // 1. Attempt to send with no config for David (expected error)
    console.log("\nAction: sendNotification (no config)");
    const sendNoConfigInput = { owner: userDavid, targetItem: itemDocXYZ, notificationType: notificationTypeReview, contextData: contextData };
    console.log("Input:", sendNoConfigInput);
    const sendNoConfigRes = await notificationConcept.sendNotification(sendNoConfigInput);
    console.log("Output:", sendNoConfigRes);
    if (!("error" in sendNoConfigRes)) {
      await client.close(); // Ensure client is closed on early exit
      assertFalse(true, `Expected error when no config exists, but got success: ${JSON.stringify(sendNoConfigRes)}`);
      return;
    }
    assertExists(sendNoConfigRes.error, "Expected error message for no config.");
    console.log("Result (no config):", sendNoConfigRes.error);

    // Create a disabled config for David
    console.log("\nAction: createNotificationConfig (disabled)");
    const createDisabledInput = {
      owner: userDavid, email: "david@example.com", targetItem: itemDocXYZ,
      notificationType: notificationTypeReview, dailyTime: "11:00",
      emailSubjectTemplate: "Review Needed for {{docName}}", emailBodyTemplate: "Please review document {{docName}}.",
      isEnabled: false, // Explicitly disabled
    };
    console.log("Input:", createDisabledInput);
    const createRes = await notificationConcept.createNotificationConfig(createDisabledInput);
    console.log("Output:", createRes);
    let disabledSettingID: ID;
    if ("error" in createRes) {
      await client.close(); // Ensure client is closed on early exit
      assertFalse(true, `Failed to create disabled notification config: ${createRes.error}`);
      return;
    } else {
      disabledSettingID = createRes.setting._id;
    }
    console.log("Created disabled setting ID:", disabledSettingID);

    // 2. Attempt to send with disabled config (expected error)
    console.log("\nAction: sendNotification (disabled config)");
    const sendDisabledInput = { owner: userDavid, targetItem: itemDocXYZ, notificationType: notificationTypeReview, contextData: contextData };
    console.log("Input:", sendDisabledInput);
    const sendDisabledRes = await notificationConcept.sendNotification(sendDisabledInput);
    console.log("Output:", sendDisabledRes);
    if (!("error" in sendDisabledRes)) {
      await client.close(); // Ensure client is closed on early exit
      assertFalse(true, `Expected error when config is disabled, but got success: ${JSON.stringify(sendDisabledRes)}`);
      return;
    }
    assertExists(sendDisabledRes.error, "Expected error message for disabled config.");
    console.log("Result (disabled config):", sendDisabledRes.error);

    // Verify no sent notifications for this disabled setting
    console.log("\nQuery: _getSentNotificationsForSetting");
    console.log("Input:", { settingID: disabledSettingID });
    const { sentNotifications: loggedDisabled } = await notificationConcept._getSentNotificationsForSetting({ settingID: disabledSettingID });
    console.log("Output:", loggedDisabled);
    assertEquals(loggedDisabled.length, 0, "Expected no sent notifications for a disabled setting.");

    console.log("Scenario successful: Sending with disabled/non-existent configs handled correctly.");

    // Teardown for this individual test step
    await client.close();
    console.log(`--- Test Teardown: DB client closed for step "${t.name}" ---`);
  });

  await t.step("Scenario: Precondition failures and error returns for actions", async () => {
    // Setup for this individual test step
    const [db, client] = await testDb();
    const notificationConcept = new NotificationConcept(db);
    console.log(`\n--- Test Setup: New NotificationConcept instance for step "${t.name}" ---`);

    const userEve: User = "user:Eve" as ID;
    const itemProject1: Item = "project:1" as ID;
    const notificationTypeUpdate = "project_update";

    // Test createNotificationConfig with missing owner (empty string, which is invalid for an ID)
    console.log("\nAction: createNotificationConfig (missing owner)");
    const createMissingOwnerInput = {
      owner: "" as ID, // Invalid owner
      email: "eve@example.com",
      targetItem: itemProject1,
      notificationType: notificationTypeUpdate,
      dailyTime: "12:00",
      emailSubjectTemplate: "Project {{projectName}} Update",
      emailBodyTemplate: "Update for {{projectName}}.",
      isEnabled: true,
    };
    console.log("Input:", createMissingOwnerInput);
    const createMissingOwner = await notificationConcept.createNotificationConfig(createMissingOwnerInput);
    console.log("Output:", createMissingOwner);
    if (!("error" in createMissingOwner)) {
      await client.close(); // Ensure client is closed on early exit
      assertFalse(true, `Expected error for missing owner, but got success: ${JSON.stringify(createMissingOwner)}`);
      return;
    }
    assertExists(createMissingOwner.error, "Expected error for missing owner (empty string).");
    console.log("Result:", createMissingOwner.error);

    // Test createNotificationConfig with invalid dailyTime format
    console.log("\nAction: createNotificationConfig (invalid dailyTime)");
    const createInvalidTimeInput = {
        owner: userEve, email: "eve@example.com", targetItem: itemProject1, notificationType: notificationTypeUpdate,
        dailyTime: "25:00", // Invalid time format
        emailSubjectTemplate: "Sub", emailBodyTemplate: "Body", isEnabled: true
    };
    console.log("Input:", createInvalidTimeInput);
    const createInvalidTime = await notificationConcept.createNotificationConfig(createInvalidTimeInput);
    console.log("Output:", createInvalidTime);
    if (!("error" in createInvalidTime)) {
      await client.close(); // Ensure client is closed on early exit
      assertFalse(true, `Expected error for invalid dailyTime format, but got success: ${JSON.stringify(createInvalidTime)}`);
      return;
    }
    assertExists(createInvalidTime.error, "Expected error for invalid dailyTime format.");
    console.log("Result:", createInvalidTime.error);
    
    // Test createNotificationConfig with invalid email format
    console.log("\nAction: createNotificationConfig (invalid email)");
    const createInvalidEmailInput = {
        owner: userEve, email: "invalid-email", targetItem: itemProject1, notificationType: notificationTypeUpdate,
        dailyTime: "12:00", 
        emailSubjectTemplate: "Sub", emailBodyTemplate: "Body", isEnabled: true
    };
    console.log("Input:", createInvalidEmailInput);
    const createInvalidEmail = await notificationConcept.createNotificationConfig(createInvalidEmailInput);
    console.log("Output:", createInvalidEmail);
    if (!("error" in createInvalidEmail)) {
      await client.close(); // Ensure client is closed on early exit
      assertFalse(true, `Expected error for invalid email format, but got success: ${JSON.stringify(createInvalidEmail)}`);
      return;
    }
    assertExists(createInvalidEmail.error, "Expected error for invalid email format.");
    console.log("Result:", createInvalidEmail.error);


    // Create a valid config for Eve for subsequent tests in this scenario (expected success)
    const createRes = await notificationConcept.createNotificationConfig({
      owner: userEve, email: "eve@example.com", targetItem: itemProject1, notificationType: notificationTypeUpdate,
      dailyTime: "12:00", emailSubjectTemplate: "Project {{projectName}} Update", emailBodyTemplate: "Update for {{projectName}}.",
      isEnabled: true,
    });
    let settingID: ID;
    if ("error" in createRes) {
      await client.close(); // Ensure client is closed on early exit
      assertFalse(true, `Failed to create valid setting for subsequent tests: ${createRes.error}`);
      return;
    } else {
      settingID = createRes.setting._id;
    }
    console.log(`Created valid setting ID: ${settingID} for subsequent tests.`);

    // Test editNotificationConfig with non-existent settingID (expected error)
    console.log("\nAction: editNotificationConfig (non-existent ID)");
    const nonExistentID = freshID();
    const editNonExistentInput = {
      settingID: nonExistentID, // Non-existent ID
      email: "eve@example.com", targetItem: itemProject1, notificationType: notificationTypeUpdate,
      dailyTime: "13:00", emailSubjectTemplate: "Project Update", emailBodyTemplate: "New update.",
      isEnabled: true,
    };
    console.log("Input:", editNonExistentInput);
    const editNonExistent = await notificationConcept.editNotificationConfig(editNonExistentInput);
    console.log("Output:", editNonExistent);
    if (!("error" in editNonExistent)) {
      await client.close(); // Ensure client is closed on early exit
      assertFalse(true, `Expected error for non-existent setting ID during edit, but got success: ${JSON.stringify(editNonExistent)}`);
      return;
    }
    assertExists(editNonExistent.error, "Expected error for non-existent setting ID during edit.");
    console.log("Result:", editNonExistent.error);

    // Test deleteNotificationConfig with non-existent settingID (expected error)
    console.log("\nAction: deleteNotificationConfig (non-existent ID)");
    const deleteNonExistentInput = { settingID: freshID() }; // Another non-existent ID
    console.log("Input:", deleteNonExistentInput);
    const deleteNonExistent = await notificationConcept.deleteNotificationConfig(deleteNonExistentInput);
    console.log("Output:", deleteNonExistent);
    if (!("error" in deleteNonExistent)) {
      await client.close(); // Ensure client is closed on early exit
      assertFalse(true, `Expected error for non-existent setting ID during delete, but got success: ${JSON.stringify(deleteNonExistent)}`);
      return;
    }
    assertExists(deleteNonExistent.error, "Expected error for non-existent setting ID during delete.");
    console.log("Result:", deleteNonExistent.error);

    // Test sendNotification with invalid contextData type (expected error)
    console.log("\nAction: sendNotification (invalid contextData type)");
    const sendInvalidContextInput = {
      owner: userEve, targetItem: itemProject1, notificationType: notificationTypeUpdate,
      contextData: "this is a string, not an object" as any, // Invalid type
    };
    console.log("Input:", sendInvalidContextInput);
    const sendInvalidContext = await notificationConcept.sendNotification(sendInvalidContextInput);
    console.log("Output:", sendInvalidContext);
    if (!("error" in sendInvalidContext)) {
      await client.close(); // Ensure client is closed on early exit
      assertFalse(true, `Expected error for invalid contextData type, but got success: ${JSON.stringify(sendInvalidContext)}`);
      return;
    }
    assertExists(sendInvalidContext.error, "Expected error for invalid contextData type.");
    console.log("Result:", sendInvalidContext.error);
    console.log("Scenario successful: Precondition failures handled with errors.");

    // Teardown for this individual test step
    await client.close();
    console.log(`--- Test Teardown: DB client closed for step "${t.name}" ---`);
  });

  await t.step("Scenario: Multiple notification settings for different items/types for one user", async () => {
    // Setup for this individual test step
    const [db, client] = await testDb();
    const notificationConcept = new NotificationConcept(db);
    console.log(`\n--- Test Setup: New NotificationConcept instance for step "${t.name}" ---`);

    const userFrank: User = "user:Frank" as ID;
    const itemNewsFeed: Item = "feed:daily" as ID;
    const itemAlerts: Item = "alerts:critical" as ID;

    // Setting 1: Daily News Feed (expected success)
    console.log("\nAction: createNotificationConfig (Daily News)");
    const createNewsFeedInput = {
      owner: userFrank, email: "frank@example.com", targetItem: itemNewsFeed,
      notificationType: "daily_news", dailyTime: "08:00",
      emailSubjectTemplate: "Your Daily News: {{date}}", emailBodyTemplate: "Here's what's new today.",
      isEnabled: true,
    };
    console.log("Input:", createNewsFeedInput);
    const createNewsFeed = await notificationConcept.createNotificationConfig(createNewsFeedInput);
    console.log("Output:", createNewsFeed);
    let newsSettingID: ID;
    if ("error" in createNewsFeed) {
      await client.close(); // Ensure client is closed on early exit
      assertFalse(true, `Failed to create News Feed setting: ${createNewsFeed.error}`);
      return;
    } else {
      newsSettingID = createNewsFeed.setting._id;
    }
    console.log("Created News Feed setting ID:", newsSettingID);

    // Setting 2: Critical Alerts (different item, different type) (expected success)
    console.log("\nAction: createNotificationConfig (Critical Alerts)");
    const createAlertsInput = {
      owner: userFrank, email: "frank@example.com", targetItem: itemAlerts,
      notificationType: "critical_alert", dailyTime: "14:00", // A valid time
      emailSubjectTemplate: "CRITICAL ALERT: {{alertReason}}", emailBodyTemplate: "Action required: {{alertDetails}}",
      isEnabled: true,
    };
    console.log("Input:", createAlertsInput);
    const createAlerts = await notificationConcept.createNotificationConfig(createAlertsInput);
    console.log("Output:", createAlerts);
    let alertSettingID: ID;
    if ("error" in createAlerts) {
      await client.close(); // Ensure client is closed on early exit
      assertFalse(true, `Failed to create Critical Alert setting: ${createAlerts.error}`);
      return;
    } else {
      alertSettingID = createAlerts.setting._id;
    }
    console.log("Created Critical Alert setting ID:", alertSettingID);

    // Send Daily News (expected success)
    console.log("\nAction: sendNotification (Daily News)");
    const sendNewsInput = {
      owner: userFrank, targetItem: itemNewsFeed,
      notificationType: "daily_news", contextData: { date: new Date().toLocaleDateString() },
    };
    console.log("Input:", sendNewsInput);
    const sendNewsResult = await notificationConcept.sendNotification(sendNewsInput);
    console.log("Output:", sendNewsResult);
    if ("error" in sendNewsResult) {
      await client.close(); // Ensure client is closed on early exit
      assertFalse(true, `Failed to send Daily News notification: ${sendNewsResult.error}`);
      return;
    }
    assertEquals(sendNewsResult.sentNotification.settingID, newsSettingID, "Daily News sent notification linked to correct setting.");
    console.log("Sent Daily News notification successfully.");

    // Send Critical Alert (expected success)
    console.log("\nAction: sendNotification (Critical Alert)");
    const sendAlertInput = {
      owner: userFrank, targetItem: itemAlerts,
      notificationType: "critical_alert", contextData: { alertReason: "System Downtime", alertDetails: "System will be down for maintenance." },
    };
    console.log("Input:", sendAlertInput);
    const sendAlertResult = await notificationConcept.sendNotification(sendAlertInput);
    console.log("Output:", sendAlertResult);
    if ("error" in sendAlertResult) {
      await client.close(); // Ensure client is closed on early exit
      assertFalse(true, `Failed to send Critical Alert notification: ${sendAlertResult.error}`);
      return;
    }
    assertEquals(sendAlertResult.sentNotification.settingID, alertSettingID, "Critical Alert sent notification linked to correct setting.");
    console.log("Sent Critical Alert notification successfully.");

    // Verify total sent notifications for Frank across all settings
    console.log("\nQuerying all sent notifications for Frank across all settings.");
    const allFrankSent = await db.collection<SentNotification>(PREFIX + "sentNotifications").find({}).toArray();
    console.log("Output (all sent notifications for Frank):", allFrankSent.map(n => ({ _id: n._id, settingID: n.settingID, wasSent: n.wasSent })));
    assertEquals(allFrankSent.length, 2, "Expected two total sent notifications for Frank.");
    console.log("Scenario successful: Multiple settings handled and targeted sends verified.");

    // Teardown for this individual test step
    await client.close();
    console.log(`--- Test Teardown: DB client closed for step "${t.name}" ---`);
  });

  await t.step("Scenario: Querying functionality for notification settings and logs", async () => {
    // Setup for this individual test step
    const [db, client] = await testDb();
    const notificationConcept = new NotificationConcept(db);
    console.log(`\n--- Test Setup: New NotificationConcept instance for step "${t.name}" ---`);

    const userGrace: User = "user:Grace" as ID;
    const itemA: Item = "item:A" as ID;
    const itemB: Item = "item:B" as ID;

    // Create a few settings for Grace (expected successes)
    const s1Res = await notificationConcept.createNotificationConfig({
      owner: userGrace, email: "grace@example.com", targetItem: itemA, notificationType: "type1",
      dailyTime: "07:00", emailSubjectTemplate: "S1", emailBodyTemplate: "B1", isEnabled: true,
    });
    const s2Res = await notificationConcept.createNotificationConfig({
      owner: userGrace, email: "grace@example.com", targetItem: itemB, notificationType: "type2",
      dailyTime: "08:00", emailSubjectTemplate: "S2", emailBodyTemplate: "B2", isEnabled: true,
    });
    const s3Res = await notificationConcept.createNotificationConfig({
      owner: userGrace, email: "grace@example.com", targetItem: itemA, notificationType: "type3", // Same item as S1, different type
      dailyTime: "09:00", emailSubjectTemplate: "S3", emailBodyTemplate: "B3", isEnabled: false, // Disabled
    });
    
    // Declare setting variables to hold the narrowed types
    let s1Setting: NotificationSetting;
    let s2Setting: NotificationSetting;
    let s3Setting: NotificationSetting;

    // Assign inside type-guarded blocks for each
    if ("error" in s1Res) { await client.close(); assertFalse(true, `Failed to create s1: ${s1Res.error}`); return; } else { s1Setting = s1Res.setting; }
    if ("error" in s2Res) { await client.close(); assertFalse(true, `Failed to create s2: ${s2Res.error}`); return; } else { s2Setting = s2Res.setting; }
    if ("error" in s3Res) { await client.close(); assertFalse(true, `Failed to create s3: ${s3Res.error}`); return; } else { s3Setting = s3Res.setting; }


    console.log(`Created 3 settings for Grace: S1(${s1Setting._id}, enabled), S2(${s2Setting._id}, enabled), S3(${s3Setting._id}, disabled)`);

    // Send a notification for s1 to create a sent log for query verification (expected success)
    const sendS1Input = { owner: userGrace, targetItem: itemA, notificationType: "type1", contextData: { key: "value" } };
    const sendS1Result = await notificationConcept.sendNotification(sendS1Input);
    if ("error" in sendS1Result) {
      await client.close(); // Ensure client is closed on early exit
      assertFalse(true, `Failed to send notification for s1: ${sendS1Result.error}`);
      return;
    }
    console.log(`Sent one notification for setting S1.`);

    // Test _getNotificationSettingsForUser query
    console.log("\nQuery: _getNotificationSettingsForUser");
    console.log("Input:", { owner: userGrace });
    const { settings: graceSettings } = await notificationConcept._getNotificationSettingsForUser({ owner: userGrace });
    console.log("Output (Grace's settings):", graceSettings.map(s => ({ _id: s._id, type: s.notificationType, enabled: s.isEnabled })));
    assertEquals(graceSettings.length, 3, "Expected 3 settings for Grace from query.");

    // Test _getSentNotificationsForSetting query
    console.log("\nQuery: _getSentNotificationsForSetting");
    console.log("Input (settingID S1):", { settingID: s1Setting._id });
    const { sentNotifications: s1Sent } = await notificationConcept._getSentNotificationsForSetting({ settingID: s1Setting._id });
    console.log("Output (S1 sent logs):", s1Sent.map(s => s._id));
    assertEquals(s1Sent.length, 1, "Expected 1 sent notification for setting 1 from query.");
    console.log("Input (settingID S2):", { settingID: s2Setting._id });
    const { sentNotifications: s2Sent } = await notificationConcept._getSentNotificationsForSetting({ settingID: s2Setting._id });
    console.log("Output (S2 sent logs):", s2Sent.map(s => s._id));
    assertEquals(s2Sent.length, 0, "Expected 0 sent notifications for setting 2 from query (none sent).");

    // Test _getEnabledSetting query
    console.log("\nQuery: _getEnabledSetting");
    const enabledSetting1Input = { owner: userGrace, targetItem: itemA, notificationType: "type1" };
    console.log("Input:", enabledSetting1Input);
    const { setting: enabledSetting1 } = await notificationConcept._getEnabledSetting(enabledSetting1Input);
    console.log("Output:", enabledSetting1 ? { _id: enabledSetting1._id, isEnabled: enabledSetting1.isEnabled } : null);
    assertExists(enabledSetting1, "Expected to find enabled setting 1 via query.");
    assertEquals(enabledSetting1._id, s1Setting._id);

    const enabledSetting3Input = { owner: userGrace, targetItem: itemA, notificationType: "type3" };
    console.log("Input:", enabledSetting3Input);
    const { setting: enabledSetting3 } = await notificationConcept._getEnabledSetting(enabledSetting3Input);
    console.log("Output:", enabledSetting3 ? { _id: enabledSetting3._id, isEnabled: enabledSetting3.isEnabled } : null);
    assertEquals(enabledSetting3, null, "Did not expect to find disabled setting 3 via _getEnabledSetting query.");

    const nonExistentSettingInput = { owner: userGrace, targetItem: itemB, notificationType: "non_existent_type" };
    console.log("Input:", nonExistentSettingInput);
    const { setting: nonExistentSetting } = await notificationConcept._getEnabledSetting(nonExistentSettingInput);
    console.log("Output:", nonExistentSetting);
    assertEquals(nonExistentSetting, null, "Did not expect to find non-existent setting via query.");
    console.log("Scenario successful: Queries functioning as expected.");

    // Teardown for this individual test step
    await client.close();
    console.log(`--- Test Teardown: DB client closed for step "${t.name}" ---`);
  });
});
```