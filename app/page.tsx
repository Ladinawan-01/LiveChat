"use client"

import { LiveChat } from "@/components/live-chat"

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md h-[600px] bg-white rounded-lg shadow-xl overflow-hidden">
        <LiveChat onClose={() => {}} />
      </div>
    </div>
  )
}
