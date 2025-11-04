import { Collection, Db } from "npm:mongodb";
import { ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import { getCurrentETDate } from "@utils/timezone.ts";

// Declare collection prefix, use concept name
const PREFIX = "Messaging" + ".";

// Generic types of this concept
type User = ID;
type ConversationId = ID;

/**
 * a set of Conversations with
 * a participant1 of type User
 * a participant2 of type User
 */
export interface ConversationDoc {
  _id: ConversationId;
  participant1: User;
  participant2: User;
}

/**
 * a set of Messages with
 * a conversationId of type ID
 * a sender of type User
 * a content of type String
 * a sentAt of type Date
 */
export interface MessageDoc {
  _id: ID;
  conversationId: ConversationId;
  sender: User;
  content: string;
  sentAt: Date;
}

export default class MessagingConcept {
  conversations: Collection<ConversationDoc>;
  messages: Collection<MessageDoc>;

  constructor(private readonly db: Db) {
    this.conversations = this.db.collection(PREFIX + "conversations");
    this.messages = this.db.collection(PREFIX + "messages");
  }

  /**
   * createConversation (user1: User, user2: User): (conversationId: ID) | (error: string)
   * **requires** `user1` is not the same as `user2`, and no conversation exists between them.
   * **effects** Creates a new `Conversation` and returns its ID.
   */
  async createConversation(
    { user1, user2 }: { user1: User; user2: User },
  ): Promise<{ conversationId: ConversationId } | { error: string }> {
    if (user1 === user2) {
      return { error: "Cannot create a conversation with yourself." };
    }

    const [p1, p2] = [user1, user2].sort();
    const existingConversation = await this.conversations.findOne({
      participant1: p1,
      participant2: p2,
    });

    if (existingConversation) {
      return {
        error: "A conversation between these two users already exists.",
      };
    }

    const newConversationId = freshID() as ConversationId;
    await this.conversations.insertOne({
      _id: newConversationId,
      participant1: p1,
      participant2: p2,
    });

    return { conversationId: newConversationId };
  }

  /**
   * sendMessage (conversationId: ID, sender: User, content: String): (message: MessageDoc) | (error: string)
   * **requires** A `Conversation` exists, `sender` is a participant, and `content` is not empty.
   * **effects** Creates a new `Message` and returns it.
   */
  async sendMessage(
    { conversationId, sender, content }: {
      conversationId: ConversationId;
      sender: User;
      content: string;
    },
  ): Promise<{ message: MessageDoc } | { error: string }> {
    if (!content || content.trim() === "") {
      return { error: "Message content cannot be empty." };
    }

    const conversation = await this.conversations.findOne({
      _id: conversationId,
    });
    if (!conversation) {
      return { error: `Conversation with ID ${conversationId} not found.` };
    }

    if (
      sender !== conversation.participant1 &&
      sender !== conversation.participant2
    ) {
      return { error: "Sender is not a participant in this conversation." };
    }

    const newMessage: MessageDoc = {
      _id: freshID(),
      conversationId,
      sender,
      content: content.trim(),
      sentAt: getCurrentETDate(), // Use ET timezone for message timestamp
    };
    await this.messages.insertOne(newMessage);
    return { message: newMessage };
  }

  // --- Queries --- //

  /**
   * _getConversation (conversationId: ID): (conversation: ConversationDoc)[]
   */
  async _getConversation(
    { conversationId }: { conversationId: ConversationId },
  ): Promise<{ conversation: ConversationDoc }[]> {
    const conversation = await this.conversations.findOne({
      _id: conversationId,
    });
    return conversation ? [{ conversation }] : [];
  }

  /**
   * _getMessagesInConversation (conversationId: ID): (messages: MessageDoc)[]
   */
  async _getMessagesInConversation(
    { conversationId }: { conversationId: ConversationId },
  ): Promise<MessageDoc[]> {
    const conversationExists = await this.conversations.countDocuments({
      _id: conversationId,
    });
    if (conversationExists === 0) {
      return [];
    }
    return this.messages.find({ conversationId }).sort({ sentAt: 1 }).toArray();
  }

  /**
   * _getConversationsForUser (user: User): (conversations: ConversationDoc)[]
   */
  async _getConversationsForUser(
    { user }: { user: User },
  ): Promise<ConversationDoc[]> {
    return this.conversations.find({
      $or: [{ participant1: user }, { participant2: user }],
    }).toArray();
  }

  /**
   * _getAllConversations (): (conversations: ConversationDoc)[]
   */
  async _getAllConversations(): Promise<ConversationDoc[]> {
    return this.conversations.find({}).toArray();
  }

  /**
   * _getMessageDetails (messageId: ID): (message: MessageDoc)[]
   */
  async _getMessageDetails(
    { messageId }: { messageId: ID },
  ): Promise<MessageDoc[]> {
    const message = await this.messages.findOne({ _id: messageId });
    return message ? [message] : [];
  }

  /**
   * _getAllMessages (): (messages: MessageDoc)[]
   */
  async _getAllMessages(): Promise<MessageDoc[]> {
    return this.messages.find({}).toArray();
  }
}
