import asyncio
import threading
import time
from typing import Any, Dict, Union
import uuid
import json
from codegen.agents.data import BaseMessage
from codegen.agents.loggers import ExternalLogger
from ..config import DATABASE_URL
from ..logging_config import get_logger
import asyncpg

# Get logger for this module
logger = get_logger(__name__)

async def store_agent_run_message(conn, agent_run_id, workspace_id, message, message_type):
    """Store an agent run message in the database"""

    # Sometimes, an individual message can come as a list.
    # If so, we want to store each item in the list as a separate message.
    if isinstance(message, list):
        for item in message:
            await store_agent_run_message(conn, agent_run_id, workspace_id, item, message_type)
        return
    
    # Check if message is already a dict
    if isinstance(message, dict):
       message = json.dumps(message)
    
    message_id = str(uuid.uuid4())
    
    await conn.execute(
        """
        INSERT INTO agent_run_message (
            id, agent_run_id, workspace_id, message, type, 
            created, modified
        ) VALUES (
            $1, $2, $3, $4, $5, NOW(), NOW()
        )
        """,
        message_id, agent_run_id, workspace_id, message, message_type
    )
    return message_id

class AgentRunMessageRecorder(ExternalLogger):
    """Logger that records agent messages to the database"""
    
    def __init__(self, agent_run_id, workspace_id):
        self.agent_run_id = agent_run_id
        self.workspace_id = workspace_id
        # We need to buffer messages in memory because:
        # 1. The CodeAgent expects a synchronous log() method (not async)
        # 2. Database operations in our codebase are async (they use 'await')
        # 3. We can't call async functions directly from synchronous code
        # 
        # However, we want messages to appear in the database in near real-time
        # for user monitoring, so we use a background task to periodically 
        # flush messages to the database while the agent is running.
        self.messages = []  # Buffer for new messages
        self.message_lock = threading.Lock()  # Lock for thread safety
        self.running = True  # Flag to control the background thread
        
        # Start background thread to periodically flush messages
        self.flush_thread = threading.Thread(target=self._background_flush, daemon=True)
        self.flush_thread.start()
        
        super().__init__()
    
    def log(self, data: Union[Dict[str, Any], BaseMessage]) -> None:
        """Buffer a message for later database storage"""
        if hasattr(data, 'content'):
            message = data.content
        else:
            message = str(data)
        
        # Thread-safe add to message buffer
        with self.message_lock:
            self.messages.append(message)
        
        # Also print for debugging
        print(f"AgentRunMessageRecorder captured: {message[:100]}...")
    
    def _background_flush(self):
        """Background thread to periodically flush messages to the database"""
        while self.running:
            # Sleep for a short time between flushes
            time.sleep(2)  # Flush every 2 seconds
            
            # Check if we have messages to flush
            messages_to_flush = []
            logger.info(f"Checking for messages to flush: {len(self.messages)}")
            with self.message_lock:
                if self.messages:
                    # Take all current messages
                    messages_to_flush = self.messages.copy()
                    self.messages = []
            
            if messages_to_flush:
                logger.info(f"Messages to flush: {len(messages_to_flush)}")
                # Create a new event loop for this thread
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                
                try:
                    # Run the flush task
                    loop.run_until_complete(self._flush_messages(messages_to_flush))
                except Exception as e:
                    logger.error(f"Background flush error: {str(e)}")
                    # Put messages back in queue if flush failed
                    with self.message_lock:
                        self.messages = messages_to_flush + self.messages
                finally:
                    loop.close()
    
    async def _flush_messages(self, messages):
        """Flush a batch of messages to the database"""
        logger.info(f"Flushing messages: {len(messages)}")
        if not messages:
            return
            
        # Create a dedicated connection for this thread
        conn = None
        try:
            # Check if DATABASE_URL is configured
            if not DATABASE_URL:
                logger.error("DATABASE_URL not configured. Cannot connect to database.")
                raise Exception("DATABASE_URL not configured")
                
            # Create a new connection directly, not using the shared pool
            # This is because we're in a different thread than the main one
            # and we don't want to use the shared pool.
            logger.info(f"Creating new database connection for thread...")
            conn = await asyncpg.connect(DATABASE_URL)
            logger.info(f"Successfully created database connection")
            
            # Process each message
            for message in messages:
                logger.info(f"Storing message: {message[:50]}...")
                try:
                    await store_agent_run_message(
                        conn, 
                        self.agent_run_id, 
                        self.workspace_id, 
                        message, 
                        "agent_log"
                    )
                    logger.info(f"Stored message in database: {message[:50]}...")
                except Exception as e:
                    logger.error(f"Failed to store agent message: {str(e)}")
        except Exception as e:
            logger.error(f"Error connecting to database: {str(e)}")
            # Re-raise to be caught by the calling function
            raise
        finally:
            # Close connection when done
            if conn:
                logger.info("Closing thread database connection")
                await conn.close()
    
    async def save_remaining_messages(self, conn):
        """Save any remaining messages that haven't been flushed yet"""
        # Get any remaining messages
        with self.message_lock:
            messages_to_flush = self.messages.copy()
            self.messages = []
            
        # Stop the background thread
        self.running = False
            
        # Flush remaining messages
        for message in messages_to_flush:
            try:
                await store_agent_run_message(
                    conn, 
                    self.agent_run_id, 
                    self.workspace_id, 
                    message, 
                    "agent_log"
                )
                logger.info(f"Stored remaining message in database: {message[:50]}...")
            except Exception as e:
                logger.error(f"Failed to store agent message: {str(e)}")
                
        # Wait for background thread to finish
        if self.flush_thread.is_alive():
            self.flush_thread.join(timeout=2)