// Simple notification sound generator using Web Audio API
export function createNotificationSound(): HTMLAudioElement {
  // Create a simple beep sound using Web Audio API
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  const oscillator = audioContext.createOscillator()
  const gainNode = audioContext.createGain()

  oscillator.connect(gainNode)
  gainNode.connect(audioContext.destination)

  oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
  oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1)
  oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2)

  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)

  oscillator.start(audioContext.currentTime)
  oscillator.stop(audioContext.currentTime + 0.3)

  // Create a fallback audio element
  const audio = new Audio()
  audio.volume = 0.3
  
  // Try to play the generated sound
  try {
    oscillator.onended = () => {
      audioContext.close()
    }
  } catch (error) {
    console.warn('Could not create notification sound:', error)
  }

  return audio
}

// Alternative: Use a simple beep sound
export function playNotificationBeep(): void {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
    oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1)
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2)

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.3)

    oscillator.onended = () => {
      audioContext.close()
    }
  } catch (error) {
    console.warn('Could not play notification sound:', error)
  }
}
