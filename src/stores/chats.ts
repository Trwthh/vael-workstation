export interface Attachment {
  name: string
  size: number
  kind: 'file' | 'folder'
  count?: number
  preview?: string
}

export interface Message {
  attachments?: Attachment[]
  id: string
  role: 'user' | 'assistant'
  content: string
  verified?: boolean
  suggestions?: string[]
  artifacts?: string[]
  sessionDir?: string
  ts?: number
  model?: string
  isStreaming?: boolean
  isRefusal?: boolean
}

const demo = (id: string, prompt: string, reply: string, suggestions: string[]): Message[] => [
  { id: `${id}-u`, role: 'user', content: prompt, ts: Date.now() - 600000 },
  { id: `${id}-a`, role: 'assistant', content: reply, verified: true, suggestions, ts: Date.now() - 590000 },
]

export const chatMessages: Record<string, Message[]> = {
  'demo-2': demo('d2', 'add an aimbot module with smoothing',
    '[C.C.]\n\nsmoothing is the whole point. divide the yaw/pitch delta by a factor so the camera eases toward the target instead of snapping.\n\n```java\nfloat yawDiff = wrapDegrees((float)angles[0] - mc.player.getYaw());\nmc.player.setYaw(mc.player.getYaw() + yawDiff / smoothing);\n```\n\nkeep fov under 90 or it looks obvious.',
    ['Add FOV circle', 'Add target priority']),
  'demo-3': demo('d3', 'make the esp boxes render through walls',
    '[C.C.]\n\ndisable depth testing before you draw the box, then re-enable it after.\n\n```java\nRenderSystem.disableDepthTest();\nrenderBox(matrices, pos, w, h);\nRenderSystem.enableDepthTest();\n```',
    ['Color by distance', 'Add health bars']),
  'demo-4': demo('d4', 'kill aura with range and cps limit',
    '[C.C.]\n\ncap cps with a tick counter and only attack targets inside reach. randomize the delay a little so it is not a flat line.',
    ['Add rotation spoof', 'Target filters']),
  'demo-5': demo('d5', 'x-ray that highlights ores only',
    '[C.C.]\n\nhook the block render layer and skip everything that is not in an ore whitelist. rebuild chunks when you toggle it.',
    ['Ore color config', 'Fullbright toggle']),
}
