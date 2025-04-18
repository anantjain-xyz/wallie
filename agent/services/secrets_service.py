import os
import base64
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.backends import default_backend
from ..logging_config import get_logger

# Get logger for this module
logger = get_logger(__name__)

class EncryptionService:
    """Handles encryption and decryption of sensitive data"""
    
    # Environment variable for the encryption key
    ENCRYPTION_KEY_ENV = "WALLIE_ENCRYPTION_KEY"
    
    # Static salt for key derivation - this doesn't need to be secret, but should be consistent
    SALT = b"wallie_secrets_salt"
    
    # Algorithm name
    ALGORITHM = "aes-256-gcm"
    
    @staticmethod
    def get_encryption_key() -> bytes:
        """Get the encryption key from environment variable.
        
        Returns:
            bytes: The derived encryption key
            
        Raises:
            ValueError: If encryption key is not set in environment
        """
        # Get the base secret from environment
        secret = os.environ.get(EncryptionService.ENCRYPTION_KEY_ENV)
        if not secret:
            raise ValueError(f"{EncryptionService.ENCRYPTION_KEY_ENV} environment variable must be set")
            
        # Convert string secret to bytes
        secret_bytes = secret.encode()
        
        # Derive a secure key using PBKDF2
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,  # 32 bytes = 256 bits
            salt=EncryptionService.SALT,
            iterations=100000,
            backend=default_backend()
        )
        
        # Return the key
        return kdf.derive(secret_bytes)
    
    @staticmethod
    def decrypt(encrypted_text: str) -> str:
        """Decrypt an encrypted string value.
        
        Args:
            encrypted_text: String in format base64(iv):base64(authTag):base64(encryptedData)
            
        Returns:
            str: Decrypted string
            
        Raises:
            ValueError: If decryption fails
        """
        if not encrypted_text:
            return encrypted_text
            
        try:
            # Split the input into parts
            parts = encrypted_text.split(":")
            if len(parts) != 3:
                raise ValueError(f"Invalid encrypted format. Expected 3 parts, got {len(parts)}")
                
            iv_base64, auth_tag_base64, encrypted_data_base64 = parts
            
            # Decode base64 components
            iv = base64.b64decode(iv_base64)
            auth_tag = base64.b64decode(auth_tag_base64)
            encrypted_data = base64.b64decode(encrypted_data_base64)
            
            # Get the key
            key = EncryptionService.get_encryption_key()
            
            # Create AES-GCM cipher
            cipher = Cipher(
                algorithms.AES(key),
                modes.GCM(iv, auth_tag),
                backend=default_backend()
            )
            
            # Decrypt
            decryptor = cipher.decryptor()
            decrypted_data = decryptor.update(encrypted_data) + decryptor.finalize()
            
            # Return the decrypted string
            return decrypted_data.decode('utf-8')
            
        except Exception as e:
            logger.error(f"Error decrypting data: {str(e)}")
            raise ValueError(f"Failed to decrypt data: {str(e)}")

class SecretsService:
    @staticmethod
    async def get_secret(workspace_id: str, key: str) -> str | None:
        """Get a secret value from the workspace_secret table for the given workspace and key.
        
        The value is automatically decrypted before being returned.
        
        Args:
            workspace_id: The workspace ID
            key: The secret key
            
        Returns:
            The decrypted secret value or None if not found
        """
        try:
            from ..db.connection import db_pool

            # Check if DB pool is available
            if not db_pool:
                logger.error("Database connection pool not available")
                return None
                
            async with db_pool.acquire() as conn:
                result = await conn.fetchval(
                    "SELECT value FROM workspace_secret WHERE workspace_id = $1 AND key = $2",
                    workspace_id, key
                )
                
                # If no result, return None
                if result is None:
                    return None
                
                # Decrypt the value before returning
                try:
                    return EncryptionService.decrypt(result)
                except ValueError as e:
                    logger.error(f"Failed to decrypt secret {key} for workspace {workspace_id}: {str(e)}")
                    return None
                    
        except Exception as e:
            logger.error(f"Error fetching secret {key} for workspace {workspace_id}: {e}")
            return None
    
    @staticmethod
    async def get_anthropic_api_key(workspace_id: str) -> str:
        """Get Anthropic API key for the given workspace.
        
        Args:
            workspace_id: The workspace ID
            
        Returns:
            The Anthropic API key from workspace secrets
            
        Raises:
            ValueError: If no API key is found in workspace secrets
        """
        # Get key from workspace secrets
        api_key = await SecretsService.get_secret(workspace_id, "ANTHROPIC_API_KEY")
        
        # Raise error if not found
        if not api_key:
            raise ValueError("No Anthropic API key found in workspace secrets. Please add your API key in the workspace settings.")
        
        return api_key