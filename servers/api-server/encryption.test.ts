import { describe, it, expect, beforeEach, vi } from 'vitest'
import { EncryptionService } from './encryption'

describe('EncryptionService', () => {
  const ORIGINAL_ENV = process.env

  beforeEach(() => {
    vi.restoreAllMocks()
    process.env = { ...ORIGINAL_ENV }
    process.env.WALLIE_ENCRYPTION_KEY = 'test-secret-key-123'
  })

  it('returns input when encrypting empty string', () => {
    expect(EncryptionService.encrypt('')).toBe('')
  })

  it('returns input when decrypting empty string', () => {
    expect(EncryptionService.decrypt('')).toBe('')
  })

  it('encrypts and decrypts round-trip', () => {
    const plaintext = 'hello world 🚀'
    const encrypted = EncryptionService.encrypt(plaintext)
    expect(encrypted).toContain(':')
    const decrypted = EncryptionService.decrypt(encrypted)
    expect(decrypted).toBe(plaintext)
  })

  it('throws if env key is missing on encrypt', () => {
    delete process.env.WALLIE_ENCRYPTION_KEY
    expect(() => EncryptionService.encrypt('abc')).toThrow()
  })

  it('throws if env key is missing on decrypt', () => {
    delete process.env.WALLIE_ENCRYPTION_KEY
    expect(() => EncryptionService.decrypt('iv:tag:data')).toThrow()
  })

  it('throws for invalid encrypted format', () => {
    expect(() => EncryptionService.decrypt('invalid')).toThrow()
  })
})


