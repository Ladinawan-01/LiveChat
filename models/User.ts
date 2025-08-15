import mongoose, { type Document, Schema } from "mongoose"

export interface IUser extends Document {
  _id: string
  username: string
  avatar?: string
  isOnline: boolean
  lastSeen: Date
  createdAt: Date
  updatedAt: Date
}

const UserSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 2,
      maxlength: 30,
    },
    avatar: {
      type: String,
      default: null,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
)

// Prevent re-compilation during development
export default mongoose.models.User || mongoose.model<IUser>("User", UserSchema)
