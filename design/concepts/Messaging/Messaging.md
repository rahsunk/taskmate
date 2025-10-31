[@concept-rubric](../../background/detailed/concept-rubric.md)

[@concept-state](../../background/detailed/concept-state.md)

[@concept-design-brief](../../background/concept-design-brief.md)

[@concept-design-overview](../../background/concept-design-overview.md)

[@concept-refactoring](../../background/concept-refactoring.md)

[@concept-specifications](../../background/concept-specifications.md)

# prompt: Give a concept for Messaging in an app

# response:

Here's a concept design for Messaging, following the provided rubric:

---

* ***concept** Messaging [User]
* **purpose** Enable users to exchange textual communications with one another in a persistent and asynchronous manner.
* **principle** After a user initiates a conversation by sending a message to another user, that user can then view the message and send a reply, and both users can subsequently review the full history of their exchanges.
* **state**
	* a set of `Conversations` with
		* an `owner` of type `User`
		* a set of `participants` of type `User`
		* a `name` of type `String`
		* a `conversationId` of type `Number` (static attribute, initially -1)
	* a set of `Messages` with
		* a `sender` of type `User`
		* a `content` of type `String`
		* a `sentAt` of type `Date`
		* a `conversationId` of type `Number`
* **actions**
	* `createConversation (owner: User, name: String): (conversation: Conversation)`
		*   **requires** `owner` and name exists
	    *   **effects** A new `conversation` is created and returned with `conversation.owner` and `conversation.name` set to their respective parameters and static attribute `conversationId` incrementing by 1. 
	* `sendMessage (conversation: Conversation, sender: User, content: String): (message: Message)`
		* **requires** `conversation` exists, `sender` is an element of `conversation.participants`, and `content` is not empty.
	    *   **effects** A `message` is created and returned where `message.sender` and `message.content` are set to their respective parameters, `message.sentAt` is set to the current `Date`
	*   `addParticipant (conversation: Conversation, newParticipant: User, owner: User)`
	    *  **requires** `conversation`, `owner`, and `newParticipant`exist and `newParticipant` is not already in `conversation.participants`.
	    *   **effects** `newParticipant` is added to the `conversation.participants` set.
	*  `removeParticipant (conversation: Conversation, participantToRemove: User, owner: User)`
	    *  **requires** `conversation`, `owner`, and `newParticipant`exist and `newParticipant` is in `conversation.participants`.
	    *  **effects** `newParticipant` is removed from the `conversation.participants` set.
# prompt: Simplify this concept so that it works just for messages between two users.  Remove the adding and removing participants methods, and have the createConversation method initialize the conversation between two users.
# response:

Here's the simplified `Messaging` concept, tailored for one-to-one conversations between two users:

***

*   **concept** Messaging \[User]
*   **purpose** Enable two specific users to exchange textual communications with one another in a persistent and asynchronous manner.
*  **principle** After two users establish a conversation, either user can send a message to the other, view previous messages, and reply, thus building a persistent history of their one-to-one exchange.
*   **state**
    *   a set of `Conversations` with
        *   a `participant1` of type `User`
        *   a `participant2` of type `User`
        *   a `conversationId` of type `Number`
    *   a set of `Messages` with
        *   a `conversationId` of type `Number`
        *   a `sender` of type `User`
        *   a `content` of type `String`
        *   a `sentAt` of type `Date`
*   **actions**
    *   `createConversation (user1: User, user2: User): (conversationId: Number)`
        *   **requires** `user1` and `user2` exist, and `user1` is not the same as `user2`. No `Conversation` already exists where `(participant1 = user1 AND participant2 = user2) OR (participant1 = user2 AND participant2 = user1)`.
        *   **effects** A new `Conversation` is created with `participant1` set to `user1`, `participant2` set to `user2`, and a fresh `conversationId` is generated and returned. (The order of `participant1` and `participant2` may be canonicalized, e.g., by ID).
    *   `sendMessage (conversationId: Number, sender: User, content: String): (message: Message)`
        *   **requires** A `Conversation` with the given `conversationId` exists. `sender` is either `participant1` or `participant2` of that `Conversation`. `content` is not empty.
        *   **effects** A `message` is created and returned where `message.conversationId` is set to the provided `conversationId` and `message.sender` and `message.content` are set to their respective parameters, with `message.sentAt` is set to the current `Date`