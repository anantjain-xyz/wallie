import crypto from 'crypto'

/**
 * Encryption service for sensitive data
 */
export class EncryptionService {
  // Environment variable for the encryption key
  private static readonly ENCRYPTION_KEY_ENV = 'WALLIE_ENCRYPTION_KEY'
  
  // Algorithm to use
  private static readonly ALGORITHM = 'aes-256-gcm'
  
  // Static salt for key derivation
  private static readonly SALT = 'wallie_secrets_salt'
  
  /**
   * Get the encryption key from environment
   */
  private static getEncryptionKey(): Buffer {
    const secret = process.env[this.ENCRYPTION_KEY_ENV]
    if (!secret) {
      throw new Error(`${this.ENCRYPTION_KEY_ENV} environment variable must be set`)
    }
    
    // Derive a key using PBKDF2
    return crypto.pbkdf2Sync(
      secret,
      this.SALT,
      100000, // iterations
      32, // key length
      'sha256'
    )
  }
  
  /**
   * Encrypt a string value
   * 
   * @param plaintext - The text to encrypt
   * @returns Base64-encoded encrypted data with IV and auth tag
   */
  static encrypt(plaintext: string): string {
    if (!plaintext) {
      return plaintext
    }
    
    try {
      const key = this.getEncryptionKey()
      
      // Generate a random initialization vector
      const iv = crypto.randomBytes(16)
      
      // Create cipher
      const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv)
      
      // Encrypt the data
      let encrypted = cipher.update(plaintext, 'utf8', 'base64')
      encrypted += cipher.final('base64')
      
      // Get the authentication tag
      const authTag = cipher.getAuthTag()
      
      // Combine IV, encrypted data, and auth tag for storage
      // Format: base64(iv):base64(authTag):base64(encryptedData)
      return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`
    } catch (error) {
      console.error('Encryption error:', error)
      throw new Error('Failed to encrypt data')
    }
  }
  
  /**
   * Decrypt an encrypted string value
   * 
   * @param encryptedText - The text to decrypt in format: base64(iv):base64(authTag):base64(encryptedData)
   * @returns The decrypted plaintext
   */
  static decrypt(encryptedText: string): string {
    if (!encryptedText) {
      return encryptedText
    }
    
    try {
      const key = this.getEncryptionKey()
      
      // Split the stored data into parts
      const [ivBase64, authTagBase64, encryptedData] = encryptedText.split(':')
      
      if (!ivBase64 || !authTagBase64 || !encryptedData) {
        throw new Error('Invalid encrypted data format')
      }
      
      // Convert from base64
      const iv = Buffer.from(ivBase64, 'base64')
      const authTag = Buffer.from(authTagBase64, 'base64')
      
      // Create decipher
      const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv)
      decipher.setAuthTag(authTag)
      
      // Decrypt the data
      let decrypted = decipher.update(encryptedData, 'base64', 'utf8')
      decrypted += decipher.final('utf8')
      
      return decrypted
    } catch (error) {
      console.error('Decryption error:', error)
      throw new Error('Failed to decrypt data')
    }
  }
}