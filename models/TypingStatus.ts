import mongoose, { type Document, Schema } from "mongoose"

export interface ITypingStatus extends Document {
  _id: string
  userId: string
  username: string
  isTyping: boolean
  lastTyping: Date
  createdAt: Date
  updatedAt: Date
}

const TypingStatusSchema = new Schema<ITypingStatus>(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
    },
    username: {
      type: String,
      required: true,
    },
    isTyping: {
      type: Boolean,
      default: false,
    },
    lastTyping: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
)

// TTL index to automatically remove old typing status after 30 seconds
TypingStatusSchema.index({ lastTyping: 1 }, { expireAfterSeconds: 30 })

export default mongoose.models.TypingStatus || mongoose.model<ITypingStatus>("TypingStatus", TypingStatusSchema)
