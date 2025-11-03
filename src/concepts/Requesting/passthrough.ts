/**
 * The Requesting concept exposes passthrough routes by default,
 * which allow POSTs to the route:
 *
 * /{REQUESTING_BASE_URL}/{Concept name}/{action or query}
 *
 * to passthrough directly to the concept action or query.
 * This is a convenient and natural way to expose concepts to
 * the world, but should only be done intentionally for public
 * actions and queries.
 *
 * This file allows you to explicitly set inclusions and exclusions
 * for passthrough routes:
 * - inclusions: those that you can justify their inclusion
 * - exclusions: those to exclude, using Requesting routes instead
 */

import { TopologyDescription } from "mongodb";

/**
 * INCLUSIONS
 *
 * Each inclusion must include a justification for why you think
 * the passthrough is appropriate (e.g. public query).
 *
 * inclusions = {"route": "justification"}
 */

export const inclusions: Record<string, string> = {
  // Feel free to delete these example inclusions
  "/api/LikertSurvey/_getSurveyQuestions": "this is a public query",
  "/api/LikertSurvey/_getSurveyResponses": "responses are public",
  "/api/LikertSurvey/_getRespondentAnswers": "answers are visible",
  "/api/LikertSurvey/submitResponse": "allow anyone to submit response",
  "/api/LikertSurvey/updateResponse": "allow anyone to update their response",

  // FileUploading
  // "/api/FileUploading/_getFilename": "need to grab filenames for previews"

  // UserAuthentication
  "/api/UserAuthentication/_getUserByUsername":
    "okay to lookup users by their username",
};

/**
 * EXCLUSIONS
 *
 * Excluded routes fall back to the Requesting concept, and will
 * instead trigger the normal Requesting.request action. As this
 * is the intended behavior, no justification is necessary.
 *
 * exclusions = ["route"]
 */

export const exclusions: Array<string> = [
  // Feel free to delete these example exclusions
  "/api/LikertSurvey/createSurvey",
  "/api/LikertSurvey/addQuestion",

  // FileUploading
  "/api/FileUploading/requestUploadURL",
  "/api/FileUploading/confirmUpload",
  "/api/FileUploading/_getFilesByOwner",
  "/api/FileUploading/_getDownloadURL",
  "/api/FileUploading/_getOwner",
  "/api/FileUploading/delete",

  // Sessioning
  "/api/Sessioning/create",
  "/api/Sessioning/delete",
  "/api/Sessioning/_getUser",

  // Sharing
  "/api/Sharing/shareWithUser",
  "/api/Sharing/revokeAccess",
  "/api/Sharing/_isSharedWith",
  "/api/Sharing/_getFilesSharedWithUser",

  // UserAuthentication
  "/api/UserAuthentication/register",
  "/api/UserAuthentication/authenticate",
  "/api/UserAuthentication/changePassword",
  "/api/UserAuthentication/deleteAccount",
  "/api/UserAuthentication/_checkUserExists",
  "/api/UserAuthentication/_getAllUsers",
  "/api/UserAuthentication/_getUsernameById",

  // ScheduleGenerator
  "/api/ScheduleGenerator/initializeSchedule",
  "/api/ScheduleGenerator/addEvent",
  "/api/ScheduleGenerator/editEvent",
  "/api/ScheduleGenerator/deleteEvent",
  "/api/ScheduleGenerator/addTask",
  "/api/ScheduleGenerator/editTask",
  "/api/ScheduleGenerator/deleteTask",
  "/api/ScheduleGenerator/generateSchedule",
  "/api/ScheduleGenerator/_getScheduleByOwner",
  "/api/ScheduleGenerator/_getEventsForSchedule",
  "/api/ScheduleGenerator/_getTasksForSchedule",
  "/api/ScheduleGenerator/_getEventDetails",
  "/api/ScheduleGenerator/_getTaskDetails",
  "/api/ScheduleGenerator/_getAllSchedules",
  "/api/ScheduleGenerator/_getScheduleDetails",
  "/api/ScheduleGenerator/_getAllEvents",
  "/api/ScheduleGenerator/_getAllTasks",

  // FriendList
  "/api/FriendList/canonicalizeUsers",
  "/api/FriendList/sendFriendRequest",
  "/api/FriendList/acceptFriendRequest",
  "/api/FriendList/declineFriendRequest",
  "/api/FriendList/cancelSentRequest",
  "/api/FriendList/removeFriend",
  "/api/FriendList/_getAllFriendships",
  "/api/FriendList/_getFriendshipsByUser",
  "/api/FriendList/_getAllFriendRequests",
  "/api/FriendList/_getSentFriendRequests",
  "/api/FriendList/_getReceivedFriendRequests",
  "/api/FriendList/_getFriendshipDetails",
  "/api/FriendList/_getFriendRequestDetails",

  // Messaging
  "/api/Messaging/createConversation",
  "/api/Messaging/sendMessage",
  "/api/Messaging/_getConversation",
  "/api/Messaging/_getMessagesInConversation",
  "/api/Messaging/_getConversationsForUser",
  "/api/Messaging/_getAllConversations",
  "/api/Messaging/_getMessageDetails",
  "/api/Messaging/_getAllMessages",
];
