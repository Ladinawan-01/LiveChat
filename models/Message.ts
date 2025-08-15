import mongoose, { type Document, Schema } from "mongoose"

export interface IMessage extends Document {
  _id: string
  content: string
  sender: string
  senderName: string
  timestamp: Date
  messageType: "text" | "image" | "file"
  isRead: boolean
  createdAt: Date
  updatedAt: Date
}

const MessageSchema = new Schema<IMessage>(
  {
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    sender: {
      type: String,
      required: true,
    },
    senderName: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    messageType: {
      type: String,
      enum: ["text", "image", "file"],
      default: "text",
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
)

// Index for efficient querying
MessageSchema.index({ timestamp: -1 })
MessageSchema.index({ sender: 1 })

export default mongoose.models.Message || mongoose.model<IMessage>("Message", MessageSchema)
