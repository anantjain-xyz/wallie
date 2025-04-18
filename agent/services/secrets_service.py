import os
import base64
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from ..logging_config import get_logger
from ..db.connection import db_pool

# Get logger for this module
logger = get_logger(__name__)

class EncryptionService:
    """Handles encryption and decryption of sensitive data"""
    
    # Environment variable for the encryption key
    ENCRYPTION_KEY_ENV = "WALLIE_ENCRYPTION_KEY"
    
    # Static salt for key derivation - this doesn't need to be secret, but should be consistent
    SALT = b"wallie_secrets_salt"
    
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
        )
        
        # Derive the key and return it
        key = base64.urlsafe_b64encode(kdf.derive(secret_bytes))
        return key
    
    @staticmethod
    def encrypt(plaintext: str) -> str:
        """Encrypt a string value.
        
        Args:
            plaintext: The string to encrypt
            
        Returns:
            str: Base64-encoded encrypted value
            
        Raises:
            ValueError: If encryption key is not set
        """
        if not plaintext:
            return plaintext
            
        try:
            key = EncryptionService.get_encryption_key()
            f = Fernet(key)
            encrypted_data = f.encrypt(plaintext.encode())
            return base64.b64encode(encrypted_data).decode()
        except Exception as e:
            logger.error(f"Error encrypting data: {str(e)}")
            raise ValueError(f"Failed to encrypt data: {str(e)}")
    
    @staticmethod
    def decrypt(encrypted_text: str) -> str:
        """Decrypt an encrypted string value.
        
        Args:
            encrypted_text: Base64-encoded encrypted value
            
        Returns:
            str: Decrypted string
            
        Raises:
            ValueError: If decryption fails
        """
        if not encrypted_text:
            return encrypted_text
            
        try:
            key = EncryptionService.get_encryption_key()
            f = Fernet(key)
            encrypted_data = base64.b64decode(encrypted_text)
            decrypted_data = f.decrypt(encrypted_data)
            return decrypted_data.decode()
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
            # Use the shared db_pool
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
    async def set_secret(workspace_id: str, key: str, value: str) -> bool:
        """Set a secret value in the workspace_secret table.
        
        The value is automatically encrypted before being stored.
        
        Args:
            workspace_id: The workspace ID
            key: The secret key
            value: The secret value to store (plaintext)
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            # Use the shared db_pool
            if not db_pool:
                logger.error("Database connection pool not available")
                return False
                
            # Encrypt the value before storing
            encrypted_value = EncryptionService.encrypt(value)
            
            async with db_pool.acquire() as conn:
                # Use a UUID as ID
                from uuid import uuid4
                secret_id = str(uuid4())
                
                await conn.execute(
                    """
                    INSERT INTO workspace_secret (id, workspace_id, key, value, created, modified)
                    VALUES ($1, $2, $3, $4, NOW(), NOW())
                    ON CONFLICT (key, workspace_id) DO UPDATE
                    SET value = $4, modified = NOW()
                    """,
                    secret_id, workspace_id, key, encrypted_value
                )
                return True
                
        except Exception as e:
            logger.error(f"Error setting secret {key} for workspace {workspace_id}: {e}")
            return False
    
    @staticmethod
    async def delete_secret(workspace_id: str, key: str) -> bool:
        """Delete a secret from the workspace_secret table.
        
        Args:
            workspace_id: The workspace ID
            key: The secret key
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            # Use the shared db_pool
            if not db_pool:
                logger.error("Database connection pool not available")
                return False
                
            async with db_pool.acquire() as conn:
                result = await conn.execute(
                    "DELETE FROM workspace_secret WHERE workspace_id = $1 AND key = $2",
                    workspace_id, key
                )
                return result == "DELETE 1"
                
        except Exception as e:
            logger.error(f"Error deleting secret {key} for workspace {workspace_id}: {e}")
            return False
    
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