---
timestamp: 'Sun Oct 19 2025 15:55:33 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251019_155533.8bc2b0e8.md]]'
content_id: 41fb1b032498753a447d2415241c2832be93548d685f00ebfe5c56b7ed0e2c39
---

# response:

```typescript
// file: src/notification/NotificationConcept.ts
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Declare collection prefix, use concept name
const PREFIX = "Notification" + ".";

// Generic types of this concept as per concept specification
type User = ID;
type Item = ID;

// Specific types for fields, based on SSF and practical needs
type EmailAddress = string; // Treating 'email' as the actual email address string
type DailyTime = string;    // E.g., "HH:MM" for daily delivery time (lexical constraint: string in "HH:MM" format)

/**
 * @concept Notification [User, Item]
 * @purpose Provides a system to configure, send, and track email notifications for users about specific items, allowing users to customize daily delivery times
 *
 * State: NotificationSettings
 * a set of `NotificationSettings` with
 *   an `owner` of type `User`
 *   an `email` of type `EmailAddress` (actual address string)
 *   a `targetItem` of type `Item`
 *   a `notificationType` of type `String` (e.g., "reminder", "update")
 *   a `dailyTime` of type `DailyTime` (e.g., "14:30")
 *   a `emailSubjectTemplate` of type `String` (template for email subject)
 *   a `emailBodyTemplate` of type `String` (template for email body)
 *   an `isEnabled` of type `Boolean`
 */
interface NotificationSetting {
  _id: ID; // Unique identifier for the notification setting
  owner: User;
  email: EmailAddress;
  targetItem: Item;
  notificationType: string;
  dailyTime: DailyTime;
  emailSubjectTemplate: string;
  emailBodyTemplate: string;
  isEnabled: boolean;
}

/**
 * State: SentNotifications
 * a set of `SentNotifications` with
 *   a `settingID` of type `ID` (references NotificationSetting._id)
 *   a `timestamp` of type `Date`
 *   a `wasSent` of type `Boolean`
 *   an `errorMessage` of type `String` (optional, for logging failures)
 */
interface SentNotification {
  _id: ID; // Unique identifier for the logged sent notification
  settingID: ID; // References the _id of the associated NotificationSetting
  timestamp: Date;
  wasSent: boolean;
  errorMessage?: string; // Added for more robust error logging in case of failure
}

/**
 * Simple templating function to replace placeholders like {{key}} in a string.
 * @param template The string containing placeholders.
 * @param data An object where keys match placeholder names and values are their replacements.
 * @returns The template string with placeholders replaced.
 */
function applyTemplate(template: string, data: Record<string, string>): string {
  let result = template;
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), data[key]);
    }
  }
  return result;
}

export default class NotificationConcept {
  private notificationSettings: Collection<NotificationSetting>;
  private sentNotifications: Collection<SentNotification>;

  /**
   * @principle Notification settings for a specific user and target item are defined,
   *            including a preferred daily delivery time. When a request for an email
   *            notification for the user and target item is made, an email configured
   *            by the settings is sent to the user and logged.
   */
  constructor(private readonly db: Db) {
    this.notificationSettings = this.db.collection(PREFIX + "notificationSettings");
    this.sentNotifications = this.db.collection(PREFIX + "sentNotifications");
  }

  /**
   * Creates a new notification configuration for a user and a target item.
   *
   * @action createNotificationConfig
   * @requires `owner` exists (as a valid ID string; actual existence check is external to this concept).
   *           `email` must be a valid format. `dailyTime` must be "HH:MM".
   * @effects Creates and returns a new `NotificationSetting` document with a fresh `_id`
   *          and all provided attributes.
   */
  async createNotificationConfig(
    {
      owner,
      email,
      targetItem,
      notificationType,
      dailyTime,
      emailSubjectTemplate,
      emailBodyTemplate,
      isEnabled,
    }: {
      owner: User;
      email: EmailAddress;
      targetItem: Item;
      notificationType: string;
      dailyTime: DailyTime;
      emailSubjectTemplate: string;
      emailBodyTemplate: string;
      isEnabled: boolean;
    },
  ): Promise<{ setting: NotificationSetting } | { error: string }> {
    // Preconditions are firing conditions - validation
    if (!owner || !email || !targetItem || !notificationType || !dailyTime || emailSubjectTemplate === undefined || emailBodyTemplate === undefined || isEnabled === undefined) {
      return { error: "Missing required parameters for notification configuration." };
    }
    if (typeof emailSubjectTemplate !== 'string' || typeof emailBodyTemplate !== 'string' || typeof isEnabled !== 'boolean') {
      return { error: "Invalid type for emailSubjectTemplate, emailBodyTemplate, or isEnabled." };
    }
    // Simple email format validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { error: "Invalid email address format." };
    }
    // Check if dailyTime is in HH:MM format (as per type definition)
    if (!/^(?:2[0-3]|[01]?[0-9]):(?:[0-5]?[0-9])$/.test(dailyTime)) {
      return { error: "Invalid dailyTime format. Expected HH:MM (e.g., '14:30')." };
    }

    const newSetting: NotificationSetting = {
      _id: freshID(),
      owner,
      email,
      targetItem,
      notificationType,
      dailyTime,
      emailSubjectTemplate,
      emailBodyTemplate,
      isEnabled,
    };

    try {
      await this.notificationSettings.insertOne(newSetting);
      return { setting: newSetting };
    } catch (e: any) {
      console.error("Error creating notification config:", e);
      return { error: `Failed to create notification configuration: ${e.message || "Unknown error"}` };
    }
  }

  /**
   * Modifies an existing notification configuration.
   *
   * @action editNotificationConfig
   * @requires `settingID` exists (i.e., found in `NotificationSettings` collection).
   *           `email` must be a valid format. `dailyTime` must be "HH:MM".
   * @effects Modifies the specified `NotificationSetting` document with the given attributes.
   */
  async editNotificationConfig(
    {
      settingID,
      email,
      targetItem,
      notificationType,
      dailyTime,
      emailSubjectTemplate,
      emailBodyTemplate,
      isEnabled,
    }: {
      settingID: ID;
      email: EmailAddress;
      targetItem: Item;
      notificationType: string;
      dailyTime: DailyTime;
      emailSubjectTemplate: string;
      emailBodyTemplate: string;
      isEnabled: boolean;
    },
  ): Promise<Empty | { error: string }> {
    // Preconditions are firing conditions - validation
    if (!settingID || !email || !targetItem || !notificationType || !dailyTime || emailSubjectTemplate === undefined || emailBodyTemplate === undefined || isEnabled === undefined) {
      return { error: "Missing required parameters for editing notification configuration." };
    }
    if (typeof emailSubjectTemplate !== 'string' || typeof emailBodyTemplate !== 'string' || typeof isEnabled !== 'boolean') {
      return { error: "Invalid type for emailSubjectTemplate, emailBodyTemplate, or isEnabled." };
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { error: "Invalid email address format." };
    }
    if (!/^(?:2[0-3]|[01]?[0-9]):(?:[0-5]?[0-9])$/.test(dailyTime)) {
      return { error: "Invalid dailyTime format. Expected HH:MM (e.g., '14:30')." };
    }

    // Requires: `setting` exists
    const existingSetting = await this.notificationSettings.findOne({ _id: settingID });
    if (!existingSetting) {
      return { error: `Notification setting with ID ${settingID} not found.` };
    }

    try {
      const updateResult = await this.notificationSettings.updateOne(
        { _id: settingID },
        {
          $set: {
            email,
            targetItem,
            notificationType,
            dailyTime,
            emailSubjectTemplate,
            emailBodyTemplate,
            isEnabled,
          },
        },
      );

      if (updateResult.matchedCount === 0) {
        // This case should ideally not be reached if findOne succeeded,
        // but included for robustness against potential race conditions.
        return { error: `Notification setting with ID ${settingID} not found for update (possible race condition).` };
      }
      return {}; // Success, return Empty
    } catch (e: any) {
      console.error("Error editing notification config:", e);
      return { error: `Failed to edit notification configuration: ${e.message || "Unknown error"}` };
    }
  }

  /**
   * Deletes a notification configuration and all its associated sent notifications.
   *
   * @action deleteNotificationConfig
   * @requires `settingID` exists.
   * @effects Deletes the `NotificationSetting` document matching `settingID` and
   *          all `SentNotification` documents that reference this `settingID`.
   */
  async deleteNotificationConfig(
    { settingID }: { settingID: ID },
  ): Promise<Empty | { error: string }> {
    if (!settingID) {
      return { error: "Missing settingID for deletion." };
    }

    // Requires: `setting` exists
    const existingSetting = await this.notificationSettings.findOne({ _id: settingID });
    if (!existingSetting) {
      return { error: `Notification setting with ID ${settingID} not found.` };
    }

    try {
      // Delete the setting itself
      await this.notificationSettings.deleteOne({ _id: settingID });

      // Delete all associated sent notifications (cascade delete)
      await this.sentNotifications.deleteMany({ settingID: settingID });

      return {}; // Success, return Empty
    } catch (e: any) {
      console.error("Error deleting notification config:", e);
      return { error: `Failed to delete notification configuration: ${e.message || "Unknown error"}` };
    }
  }

  /**
   * Sends an email notification based on configured settings and logs the attempt.
   * The `contextData` parameter allows for dynamic content in email subject and body templates.
   *
   * @action sendNotification
   * @requires `owner` exists (as a valid ID string), and there exists a `NotificationSetting` entry
   *           with the same `owner`, `targetItem`, and `notificationType`, and `isEnabled` set to true.
   *           `contextData` must be a non-null object.
   * @effects Finds the specified `NotificationSetting`. Uses its `emailSubjectTemplate`, `emailBodyTemplate`,
   *          and `email` to construct and "send" the email (simulated here). Creates a `SentNotification`
   *          entry to record the attempt, `timestamp`, `wasSent` (true for success, false for failure),
   *          and an `errorMessage` if applicable. Returns the `SentNotification` on success,
   *          or an `error` string if no matching/enabled setting was found or email delivery fails.
   */
  async sendNotification(
    {
      owner,
      targetItem,
      notificationType,
      contextData,
    }: {
      owner: User;
      targetItem: Item;
      notificationType: string;
      contextData: Record<string, string>;
    },
  ): Promise<{ sentNotification: SentNotification } | { error: string }> {
    // Preconditions are firing conditions - validation
    if (!owner || !targetItem || !notificationType || contextData === undefined) {
      return { error: "Missing required parameters for sending notification." };
    }
    if (typeof contextData !== 'object' || contextData === null) { // contextData should be an object for templating
      return { error: "Invalid contextData format. Expected a dictionary/object." };
    }

    // Requires: owner exists and there exists a NotificationSettings entry with matching criteria and isEnabled=true.
    const setting = await this.notificationSettings.findOne({
      owner,
      targetItem,
      notificationType,
      isEnabled: true,
    });

    if (!setting) {
      const errorMessage = "No matching and enabled notification setting found for this owner, item, and type.";
      console.warn(`Warning: ${errorMessage} (Owner: ${owner}, Item: ${targetItem}, Type: ${notificationType})`);
      // Log an attempt even if setting not found, to track potential misconfigurations
      const failedSentNotification: SentNotification = {
          _id: freshID(),
          settingID: "not-found" as ID, // Use a placeholder ID for settings not found when no specific setting ID is available
          timestamp: new Date(),
          wasSent: false,
          errorMessage,
      };
      await this.sentNotifications.insertOne(failedSentNotification);
      return { error: errorMessage };
    }

    const _id = freshID(); // Unique ID for the new SentNotification log entry
    const timestamp = new Date();
    let wasSent = false;
    let errorMessage: string | undefined = undefined;
    let simulatedEmailContent: { to: string, subject: string, body: string } | undefined;

    try {
      // Simulate email sending process
      const subject = applyTemplate(setting.emailSubjectTemplate, contextData);
      const body = applyTemplate(setting.emailBodyTemplate, contextData);

      simulatedEmailContent = {
          to: setting.email,
          subject,
          body,
      };

      console.log(`--- Simulating Email Send ---`);
      console.log(`To: ${simulatedEmailContent.to}`);
      console.log(`Subject: ${simulatedEmailContent.subject}`);
      console.log(`Body:\n${simulatedEmailContent.body}`);
      console.log(`-----------------------------`);

      // In a real application, this would involve calling an external email service API (e.g., SendGrid, Mailgun).
      // For this implementation, we assume successful sending unless an explicit error condition is simulated.
      wasSent = true;
    } catch (e: any) {
      console.error("Error simulating email sending:", e);
      errorMessage = `Email delivery failed: ${e.message || "Unknown reason"}`;
      wasSent = false;
    }

    const sentNotification: SentNotification = {
      _id,
      settingID: setting._id,
      timestamp,
      wasSent,
      errorMessage,
    };

    try {
      await this.sentNotifications.insertOne(sentNotification);
      return { sentNotification };
    } catch (e: any) {
      console.error("Error logging sent notification:", e);
      // Even if logging fails, the email might have been sent, but we prioritize reporting logging failure.
      // In a production system, you might have different strategies for handling logging failures.
      return { error: `Failed to log sent notification (email send status: ${wasSent ? 'success' : 'failure'}): ${e.message || "Unknown error"}` };
    }
  }

  // --- Concept Queries ---

  /**
   * Retrieves all notification settings configured for a specific user.
   *
   * @query _getNotificationSettingsForUser
   * @param owner The ID of the user.
   * @returns An array of `NotificationSetting` objects belonging to the user.
   */
  async _getNotificationSettingsForUser(
    { owner }: { owner: User },
  ): Promise<{ settings: NotificationSetting[] }> {
    if (!owner) {
      return { settings: [] };
    }
    const settings = await this.notificationSettings.find({ owner }).toArray();
    return { settings };
  }

  /**
   * Retrieves a specific notification setting by its ID.
   *
   * @query _getNotificationSettingById
   * @param settingID The ID of the notification setting.
   * @returns The matching `NotificationSetting` or `null` if not found.
   */
  async _getNotificationSettingById(
    { settingID }: { settingID: ID },
  ): Promise<{ setting: NotificationSetting | null }> {
    if (!settingID) {
      return { setting: null };
    }
    const setting = await this.notificationSettings.findOne({ _id: settingID });
    return { setting };
  }

  /**
   * Retrieves all sent notifications associated with a specific notification setting.
   *
   * @query _getSentNotificationsForSetting
   * @param settingID The ID of the notification setting.
   * @returns An array of `SentNotification` objects associated with the setting.
   */
  async _getSentNotificationsForSetting(
    { settingID }: { settingID: ID },
  ): Promise<{ sentNotifications: SentNotification[] }> {
    if (!settingID) {
      return { sentNotifications: [] };
    }
    const sent = await this.sentNotifications.find({ settingID }).toArray();
    return { sentNotifications: sent };
  }

  /**
   * Retrieves an enabled notification setting for a specific user, item, and notification type.
   * This is useful for internal logic, e.g., when a system event needs to check if a notification should be sent.
   *
   * @query _getEnabledSetting
   * @param owner The ID of the user.
   * @param targetItem The ID of the item.
   * @param notificationType The type of notification.
   * @returns The matching `NotificationSetting` or `null` if not found/enabled.
   */
  async _getEnabledSetting(
    { owner, targetItem, notificationType }: { owner: User; targetItem: Item; notificationType: string },
  ): Promise<{ setting: NotificationSetting | null }> {
    if (!owner || !targetItem || !notificationType) {
      return { setting: null };
    }
    const setting = await this.notificationSettings.findOne({
      owner,
      targetItem,
      notificationType,
      isEnabled: true,
    });
    return { setting };
  }
}
```

