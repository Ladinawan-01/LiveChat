import mongoose, { type Document, Schema } from "mongoose"

export interface IMessage extends Document {
  _id: string
  sender: string
  receiver?: string // for private chat
  room?: string // for group chat
  text: string
  timestamp: Date
  createdAt: Date
  updatedAt: Date
}

const MessageSchema = new Schema<IMessage>(
  {
    sender: {
      type: String,
      required: true,
    },
    receiver: {
      type: String,
      required: false, // optional for group chat
    },
    room: {
      type: String,
      required: false, // optional for private chat
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
)

// Index for efficient querying
MessageSchema.index({ timestamp: -1 })
MessageSchema.index({ sender: 1 })
MessageSchema.index({ receiver: 1 })
MessageSchema.index({ room: 1 })

export default mongoose.models.Message || mongoose.model<IMessage>("Message", MessageSchema)
