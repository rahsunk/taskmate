# Major Design Changes (Assignment 4b)

## ScheduleGenerator

- Slightly simplified so that now, users are only allowed to own one schedule. I made this change since the old concept specification and implementation made it difficult for me and the Claude Code agent to keep track of the various IDs of schedules, events, tasks, and users in one concept.
- In the implementation, I added new queries _getScheduleByOwner, _getEventsForSchedule, _getTasksForSchedule, _getEventDetails, _getTaskDetails, _getAllSchedules, _getScheduleDetails, _getAllEvents, and _getAllTasks so that the API implementation in the frontend repository can acquire the state of the ScheduleGenerator concept easier.


## UserAuthentication

- In the implementation, I added new queries _getUserByUsername, _checkUserExists, _getAllUsers, and _getUsernameById so that the API implementation in the frontend repository can acquire the state of the ScheduleGenerator concept easier.


## ItemSharing => Messaging

- My original intention was to use ItemSharing so that users can share events with each other, and that shared users can accept and reject requests and make changes to the event that would be reflected for everyone else. However, this was heavily concept sync dependent, and I found that at this stage of the project, implementing this would be very difficult. Hence, I made a new simpler concept, called Messaging, which preserves the principle of sharing content between users, but simplifies it to text messages between two users with no special requests. I believe that with this new concept, students can still communicate with each other about planning shared events, even if it isn't done directly on the schedule anymore.

## Notification => FriendList

- With Notification, I intended for this to be used to remind users at a set time every day to update their progress on their tasks. However, I thought that this was a very niche purpose in the app, and that getting this to work on the frontend and testing it would be quite difficult. Hence, I replaced this concept with a FriendList, allowing users to search others and send friend requests to each other, which they can accept. The FriendList concept has a much more flexible purpose than Notification, and I decided to use this new concept to allow students to be able to pick the other students they wish to work on tasks with.
