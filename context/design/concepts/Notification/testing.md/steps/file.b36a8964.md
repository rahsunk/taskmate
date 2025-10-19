---
timestamp: 'Sun Oct 19 2025 15:58:25 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251019_155825.24eb49ca.md]]'
content_id: b36a89645220982787456dcffb6c3d289fe3b8b710bd4fecdee4f2ff09fac541
---

# file: src/notification/NotificationConcept.test.ts

```typescript
import { assertEquals, assertExists, assertFalse, assertObjectMatch, assertStringIncludes, assertTrue } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { freshID } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import NotificationConcept from "./NotificationConcept.ts";
import { NotificationSetting } from "./NotificationConcept.ts"; // Import for type assertion

Deno.test("Notification Concept - Operational Principle", async (t) => {
  const [db, client] = await testDb();
  const concept = new NotificationConcept(db);

  // --- Test Setup: Define common IDs ---
  const userAlice = "user:Alice" as ID;
  const itemPost123 = "item:Post123" as ID;
  const notificationTypeComment = "new_comment" as string;
  const emailAlice = "alice@example.com";
  const dailyTime = "09:00";
  const subjectTemplate = "New comment on your post: {{postTitle}}";
  const bodyTemplate = "Hi {{userName}},\n\nA new comment was added to your post '{{postTitle}}' by {{commentAuthor}}.\n\nComment: \"{{commentContent}}\"\n\nBest regards,\nNotification System";

  let createdSetting: { setting: NotificationSetting } | { error: string };

  console.log("\n--- Operational Principle Trace ---");

  await t.step("1. Create Notification Configuration", async () => {
    console.log("Action: createNotificationConfig");
    const createArgs = {
      owner: userAlice,
      email: emailAlice,
      targetItem: itemPost123,
      notificationType: notificationTypeComment,
      dailyTime: dailyTime,
      emailSubjectTemplate: subjectTemplate,
      emailBodyTemplate: bodyTemplate,
      isEnabled: true,
    };
    console.log("Input:", createArgs);
    createdSetting = await concept.createNotificationConfig(createArgs);

    assertExists(createdSetting.setting, "Should successfully create a notification setting.");
    assertFalse("error" in createdSetting, "Should not return an error.");
    assertObjectMatch(createdSetting.setting as NotificationSetting, { // Assert as NotificationSetting
      owner: userAlice,
      email: emailAlice,
      targetItem: itemPost123,
      notificationType: notificationTypeComment,
      dailyTime: dailyTime,
      emailSubjectTemplate: subjectTemplate,
      emailBodyTemplate: bodyTemplate,
      isEnabled: true,
    });
    console.log("Output (created setting):", createdSetting.setting);

    // Verify state: retrieve the created setting
    const retrievedSetting = await concept._getNotificationSettingById({ settingID: createdSetting.setting._id });
    assertExists(retrievedSetting.setting, "Created setting should be retrievable from state.");
    assertEquals(retrievedSetting.setting!._id, createdSetting.setting._id);
  });

  await t.step("2. Send Notification based on Configuration", async () => {
    console.log("Action: sendNotification");
    // Ensure the setting was successfully created in the previous step
    assertExists(createdSetting.setting, "Pre-condition failed: Notification setting must exist from previous step.");

    const sendArgs = {
      owner: userAlice,
      targetItem: itemPost123,
      notificationType: notificationTypeComment,
      contextData: {
        userName: "Alice",
        postTitle: "My First Post",
        commentAuthor: "Bob",
        commentContent: "Great post!",
      },
    };
    console.log("Input:", sendArgs);
    const sentNotificationResult = await concept.sendNotification(sendArgs);

    assertExists(sentNotificationResult.sentNotification, "Should successfully send and log a notification.");
    assertFalse("error" in sentNotificationResult, "Should not return an error.");
    assertObjectMatch(sentNotificationResult.sentNotification, {
      settingID: createdSetting.setting._id,
      wasSent: true,
    });
    assertTrue(sentNotificationResult.sentNotification.timestamp instanceof Date, "Timestamp should be a Date object.");
    console.log("Output (sent notification):", sentNotificationResult.sentNotification);

    // Verify state: retrieve the sent notification
    const retrievedSentNotifications = await concept._getSentNotificationsForSetting({ settingID: createdSetting.setting._id });
    assertEquals(retrievedSentNotifications.sentNotifications.length, 1, "There should be one sent notification logged.");
    assertEquals(retrievedSentNotifications.sentNotifications[0]._id, sentNotificationResult.sentNotification._id);
  });

  console.log("--- End Operational Principle Trace ---\n");

  await client.close();
});

Deno.test("Notification Concept - Interesting Scenarios", async (t) => {
  const [db, client] = await testDb();
  const concept = new NotificationConcept(db);

  // Common IDs for multiple scenarios
  const userBob = "user:Bob" as ID;
  const userCharlie = "user:Charlie" as ID;
  const itemProductA = "item:ProductA" as ID;
  const itemProductB = "item:ProductB" as ID;
  const notificationTypePriceDrop = "price_drop_alert" as string;
  const notificationTypeOrderUpdate = "order_status" as string;
  const emailBob = "bob@example.com";
  const emailCharlie = "charlie@example.com";

  let bobSettingID: ID;
  let charlieSettingID: ID;
  let charlieSecondSettingID: ID; // For the second setting created for Charlie

  await t.step("Scenario 1: Invalid Creation Attempts", async () => {
    console.log("\n--- Scenario 1: Invalid Creation Attempts ---");

    // Missing owner
    console.log("Attempting to create config with missing owner.");
    const res1 = await concept.createNotificationConfig({
      owner: "" as ID, email: emailBob, targetItem: itemProductA, notificationType: notificationTypePriceDrop,
      dailyTime: "10:00", emailSubjectTemplate: "Sub", emailBodyTemplate: "Body", isEnabled: true,
    });
    assertExists(res1.error);
    assertEquals(res1.error, "Missing or invalid required parameters for notification configuration.");
    console.log("Result (missing owner):", res1.error);

    // Invalid email format (simpler validation in concept means this might pass, but a real system would do more)
    // Here we're testing the basic validation logic present in the `createNotificationConfig`
    console.log("Attempting to create config with invalid email subject template type.");
    const res2 = await concept.createNotificationConfig({
      owner: userBob, email: emailBob, targetItem: itemProductA, notificationType: notificationTypePriceDrop,
      dailyTime: "10:00", emailSubjectTemplate: 123 as any, emailBodyTemplate: "Body", isEnabled: true,
    });
    assertExists(res2.error);
    assertEquals(res2.error, "Invalid type for emailSubjectTemplate, emailBodyTemplate, or isEnabled.");
    console.log("Result (invalid subject template type):", res2.error);

    // Invalid dailyTime format
    console.log("Attempting to create config with invalid dailyTime format.");
    const res3 = await concept.createNotificationConfig({
      owner: userBob, email: emailBob, targetItem: itemProductA, notificationType: notificationTypePriceDrop,
      dailyTime: "25:00", emailSubjectTemplate: "Sub", emailBodyTemplate: "Body", isEnabled: true,
    });
    assertExists(res3.error);
    assertEquals(res3.error, "Invalid dailyTime format. Expected HH:MM.");
    console.log("Result (invalid dailyTime):", res3.error);
  });

  await t.step("Scenario 2: Editing an existing configuration", async () => {
    console.log("\n--- Scenario 2: Editing an existing configuration ---");

    // Create a setting first
    const createRes = await concept.createNotificationConfig({
      owner: userBob, email: emailBob, targetItem: itemProductA, notificationType: notificationTypePriceDrop,
      dailyTime: "10:00", emailSubjectTemplate: "Price Drop for {{productName}}",
      emailBodyTemplate: "Hey, {{userName}}! The price for {{productName}} has dropped!", isEnabled: true,
    });
    assertExists(createRes.setting);
    bobSettingID = createRes.setting._id;
    console.log("Created setting for Bob:", createRes.setting);

    // Edit the setting
    console.log("Action: editNotificationConfig (changing email and disabling)");
    const editArgs = {
      settingID: bobSettingID,
      email: "bob.new@example.com",
      targetItem: itemProductA,
      notificationType: notificationTypePriceDrop,
      dailyTime: "11:30",
      emailSubjectTemplate: "Updated Price Alert: {{productName}}",
      emailBodyTemplate: "The new price for {{productName}} is even lower!",
      isEnabled: false, // Disable it
    };
    console.log("Input:", editArgs);
    const editResult = await concept.editNotificationConfig(editArgs);
    assertFalse("error" in editResult, "Edit should be successful.");
    console.log("Edit result:", editResult);

    // Verify changes
    const updatedSetting = await concept._getNotificationSettingById({ settingID: bobSettingID });
    assertExists(updatedSetting.setting);
    assertEquals(updatedSetting.setting.email, "bob.new@example.com");
    assertEquals(updatedSetting.setting.dailyTime, "11:30");
    assertFalse(updatedSetting.setting.isEnabled, "Setting should be disabled.");
    assertEquals(updatedSetting.setting.emailSubjectTemplate, "Updated Price Alert: {{productName}}");
    console.log("Verified updated setting:", updatedSetting.setting);

    // Attempt to edit a non-existent setting
    console.log("Attempting to edit a non-existent setting.");
    const nonExistentID = freshID();
    const editNonExistentResult = await concept.editNotificationConfig({
      settingID: nonExistentID,
      email: "some@email.com", targetItem: itemProductA, notificationType: notificationTypePriceDrop,
      dailyTime: "12:00", emailSubjectTemplate: "Fake", emailBodyTemplate: "Fake", isEnabled: true,
    });
    assertExists(editNonExistentResult.error);
    assertEquals(editNonExistentResult.error, `Notification setting with ID ${nonExistentID} not found.`);
    console.log("Result (edit non-existent):", editNonExistentResult.error);
  });

  await t.step("Scenario 3: Sending notifications with disabled/missing settings", async () => {
    console.log("\n--- Scenario 3: Sending notifications with disabled/missing settings ---");

    // Attempt to send for the disabled setting (from Scenario 2)
    console.log("Action: sendNotification for disabled setting.");
    const sendDisabledArgs = {
      owner: userBob,
      targetItem: itemProductA,
      notificationType: notificationTypePriceDrop,
      contextData: { productName: "Product A" },
    };
    console.log("Input:", sendDisabledArgs);
    const sendDisabledResult = await concept.sendNotification(sendDisabledArgs);
    assertExists(sendDisabledResult.error, "Should fail to send for a disabled setting.");
    assertStringIncludes(sendDisabledResult.error, "No matching and enabled notification setting found");
    console.log("Result (send disabled):", sendDisabledResult.error);

    // Verify no sent notification was logged for this specific failed attempt in the 'sentNotifications' collection
    // as per the initial implementation's behavior for `if (!setting)`
    const sentNotifsForBobSetting = await concept._getSentNotificationsForSetting({ settingID: bobSettingID });
    assertEquals(sentNotifsForBobSetting.sentNotifications.length, 0, "No notification should be logged for a disabled setting when it doesn't match the enabled criteria.");

    // Attempt to send for a non-existent setting/owner/item/type combination
    console.log("Action: sendNotification for non-existent setting combo.");
    const sendNonExistentArgs = {
      owner: userCharlie, // Charlie has no settings yet
      targetItem: itemProductB,
      notificationType: notificationTypeOrderUpdate,
      contextData: { orderId: "XYZ789" },
    };
    console.log("Input:", sendNonExistentArgs);
    const sendNonExistentResult = await concept.sendNotification(sendNonExistentArgs);
    assertExists(sendNonExistentResult.error, "Should fail to send for non-existent combo.");
    assertStringIncludes(sendNonExistentResult.error, "No matching and enabled notification setting found");
    console.log("Result (send non-existent combo):", sendNonExistentResult.error);
    // Again, no log should be created in `sentNotifications` for a non-existent setting.
    const allSentNotifs = await concept.sentNotifications.find({}).toArray();
    assertEquals(allSentNotifs.length, 0, "No notification should be logged for a non-existent setting.");
  });

  await t.step("Scenario 4: Multiple settings and targeted sending", async () => {
    console.log("\n--- Scenario 4: Multiple settings and targeted sending ---");

    // Create a setting for Charlie, enabled
    const createCharlieRes = await concept.createNotificationConfig({
      owner: userCharlie, email: emailCharlie, targetItem: itemProductB, notificationType: notificationTypeOrderUpdate,
      dailyTime: "14:00", emailSubjectTemplate: "Order Update for #{{orderId}}",
      emailBodyTemplate: "Hello {{customerName}}, your order {{orderId}} is now {{status}}.", isEnabled: true,
    });
    assertExists(createCharlieRes.setting);
    charlieSettingID = createCharlieRes.setting._id;
    console.log("Created setting for Charlie (Order Update):", createCharlieRes.setting);

    // Create another setting for Charlie, same item, different type
    const createCharlieRes2 = await concept.createNotificationConfig({
      owner: userCharlie, email: emailCharlie, targetItem: itemProductB, notificationType: notificationTypePriceDrop,
      dailyTime: "15:00", emailSubjectTemplate: "Price Drop on {{productName}} for Charlie",
      emailBodyTemplate: "Hi Charlie, {{productName}} price dropped!", isEnabled: true,
    });
    assertExists(createCharlieRes2.setting);
    charlieSecondSettingID = createCharlieRes2.setting._id;
    console.log("Created second setting for Charlie (Price Drop):", createCharlieRes2.setting);

    // Send order update for Charlie
    console.log("Action: sendNotification for Charlie's order update.");
    const sendCharlieOrderArgs = {
      owner: userCharlie,
      targetItem: itemProductB,
      notificationType: notificationTypeOrderUpdate,
      contextData: { customerName: "Charlie", orderId: "ORD-001", status: "Shipped" },
    };
    console.log("Input:", sendCharlieOrderArgs);
    const sentCharlieOrder = await concept.sendNotification(sendCharlieOrderArgs);
    assertExists(sentCharlieOrder.sentNotification);
    assertEquals(sentCharlieOrder.sentNotification.settingID, charlieSettingID, "Should use the correct 'order_status' setting.");
    assertTrue(sentCharlieOrder.sentNotification.wasSent);
    console.log("Sent notification for Charlie's order:", sentCharlieOrder.sentNotification);

    // Send price drop for Charlie
    console.log("Action: sendNotification for Charlie's price drop.");
    const sendCharliePriceDropArgs = {
      owner: userCharlie,
      targetItem: itemProductB,
      notificationType: notificationTypePriceDrop,
      contextData: { productName: "Super Widget" },
    };
    console.log("Input:", sendCharliePriceDropArgs);
    const sentCharliePriceDrop = await concept.sendNotification(sendCharliePriceDropArgs);
    assertExists(sentCharliePriceDrop.sentNotification);
    assertEquals(sentCharliePriceDrop.sentNotification.settingID, charlieSecondSettingID, "Should use the correct 'price_drop_alert' setting.");
    assertTrue(sentCharliePriceDrop.sentNotification.wasSent);
    console.log("Sent notification for Charlie's price drop:", sentCharliePriceDrop.sentNotification);

    // Verify total sent notifications for Charlie's main setting
    const charlieSentNotifsPrimary = await concept._getSentNotificationsForSetting({ settingID: charlieSettingID });
    assertEquals(charlieSentNotifsPrimary.sentNotifications.length, 1, "Only one notification should be logged for charlieSettingID (order_status).");
    console.log("Verified total sent notifications for Charlie's main setting.");

    const charlieSentNotifsSecondary = await concept._getSentNotificationsForSetting({ settingID: charlieSecondSettingID });
    assertEquals(charlieSentNotifsSecondary.sentNotifications.length, 1, "Only one notification should be logged for charlieSecondSettingID (price_drop_alert).");
    console.log("Verified total sent notifications for Charlie's second setting.");
  });

  await t.step("Scenario 5: Deleting configurations and cascade effect", async () => {
    console.log("\n--- Scenario 5: Deleting configurations and cascade effect ---");

    // Ensure settings exist from previous steps
    assertExists(bobSettingID, "bobSettingID must be set from Scenario 2.");
    assertExists(charlieSettingID, "charlieSettingID must be set from Scenario 4.");
    assertExists(charlieSecondSettingID, "charlieSecondSettingID must be set from Scenario 4.");

    // Re-enable Bob's setting and send one to ensure there's a logged entry to test cascade delete
    // Note: The concept itself does not validate email format strictly beyond type check.
    await concept.editNotificationConfig({
      settingID: bobSettingID,
      email: "bob.re-enabled@example.com", targetItem: itemProductA, notificationType: notificationTypePriceDrop,
      dailyTime: "11:30", emailSubjectTemplate: "Updated Price Alert: {{productName}}",
      emailBodyTemplate: "The new price for {{productName}} is even lower!",
      isEnabled: true,
    });
    const sendBobAgain = await concept.sendNotification({
      owner: userBob,
      targetItem: itemProductA,
      notificationType: notificationTypePriceDrop,
      contextData: { productName: "Product A" },
    });
    assertExists(sendBobAgain.sentNotification);
    const bobSentAfterReenable = await concept._getSentNotificationsForSetting({ settingID: bobSettingID });
    assertEquals(bobSentAfterReenable.sentNotifications.length, 1, "One successful notification should be logged for Bob's setting.");
    console.log("Bob's setting re-enabled and one notification sent for deletion test.");


    // Delete Bob's setting
    console.log("Action: deleteNotificationConfig for Bob's setting.");
    const deleteBobResult = await concept.deleteNotificationConfig({ settingID: bobSettingID });
    assertFalse("error" in deleteBobResult, "Deletion of Bob's setting should be successful.");
    console.log("Deletion result for Bob:", deleteBobResult);

    // Verify Bob's setting is gone
    const deletedBobSetting = await concept._getNotificationSettingById({ settingID: bobSettingID });
    assertEquals(deletedBobSetting.setting, null, "Bob's setting should no longer exist.");
    console.log("Verified Bob's setting is gone.");

    // Verify cascade deletion of Bob's sent notifications
    const bobSentAfterDeletion = await concept._getSentNotificationsForSetting({ settingID: bobSettingID });
    assertEquals(bobSentAfterDeletion.sentNotifications.length, 0, "All sent notifications for Bob's setting should be deleted.");
    console.log("Verified cascade deletion for Bob's sent notifications.");

    // Delete one of Charlie's settings
    console.log("Action: deleteNotificationConfig for Charlie's first setting (order_status).");
    const deleteCharlieResult = await concept.deleteNotificationConfig({ settingID: charlieSettingID });
    assertFalse("error" in deleteCharlieResult, "Deletion of Charlie's setting should be successful.");
    const deletedCharlieSetting = await concept._getNotificationSettingById({ settingID: charlieSettingID });
    assertEquals(deletedCharlieSetting.setting, null, "Charlie's first setting should no longer exist.");
    const charlieSentAfterDeletion = await concept._getSentNotificationsForSetting({ settingID: charlieSettingID });
    assertEquals(charlieSentAfterDeletion.sentNotifications.length, 0, "All sent notifications for Charlie's first setting should be deleted.");
    console.log("Verified deletion and cascade effect for Charlie's first setting.");

    // Check that Charlie's second setting still exists
    const remainingCharlieSetting = await concept._getNotificationSettingById({ settingID: charlieSecondSettingID });
    assertExists(remainingCharlieSetting.setting, "Charlie's second setting should still exist.");
    console.log("Verified Charlie's second setting still exists:", remainingCharlieSetting.setting);

    // Attempt to delete a non-existent setting
    console.log("Attempting to delete a non-existent setting.");
    const nonExistentID = freshID();
    const deleteNonExistentResult = await concept.deleteNotificationConfig({ settingID: nonExistentID });
    assertExists(deleteNonExistentResult.error);
    assertEquals(deleteNonExistentResult.error, `Notification setting with ID ${nonExistentID} not found.`);
    console.log("Result (delete non-existent):", deleteNonExistentResult.error);
  });

  await client.close();
});
```