```typescript
// file: src/notification/NotificationConcept.test.ts
import { assertEquals, assertExists, assertFalse, assertNotEquals, assertObjectMatch, assertStringIncludes, assertTrue } from "jsr:@std/assert";
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
    assertEquals(res1.error, "Missing required parameters for notification configuration.");
    console.log("Result (missing owner):", res1.error);

    // Invalid email format
    console.log("Attempting to create config with invalid email format.");
    const res2 = await concept.createNotificationConfig({
      owner: userBob, email: "invalid-email", targetItem: itemProductA, notificationType: notificationTypePriceDrop,
      dailyTime: "10:00", emailSubjectTemplate: "Sub", emailBodyTemplate: "Body", isEnabled: true,
    });
    assertExists(res2.error);
    assertEquals(res2.error, "Invalid email address format.");
    console.log("Result (invalid email):", res2.error);

    // Invalid dailyTime format
    console.log("Attempting to create config with invalid dailyTime format.");
    const res3 = await concept.createNotificationConfig({
      owner: userBob, email: emailBob, targetItem: itemProductA, notificationType: notificationTypePriceDrop,
      dailyTime: "25:00", emailSubjectTemplate: "Sub", emailBodyTemplate: "Body", isEnabled: true,
    });
    assertExists(res3.error);
    assertEquals(res3.error, "Invalid dailyTime format. Expected HH:MM (e.g., '14:30').");
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

    // Verify a failed log entry was made for the 'not-found' case (as setting was not matching enabled criteria)
    // We expect one entry now, for this failed attempt.
    const allSentNotifs = await concept.sentNotifications.find({ settingID: "not-found" as ID }).toArray();
    assertNotEquals(allSentNotifs.length, 0, "A failed log entry for 'not-found' settingID should exist.");
    assertEquals(allSentNotifs[0].wasSent, false);
    assertStringIncludes(allSentNotifs[0].errorMessage!, "No matching and enabled notification setting found");
    console.log("Verified failed log entry for disabled setting.");


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
    // This will also add to the 'not-found' log entries, total should be 2 now
    const allSentNotifsAfterSecondFail = await concept.sentNotifications.find({ settingID: "not-found" as ID }).toArray();
    assertEquals(allSentNotifsAfterSecondFail.length, 2, "A second failed log entry for 'not-found' settingID should exist.");
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
