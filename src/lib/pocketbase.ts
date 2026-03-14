import PocketBase from 'pocketbase'

const pocketbaseUrl = process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://c.yuu.my.id'

export const pb = new PocketBase(pocketbaseUrl)

// Optional: Auth store for future user authentication
// pb.authStore.save('token', { email: 'user@example.com' })
