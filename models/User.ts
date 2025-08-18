import mongoose, { type Document, Schema } from "mongoose"

export interface IUser extends Document {
  _id: string
  username: string
  email: string
  password: string
  avatar?: string
  isOnline: boolean
  lastSeen: Date
  refreshToken?: string
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
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
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
    refreshToken: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  },
)

// Index for efficient querying
UserSchema.index({ email: 1 })
UserSchema.index({ username: 1 })
UserSchema.index({ isOnline: 1 })

// Prevent re-compilation during development
export default mongoose.models.User || mongoose.model<IUser>("User", UserSchema)
