// Version management for Copas app

export interface Version {
  version: string
  buildDate: string
  changelog: string
}

export async function getVersion(): Promise<Version> {
  try {
    const versionModule = await import('./version.json')
    return versionModule.default as Version
  } catch (error) {
    console.error('Failed to load version:', error)
    return {
      version: '1.0.0',
      buildDate: '2025-11-08',
      changelog: 'Initial release'
    }
  }
}