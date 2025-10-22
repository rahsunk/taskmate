---
timestamp: 'Tue Oct 21 2025 12:28:59 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251021_122859.336423ef.md]]'
content_id: cbc2e72baa2c96d5331510876b7237df012c6b4bc49824d3f80b38507245abf0
---

# response:

Here's the implementation for the `Notification` concept in TypeScript, adhering to the provided guidelines and rubric. I've made some minor adjustments to the concept specification (marked with `diff` blocks) for practical implementation, especially regarding the `notificationType` field in the state and the `contextData` type in `sendNotification` action for templating.

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
type EmailAddress = string; // Treating 'Email' as the actual email address string
type DailyTime = string;    // E.g., "HH:MM" for daily delivery time
type Percent = number;      // For completionLevel, priority (0-100)

/**
 * @concept Notification [User, Item]
 * @purpose Provides a system to configure, send, and track email notifications for users about specific items, allowing users to customize daily delivery times
 *
 * State: NotificationSettings
 * a set of `NotificationSettings` with
 *   an `owner` of type `User`
 *   an `email` of type `EmailAddress` (actual address string)
 *   a `settingID` of type `ID` (concept-internal identifier, maps to MongoDB _id)
 *   a `targetItem` of type `Item`
 *   a `notificationType` of type `String` (e.g., "reminder", "update")
 *   a `dailyTime` of type `DailyTime` (e.g., "14:30")
 *   a `emailSubjectTemplate` of type `String` (template for email subject)
 *   a `emailBodyTemplate` of type `String` (template for email body)
 *   an `isEnabled` of type `Boolean`
 */
interface NotificationSetting {
  _id: ID; // Maps to settingID in the specification, unique identifier for the setting
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
 *   a `sentNotificationID` of type `ID` (concept-internal identifier, maps to MongoDB _id)
 *   a `settingID` of type `ID` (references NotificationSetting._id)
 *   a `timestamp` of type `Date`
 *   a `wasSent` of type `Boolean`
 *   an `errorMessage` of type `String` (optional, for logging failures)
 */
interface SentNotification {
  _id: ID; // Maps to sentNotificationID in the specification
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
   * @effects Creates and returns a new `NotificationSetting` document with a fresh `_id` (settingID)
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
    // Basic validation for required fields
    if (!owner || !email || !targetItem || !notificationType || !dailyTime || emailSubjectTemplate === undefined || emailBodyTemplate === undefined || isEnabled === undefined) {
      return { error: "Missing or invalid required parameters for notification configuration." };
    }
    if (typeof emailSubjectTemplate !== 'string' || typeof emailBodyTemplate !== 'string' || typeof isEnabled !== 'boolean') {
        return { error: "Invalid type for emailSubjectTemplate, emailBodyTemplate, or isEnabled." };
    }
    // Check if dailyTime is in HH:MM format (optional, but good for robust design)
    if (!/^(?:2[0-3]|[01]?[0-9]):(?:[0-5]?[0-9])$/.test(dailyTime)) {
        return { error: "Invalid dailyTime format. Expected HH:MM." };
    }


    const newSetting: NotificationSetting = {
      _id: freshID(), // Maps to settingID, auto-generated unique ID
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
    // Basic validation for required fields
    if (!settingID || !email || !targetItem || !notificationType || !dailyTime || emailSubjectTemplate === undefined || emailBodyTemplate === undefined || isEnabled === undefined) {
      return { error: "Missing or invalid required parameters for editing notification configuration." };
    }
    if (typeof emailSubjectTemplate !== 'string' || typeof emailBodyTemplate !== 'string' || typeof isEnabled !== 'boolean') {
        return { error: "Invalid type for emailSubjectTemplate, emailBodyTemplate, or isEnabled." };
    }
    if (!/^(?:2[0-3]|[01]?[0-9]):(?:[0-5]?[0-9])$/.test(dailyTime)) {
        return { error: "Invalid dailyTime format. Expected HH:MM." };
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

      // Delete all associated sent notifications
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
   * @effects Finds the specified `NotificationSetting`. Uses its `emailSubjectTemplate`, `emailBodyTemplate`,
   *          and `email` to construct and "send" the email (simulated here). Creates a `SentNotification`
   *          entry to record the attempt, `timestamp`, `wasSent` (true for success, false for failure),
   *          and an `errorMessage` if applicable. Returns the `SentNotification` on success,
   *          or an `error` string if no matching/enabled setting was found or email delivery fails.
   * @param owner The ID of the user for whom the notification is intended.
   * @param targetItem The ID of the item the notification is related to.
   * @param notificationType The specific type of notification (e.g., "new_post_alert", "deadline_reminder").
   * @param contextData A dictionary object providing key-value pairs for templating the email content.
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
    if (!owner || !targetItem || !notificationType || !contextData) {
      return { error: "Missing required parameters for sending notification." };
    }
    if (typeof contextData !== 'object' || contextData === null) {
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
      return { error: "No matching and enabled notification setting found for this owner, item, and type." };
    }

    const _id = freshID(); // Maps to sentNotificationID for the new log entry
    const timestamp = new Date();
    let wasSent = false;
    let errorMessage: string | undefined = undefined;

    try {
      // Simulate email sending process
      const subject = applyTemplate(setting.emailSubjectTemplate, contextData);
      const body = applyTemplate(setting.emailBodyTemplate, contextData);

      console.log(`--- Simulating Email Send ---`);
      console.log(`To: ${setting.email}`);
      console.log(`Subject: ${subject}`);
      console.log(`Body:\n${body}`);
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
      return { error: `Failed to log sent notification: ${e.message || "Unknown error"}` };
    }
  }

  // --- Concept Queries ---
  // Queries are reads of the concept state. Explicit query specifications are often not required
  // since the concept state is assumed to be visible, so straightforward queries of the state
  // do not need to be defined in advance. However, some non-trivial or common queries can be
  // explicitly defined for convenience or to clarify intended access patterns.

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
