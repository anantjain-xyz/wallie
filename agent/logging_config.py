import logging
import os
import sys

def configure_logging():
    """
    Configure logging for the entire application.
    
    This sets up a consistent logging format and ensures logs are directed
    to the appropriate outputs.
    """
    # Get log level from environment variable, default to INFO
    log_level_name = os.environ.get('LOG_LEVEL', 'INFO')
    log_level = getattr(logging, log_level_name, logging.INFO)
    
    # Create a formatter for consistent log message format
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    
    # Remove any existing handlers to avoid duplicate logs
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
    
    # Add console handler to output logs to stdout
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)
    
    # Optionally add file handler if LOG_FILE environment variable is set
    log_file = os.environ.get('LOG_FILE')
    if log_file:
        file_handler = logging.FileHandler(log_file)
        file_handler.setFormatter(formatter)
        root_logger.addHandler(file_handler)
    
    # Set third-party loggers to a higher level to reduce noise
    logging.getLogger('asyncio').setLevel(logging.WARNING)
    logging.getLogger('aiohttp').setLevel(logging.WARNING)
    
    logging.info(f"Logging configured with level: {log_level_name}")
    
    return root_logger

# Create a function to get a logger for a specific module
def get_logger(name):
    """
    Get a logger for a specific module.
    
    Args:
        name: Usually __name__ of the calling module
        
    Returns:
        A configured logger instance
    """
    return logging.getLogger(name) 