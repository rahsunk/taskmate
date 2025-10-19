[@concept-rubric](../../background/detailed/concept-rubric.md)

[@concept-state](../../background/detailed/concept-state.md)

[@concept-design-brief](../../background/concept-design-brief.md)

[@concept-design-overview](../../background/concept-design-overview.md)

[@concept-refactoring](../../background/concept-refactoring.md)

[@concept-specifications](../../background/concept-specifications.md)

- **concept** UserAuthentication[User]  
- **purpose** limit access to known users and find users by name  
- **principle** After a user registers with a username and a password, they can authenticate with that same username and password and be treated each time as the same user. They can also be looked up by other users when sharing events
- **state**
	- a set of `Users` with
		- a `username` of type `String`
		- a `password` of type `String`
- **actions**
	- `register (username: String, password: String): (user: User)`
		- **requires**: no `User` with `username` exists
		- **effects**: create and return a new `User` with the given `username` and `password`
	- `authenticate (username: String, password: String): (user: User)`
		- **requires**: `User` with the same `username` and `password` exists
		- **effects**: grants access to the `User` associated with that `username` and `password`
    * `changePassword (user: User, oldPassword: String, newPassword: String)`
        * **requires**: `user` exists and  `user.password` is equal to `oldPassword`
        * **effects**: `password` for `user` is changed to `newPassword`.
    * `deleteAccount (user: User)`
        * **requires**: `user` exists
        * **effects**: `user` is removed from the state