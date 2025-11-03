---
timestamp: 'Mon Nov 03 2025 00:50:08 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251103_005008.51085b8a.md]]'
content_id: 7ab4dc2cd77320f41e59e72aea5f2a7d3f74cb1cb2e4c4094bc4eed22c61ccd8
---

# Example auth sync:

```typescript
import { actions, Sync } from "@engine";

import { Requesting, UserAuthentication, Sessioning } from "@concepts";

  

//-- User Registration --//

export const RegisterRequest: Sync = ({ request, username, password }) => ({

when: actions([Requesting.request, { path: "/UserAuthentication/register", username, password }, { request }]),

then: actions([UserAuthentication.register, { username, password }]),

});

  

export const RegisterResponseSuccess: Sync = ({ request, user }) => ({

when: actions(

[Requesting.request, { path: "/UserAuthentication/register" }, { request }],

[UserAuthentication.register, {}, { user }],

),

then: actions([Requesting.respond, { request, user }]),

});

  

export const RegisterResponseError: Sync = ({ request, error }) => ({

when: actions(

[Requesting.request, { path: "/UserAuthentication/register" }, { request }],

[UserAuthentication.register, {}, { error }],

),

then: actions([Requesting.respond, { request, error }]),

});

  

//-- User Login & Session Creation --//

export const LoginRequest: Sync = ({ request, username, password }) => ({

when: actions([Requesting.request, { path: "/login", username, password }, { request }]),

then: actions([UserAuthentication.login, { username, password }]),

});

  

export const LoginSuccessCreatesSession: Sync = ({ user }) => ({

when: actions([UserAuthentication.login, {}, { user }]),

then: actions([Sessioning.create, { user }]),

});

  

export const LoginResponseSuccess: Sync = ({ request, user, session }) => ({

when: actions(

[Requesting.request, { path: "/login" }, { request }],

[UserAuthentication.login, {}, { user }],

[Sessioning.create, { user }, { session }],

),

then: actions([Requesting.respond, { request, session }]),

});

  

export const LoginResponseError: Sync = ({ request, error }) => ({

when: actions(

[Requesting.request, { path: "/login" }, { request }],

[UserAuthentication.login, {}, { error }]

),

then: actions([Requesting.respond, { request, error }]),

});

  

//-- User Logout --//

export const LogoutRequest: Sync = ({ request, session, user }) => ({

when: actions([Requesting.request, { path: "/logout", session }, { request }]),

where: (frames) => frames.query(Sessioning._getUser, { session }, { user }),

then: actions([Sessioning.delete, { session }]),

});

  

export const LogoutResponse: Sync = ({ request }) => ({

when: actions(

[Requesting.request, { path: "/logout" }, { request }],

[Sessioning.delete, {}, {}],

),

then: actions([Requesting.respond, { request, status: "logged_out" }]),

});
```
