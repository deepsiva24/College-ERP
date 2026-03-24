import os
import base64
import json
from cryptography.hazmat.primitives import padding
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
from config import settings

# Shared key must be exactly 32 bytes for AES-256
_KEY = base64.b64decode(settings.SYMMETRIC_KEY)

def encrypt_payload(data: dict) -> str:
    """Encrypt a dictionary into a base64 encoded string with random IV prepended."""
    raw_data = json.dumps(data).encode('utf-8')
    
    # Pad to block size (128 bits / 16 bytes for AES)
    padder = padding.PKCS7(128).padder()
    padded_data = padder.update(raw_data) + padder.finalize()
    
    # Generate random IV
    iv = os.urandom(16)
    
    # Encrypt
    cipher = Cipher(algorithms.AES(_KEY), modes.CBC(iv), backend=default_backend())
    encryptor = cipher.encryptor()
    ciphertext = encryptor.update(padded_data) + encryptor.finalize()
    
    # Return iv + ciphertext encoded as base64
    return base64.b64encode(iv + ciphertext).decode('utf-8')

def decrypt_payload(encrypted_str: str) -> dict:
    """Decrypt a base64 string (with prepended IV) into a dictionary."""
    try:
        raw_bytes = base64.b64decode(encrypted_str)
        if len(raw_bytes) < 16:
            raise ValueError("Encrypted data too short")
        
        iv = raw_bytes[:16]
        ciphertext = raw_bytes[16:]
        
        # Decrypt
        cipher = Cipher(algorithms.AES(_KEY), modes.CBC(iv), backend=default_backend())
        decryptor = cipher.decryptor()
        padded_data = decryptor.update(ciphertext) + decryptor.finalize()
        
        # Unpad
        unpadder = padding.PKCS7(128).unpadder()
        raw_data = unpadder.update(padded_data) + unpadder.finalize()
        
        return json.loads(raw_data.decode('utf-8'))
    except Exception as e:
        # For security reasons, don't expose error details in production
        print(f"Decryption failed: {e}")
        raise ValueError("Decryption failed")
