# Design Document

## Differences from Concept Design in Assignment 2
[Assignment 2 Concept Design](https://github.com/rahsunk/61040-portfolio/blob/main/assignments/assignment2/conceptDesign.md)

### UserAuthentication
- Only the `register` and `authenticate` actions were already conceived; a `verify` action existed that was used to check if a user with a given username exists. This was adapted to the current `_checkUserExists` action, which checks if a user with a given ID exists.
- For the sake of completeness, I added `changePassword` and `deleteAccount` actions, recommended by the LLM [here](../context/design/concepts/UserAuthentication/UserAuthentication.md/steps/response.d5941f56.md).
- I added queries to retrieve content from the state, such as `_getUserByUsername`, `_checkUserExists`, `_getAllUsers`, and `_getUsernameById`, making it eaiser to build the frontend and implement syncs

### ScheduleGenerator
- The `Time` generic type turned to the default `Date` type (so that events and tasks could have dates as attributes) and `RepeatTime` turned into the more specific `RepeatConfig` [here](../context/design/concepts/ScheduleGenerator/ScheduleGenerator.md/steps/concept.3be7817b.md).
- Each user now only has one `schedule`. Before, users could have multiple `schedules`, but I changed this to simplify the implementation.
- I added IDs to `schedules`, `events`, and `tasks` in the state. This helped keep track of what `schedule` each `event` and `task` belong to without using a direct `schedulePointer` like in Assignment 2.
- In an oversight, there was no `name` attribute to the `events` and `tasks` in Assignment 2. I added this to their states and the actions so that users can name inputted `events` and `tasks` [here](../context/design/concepts/ScheduleGenerator/ScheduleGenerator.md/steps/concept.3be7817b.md).
- I added an `initializeSchedule` action for users who do not already have one created [here](../context/design/concepts/ScheduleGenerator/ScheduleGenerator.md/steps/concept.3be7817b.md).
- `generateSchedule` is no longer a system action that is called as a result of calling another action in `ScheduleGenerator` or one of the many syncs I defined in Assignment 2. It can be called by the user at any time now.

### EventSharing => ItemSharing => Messaging
- The `EventSharing` concept in Assignment 2 was intended for users to be able to share events with each other, and that shared users can accept and reject requests and make changes to the event that would be reflected for everyone else.
- `EventSharing` did not properly separate concerns, as it referenced the state of the `events` in `ScheduleGenerator`, so I changed it to a more generic concept [ItemSharing](../context/design/concepts/ItemSharing/ItemSharing.md/steps/concept.66359f1e.md) in later assignments, which had the same principle, albeit users would share a generic `Item` with attributes.
- These concepts were heavily sync dependent (as seen by the four syncs I defined for this concept in Assignment 2), and I found that at those stages of the project, implementing `ItemSharing` would be very difficult. Hence, I made a new simpler concept, called Messaging, which preserves the principle of sharing content between users, but simplifies it to text messages between two users with no special requests.

### ProgressNotification => Notification => FriendList
- With `ProgressNotification` in Assignment 2, I intended for this to be used to remind users at a set time every day to update their progress on their tasks.
- Like `EventSharing`, `ProgressNotification` did not properly separate concerns, as it referenced the state of the `tasks` in `ScheduleGenerator`, so I changed it to a more generic concept [Notification](../context/design/concepts/Notification/Notification.md/steps/concept.1c49c453.md) in later assignments which configured settings for notifying a user.
- However, I thought that this was a very niche purpose in the app, and that getting this to work on the frontend and testing it would be quite difficult. Hence, I replaced it with a new concept `FriendList`, designed to be used together with the new `Messaging` concept I created, that is users who are friends can message each other.

### Requesting and Sessioning
- These concepts were included in the given conceptbox repository.
- I used `Requesting` to configure API routes to all of my actions to verify if a user is logged in, using `Sessioning._getUser`. This was similar to the `VerifySharedUser` sync I defined in Assignment 2 for the old `EventSharing` concept involved throwing an error if a user doesn't exist by using the old `verify` action.

## Differences from Visual Design in Assignment 4b

### UserAuthentication
- Made the Change Password button blue if the passwords match, gray otherwise like with the green or gray Register button
- Added some bottom margin to the profile page to match the existing top margin
- Submitting the change password form now displays a message for failures: (old password is not correct, new password is the same as old password) and for success: (password successfully changed)
- Made the login screen higher up on the page

### ScheduleGenerator
- Made the time and day columns in schedule align properly (by setting the height of them to be equal)
- For non-repeating events, the event cards now only display the times on the Schedule page, instead of the dates and the times they were set at
- Repeating events that had start/end times on past days are no longer greyed out
- Generated schedules now always display the current day and the next 7 days, with no missing days in between

### Messaging
- Added dates alongside the time for every message
