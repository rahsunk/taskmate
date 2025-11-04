# Trace of actions (from screen recording)

```
Task start deno run --allow-net --allow-write --allow-read --allow-sys --allow-env src/main.ts

Requesting concept initialized with a timeout of 10000ms.

Registering concept passthrough routes.
  -> /api/UserAuthentication/_getUserByUsername

🚀 Requesting server listening for POST requests at base path of /api/*

Listening on http://0.0.0.0:10000/ (http://localhost:10000/)

[Requesting] Received request for path: /UserAuthentication/register
Requesting.request {
  username: 'rahsunk',
  password: 'bruh123',
  path: '/UserAuthentication/register'
} => { request: '019a4ee8-7383-785b-992b-165954a6b0da' }
UserAuthentication.register { username: 'rahsunk', password: 'bruh123' } => { user: '019a4ee8-73b7-743c-b7c0-070fe659867a' }
Sessioning.create { user: '019a4ee8-73b7-743c-b7c0-070fe659867a' } => { session: '019a4ee8-73c9-73e5-ab09-17f8d619220e' }
Requesting.respond {
  request: '019a4ee8-7383-785b-992b-165954a6b0da',
  user: '019a4ee8-73b7-743c-b7c0-070fe659867a',
  session: '019a4ee8-73c9-73e5-ab09-17f8d619220e'
} => { request: '019a4ee8-7383-785b-992b-165954a6b0da' }

[Requesting] Received request for path: /ScheduleGenerator/initializeSchedule
Requesting.request {
  session: '019a4ee8-73c9-73e5-ab09-17f8d619220e',
  path: '/ScheduleGenerator/initializeSchedule'
} => { request: '019a4ee8-7472-7ae4-aecf-a9a7600ef698' }
ScheduleGenerator.initializeSchedule { owner: '019a4ee8-73b7-743c-b7c0-070fe659867a' } => { schedule: '019a4ee8-74b5-7210-8cd8-9ee72ca33d42' }
Requesting.respond {
  request: '019a4ee8-7472-7ae4-aecf-a9a7600ef698',
  schedule: '019a4ee8-74b5-7210-8cd8-9ee72ca33d42'
} => { request: '019a4ee8-7472-7ae4-aecf-a9a7600ef698' }

[Requesting] Received request for path: /ScheduleGenerator/_getEventsForSchedule
Requesting.request {
  session: '019a4ee8-73c9-73e5-ab09-17f8d619220e',
  schedule: '019a4ee8-74b5-7210-8cd8-9ee72ca33d42',
  path: '/ScheduleGenerator/_getEventsForSchedule'
} => { request: '019a4ee8-754f-72c0-900b-9bd22e07d1ea' }
Requesting.respond {
  request: '019a4ee8-754f-72c0-900b-9bd22e07d1ea',
  events: Frames(0) []
} => { request: '019a4ee8-754f-72c0-900b-9bd22e07d1ea' }

[Requesting] Received request for path: /ScheduleGenerator/_getTasksForSchedule
Requesting.request {
  session: '019a4ee8-73c9-73e5-ab09-17f8d619220e',
  schedule: '019a4ee8-74b5-7210-8cd8-9ee72ca33d42',
  path: '/ScheduleGenerator/_getTasksForSchedule'
} => { request: '019a4ee8-7615-7598-8f11-d971a27d025f' }
Requesting.respond {
  request: '019a4ee8-7615-7598-8f11-d971a27d025f',
  tasks: Frames(0) []
} => { request: '019a4ee8-7615-7598-8f11-d971a27d025f' }

[Requesting] Received request for path: /ScheduleGenerator/addEvent
Requesting.request {
  session: '019a4ee8-73c9-73e5-ab09-17f8d619220e',
  schedule: '019a4ee8-74b5-7210-8cd8-9ee72ca33d42',
  name: 'School',
  startTime: '2025-11-04T09:00',
  endTime: '2025-11-04T15:00',
  repeat: { frequency: 'WEEKLY', daysOfWeek: [ 1, 2, 3, 4, 5 ] },
  path: '/ScheduleGenerator/addEvent'
} => { request: '019a4ee8-e5b3-772a-bc00-a615cd14c469' }
ScheduleGenerator.addEvent {
  schedule: '019a4ee8-74b5-7210-8cd8-9ee72ca33d42',
  name: 'School',
  startTime: '2025-11-04T09:00',
  endTime: '2025-11-04T15:00',
  repeat: { frequency: 'WEEKLY', daysOfWeek: [ 1, 2, 3, 4, 5 ] }
} => { event: '019a4ee8-e5f4-7a12-a23f-05d574efe054' }
Requesting.respond {
  request: '019a4ee8-e5b3-772a-bc00-a615cd14c469',
  event: '019a4ee8-e5f4-7a12-a23f-05d574efe054'
} => { request: '019a4ee8-e5b3-772a-bc00-a615cd14c469' }

[Requesting] Received request for path: /ScheduleGenerator/_getEventsForSchedule
Requesting.request {
  session: '019a4ee8-73c9-73e5-ab09-17f8d619220e',
  schedule: '019a4ee8-74b5-7210-8cd8-9ee72ca33d42',
  path: '/ScheduleGenerator/_getEventsForSchedule'
} => { request: '019a4ee8-e68d-72c5-96b7-f592f6d4dfec' }
Requesting.respond {
  request: '019a4ee8-e68d-72c5-96b7-f592f6d4dfec',
  events: Frames(1) [
    {
      _id: '019a4ee8-e5f4-7a12-a23f-05d574efe054',
      name: 'School',
      eventID: 5,
      scheduleID: 4,
      startTime: '2025-11-04T09:00',
      endTime: '2025-11-04T15:00',
      repeat: [Object]
    }
  ]
} => { request: '019a4ee8-e68d-72c5-96b7-f592f6d4dfec' }

[Requesting] Received request for path: /ScheduleGenerator/_getTasksForSchedule
Requesting.request {
  session: '019a4ee8-73c9-73e5-ab09-17f8d619220e',
  schedule: '019a4ee8-74b5-7210-8cd8-9ee72ca33d42',
  path: '/ScheduleGenerator/_getTasksForSchedule'
} => { request: '019a4ee8-e761-79ac-bf44-1dd3ea280896' }
Requesting.respond {
  request: '019a4ee8-e761-79ac-bf44-1dd3ea280896',
  tasks: Frames(0) []
} => { request: '019a4ee8-e761-79ac-bf44-1dd3ea280896' }
     ==> Detected service running on port 10000
     ==> Docs on specifying a port: https://render.com/docs/web-services#port-binding

[Requesting] Received request for path: /ScheduleGenerator/addEvent
Requesting.request {
  session: '019a4ee8-73c9-73e5-ab09-17f8d619220e',
  schedule: '019a4ee8-74b5-7210-8cd8-9ee72ca33d42',
  name: 'Gym',
  startTime: '2025-11-04T20:00',
  endTime: '2025-11-04T21:00',
  repeat: { frequency: 'WEEKLY', daysOfWeek: [ 0, 2 ] },
  path: '/ScheduleGenerator/addEvent'
} => { request: '019a4ee9-4e73-7314-a4ca-ddde4214e4be' }
ScheduleGenerator.addEvent {
  schedule: '019a4ee8-74b5-7210-8cd8-9ee72ca33d42',
  name: 'Gym',
  startTime: '2025-11-04T20:00',
  endTime: '2025-11-04T21:00',
  repeat: { frequency: 'WEEKLY', daysOfWeek: [ 0, 2 ] }
} => { event: '019a4ee9-4eb5-7f0c-8286-14970e9b371a' }
Requesting.respond {
  request: '019a4ee9-4e73-7314-a4ca-ddde4214e4be',
  event: '019a4ee9-4eb5-7f0c-8286-14970e9b371a'
} => { request: '019a4ee9-4e73-7314-a4ca-ddde4214e4be' }

[Requesting] Received request for path: /ScheduleGenerator/_getEventsForSchedule
Requesting.request {
  session: '019a4ee8-73c9-73e5-ab09-17f8d619220e',
  schedule: '019a4ee8-74b5-7210-8cd8-9ee72ca33d42',
  path: '/ScheduleGenerator/_getEventsForSchedule'
} => { request: '019a4ee9-4f4f-7ea1-a9a5-f7a7f55ba42d' }
Requesting.respond {
  request: '019a4ee9-4f4f-7ea1-a9a5-f7a7f55ba42d',
  events: Frames(2) [
    {
      _id: '019a4ee8-e5f4-7a12-a23f-05d574efe054',
      name: 'School',
      eventID: 5,
      scheduleID: 4,
      startTime: '2025-11-04T09:00',
      endTime: '2025-11-04T15:00',
      repeat: [Object]
    },
    {
      _id: '019a4ee9-4eb5-7f0c-8286-14970e9b371a',
      name: 'Gym',
      eventID: 6,
      scheduleID: 4,
      startTime: '2025-11-04T20:00',
      endTime: '2025-11-04T21:00',
      repeat: [Object]
    }
  ]
} => { request: '019a4ee9-4f4f-7ea1-a9a5-f7a7f55ba42d' }

[Requesting] Received request for path: /ScheduleGenerator/_getTasksForSchedule
Requesting.request {
  session: '019a4ee8-73c9-73e5-ab09-17f8d619220e',
  schedule: '019a4ee8-74b5-7210-8cd8-9ee72ca33d42',
  path: '/ScheduleGenerator/_getTasksForSchedule'
} => { request: '019a4ee9-504f-7694-832c-91edae3c9fd8' }
Requesting.respond {
  request: '019a4ee9-504f-7694-832c-91edae3c9fd8',
  tasks: Frames(0) []
} => { request: '019a4ee9-504f-7694-832c-91edae3c9fd8' }

[Requesting] Received request for path: /ScheduleGenerator/addTask
Requesting.request {
  session: '019a4ee8-73c9-73e5-ab09-17f8d619220e',
  schedule: '019a4ee8-74b5-7210-8cd8-9ee72ca33d42',
  name: 'Math Pset',
  deadline: '2025-11-05T22:00',
  expectedCompletionTime: 60,
  completionLevel: 0,
  priority: 3,
  path: '/ScheduleGenerator/addTask'
} => { request: '019a4ee9-cf1b-7446-8fd0-51da322b34d9' }
ScheduleGenerator.addTask {
  schedule: '019a4ee8-74b5-7210-8cd8-9ee72ca33d42',
  name: 'Math Pset',
  deadline: '2025-11-05T22:00',
  expectedCompletionTime: 60,
  completionLevel: 0,
  priority: 3
} => { task: '019a4ee9-cf5e-7733-8591-ea6421bf80dc' }
Requesting.respond {
  request: '019a4ee9-cf1b-7446-8fd0-51da322b34d9',
  task: '019a4ee9-cf5e-7733-8591-ea6421bf80dc'
} => { request: '019a4ee9-cf1b-7446-8fd0-51da322b34d9' }

[Requesting] Received request for path: /ScheduleGenerator/_getEventsForSchedule
Requesting.request {
  session: '019a4ee8-73c9-73e5-ab09-17f8d619220e',
  schedule: '019a4ee8-74b5-7210-8cd8-9ee72ca33d42',
  path: '/ScheduleGenerator/_getEventsForSchedule'
} => { request: '019a4ee9-cff8-7389-831d-f56db3252a6c' }
Requesting.respond {
  request: '019a4ee9-cff8-7389-831d-f56db3252a6c',
  events: Frames(2) [
    {
      _id: '019a4ee8-e5f4-7a12-a23f-05d574efe054',
      name: 'School',
      eventID: 5,
      scheduleID: 4,
      startTime: '2025-11-04T09:00',
      endTime: '2025-11-04T15:00',
      repeat: [Object]
    },
    {
      _id: '019a4ee9-4eb5-7f0c-8286-14970e9b371a',
      name: 'Gym',
      eventID: 6,
      scheduleID: 4,
      startTime: '2025-11-04T20:00',
      endTime: '2025-11-04T21:00',
      repeat: [Object]
    }
  ]
} => { request: '019a4ee9-cff8-7389-831d-f56db3252a6c' }

[Requesting] Received request for path: /ScheduleGenerator/_getTasksForSchedule
Requesting.request {
  session: '019a4ee8-73c9-73e5-ab09-17f8d619220e',
  schedule: '019a4ee8-74b5-7210-8cd8-9ee72ca33d42',
  path: '/ScheduleGenerator/_getTasksForSchedule'
} => { request: '019a4ee9-d0ba-761d-9806-c90ac10e84eb' }
Requesting.respond {
  request: '019a4ee9-d0ba-761d-9806-c90ac10e84eb',
  tasks: Frames(1) [
    {
      _id: '019a4ee9-cf5e-7733-8591-ea6421bf80dc',
      name: 'Math Pset',
      taskID: 6,
      scheduleID: 4,
      deadline: '2025-11-05T22:00',
      expectedCompletionTime: 60,
      completionLevel: 0,
      priority: 3
    }
  ]
} => { request: '019a4ee9-d0ba-761d-9806-c90ac10e84eb' }

[Requesting] Received request for path: /ScheduleGenerator/addTask
Requesting.request {
  session: '019a4ee8-73c9-73e5-ab09-17f8d619220e',
  schedule: '019a4ee8-74b5-7210-8cd8-9ee72ca33d42',
  name: 'Internship Application',
  deadline: '2025-11-07T12:00',
  expectedCompletionTime: 180,
  completionLevel: 10,
  priority: 5,
  path: '/ScheduleGenerator/addTask'
} => { request: '019a4eea-4d39-7890-a7f3-ef67076b68ed' }
ScheduleGenerator.addTask {
  schedule: '019a4ee8-74b5-7210-8cd8-9ee72ca33d42',
  name: 'Internship Application',
  deadline: '2025-11-07T12:00',
  expectedCompletionTime: 180,
  completionLevel: 10,
  priority: 5
} => { task: '019a4eea-4d88-7ff2-876f-56dbb68dc3c0' }
Requesting.respond {
  request: '019a4eea-4d39-7890-a7f3-ef67076b68ed',
  task: '019a4eea-4d88-7ff2-876f-56dbb68dc3c0'
} => { request: '019a4eea-4d39-7890-a7f3-ef67076b68ed' }

[Requesting] Received request for path: /ScheduleGenerator/_getEventsForSchedule
Requesting.request {
  session: '019a4ee8-73c9-73e5-ab09-17f8d619220e',
  schedule: '019a4ee8-74b5-7210-8cd8-9ee72ca33d42',
  path: '/ScheduleGenerator/_getEventsForSchedule'
} => { request: '019a4eea-4e2d-7aee-9960-966184c96530' }
Requesting.respond {
  request: '019a4eea-4e2d-7aee-9960-966184c96530',
  events: Frames(2) [
    {
      _id: '019a4ee8-e5f4-7a12-a23f-05d574efe054',
      name: 'School',
      eventID: 5,
      scheduleID: 4,
      startTime: '2025-11-04T09:00',
      endTime: '2025-11-04T15:00',
      repeat: [Object]
    },
    {
      _id: '019a4ee9-4eb5-7f0c-8286-14970e9b371a',
      name: 'Gym',
      eventID: 6,
      scheduleID: 4,
      startTime: '2025-11-04T20:00',
      endTime: '2025-11-04T21:00',
      repeat: [Object]
    }
  ]
} => { request: '019a4eea-4e2d-7aee-9960-966184c96530' }

[Requesting] Received request for path: /ScheduleGenerator/_getTasksForSchedule
Requesting.request {
  session: '019a4ee8-73c9-73e5-ab09-17f8d619220e',
  schedule: '019a4ee8-74b5-7210-8cd8-9ee72ca33d42',
  path: '/ScheduleGenerator/_getTasksForSchedule'
} => { request: '019a4eea-4f8e-7708-9268-1a877f202328' }
Requesting.respond {
  request: '019a4eea-4f8e-7708-9268-1a877f202328',
  tasks: Frames(2) [
    {
      _id: '019a4ee9-cf5e-7733-8591-ea6421bf80dc',
      name: 'Math Pset',
      taskID: 6,
      scheduleID: 4,
      deadline: '2025-11-05T22:00',
      expectedCompletionTime: 60,
      completionLevel: 0,
      priority: 3
    },
    {
      _id: '019a4eea-4d88-7ff2-876f-56dbb68dc3c0',
      name: 'Internship Application',
      taskID: 7,
      scheduleID: 4,
      deadline: '2025-11-07T12:00',
      expectedCompletionTime: 180,
      completionLevel: 10,
      priority: 5
    }
  ]
} => { request: '019a4eea-4f8e-7708-9268-1a877f202328' }

[Requesting] Received request for path: /ScheduleGenerator/generateSchedule
Requesting.request {
  session: '019a4ee8-73c9-73e5-ab09-17f8d619220e',
  schedule: '019a4ee8-74b5-7210-8cd8-9ee72ca33d42',
  path: '/ScheduleGenerator/generateSchedule'
} => { request: '019a4eea-678b-7bd1-9eb7-14e5cef5a43e' }
ScheduleGenerator.generateSchedule { schedule: '019a4ee8-74b5-7210-8cd8-9ee72ca33d42' } => {
  scheduleId: '019a4ee8-74b5-7210-8cd8-9ee72ca33d42',
  generatedPlan: [
    {
      type: 'task',
      originalId: '019a4ee9-cf5e-7733-8591-ea6421bf80dc',
      name: 'Math Pset',
      scheduledStartTime: 2025-11-04T13:00:00.000Z,
      scheduledEndTime: 2025-11-04T14:00:00.000Z
    },
    {
      type: 'event',
      originalId: '019a4ee8-e5f4-7a12-a23f-05d574efe054',
      name: 'School',
      scheduledStartTime: 2025-11-04T14:00:00.000Z,
      scheduledEndTime: 2025-11-04T20:00:00.000Z
    },
    {
      type: 'task',
      originalId: '019a4eea-4d88-7ff2-876f-56dbb68dc3c0',
      name: 'Internship Application',
      scheduledStartTime: 2025-11-04T20:00:00.000Z,
      scheduledEndTime: 2025-11-04T22:42:00.000Z
    },
    {
      type: 'event',
      originalId: '019a4ee9-4eb5-7f0c-8286-14970e9b371a',
      name: 'Gym',
      scheduledStartTime: 2025-11-05T01:00:00.000Z,
      scheduledEndTime: 2025-11-05T02:00:00.000Z
    },
    {
      type: 'event',
      originalId: '019a4ee8-e5f4-7a12-a23f-05d574efe054',
      name: 'School',
      scheduledStartTime: 2025-11-05T14:00:00.000Z,
      scheduledEndTime: 2025-11-05T20:00:00.000Z
    },
    {
      type: 'event',
      originalId: '019a4ee8-e5f4-7a12-a23f-05d574efe054',
      name: 'School',
      scheduledStartTime: 2025-11-06T14:00:00.000Z,
      scheduledEndTime: 2025-11-06T20:00:00.000Z
    },
    {
      type: 'event',
      originalId: '019a4ee8-e5f4-7a12-a23f-05d574efe054',
      name: 'School',
      scheduledStartTime: 2025-11-07T14:00:00.000Z,
      scheduledEndTime: 2025-11-07T20:00:00.000Z
    },
    {
      type: 'event',
      originalId: '019a4ee9-4eb5-7f0c-8286-14970e9b371a',
      name: 'Gym',
      scheduledStartTime: 2025-11-10T01:00:00.000Z,
      scheduledEndTime: 2025-11-10T02:00:00.000Z
    },
    {
      type: 'event',
      originalId: '019a4ee8-e5f4-7a12-a23f-05d574efe054',
      name: 'School',
      scheduledStartTime: 2025-11-10T14:00:00.000Z,
      scheduledEndTime: 2025-11-10T20:00:00.000Z
    },
    {
      type: 'event',
      originalId: '019a4ee8-e5f4-7a12-a23f-05d574efe054',
      name: 'School',
      scheduledStartTime: 2025-11-11T14:00:00.000Z,
      scheduledEndTime: 2025-11-11T20:00:00.000Z
    },
    {
      type: 'event',
      originalId: '019a4ee9-4eb5-7f0c-8286-14970e9b371a',
      name: 'Gym',
      scheduledStartTime: 2025-11-12T01:00:00.000Z,
      scheduledEndTime: 2025-11-12T02:00:00.000Z
    }
  ]
}
Requesting.respond {
  request: '019a4eea-678b-7bd1-9eb7-14e5cef5a43e',
  scheduleId: '019a4ee8-74b5-7210-8cd8-9ee72ca33d42',
  generatedPlan: [
    {
      type: 'task',
      originalId: '019a4ee9-cf5e-7733-8591-ea6421bf80dc',
      name: 'Math Pset',
      scheduledStartTime: 2025-11-04T13:00:00.000Z,
      scheduledEndTime: 2025-11-04T14:00:00.000Z
    },
    {
      type: 'event',
      originalId: '019a4ee8-e5f4-7a12-a23f-05d574efe054',
      name: 'School',
      scheduledStartTime: 2025-11-04T14:00:00.000Z,
      scheduledEndTime: 2025-11-04T20:00:00.000Z
    },
    {
      type: 'task',
      originalId: '019a4eea-4d88-7ff2-876f-56dbb68dc3c0',
      name: 'Internship Application',
      scheduledStartTime: 2025-11-04T20:00:00.000Z,
      scheduledEndTime: 2025-11-04T22:42:00.000Z
    },
    {
      type: 'event',
      originalId: '019a4ee9-4eb5-7f0c-8286-14970e9b371a',
      name: 'Gym',
      scheduledStartTime: 2025-11-05T01:00:00.000Z,
      scheduledEndTime: 2025-11-05T02:00:00.000Z
    },
    {
      type: 'event',
      originalId: '019a4ee8-e5f4-7a12-a23f-05d574efe054',
      name: 'School',
      scheduledStartTime: 2025-11-05T14:00:00.000Z,
      scheduledEndTime: 2025-11-05T20:00:00.000Z
    },
    {
      type: 'event',
      originalId: '019a4ee8-e5f4-7a12-a23f-05d574efe054',
      name: 'School',
      scheduledStartTime: 2025-11-06T14:00:00.000Z,
      scheduledEndTime: 2025-11-06T20:00:00.000Z
    },
    {
      type: 'event',
      originalId: '019a4ee8-e5f4-7a12-a23f-05d574efe054',
      name: 'School',
      scheduledStartTime: 2025-11-07T14:00:00.000Z,
      scheduledEndTime: 2025-11-07T20:00:00.000Z
    },
    {
      type: 'event',
      originalId: '019a4ee9-4eb5-7f0c-8286-14970e9b371a',
      name: 'Gym',
      scheduledStartTime: 2025-11-10T01:00:00.000Z,
      scheduledEndTime: 2025-11-10T02:00:00.000Z
    },
    {
      type: 'event',
      originalId: '019a4ee8-e5f4-7a12-a23f-05d574efe054',
      name: 'School',
      scheduledStartTime: 2025-11-10T14:00:00.000Z,
      scheduledEndTime: 2025-11-10T20:00:00.000Z
    },
    {
      type: 'event',
      originalId: '019a4ee8-e5f4-7a12-a23f-05d574efe054',
      name: 'School',
      scheduledStartTime: 2025-11-11T14:00:00.000Z,
      scheduledEndTime: 2025-11-11T20:00:00.000Z
    },
    {
      type: 'event',
      originalId: '019a4ee9-4eb5-7f0c-8286-14970e9b371a',
      name: 'Gym',
      scheduledStartTime: 2025-11-12T01:00:00.000Z,
      scheduledEndTime: 2025-11-12T02:00:00.000Z
    }
  ]
} => { request: '019a4eea-678b-7bd1-9eb7-14e5cef5a43e' }

[Requesting] Received request for path: /api/FriendList/_getFriendshipsByUser
Requesting.request {
  session: '019a4ee8-73c9-73e5-ab09-17f8d619220e',
  path: '/api/FriendList/_getFriendshipsByUser'
} => { request: '019a4eeb-011b-7c80-8556-86dec1621c9a' }
Requesting.respond { request: '019a4eeb-011b-7c80-8556-86dec1621c9a', results: [] } => { request: '019a4eeb-011b-7c80-8556-86dec1621c9a' }

[Requesting] Received request for path: /api/FriendList/_getSentFriendRequests
Requesting.request {
  session: '019a4ee8-73c9-73e5-ab09-17f8d619220e',
  path: '/api/FriendList/_getSentFriendRequests'
} => { request: '019a4eeb-01ce-716b-af0f-d9493a3a0576' }
Requesting.respond { request: '019a4eeb-01ce-716b-af0f-d9493a3a0576', results: [] } => { request: '019a4eeb-01ce-716b-af0f-d9493a3a0576' }

[Requesting] Received request for path: /api/FriendList/_getReceivedFriendRequests
Requesting.request {
  session: '019a4ee8-73c9-73e5-ab09-17f8d619220e',
  path: '/api/FriendList/_getReceivedFriendRequests'
} => { request: '019a4eeb-0283-76ec-9f25-96c220fc90e6' }
Requesting.respond { request: '019a4eeb-0283-76ec-9f25-96c220fc90e6', results: [] } => { request: '019a4eeb-0283-76ec-9f25-96c220fc90e6' }

[Requesting] Received request for path: /api/FriendList/sendFriendRequest
Requesting.request {
  session: '019a4ee8-73c9-73e5-ab09-17f8d619220e',
  receiver: '019a4d64-15df-7c81-a927-b5d1faa9ca5d',
  path: '/api/FriendList/sendFriendRequest'
} => { request: '019a4eeb-17bd-7877-895a-813fda0157fd' }
FriendsList.sendFriendRequest {
  sender: '019a4ee8-73b7-743c-b7c0-070fe659867a',
  receiver: '019a4d64-15df-7c81-a927-b5d1faa9ca5d'
} => { request: '019a4eeb-180c-7429-ac12-1f4732c7cba5' }
Requesting.respond {
  request: '019a4eeb-17bd-7877-895a-813fda0157fd',
  friendRequest: '019a4eeb-180c-7429-ac12-1f4732c7cba5'
} => { request: '019a4eeb-17bd-7877-895a-813fda0157fd' }

[Requesting] Received request for path: /UserAuthentication/authenticate
Requesting.request {
  username: 'tim',
  password: 'bruh123',
  path: '/UserAuthentication/authenticate'
} => { request: '019a4eeb-37c1-7fcb-99e2-955b91d1bbbc' }
UserAuthentication.authenticate { username: 'tim', password: 'bruh123' } => { user: '019a4d64-15df-7c81-a927-b5d1faa9ca5d' }
Sessioning.create { user: '019a4d64-15df-7c81-a927-b5d1faa9ca5d' } => { session: '019a4eeb-37e3-7ea9-a887-d9c23fd3fb1a' }
Requesting.respond {
  request: '019a4eeb-37c1-7fcb-99e2-955b91d1bbbc',
  user: '019a4d64-15df-7c81-a927-b5d1faa9ca5d',
  session: '019a4eeb-37e3-7ea9-a887-d9c23fd3fb1a'
} => { request: '019a4eeb-37c1-7fcb-99e2-955b91d1bbbc' }

[Requesting] Received request for path: /ScheduleGenerator/initializeSchedule
Requesting.request {
  session: '019a4eeb-37e3-7ea9-a887-d9c23fd3fb1a',
  path: '/ScheduleGenerator/initializeSchedule'
} => { request: '019a4eeb-3888-7879-b723-6a75bd1ff013' }
ScheduleGenerator.initializeSchedule { owner: '019a4d64-15df-7c81-a927-b5d1faa9ca5d' } => { schedule: '019a4d64-16c9-7142-9646-10ecbc5349e9' }
Requesting.respond {
  request: '019a4eeb-3888-7879-b723-6a75bd1ff013',
  schedule: '019a4d64-16c9-7142-9646-10ecbc5349e9'
} => { request: '019a4eeb-3888-7879-b723-6a75bd1ff013' }

[Requesting] Received request for path: /ScheduleGenerator/_getEventsForSchedule
Requesting.request {
  session: '019a4eeb-37e3-7ea9-a887-d9c23fd3fb1a',
  schedule: '019a4d64-16c9-7142-9646-10ecbc5349e9',
  path: '/ScheduleGenerator/_getEventsForSchedule'
} => { request: '019a4eeb-3971-7e21-bfbe-625c8cbb20be' }
Requesting.respond {
  request: '019a4eeb-3971-7e21-bfbe-625c8cbb20be',
  events: Frames(2) [
    {
      _id: '019a4d64-698e-783a-a416-249e6762c039',
      name: 'School',
      eventID: 1,
      scheduleID: 1,
      startTime: '2025-11-05T09:00',
      endTime: '2025-11-05T15:00',
      repeat: [Object]
    },
    {
      _id: '019a4d64-b530-77d3-aed7-3868f6ebfc9f',
      name: 'Tim Time',
      eventID: 2,
      scheduleID: 1,
      startTime: '2025-11-04T14:00',
      endTime: '2025-11-04T15:00',
      repeat: [Object]
    }
  ]
} => { request: '019a4eeb-3971-7e21-bfbe-625c8cbb20be' }

[Requesting] Received request for path: /ScheduleGenerator/_getTasksForSchedule
Requesting.request {
  session: '019a4eeb-37e3-7ea9-a887-d9c23fd3fb1a',
  schedule: '019a4d64-16c9-7142-9646-10ecbc5349e9',
  path: '/ScheduleGenerator/_getTasksForSchedule'
} => { request: '019a4eeb-3a21-7775-8fce-52d7984e2d0a' }
Requesting.respond {
  request: '019a4eeb-3a21-7775-8fce-52d7984e2d0a',
  tasks: Frames(1) [
    {
      _id: '019a4d65-0359-73bb-8aba-f39f0989a3a8',
      name: 'Math Pset',
      taskID: 1,
      scheduleID: 1,
      deadline: '2025-11-05T22:00',
      expectedCompletionTime: 60,
      completionLevel: 0,
      priority: 3
    }
  ]
} => { request: '019a4eeb-3a21-7775-8fce-52d7984e2d0a' }

[Requesting] Received request for path: /api/FriendList/_getFriendshipsByUser
Requesting.request {
  session: '019a4eeb-37e3-7ea9-a887-d9c23fd3fb1a',
  path: '/api/FriendList/_getFriendshipsByUser'
} => { request: '019a4eeb-5906-7f8a-a629-03c60430b61f' }
Requesting.respond { request: '019a4eeb-5906-7f8a-a629-03c60430b61f', results: [] } => { request: '019a4eeb-5906-7f8a-a629-03c60430b61f' }

[Requesting] Received request for path: /api/FriendList/_getSentFriendRequests
Requesting.request {
  session: '019a4eeb-37e3-7ea9-a887-d9c23fd3fb1a',
  path: '/api/FriendList/_getSentFriendRequests'
} => { request: '019a4eeb-59b9-711c-a8ec-dfbe3b175a18' }
Requesting.respond { request: '019a4eeb-59b9-711c-a8ec-dfbe3b175a18', results: [] } => { request: '019a4eeb-59b9-711c-a8ec-dfbe3b175a18' }

[Requesting] Received request for path: /api/FriendList/_getReceivedFriendRequests
Requesting.request {
  session: '019a4eeb-37e3-7ea9-a887-d9c23fd3fb1a',
  path: '/api/FriendList/_getReceivedFriendRequests'
} => { request: '019a4eeb-5a66-7c17-a37c-4da7de4bdf35' }
Requesting.respond {
  request: '019a4eeb-5a66-7c17-a37c-4da7de4bdf35',
  results: [
    {
      _id: '019a4eeb-180c-7429-ac12-1f4732c7cba5',
      sender: '019a4ee8-73b7-743c-b7c0-070fe659867a',
      receiver: '019a4d64-15df-7c81-a927-b5d1faa9ca5d'
    }
  ]
} => { request: '019a4eeb-5a66-7c17-a37c-4da7de4bdf35' }

[Requesting] Received request for path: /UserAuthentication/_getUsernameById
Requesting.request {
  session: '019a4eeb-37e3-7ea9-a887-d9c23fd3fb1a',
  user: '019a4ee8-73b7-743c-b7c0-070fe659867a',
  path: '/UserAuthentication/_getUsernameById'
} => { request: '019a4eeb-5b0b-707b-bc5c-6e01d205a0c6' }
Requesting.respond {
  request: '019a4eeb-5b0b-707b-bc5c-6e01d205a0c6',
  username: 'rahsunk'
} => { request: '019a4eeb-5b0b-707b-bc5c-6e01d205a0c6' }

[Requesting] Received request for path: /api/FriendList/acceptFriendRequest
Requesting.request {
  session: '019a4eeb-37e3-7ea9-a887-d9c23fd3fb1a',
  sender: '019a4ee8-73b7-743c-b7c0-070fe659867a',
  path: '/api/FriendList/acceptFriendRequest'
} => { request: '019a4eeb-69fe-7a73-a773-b092e00fcc77' }
FriendsList.acceptFriendRequest {
  receiver: '019a4d64-15df-7c81-a927-b5d1faa9ca5d',
  sender: '019a4ee8-73b7-743c-b7c0-070fe659867a'
} => { success: true }
Requesting.respond { request: '019a4eeb-69fe-7a73-a773-b092e00fcc77', status: 'accepted' } => { request: '019a4eeb-69fe-7a73-a773-b092e00fcc77' }

[Requesting] Received request for path: /UserAuthentication/_getUsernameById
Requesting.request {
  session: '019a4eeb-37e3-7ea9-a887-d9c23fd3fb1a',
  user: '019a4d64-15df-7c81-a927-b5d1faa9ca5d',
  path: '/UserAuthentication/_getUsernameById'
} => { request: '019a4eeb-6ab5-78d5-a593-53a1d581b3f5' }
Requesting.respond { request: '019a4eeb-6ab5-78d5-a593-53a1d581b3f5', username: 'tim' } => { request: '019a4eeb-6ab5-78d5-a593-53a1d581b3f5' }

[Requesting] Received request for path: /Messaging/createConversation
Requesting.request {
  session: '019a4eeb-37e3-7ea9-a887-d9c23fd3fb1a',
  user2: '019a4ee8-73b7-743c-b7c0-070fe659867a',
  path: '/Messaging/createConversation'
} => { request: '019a4eeb-7477-79cd-b9f2-e8ed5f88c649' }
Messaging.createConversation {
  user1: '019a4d64-15df-7c81-a927-b5d1faa9ca5d',
  user2: '019a4ee8-73b7-743c-b7c0-070fe659867a'
} => { conversationId: '019a4eeb-74a7-7e18-8465-958eb021071d' }
Requesting.respond {
  request: '019a4eeb-7477-79cd-b9f2-e8ed5f88c649',
  conversationId: '019a4eeb-74a7-7e18-8465-958eb021071d'
} => { request: '019a4eeb-7477-79cd-b9f2-e8ed5f88c649' }

[Requesting] Received request for path: /UserAuthentication/_getUsernameById
Requesting.request {
  session: '019a4eeb-37e3-7ea9-a887-d9c23fd3fb1a',
  user: '019a4ee8-73b7-743c-b7c0-070fe659867a',
  path: '/UserAuthentication/_getUsernameById'
} => { request: '019a4eeb-755b-7fe5-b190-4cf87f1d156d' }
Requesting.respond {
  request: '019a4eeb-755b-7fe5-b190-4cf87f1d156d',
  username: 'rahsunk'
} => { request: '019a4eeb-755b-7fe5-b190-4cf87f1d156d' }

[Requesting] Received request for path: /UserAuthentication/_getUsernameById
Requesting.request {
  session: '019a4eeb-37e3-7ea9-a887-d9c23fd3fb1a',
  user: '019a4d64-15df-7c81-a927-b5d1faa9ca5d',
  path: '/UserAuthentication/_getUsernameById'
} => { request: '019a4eeb-75da-7c14-9b81-4972830ead02' }
Requesting.respond { request: '019a4eeb-75da-7c14-9b81-4972830ead02', username: 'tim' } => { request: '019a4eeb-75da-7c14-9b81-4972830ead02' }

[Requesting] Received request for path: /Messaging/_getMessagesInConversation
Requesting.request {
  session: '019a4eeb-37e3-7ea9-a887-d9c23fd3fb1a',
  conversationId: '019a4eeb-74a7-7e18-8465-958eb021071d',
  path: '/Messaging/_getMessagesInConversation'
} => { request: '019a4eeb-7688-7189-98d6-3c8caf1ab941' }

Requesting.respond { request: '019a4eeb-7688-7189-98d6-3c8caf1ab941', messages: [] } => { request: '019a4eeb-7688-7189-98d6-3c8caf1ab941' }

[Requesting] Received request for path: /Messaging/_getConversationsForUser
Requesting.request {
  session: '019a4eeb-37e3-7ea9-a887-d9c23fd3fb1a',
  user: '019a4d64-15df-7c81-a927-b5d1faa9ca5d',
  path: '/Messaging/_getConversationsForUser'
} => { request: '019a4eeb-7764-735e-bf6f-8bc27c7e9af2' }
Requesting.respond {
  request: '019a4eeb-7764-735e-bf6f-8bc27c7e9af2',
  conversations: [
    {
      _id: '019a4eeb-74a7-7e18-8465-958eb021071d',
      participant1: '019a4d64-15df-7c81-a927-b5d1faa9ca5d',
      participant2: '019a4ee8-73b7-743c-b7c0-070fe659867a'
    }
  ]
} => { request: '019a4eeb-7764-735e-bf6f-8bc27c7e9af2' }

[Requesting] Received request for path: /Messaging/sendMessage
Requesting.request {
  session: '019a4eeb-37e3-7ea9-a887-d9c23fd3fb1a',
  conversationId: '019a4eeb-74a7-7e18-8465-958eb021071d',
  content: 'hey whats up',
  path: '/Messaging/sendMessage'
} => { request: '019a4eeb-86de-7f4e-80e4-2ca57ed416cd' }
Messaging.sendMessage {
  conversationId: '019a4eeb-74a7-7e18-8465-958eb021071d',
  sender: '019a4d64-15df-7c81-a927-b5d1faa9ca5d',
  content: 'hey whats up'
} => {
  message: {
    _id: '019a4eeb-8710-78d9-bf02-7d2843fcf3b9',
    conversationId: '019a4eeb-74a7-7e18-8465-958eb021071d',
    sender: '019a4d64-15df-7c81-a927-b5d1faa9ca5d',
    content: 'hey whats up',
    sentAt: 2025-11-04T12:50:49.744Z
  }
}
Requesting.respond {
  request: '019a4eeb-86de-7f4e-80e4-2ca57ed416cd',
  message: {
    _id: '019a4eeb-8710-78d9-bf02-7d2843fcf3b9',
    conversationId: '019a4eeb-74a7-7e18-8465-958eb021071d',
    sender: '019a4d64-15df-7c81-a927-b5d1faa9ca5d',
    content: 'hey whats up',
    sentAt: 2025-11-04T12:50:49.744Z
  }
} => { request: '019a4eeb-86de-7f4e-80e4-2ca57ed416cd' }

[Requesting] Received request for path: /UserAuthentication/authenticate
Requesting.request {
  username: 'rahsunk',
  password: 'bruh123',
  path: '/UserAuthentication/authenticate'
} => { request: '019a4eeb-9d0b-7adb-8146-8c3b2a7855cf' }
UserAuthentication.authenticate { username: 'rahsunk', password: 'bruh123' } => { user: '019a4ee8-73b7-743c-b7c0-070fe659867a' }
Sessioning.create { user: '019a4ee8-73b7-743c-b7c0-070fe659867a' } => { session: '019a4eeb-9d2e-7e6d-99ab-89b292f136d4' }
Requesting.respond {
  request: '019a4eeb-9d0b-7adb-8146-8c3b2a7855cf',
  user: '019a4ee8-73b7-743c-b7c0-070fe659867a',
  session: '019a4eeb-9d2e-7e6d-99ab-89b292f136d4'
} => { request: '019a4eeb-9d0b-7adb-8146-8c3b2a7855cf' }

[Requesting] Received request for path: /ScheduleGenerator/initializeSchedule
Requesting.request {
  session: '019a4eeb-9d2e-7e6d-99ab-89b292f136d4',
  path: '/ScheduleGenerator/initializeSchedule'
} => { request: '019a4eeb-9dbe-70e3-a1a8-281183feb025' }
ScheduleGenerator.initializeSchedule { owner: '019a4ee8-73b7-743c-b7c0-070fe659867a' } => { schedule: '019a4ee8-74b5-7210-8cd8-9ee72ca33d42' }
Requesting.respond {
  request: '019a4eeb-9dbe-70e3-a1a8-281183feb025',
  schedule: '019a4ee8-74b5-7210-8cd8-9ee72ca33d42'
} => { request: '019a4eeb-9dbe-70e3-a1a8-281183feb025' }

[Requesting] Received request for path: /ScheduleGenerator/_getEventsForSchedule
Requesting.request {
  session: '019a4eeb-9d2e-7e6d-99ab-89b292f136d4',
  schedule: '019a4ee8-74b5-7210-8cd8-9ee72ca33d42',
  path: '/ScheduleGenerator/_getEventsForSchedule'
} => { request: '019a4eeb-9e64-797f-9f75-72ab8017158d' }
Requesting.respond {
  request: '019a4eeb-9e64-797f-9f75-72ab8017158d',
  events: Frames(2) [
    {
      _id: '019a4ee8-e5f4-7a12-a23f-05d574efe054',
      name: 'School',
      eventID: 5,
      scheduleID: 4,
      startTime: '2025-11-04T09:00',
      endTime: '2025-11-04T15:00',
      repeat: [Object]
    },
    {
      _id: '019a4ee9-4eb5-7f0c-8286-14970e9b371a',
      name: 'Gym',
      eventID: 6,
      scheduleID: 4,
      startTime: '2025-11-04T20:00',
      endTime: '2025-11-04T21:00',
      repeat: [Object]
    }
  ]
} => { request: '019a4eeb-9e64-797f-9f75-72ab8017158d' }

[Requesting] Received request for path: /ScheduleGenerator/_getTasksForSchedule
Requesting.request {
  session: '019a4eeb-9d2e-7e6d-99ab-89b292f136d4',
  schedule: '019a4ee8-74b5-7210-8cd8-9ee72ca33d42',
  path: '/ScheduleGenerator/_getTasksForSchedule'
} => { request: '019a4eeb-9f18-78be-85a1-72a39a908fb8' }
Requesting.respond {
  request: '019a4eeb-9f18-78be-85a1-72a39a908fb8',
  tasks: Frames(2) [
    {
      _id: '019a4ee9-cf5e-7733-8591-ea6421bf80dc',
      name: 'Math Pset',
      taskID: 6,
      scheduleID: 4,
      deadline: '2025-11-05T22:00',
      expectedCompletionTime: 60,
      completionLevel: 0,
      priority: 3
    },
    {
      _id: '019a4eea-4d88-7ff2-876f-56dbb68dc3c0',
      name: 'Internship Application',
      taskID: 7,
      scheduleID: 4,
      deadline: '2025-11-07T12:00',
      expectedCompletionTime: 180,
      completionLevel: 10,
      priority: 5
    }
  ]
} => { request: '019a4eeb-9f18-78be-85a1-72a39a908fb8' }

[Requesting] Received request for path: /api/FriendList/_getFriendshipsByUser
Requesting.request {
  session: '019a4eeb-9d2e-7e6d-99ab-89b292f136d4',
  path: '/api/FriendList/_getFriendshipsByUser'
} => { request: '019a4eeb-a119-7e32-9308-9360a8b3a648' }
Requesting.respond {
  request: '019a4eeb-a119-7e32-9308-9360a8b3a648',
  results: [
    {
      _id: '019a4eeb-6a52-73c2-b4b2-0bc2d8a6bfe8',
      user1: '019a4d64-15df-7c81-a927-b5d1faa9ca5d',
      user2: '019a4ee8-73b7-743c-b7c0-070fe659867a'
    }
  ]
} => { request: '019a4eeb-a119-7e32-9308-9360a8b3a648' }

[Requesting] Received request for path: /api/FriendList/_getSentFriendRequests
Requesting.request {
  session: '019a4eeb-9d2e-7e6d-99ab-89b292f136d4',
  path: '/api/FriendList/_getSentFriendRequests'
} => { request: '019a4eeb-a1b2-796f-8322-61b074d39adb' }
Requesting.respond { request: '019a4eeb-a1b2-796f-8322-61b074d39adb', results: [] } => { request: '019a4eeb-a1b2-796f-8322-61b074d39adb' }

[Requesting] Received request for path: /api/FriendList/_getReceivedFriendRequests
Requesting.request {
  session: '019a4eeb-9d2e-7e6d-99ab-89b292f136d4',
  path: '/api/FriendList/_getReceivedFriendRequests'
} => { request: '019a4eeb-a254-790f-8925-1f797209d4f0' }
Requesting.respond { request: '019a4eeb-a254-790f-8925-1f797209d4f0', results: [] } => { request: '019a4eeb-a254-790f-8925-1f797209d4f0' }

[Requesting] Received request for path: /Messaging/_getMessagesInConversation
Requesting.request {
  session: '019a4eeb-9d2e-7e6d-99ab-89b292f136d4',
  conversationId: '019a4eeb-74a7-7e18-8465-958eb021071d',
  path: '/Messaging/_getMessagesInConversation'
} => { request: '019a4eeb-ad17-757a-b83f-e08568c9c8bb' }

Requesting.respond {
  request: '019a4eeb-ad17-757a-b83f-e08568c9c8bb',
  messages: [
    {
      _id: '019a4eeb-8710-78d9-bf02-7d2843fcf3b9',
      conversationId: '019a4eeb-74a7-7e18-8465-958eb021071d',
      sender: '019a4d64-15df-7c81-a927-b5d1faa9ca5d',
      content: 'hey whats up',
      sentAt: 2025-11-04T12:50:49.744Z
    }
  ]
} => { request: '019a4eeb-ad17-757a-b83f-e08568c9c8bb' }

[Requesting] Received request for path: /Messaging/_getConversationsForUser
Requesting.request {
  session: '019a4eeb-9d2e-7e6d-99ab-89b292f136d4',
  user: '019a4ee8-73b7-743c-b7c0-070fe659867a',
  path: '/Messaging/_getConversationsForUser'
} => { request: '019a4eeb-adcc-72d6-8c26-053bb3588066' }
Requesting.respond {
  request: '019a4eeb-adcc-72d6-8c26-053bb3588066',
  conversations: [
    {
      _id: '019a4eeb-74a7-7e18-8465-958eb021071d',
      participant1: '019a4d64-15df-7c81-a927-b5d1faa9ca5d',
      participant2: '019a4ee8-73b7-743c-b7c0-070fe659867a'
    }
  ]
} => { request: '019a4eeb-adcc-72d6-8c26-053bb3588066' }

[Requesting] Received request for path: /ScheduleGenerator/initializeSchedule
Requesting.request {
  session: '019a4eeb-9d2e-7e6d-99ab-89b292f136d4',
  path: '/ScheduleGenerator/initializeSchedule'
} => { request: '019a4eeb-d2aa-75d7-ad4b-1d42752618d9' }
ScheduleGenerator.initializeSchedule { owner: '019a4ee8-73b7-743c-b7c0-070fe659867a' } => { schedule: '019a4ee8-74b5-7210-8cd8-9ee72ca33d42' }
Requesting.respond {
  request: '019a4eeb-d2aa-75d7-ad4b-1d42752618d9',
  schedule: '019a4ee8-74b5-7210-8cd8-9ee72ca33d42'
} => { request: '019a4eeb-d2aa-75d7-ad4b-1d42752618d9' }

[Requesting] Received request for path: /ScheduleGenerator/_getEventsForSchedule
Requesting.request {
  session: '019a4eeb-9d2e-7e6d-99ab-89b292f136d4',
  schedule: '019a4ee8-74b5-7210-8cd8-9ee72ca33d42',
  path: '/ScheduleGenerator/_getEventsForSchedule'
} => { request: '019a4eeb-d351-7f56-8cd7-20e9b34a251a' }
Requesting.respond {
  request: '019a4eeb-d351-7f56-8cd7-20e9b34a251a',
  events: Frames(2) [
    {
      _id: '019a4ee8-e5f4-7a12-a23f-05d574efe054',
      name: 'School',
      eventID: 5,
      scheduleID: 4,
      startTime: '2025-11-04T09:00',
      endTime: '2025-11-04T15:00',
      repeat: [Object]
    },
    {
      _id: '019a4ee9-4eb5-7f0c-8286-14970e9b371a',
      name: 'Gym',
      eventID: 6,
      scheduleID: 4,
      startTime: '2025-11-04T20:00',
      endTime: '2025-11-04T21:00',
      repeat: [Object]
    }
  ]
} => { request: '019a4eeb-d351-7f56-8cd7-20e9b34a251a' }

[Requesting] Received request for path: /ScheduleGenerator/_getTasksForSchedule
Requesting.request {
  session: '019a4eeb-9d2e-7e6d-99ab-89b292f136d4',
  schedule: '019a4ee8-74b5-7210-8cd8-9ee72ca33d42',
  path: '/ScheduleGenerator/_getTasksForSchedule'
} => { request: '019a4eeb-d3fb-7241-accb-c81fc1464424' }
Requesting.respond {
  request: '019a4eeb-d3fb-7241-accb-c81fc1464424',
  tasks: Frames(2) [
    {
      _id: '019a4ee9-cf5e-7733-8591-ea6421bf80dc',
      name: 'Math Pset',
      taskID: 6,
      scheduleID: 4,
      deadline: '2025-11-05T22:00',
      expectedCompletionTime: 60,
      completionLevel: 0,
      priority: 3
    },
    {
      _id: '019a4eea-4d88-7ff2-876f-56dbb68dc3c0',
      name: 'Internship Application',
      taskID: 7,
      scheduleID: 4,
      deadline: '2025-11-07T12:00',
      expectedCompletionTime: 180,
      completionLevel: 10,
      priority: 5
    }
  ]
} => { request: '019a4eeb-d3fb-7241-accb-c81fc1464424' }

[Requesting] Received request for path: /api/FriendList/_getFriendshipsByUser
Requesting.request {
  session: '019a4eeb-9d2e-7e6d-99ab-89b292f136d4',
  path: '/api/FriendList/_getFriendshipsByUser'
} => { request: '019a4eec-07cc-74bc-afdd-324a2c234b70' }
Requesting.respond {
  request: '019a4eec-07cc-74bc-afdd-324a2c234b70',
  results: [
    {
      _id: '019a4eeb-6a52-73c2-b4b2-0bc2d8a6bfe8',
      user1: '019a4d64-15df-7c81-a927-b5d1faa9ca5d',
      user2: '019a4ee8-73b7-743c-b7c0-070fe659867a'
    }
  ]
} => { request: '019a4eec-07cc-74bc-afdd-324a2c234b70' }

[Requesting] Received request for path: /api/FriendList/_getSentFriendRequests
Requesting.request {
  session: '019a4eeb-9d2e-7e6d-99ab-89b292f136d4',
  path: '/api/FriendList/_getSentFriendRequests'
} => { request: '019a4eec-0872-779f-b099-9b3ae7966c0e' }
Requesting.respond { request: '019a4eec-0872-779f-b099-9b3ae7966c0e', results: [] } => { request: '019a4eec-0872-779f-b099-9b3ae7966c0e' }

[Requesting] Received request for path: /api/FriendList/_getReceivedFriendRequests
Requesting.request {
  session: '019a4eeb-9d2e-7e6d-99ab-89b292f136d4',
  path: '/api/FriendList/_getReceivedFriendRequests'
} => { request: '019a4eec-0928-7fea-a6d3-c42da7c53bbf' }
Requesting.respond { request: '019a4eec-0928-7fea-a6d3-c42da7c53bbf', results: [] } => { request: '019a4eec-0928-7fea-a6d3-c42da7c53bbf' }

[Requesting] Received request for path: /Messaging/_getMessagesInConversation
Requesting.request {
  session: '019a4eeb-9d2e-7e6d-99ab-89b292f136d4',
  conversationId: '019a4eeb-74a7-7e18-8465-958eb021071d',
  path: '/Messaging/_getMessagesInConversation'
} => { request: '019a4eec-0c6b-7d8d-a8c9-79b9e0344a80' }

Requesting.respond {
  request: '019a4eec-0c6b-7d8d-a8c9-79b9e0344a80',
  messages: [
    {
      _id: '019a4eeb-8710-78d9-bf02-7d2843fcf3b9',
      conversationId: '019a4eeb-74a7-7e18-8465-958eb021071d',
      sender: '019a4d64-15df-7c81-a927-b5d1faa9ca5d',
      content: 'hey whats up',
      sentAt: 2025-11-04T12:50:49.744Z
    }
  ]
} => { request: '019a4eec-0c6b-7d8d-a8c9-79b9e0344a80' }

[Requesting] Received request for path: /Messaging/_getConversationsForUser
Requesting.request {
  session: '019a4eeb-9d2e-7e6d-99ab-89b292f136d4',
  user: '019a4ee8-73b7-743c-b7c0-070fe659867a',
  path: '/Messaging/_getConversationsForUser'
} => { request: '019a4eec-0d2d-7daf-81b7-4a66dc364bd3' }
Requesting.respond {
  request: '019a4eec-0d2d-7daf-81b7-4a66dc364bd3',
  conversations: [
    {
      _id: '019a4eeb-74a7-7e18-8465-958eb021071d',
      participant1: '019a4d64-15df-7c81-a927-b5d1faa9ca5d',
      participant2: '019a4ee8-73b7-743c-b7c0-070fe659867a'
    }
  ]
} => { request: '019a4eec-0d2d-7daf-81b7-4a66dc364bd3' }

[Requesting] Received request for path: /Messaging/sendMessage
Requesting.request {
  session: '019a4eeb-9d2e-7e6d-99ab-89b292f136d4',
  conversationId: '019a4eeb-74a7-7e18-8465-958eb021071d',
  content: 'Hey want to work on the math pset 8am to 9am today?',
  path: '/Messaging/sendMessage'
} => { request: '019a4eec-3924-75fe-a83f-4f48631e0c71' }
Messaging.sendMessage {
  conversationId: '019a4eeb-74a7-7e18-8465-958eb021071d',
  sender: '019a4ee8-73b7-743c-b7c0-070fe659867a',
  content: 'Hey want to work on the math pset 8am to 9am today?'
} => {
  message: {
    _id: '019a4eec-3963-76a3-83ab-bb94092326c0',
    conversationId: '019a4eeb-74a7-7e18-8465-958eb021071d',
    sender: '019a4ee8-73b7-743c-b7c0-070fe659867a',
    content: 'Hey want to work on the math pset 8am to 9am today?',
    sentAt: 2025-11-04T12:51:35.395Z
  }
}
Requesting.respond {
  request: '019a4eec-3924-75fe-a83f-4f48631e0c71',
  message: {
    _id: '019a4eec-3963-76a3-83ab-bb94092326c0',
    conversationId: '019a4eeb-74a7-7e18-8465-958eb021071d',
    sender: '019a4ee8-73b7-743c-b7c0-070fe659867a',
    content: 'Hey want to work on the math pset 8am to 9am today?',
    sentAt: 2025-11-04T12:51:35.395Z
  }
} => { request: '019a4eec-3924-75fe-a83f-4f48631e0c71' }

[Requesting] Received request for path: /UserAuthentication/authenticate
Requesting.request {
  username: 'tim',
  password: 'bruh123',
  path: '/UserAuthentication/authenticate'
} => { request: '019a4eec-4f81-75b4-a102-70df3574836c' }
UserAuthentication.authenticate { username: 'tim', password: 'bruh123' } => { user: '019a4d64-15df-7c81-a927-b5d1faa9ca5d' }
Sessioning.create { user: '019a4d64-15df-7c81-a927-b5d1faa9ca5d' } => { session: '019a4eec-4fa3-7670-b8a1-f601ebf10179' }
Requesting.respond {
  request: '019a4eec-4f81-75b4-a102-70df3574836c',
  user: '019a4d64-15df-7c81-a927-b5d1faa9ca5d',
  session: '019a4eec-4fa3-7670-b8a1-f601ebf10179'
} => { request: '019a4eec-4f81-75b4-a102-70df3574836c' }

[Requesting] Received request for path: /ScheduleGenerator/initializeSchedule
Requesting.request {
  session: '019a4eec-4fa3-7670-b8a1-f601ebf10179',
  path: '/ScheduleGenerator/initializeSchedule'
} => { request: '019a4eec-5027-7597-9899-8fd55094b805' }
ScheduleGenerator.initializeSchedule { owner: '019a4d64-15df-7c81-a927-b5d1faa9ca5d' } => { schedule: '019a4d64-16c9-7142-9646-10ecbc5349e9' }
Requesting.respond {
  request: '019a4eec-5027-7597-9899-8fd55094b805',
  schedule: '019a4d64-16c9-7142-9646-10ecbc5349e9'
} => { request: '019a4eec-5027-7597-9899-8fd55094b805' }

[Requesting] Received request for path: /ScheduleGenerator/_getEventsForSchedule
Requesting.request {
  session: '019a4eec-4fa3-7670-b8a1-f601ebf10179',
  schedule: '019a4d64-16c9-7142-9646-10ecbc5349e9',
  path: '/ScheduleGenerator/_getEventsForSchedule'
} => { request: '019a4eec-50c1-79e3-9c3d-197591b7878c' }
Requesting.respond {
  request: '019a4eec-50c1-79e3-9c3d-197591b7878c',
  events: Frames(2) [
    {
      _id: '019a4d64-698e-783a-a416-249e6762c039',
      name: 'School',
      eventID: 1,
      scheduleID: 1,
      startTime: '2025-11-05T09:00',
      endTime: '2025-11-05T15:00',
      repeat: [Object]
    },
    {
      _id: '019a4d64-b530-77d3-aed7-3868f6ebfc9f',
      name: 'Tim Time',
      eventID: 2,
      scheduleID: 1,
      startTime: '2025-11-04T14:00',
      endTime: '2025-11-04T15:00',
      repeat: [Object]
    }
  ]
} => { request: '019a4eec-50c1-79e3-9c3d-197591b7878c' }

[Requesting] Received request for path: /ScheduleGenerator/_getTasksForSchedule
Requesting.request {
  session: '019a4eec-4fa3-7670-b8a1-f601ebf10179',
  schedule: '019a4d64-16c9-7142-9646-10ecbc5349e9',
  path: '/ScheduleGenerator/_getTasksForSchedule'
} => { request: '019a4eec-5224-7305-bb57-01be2b9762c1' }
Requesting.respond {
  request: '019a4eec-5224-7305-bb57-01be2b9762c1',
  tasks: Frames(1) [
    {
      _id: '019a4d65-0359-73bb-8aba-f39f0989a3a8',
      name: 'Math Pset',
      taskID: 1,
      scheduleID: 1,
      deadline: '2025-11-05T22:00',
      expectedCompletionTime: 60,
      completionLevel: 0,
      priority: 3
    }
  ]
} => { request: '019a4eec-5224-7305-bb57-01be2b9762c1' }

[Requesting] Received request for path: /api/FriendList/_getFriendshipsByUser
Requesting.request {
  session: '019a4eec-4fa3-7670-b8a1-f601ebf10179',
  path: '/api/FriendList/_getFriendshipsByUser'
} => { request: '019a4eec-5364-7cd9-9987-499f17db49f2' }
Requesting.respond {
  request: '019a4eec-5364-7cd9-9987-499f17db49f2',
  results: [
    {
      _id: '019a4eeb-6a52-73c2-b4b2-0bc2d8a6bfe8',
      user1: '019a4d64-15df-7c81-a927-b5d1faa9ca5d',
      user2: '019a4ee8-73b7-743c-b7c0-070fe659867a'
    }
  ]
} => { request: '019a4eec-5364-7cd9-9987-499f17db49f2' }

[Requesting] Received request for path: /api/FriendList/_getSentFriendRequests
Requesting.request {
  session: '019a4eec-4fa3-7670-b8a1-f601ebf10179',
  path: '/api/FriendList/_getSentFriendRequests'
} => { request: '019a4eec-5408-7af0-a8a6-c5e28edb925a' }
Requesting.respond { request: '019a4eec-5408-7af0-a8a6-c5e28edb925a', results: [] } => { request: '019a4eec-5408-7af0-a8a6-c5e28edb925a' }

[Requesting] Received request for path: /api/FriendList/_getReceivedFriendRequests
Requesting.request {
  session: '019a4eec-4fa3-7670-b8a1-f601ebf10179',
  path: '/api/FriendList/_getReceivedFriendRequests'
} => { request: '019a4eec-54b1-7853-8f0f-bdd01c57293c' }
Requesting.respond { request: '019a4eec-54b1-7853-8f0f-bdd01c57293c', results: [] } => { request: '019a4eec-54b1-7853-8f0f-bdd01c57293c' }

[Requesting] Received request for path: /Messaging/_getMessagesInConversation
Requesting.request {
  session: '019a4eec-4fa3-7670-b8a1-f601ebf10179',
  conversationId: '019a4eeb-74a7-7e18-8465-958eb021071d',
  path: '/Messaging/_getMessagesInConversation'
} => { request: '019a4eec-591a-7c28-9410-c928d45bf4a4' }

Requesting.respond {
  request: '019a4eec-591a-7c28-9410-c928d45bf4a4',
  messages: [
    {
      _id: '019a4eeb-8710-78d9-bf02-7d2843fcf3b9',
      conversationId: '019a4eeb-74a7-7e18-8465-958eb021071d',
      sender: '019a4d64-15df-7c81-a927-b5d1faa9ca5d',
      content: 'hey whats up',
      sentAt: 2025-11-04T12:50:49.744Z
    },
    {
      _id: '019a4eec-3963-76a3-83ab-bb94092326c0',
      conversationId: '019a4eeb-74a7-7e18-8465-958eb021071d',
      sender: '019a4ee8-73b7-743c-b7c0-070fe659867a',
      content: 'Hey want to work on the math pset 8am to 9am today?',
      sentAt: 2025-11-04T12:51:35.395Z
    }
  ]
} => { request: '019a4eec-591a-7c28-9410-c928d45bf4a4' }

[Requesting] Received request for path: /Messaging/_getConversationsForUser
Requesting.request {
  session: '019a4eec-4fa3-7670-b8a1-f601ebf10179',
  user: '019a4d64-15df-7c81-a927-b5d1faa9ca5d',
  path: '/Messaging/_getConversationsForUser'
} => { request: '019a4eec-59ed-7e5a-82df-a915527387eb' }
Requesting.respond {
  request: '019a4eec-59ed-7e5a-82df-a915527387eb',
  conversations: [
    {
      _id: '019a4eeb-74a7-7e18-8465-958eb021071d',
      participant1: '019a4d64-15df-7c81-a927-b5d1faa9ca5d',
      participant2: '019a4ee8-73b7-743c-b7c0-070fe659867a'
    }
  ]
} => { request: '019a4eec-59ed-7e5a-82df-a915527387eb' }

[Requesting] Received request for path: /ScheduleGenerator/initializeSchedule
Requesting.request {
  session: '019a4eec-4fa3-7670-b8a1-f601ebf10179',
  path: '/ScheduleGenerator/initializeSchedule'
} => { request: '019a4eec-802b-7a68-8d5b-13640a0f3e0b' }
ScheduleGenerator.initializeSchedule { owner: '019a4d64-15df-7c81-a927-b5d1faa9ca5d' } => { schedule: '019a4d64-16c9-7142-9646-10ecbc5349e9' }
Requesting.respond {
  request: '019a4eec-802b-7a68-8d5b-13640a0f3e0b',
  schedule: '019a4d64-16c9-7142-9646-10ecbc5349e9'
} => { request: '019a4eec-802b-7a68-8d5b-13640a0f3e0b' }

[Requesting] Received request for path: /ScheduleGenerator/_getEventsForSchedule
Requesting.request {
  session: '019a4eec-4fa3-7670-b8a1-f601ebf10179',
  schedule: '019a4d64-16c9-7142-9646-10ecbc5349e9',
  path: '/ScheduleGenerator/_getEventsForSchedule'
} => { request: '019a4eec-80c6-7419-8e16-a12df9936add' }
Requesting.respond {
  request: '019a4eec-80c6-7419-8e16-a12df9936add',
  events: Frames(2) [
    {
      _id: '019a4d64-698e-783a-a416-249e6762c039',
      name: 'School',
      eventID: 1,
      scheduleID: 1,
      startTime: '2025-11-05T09:00',
      endTime: '2025-11-05T15:00',
      repeat: [Object]
    },
    {
      _id: '019a4d64-b530-77d3-aed7-3868f6ebfc9f',
      name: 'Tim Time',
      eventID: 2,
      scheduleID: 1,
      startTime: '2025-11-04T14:00',
      endTime: '2025-11-04T15:00',
      repeat: [Object]
    }
  ]
} => { request: '019a4eec-80c6-7419-8e16-a12df9936add' }

[Requesting] Received request for path: /ScheduleGenerator/_getTasksForSchedule
Requesting.request {
  session: '019a4eec-4fa3-7670-b8a1-f601ebf10179',
  schedule: '019a4d64-16c9-7142-9646-10ecbc5349e9',
  path: '/ScheduleGenerator/_getTasksForSchedule'
} => { request: '019a4eec-8184-7ef4-9b70-777e320e5a73' }
Requesting.respond {
  request: '019a4eec-8184-7ef4-9b70-777e320e5a73',
  tasks: Frames(1) [
    {
      _id: '019a4d65-0359-73bb-8aba-f39f0989a3a8',
      name: 'Math Pset',
      taskID: 1,
      scheduleID: 1,
      deadline: '2025-11-05T22:00',
      expectedCompletionTime: 60,
      completionLevel: 0,
      priority: 3
    }
  ]
} => { request: '019a4eec-8184-7ef4-9b70-777e320e5a73' }

[Requesting] Received request for path: /UserAuthentication/_checkUserExists
Requesting.request {
  session: '019a4eec-4fa3-7670-b8a1-f601ebf10179',
  user: '019a4d64-15df-7c81-a927-b5d1faa9ca5d',
  path: '/UserAuthentication/_checkUserExists'
} => { request: '019a4eec-97f3-7b63-b290-a34ec3c7e46b' }
Requesting.respond { request: '019a4eec-97f3-7b63-b290-a34ec3c7e46b', exists: true } => { request: '019a4eec-97f3-7b63-b290-a34ec3c7e46b' }

[Requesting] Received request for path: /ScheduleGenerator/initializeSchedule

[Requesting] Received request for path: /ScheduleGenerator/initializeSchedule
Requesting.request {
  session: '019a4eec-4fa3-7670-b8a1-f601ebf10179',
  path: '/ScheduleGenerator/initializeSchedule'
} => { request: '019a4eec-98c5-7b64-a835-9e5ecbdfeb34' }
Requesting.request {
  session: '019a4eec-4fa3-7670-b8a1-f601ebf10179',
  path: '/ScheduleGenerator/initializeSchedule'
} => { request: '019a4eec-98cc-7170-ae16-dcbc11eacd08' }
ScheduleGenerator.initializeSchedule { owner: '019a4d64-15df-7c81-a927-b5d1faa9ca5d' } => { schedule: '019a4d64-16c9-7142-9646-10ecbc5349e9' }
ScheduleGenerator.initializeSchedule { owner: '019a4d64-15df-7c81-a927-b5d1faa9ca5d' } => { schedule: '019a4d64-16c9-7142-9646-10ecbc5349e9' }
Requesting.respond {
  request: '019a4eec-98cc-7170-ae16-dcbc11eacd08',
  schedule: '019a4d64-16c9-7142-9646-10ecbc5349e9'
} => { request: '019a4eec-98cc-7170-ae16-dcbc11eacd08' }
Requesting.respond {
  request: '019a4eec-98c5-7b64-a835-9e5ecbdfeb34',
  schedule: '019a4d64-16c9-7142-9646-10ecbc5349e9'
} => { request: '019a4eec-98c5-7b64-a835-9e5ecbdfeb34' }

[Requesting] Received request for path: /ScheduleGenerator/_getEventsForSchedule

[Requesting] Received request for path: /ScheduleGenerator/_getEventsForSchedule
Requesting.request {
  session: '019a4eec-4fa3-7670-b8a1-f601ebf10179',
  schedule: '019a4d64-16c9-7142-9646-10ecbc5349e9',
  path: '/ScheduleGenerator/_getEventsForSchedule'
} => { request: '019a4eec-995f-7f0e-b4c0-9b454f583768' }
Requesting.request {
  session: '019a4eec-4fa3-7670-b8a1-f601ebf10179',
  schedule: '019a4d64-16c9-7142-9646-10ecbc5349e9',
  path: '/ScheduleGenerator/_getEventsForSchedule'
} => { request: '019a4eec-9966-702d-8273-4b1a9cabcee7' }
Requesting.respond {
  request: '019a4eec-9966-702d-8273-4b1a9cabcee7',
  events: Frames(2) [
    {
      _id: '019a4d64-698e-783a-a416-249e6762c039',
      name: 'School',
      eventID: 1,
      scheduleID: 1,
      startTime: '2025-11-05T09:00',
      endTime: '2025-11-05T15:00',
      repeat: [Object]
    },
    {
      _id: '019a4d64-b530-77d3-aed7-3868f6ebfc9f',
      name: 'Tim Time',
      eventID: 2,
      scheduleID: 1,
      startTime: '2025-11-04T14:00',
      endTime: '2025-11-04T15:00',
      repeat: [Object]
    }
  ]
} => { request: '019a4eec-9966-702d-8273-4b1a9cabcee7' }
Requesting.respond {
  request: '019a4eec-995f-7f0e-b4c0-9b454f583768',
  events: Frames(2) [
    {
      _id: '019a4d64-698e-783a-a416-249e6762c039',
      name: 'School',
      eventID: 1,
      scheduleID: 1,
      startTime: '2025-11-05T09:00',
      endTime: '2025-11-05T15:00',
      repeat: [Object]
    },
    {
      _id: '019a4d64-b530-77d3-aed7-3868f6ebfc9f',
      name: 'Tim Time',
      eventID: 2,
      scheduleID: 1,
      startTime: '2025-11-04T14:00',
      endTime: '2025-11-04T15:00',
      repeat: [Object]
    }
  ]
} => { request: '019a4eec-995f-7f0e-b4c0-9b454f583768' }

[Requesting] Received request for path: /ScheduleGenerator/_getTasksForSchedule

[Requesting] Received request for path: /ScheduleGenerator/_getTasksForSchedule
Requesting.request {
  session: '019a4eec-4fa3-7670-b8a1-f601ebf10179',
  schedule: '019a4d64-16c9-7142-9646-10ecbc5349e9',
  path: '/ScheduleGenerator/_getTasksForSchedule'
} => { request: '019a4eec-9a12-7a3c-8364-1d4e4d463659' }
Requesting.request {
  session: '019a4eec-4fa3-7670-b8a1-f601ebf10179',
  schedule: '019a4d64-16c9-7142-9646-10ecbc5349e9',
  path: '/ScheduleGenerator/_getTasksForSchedule'
} => { request: '019a4eec-9a17-77be-95ac-7702158f5e10' }
Requesting.respond {
  request: '019a4eec-9a12-7a3c-8364-1d4e4d463659',
  tasks: Frames(1) [
    {
      _id: '019a4d65-0359-73bb-8aba-f39f0989a3a8',
      name: 'Math Pset',
      taskID: 1,
      scheduleID: 1,
      deadline: '2025-11-05T22:00',
      expectedCompletionTime: 60,
      completionLevel: 0,
      priority: 3
    }
  ]
} => { request: '019a4eec-9a12-7a3c-8364-1d4e4d463659' }
Requesting.respond {
  request: '019a4eec-9a17-77be-95ac-7702158f5e10',
  tasks: Frames(1) [
    {
      _id: '019a4d65-0359-73bb-8aba-f39f0989a3a8',
      name: 'Math Pset',
      taskID: 1,
      scheduleID: 1,
      deadline: '2025-11-05T22:00',
      expectedCompletionTime: 60,
      completionLevel: 0,
      priority: 3
    }
  ]
} => { request: '019a4eec-9a17-77be-95ac-7702158f5e10' }
```
