import PocketBase from 'pocketbase'

const pbUrl = process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://localhost:8090'
export const pb = new PocketBase(pbUrl)

// Auto-cancel pending requests when component unmounts
pb.autoCancellation(false)
