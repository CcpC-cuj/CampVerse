from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from PIL import Image, ImageDraw, ImageFont
import os
import shutil
import uuid
from datetime import datetime
import io
import json
import requests
import zipfile
import base64
import gradio as gr
from ui import demo

app = FastAPI(
    title="Certificate Generator API",
    version="1.0.0",
    description="API for generating customized certificates with logos, signatures, and text"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Gradio UI
app = gr.mount_gradio_app(app, demo, path="/ui")

# Health check endpoint
@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint for container orchestration"""
    return {
        "status": "healthy",
        "service": "ML Certificate Generator",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/", tags=["Health"])
async def root():
    """Root endpoint"""
    return {
        "message": "ML Certificate Generator API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }

# Directories
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
OUTPUT_DIR = os.path.join(BASE_DIR, "generated_certificates")
TEMPLATES_DIR = os.path.join(BASE_DIR, "templates")
FONTS_DIR = os.path.join(BASE_DIR, "fonts")
CONFIG_FILE = os.path.join(BASE_DIR, "config.json")

# Create directories
for directory in [UPLOAD_DIR, OUTPUT_DIR, TEMPLATES_DIR, FONTS_DIR]:
    os.makedirs(directory, exist_ok=True)

# ============================================================================
# DEFAULT CONFIGURATION - Used if user doesn't provide custom settings
# ============================================================================
DEFAULT_CONFIG = {
    "certificate_type": "participation",  # 'participation' or 'achievement'
    "name_settings": {
        "position": {"x": 810, "y": 596},
        "font_path": "DancingScript-Regular.ttf",
        "font_size": 85,
        "color": "black"
    },
    "award_text_settings": {
        "text": "For outstanding participation in the CSI Workshop 2025",
        "position": {"x": 810, "y": 720},
        "font_path": "times.ttf",
        "font_size": 45,
        "color": "black",
        "max_width": 1000
    },
    "left_logo": {
        "filename": "logo_left.png",
        "position": {"x": 200, "y": 170},
        "max_fraction": 0.18
    },
    "right_logo": {
        "filename": "logo_right.png",
        "position": {"x": 1500, "y": 170},
        "max_fraction": 0.18
    },
    "left_signatory": {
        "filename": "signature_left.png",
        "name": "Dr. John Doe",
        "title": "Director, CSI Chapter",
        "image_position": {"x": 400, "y": 1100},
        "text_position": {"x": 400, "y": 1200},
        "font_size": 35,
        "color": "black"
    },
    "right_signatory": {
        "filename": "signature_right.png",
        "name": "Prof. Jane Smith",
        "title": "Head of Department",
        "image_position": {"x": 1200, "y": 1100},
        "text_position": {"x": 1200, "y": 1200},
        "font_size": 35,
        "color": "black"
    },
    "signature_max_size": {
        "width": 300,
        "height": 150
    }
}

# Load or create config
def load_config():
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, 'r') as f:
            return json.load(f)
    else:
        save_config(DEFAULT_CONFIG)
        return DEFAULT_CONFIG.copy()

def save_config(config):
    with open(CONFIG_FILE, 'w') as f:
        json.dump(config, f, indent=2)

# Models
class Position(BaseModel):
    x: int = Field(..., description="X coordinate in pixels")
    y: int = Field(..., description="Y coordinate in pixels")

class NameSettings(BaseModel):
    position: Position = Field(..., description="Position where recipient name will be placed")
    font_path: str = Field(default="DancingScript-Regular.ttf", description="Font file name (must be uploaded to /fonts directory)")
    font_size: int = Field(default=85, description="Font size for the name")
    color: str = Field(default="black", description="Text color (e.g., 'black', '#000000', 'rgb(0,0,0)')")

class AwardTextSettings(BaseModel):
    text: str = Field(..., description="Text describing what the certificate is awarded for")
    position: Position = Field(..., description="Position where award text will be placed")
    font_path: str = Field(default="DancingScript-Regular.ttf", description="Font file name")
    font_size: int = Field(default=45, description="Font size for award text")
    color: str = Field(default="black", description="Text color")
    max_width: int = Field(default=1000, description="Maximum width before text wraps to next line")

class LogoSettings(BaseModel):
    filename: str = Field(..., description="Logo filename (must be uploaded via /upload-logo endpoint)")
    position: Position = Field(..., description="Position where logo will be placed")
    max_fraction: float = Field(default=0.18, description="Maximum size as fraction of template size (0.0 to 1.0)")

class SignatorySettings(BaseModel):
    filename: str = Field(..., description="Signature image filename (must be uploaded via /upload-signature endpoint)")
    name: str = Field(..., description="Name of the signatory (e.g., 'Dr. John Doe')")
    title: str = Field(..., description="Title/position of signatory (e.g., 'Director, CSI Chapter')")
    image_position: Position = Field(..., description="Position where signature image will be placed")
    text_position: Position = Field(..., description="Position where signatory name/title text will be placed")
    font_size: int = Field(default=35, description="Font size for signatory name/title")
    color: str = Field(default="black", description="Text color for signatory name/title")

class GenerateRequest(BaseModel):
    names: List[str] = Field(..., description="List of recipient names to generate certificates for")

class ParticipantInfo(BaseModel):
    userId: str = Field(..., description="User ID of the participant")
    name: str = Field(..., description="Name of the participant")
    email: str = Field(..., description="Email of the participant")

class SignatoryInfo(BaseModel):
    url: str = Field(..., description="Cloud storage URL of signature image")
    name: str = Field(..., description="Name of the signatory")
    title: str = Field(..., description="Title of the signatory")

class BatchGenerateRequest(BaseModel):
    eventId: str = Field(..., description="Event ID for which certificates are being generated")
    eventTitle: str = Field(..., description="Title of the event")
    templateUrl: str = Field(..., description="Cloud storage URL of certificate template")
    orgLogoUrl: str = Field(..., description="Cloud storage URL of organization logo")
    leftSignature: SignatoryInfo = Field(..., description="Left signature details")
    rightSignature: SignatoryInfo = Field(..., description="Right signature details")
    awardText: str = Field(..., description="Award text to display on certificate")
    certificateType: str = Field(..., description="Type of certificate (participation/achievement)")
    participants: List[ParticipantInfo] = Field(..., description="List of participants to generate certificates for")

class BackendCertificateRequest(BaseModel):
    userName: str
    userEmail: str
    eventTitle: str
    templateUrl: Optional[str] = None # Direct URL to template in cloud
    logoUrl: Optional[str] = None     # Host logo URL
    leftSignatureUrl: Optional[str] = None
    rightSignatureUrl: Optional[str] = None
    leftSignatoryName: Optional[str] = None
    leftSignatoryTitle: Optional[str] = None
    rightSignatoryName: Optional[str] = None
    rightSignatoryTitle: Optional[str] = None
    awardText: Optional[str] = "{name} has successfully participated in {event_name}"
    certificateType: str = "participant"
    qrCode: Optional[str] = None # Base64 QR code

# Helper functions
def load_font(font_name: str, size: int):
    """Load a font with fallback to default"""
    font_path = os.path.join(FONTS_DIR, font_name)
    try:
        if os.path.exists(font_path):
            return ImageFont.truetype(font_path, size)
        else:
            # Try system font
            return ImageFont.truetype(font_name, size)
    except Exception:
        print(f"Warning: Could not load font '{font_name}', using default")
        return ImageFont.load_default()

def add_logo(certificate, logo_filename: str, position: dict, max_fraction: float):
    """Add a logo to the certificate"""
    logo_path = os.path.join(UPLOAD_DIR, logo_filename)
    try:
        if os.path.exists(logo_path):
            logo = Image.open(logo_path).convert("RGBA")
            
            max_logo_width = int(certificate.width * max_fraction)
            max_logo_height = int(certificate.height * max_fraction)
            
            lw, lh = logo.size
            scale = min(max_logo_width / lw if lw else 1.0,
                       max_logo_height / lh if lh else 1.0,
                       1.0)
            new_size = (max(1, int(lw * scale)), max(1, int(lh * scale)))
            if new_size != logo.size:
                logo = logo.resize(new_size, Image.LANCZOS)
            
            pos_x = max(0, min(position['x'], certificate.width - logo.width))
            pos_y = max(0, min(position['y'], certificate.height - logo.height))
            
            certificate.paste(logo, (pos_x, pos_y), logo)
            print(f"Added logo '{logo_filename}' at ({pos_x}, {pos_y})")
    except Exception as e:
        print(f"Warning: could not add logo '{logo_filename}' ({e})")

def add_signature(certificate, sig_config: dict, font, draw, max_width: int = 300, max_height: int = 150):
    """Add signature image and text to certificate (legacy config-based)"""
    sig_path = os.path.join(UPLOAD_DIR, sig_config['filename'])
    try:
        if os.path.exists(sig_path):
            sig_image = Image.open(sig_path).convert("RGBA")
            
            sw, sh = sig_image.size
            scale = min(max_width / sw if sw else 1.0,
                       max_height / sh if sh else 1.0,
                       1.0)
            new_size = (max(1, int(sw * scale)), max(1, int(sh * scale)))
            if new_size != sig_image.size:
                sig_image = sig_image.resize(new_size, Image.LANCZOS)
            
            pos_x = max(0, min(sig_config['image_position']['x'], certificate.width - sig_image.width))
            pos_y = max(0, min(sig_config['image_position']['y'], certificate.height - sig_image.height))
            
            certificate.paste(sig_image, (pos_x, pos_y), sig_image)
            
            # Add name and title
            text_x = sig_config['text_position']['x']
            text_y = sig_config['text_position']['y']
            draw.text((text_x, text_y), sig_config['name'], fill=sig_config['color'], font=font)
            draw.text((text_x, text_y + 40), sig_config['title'], fill=sig_config['color'], font=font)
            
            print(f"Added signature '{sig_config['filename']}' at ({pos_x}, {pos_y})")
    except Exception as e:
        print(f"Warning: could not add signature '{sig_config['filename']}' ({e})")

def add_signature_from_path(certificate, sig_path: str, image_pos: dict, 
                            sig_name: str, sig_title: str, text_pos: dict,
                            font, color: str, draw, max_width: int = 300, max_height: int = 150):
    """Add signature image and text to certificate from a downloaded file path."""
    try:
        if os.path.exists(sig_path):
            sig_image = Image.open(sig_path).convert("RGBA")
            
            sw, sh = sig_image.size
            scale = min(max_width / sw if sw else 1.0,
                       max_height / sh if sh else 1.0,
                       1.0)
            new_size = (max(1, int(sw * scale)), max(1, int(sh * scale)))
            if new_size != sig_image.size:
                sig_image = sig_image.resize(new_size, Image.LANCZOS)
            
            pos_x = max(0, min(image_pos['x'], certificate.width - sig_image.width))
            pos_y = max(0, min(image_pos['y'], certificate.height - sig_image.height))
            
            certificate.paste(sig_image, (pos_x, pos_y), sig_image)
            
            # Add name and title
            draw.text((text_pos['x'], text_pos['y']), sig_name, fill=color, font=font)
            draw.text((text_pos['x'], text_pos['y'] + 40), sig_title, fill=color, font=font)
            
            print(f"Added signature at ({pos_x}, {pos_y})")
    except Exception as e:
        print(f"Warning: could not add signature from {sig_path}: {e}")

def wrap_text(text: str, font, max_width: int):
    """Wrap text to fit within max_width"""
    words = text.split()
    lines = []
    current_line = []
    
    for word in words:
        test_line = ' '.join(current_line + [word])
        bbox = font.getbbox(test_line)
        width = bbox[2] - bbox[0]
        
        if width <= max_width:
            current_line.append(word)
        else:
            if current_line:
                lines.append(' '.join(current_line))
            current_line = [word]
    
    if current_line:
        lines.append(' '.join(current_line))
    
    return lines

# API Endpoints

@app.get("/", tags=["Info"])
async def root():
    """
    API documentation and available endpoints
    """
    return {
        "message": "Certificate Generator API",
        "version": "1.0.0",
        "description": "Generate professional certificates with custom logos, signatures, and text",
        "workflow": {
            "1": "Upload certificate templates (participation/achievement) via POST /upload-template",
            "2": "Upload logos (left/right) via POST /upload-logo",
            "3": "Upload signature images (left/right) via POST /upload-signature",
            "4": "Upload custom fonts (optional) via POST /upload-font",
            "5": "Configure settings via POST /config/* endpoints (optional - defaults provided)",
            "6": "Generate certificates via POST /generate",
            "7": "Download certificates via GET /download/{filename}"
        },
        "endpoints": {
            "GET /": "This help page",
            "GET /config": "Get current configuration",
            "GET /config/defaults": "Get default configuration",
            "POST /config/certificate-type": "Set certificate type",
            "POST /config/name-settings": "Configure name placement and styling",
            "POST /config/award-text": "Configure award text",
            "POST /config/logo-left": "Configure left logo",
            "POST /config/logo-right": "Configure right logo",
            "POST /config/signatory-left": "Configure left signatory",
            "POST /config/signatory-right": "Configure right signatory",
            "POST /config/reset": "Reset to default configuration",
            "POST /upload-template": "Upload certificate template",
            "POST /upload-logo": "Upload logo image",
            "POST /upload-signature": "Upload signature image",
            "POST /upload-font": "Upload font file",
            "POST /generate": "Generate certificates",
            "GET /download/{filename}": "Download generated certificate",
            "GET /files": "List uploaded files",
            "DELETE /clear-generated": "Clear generated certificates"
        },
        "note": "Visit /docs for interactive API documentation"
    }

# Configuration Endpoints

@app.get("/config", tags=["Configuration"])
async def get_config():
    """
    Get current configuration settings
    """
    config = load_config()
    return {
        "current_config": config,
        "note": "Use POST /config/* endpoints to update individual settings"
    }

@app.get("/config/defaults", tags=["Configuration"])
async def get_defaults():
    """
    Get default configuration values
    """
    return {
        "default_config": DEFAULT_CONFIG,
        "note": "These are the default values used when no custom configuration is provided"
    }

@app.post("/config/certificate-type", tags=["Configuration"])
async def set_certificate_type(
    certificate_type: str = Form(..., description="Certificate type: 'participation' or 'achievement'")
):
    """
    Set the certificate type to use for generation.
    
    **Options:**
    - `participation`: Use the participation certificate template
    - `achievement`: Use the achievement certificate template
    
    **Note:** The corresponding template file must be uploaded first via /upload-template
    """
    if certificate_type not in ['participation', 'achievement']:
        raise HTTPException(400, "certificate_type must be 'participation' or 'achievement'")
    
    config = load_config()
    config['certificate_type'] = certificate_type
    save_config(config)
    
    return {
        "message": f"Certificate type set to '{certificate_type}'",
        "current_type": certificate_type
    }

@app.post("/config/name-settings", tags=["Configuration"])
async def set_name_settings(settings: NameSettings):
    """
    Configure how recipient names appear on certificates.
    
    **Parameters:**
    - `position`: X and Y coordinates where the name will be placed
    - `font_path`: Font filename (default: DancingScript-Regular.ttf)
    - `font_size`: Size of the name text (default: 85)
    - `color`: Color of the text (default: black)
    
    **Example:**
    ```json
    {
        "position": {"x": 810, "y": 596},
        "font_path": "DancingScript-Regular.ttf",
        "font_size": 85,
        "color": "black"
    }
    ```
    """
    config = load_config()
    config['name_settings'] = settings.dict()
    save_config(config)
    
    return {
        "message": "Name settings updated successfully",
        "settings": settings.dict()
    }

@app.post("/config/award-text", tags=["Configuration"])
async def set_award_text(settings: AwardTextSettings):
    """
    Configure the award text that appears below the recipient's name.
    
    **Parameters:**
    - `text`: The award description text
    - `position`: X and Y coordinates where text will be placed
    - `font_path`: Font filename (default: DancingScript-Regular.ttf)
    - `font_size`: Size of the text (default: 45)
    - `color`: Color of the text (default: black)
    - `max_width`: Maximum width before text wraps (default: 1000)
    
    **Example:**
    ```json
    {
        "text": "For outstanding participation in the CSI Workshop 2025",
        "position": {"x": 810, "y": 720},
        "font_size": 45,
        "max_width": 1000
    }
    ```
    """
    config = load_config()
    config['award_text_settings'] = settings.dict()
    save_config(config)
    
    return {
        "message": "Award text settings updated successfully",
        "settings": settings.dict()
    }

@app.post("/config/logo-left", tags=["Configuration"])
async def set_left_logo(settings: LogoSettings):
    """
    Configure the left logo placement and size.
    
    **Parameters:**
    - `filename`: Logo filename (must be uploaded via /upload-logo first)
    - `position`: X and Y coordinates where logo will be placed
    - `max_fraction`: Maximum size as fraction of template (0.0 to 1.0, default: 0.18)
    
    **Example:**
    ```json
    {
        "filename": "logo_left.png",
        "position": {"x": 200, "y": 170},
        "max_fraction": 0.18
    }
    ```
    """
    config = load_config()
    config['left_logo'] = settings.dict()
    save_config(config)
    
    return {
        "message": "Left logo settings updated successfully",
        "settings": settings.dict()
    }

@app.post("/config/logo-right", tags=["Configuration"])
async def set_right_logo(settings: LogoSettings):
    """
    Configure the right logo placement and size.
    
    **Parameters:**
    - `filename`: Logo filename (must be uploaded via /upload-logo first)
    - `position`: X and Y coordinates where logo will be placed
    - `max_fraction`: Maximum size as fraction of template (0.0 to 1.0, default: 0.18)
    
    **Example:**
    ```json
    {
        "filename": "logo_right.png",
        "position": {"x": 1500, "y": 170},
        "max_fraction": 0.18
    }
    ```
    """
    config = load_config()
    config['right_logo'] = settings.dict()
    save_config(config)
    
    return {
        "message": "Right logo settings updated successfully",
        "settings": settings.dict()
    }

@app.post("/config/signatory-left", tags=["Configuration"])
async def set_left_signatory(settings: SignatorySettings):
    """
    Configure the left signatory (signature image, name, and title).
    
    **Parameters:**
    - `filename`: Signature image filename (must be uploaded via /upload-signature first)
    - `name`: Signatory's name (e.g., "Dr. John Doe")
    - `title`: Signatory's title (e.g., "Director, CSI Chapter")
    - `image_position`: X and Y coordinates for signature image
    - `text_position`: X and Y coordinates for name/title text
    - `font_size`: Size of name/title text (default: 35)
    - `color`: Color of name/title text (default: black)
    
    **Example:**
    ```json
    {
        "filename": "signature_left.png",
        "name": "Dr. John Doe",
        "title": "Director, CSI Chapter",
        "image_position": {"x": 400, "y": 1100},
        "text_position": {"x": 400, "y": 1200}
    }
    ```
    """
    config = load_config()
    config['left_signatory'] = settings.dict()
    save_config(config)
    
    return {
        "message": "Left signatory settings updated successfully",
        "settings": settings.dict()
    }

@app.post("/config/signatory-right", tags=["Configuration"])
async def set_right_signatory(settings: SignatorySettings):
    """
    Configure the right signatory (signature image, name, and title).
    
    **Parameters:**
    - `filename`: Signature image filename (must be uploaded via /upload-signature first)
    - `name`: Signatory's name (e.g., "Prof. Jane Smith")
    - `title`: Signatory's title (e.g., "Head of Department")
    - `image_position`: X and Y coordinates for signature image
    - `text_position`: X and Y coordinates for name/title text
    - `font_size`: Size of name/title text (default: 35)
    - `color`: Color of name/title text (default: black)
    
    **Example:**
    ```json
    {
        "filename": "signature_right.png",
        "name": "Prof. Jane Smith",
        "title": "Head of Department",
        "image_position": {"x": 1200, "y": 1100},
        "text_position": {"x": 1200, "y": 1200}
    }
    ```
    """
    config = load_config()
    config['right_signatory'] = settings.dict()
    save_config(config)
    
    return {
        "message": "Right signatory settings updated successfully",
        "settings": settings.dict()
    }

@app.post("/config/reset", tags=["Configuration"])
async def reset_config():
    """
    Reset all configuration to default values
    """
    save_config(DEFAULT_CONFIG)
    return {
        "message": "Configuration reset to defaults",
        "config": DEFAULT_CONFIG
    }

# Upload Endpoints

@app.post("/upload-template", tags=["Uploads"])
async def upload_template(
    file: UploadFile = File(..., description="Certificate template image (PNG/JPEG)"),
    template_type: str = Form(..., description="Template type: 'participation' or 'achievement'")
):
    """
    Upload a certificate template image.
    
    **Requirements:**
    - File format: PNG or JPEG
    - Template type must be either 'participation' or 'achievement'
    - Recommended resolution: 2000x1500 pixels or higher
    
    **Instructions:**
    1. Prepare your certificate template as a PNG or JPEG
    2. Ensure the template has space for:
       - Recipient name (typically center)
       - Award text below the name
       - Two logos (left and right corners)
       - Two signatures at the bottom
    3. Upload the file and specify the type
    
    **Note:** You need to upload both participation and achievement templates if you plan to use both types.
    """
    if template_type not in ['participation', 'achievement']:
        raise HTTPException(400, "template_type must be 'participation' or 'achievement'")
    
    if not file.filename.lower().endswith(('.png', '.jpg', '.jpeg')):
        raise HTTPException(400, "Only PNG and JPEG images are allowed")
    
    filename = f"template_{template_type}.png"
    file_path = os.path.join(TEMPLATES_DIR, filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    return {
        "message": f"Template uploaded successfully",
        "filename": filename,
        "type": template_type,
        "path": f"/templates/{filename}"
    }

@app.post("/upload-logo", tags=["Uploads"])
async def upload_logo(
    file: UploadFile = File(..., description="Logo image (PNG recommended for transparency)"),
    logo_type: str = Form(..., description="Logo position: 'left' or 'right'")
):
    """
    Upload a logo image for left or right position.
    
    **Requirements:**
    - File format: PNG (recommended for transparency), JPEG, or JPG
    - Logo type must be either 'left' or 'right'
    - Recommended: PNG with transparent background
    - Recommended size: 200x200 pixels to 400x400 pixels
    
    **Instructions:**
    1. Prepare your logo as a PNG with transparent background
    2. Specify whether it's for 'left' or 'right' position
    3. Upload the file
    
    **Note:** The logo will be automatically resized based on the max_fraction setting (default 18% of template size).
    """
    if logo_type not in ['left', 'right']:
        raise HTTPException(400, "logo_type must be 'left' or 'right'")
    
    if not file.filename.lower().endswith(('.png', '.jpg', '.jpeg')):
        raise HTTPException(400, "Only PNG and JPEG images are allowed")
    
    filename = f"logo_{logo_type}.png"
    file_path = os.path.join(UPLOAD_DIR, filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    return {
        "message": f"{logo_type.capitalize()} logo uploaded successfully",
        "filename": filename,
        "type": logo_type,
        "note": f"Configure position via POST /config/logo-{logo_type}"
    }

@app.post("/upload-signature", tags=["Uploads"])
async def upload_signature(
    file: UploadFile = File(..., description="Signature image (PNG recommended)"),
    signature_type: str = Form(..., description="Signature position: 'left' or 'right'")
):
    """
    Upload a signature image for left or right signatory.
    
    **Requirements:**
    - File format: PNG (recommended for transparency), JPEG, or JPG
    - Signature type must be either 'left' or 'right'
    - Recommended: PNG with transparent background
    - Recommended size: 300x150 pixels
    
    **Instructions:**
    1. Scan or create a digital signature image
    2. Save as PNG with transparent background (white background also works)
    3. Specify whether it's for 'left' or 'right' signatory
    4. Upload the file
    
    **Note:** 
    - The signature will be automatically resized to fit within 300x150 pixels
    - Configure signatory name and title via POST /config/signatory-left or /config/signatory-right
    """
    if signature_type not in ['left', 'right']:
        raise HTTPException(400, "signature_type must be 'left' or 'right'")
    
    if not file.filename.lower().endswith(('.png', '.jpg', '.jpeg')):
        raise HTTPException(400, "Only PNG and JPEG images are allowed")
    
    filename = f"signature_{signature_type}.png"
    file_path = os.path.join(UPLOAD_DIR, filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    return {
        "message": f"{signature_type.capitalize()} signature uploaded successfully",
        "filename": filename,
        "type": signature_type,
        "note": f"Configure signatory details via POST /config/signatory-{signature_type}"
    }

@app.post("/upload-font", tags=["Uploads"])
async def upload_font(
    file: UploadFile = File(..., description="Font file (TTF format)")
):
    """
    Upload a custom font file (optional - default font provided).
    
    **Requirements:**
    - File format: TTF (TrueType Font)
    - Font must support the characters you plan to use
    
    **Instructions:**
    1. Download a TTF font file (e.g., from Google Fonts)
    2. Upload the file
    3. Use the filename in configuration endpoints (e.g., "YourFont.ttf")
    
    **Default Font:**
    - DancingScript-Regular.ttf is provided by default
    - You can use custom fonts for name, award text, and signatory text
    
    **Note:** After uploading, reference the font by its filename in the configuration.
    """
    if not file.filename.lower().endswith('.ttf'):
        raise HTTPException(400, "Only TTF font files are allowed")
    
    file_path = os.path.join(FONTS_DIR, file.filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    return {
        "message": "Font uploaded successfully",
        "filename": file.filename,
        "usage": f"Reference this font as '{file.filename}' in configuration endpoints"
    }

# Generation Endpoint

@app.post("/generate", tags=["Generation"])
async def generate_certificates(request: GenerateRequest):
    """
    Generate certificates for a list of recipients using current configuration.
    
    **Requirements:**
    1. Certificate template must be uploaded (matching current certificate_type)
    2. Both logos must be uploaded (left and right)
    3. Both signatures must be uploaded (left and right)
    4. Configuration should be set (or defaults will be used)
    
    **Request Body:**
    ```json
    {
        "names": ["John Doe", "Jane Smith", "Om Vishesh"]
    }
    ```
    
    **Process:**
    1. Loads the current configuration (or uses defaults)
    2. Loads the appropriate certificate template
    3. For each name:
       - Adds the recipient name
       - Adds the award text
       - Adds both logos
       - Adds both signatures with names/titles
    4. Saves as PDF files
    
    **Returns:**
    - List of generated filenames
    - Download URLs for each certificate
    
    **Example Response:**
    ```json
    {
        "message": "Successfully generated 3 certificate(s)",
        "files": ["John_Doe_20250125_143022.pdf", ...],
        "download_urls": ["/download/John_Doe_20250125_143022.pdf", ...]
    }
    ```
    """
    config = load_config()
    
    # Validate template exists
    template_file = f"template_{config['certificate_type']}.png"
    template_path = os.path.join(TEMPLATES_DIR, template_file)
    
    if not os.path.exists(template_path):
        raise HTTPException(
            404, 
            f"Template not found: {template_file}. Please upload it via POST /upload-template"
        )
    
    # Check required files
    required_files = [
        (config['left_logo']['filename'], "Left logo", "/upload-logo"),
        (config['right_logo']['filename'], "Right logo", "/upload-logo"),
        (config['left_signatory']['filename'], "Left signature", "/upload-signature"),
        (config['right_signatory']['filename'], "Right signature", "/upload-signature")
    ]
    
    for filename, description, endpoint in required_files:
        if not os.path.exists(os.path.join(UPLOAD_DIR, filename)):
            raise HTTPException(
                404, 
                f"{description} not found (expected: {filename}). Please upload it via POST {endpoint}"
            )
    
    generated_files = []
    
    try:
        for name in request.names:
            # Load template
            certificate = Image.open(template_path).copy()
            draw = ImageDraw.Draw(certificate)
            
            # Load fonts
            name_font = load_font(
                config['name_settings']['font_path'],
                config['name_settings']['font_size']
            )
            award_font = load_font(
                config['award_text_settings']['font_path'],
                config['award_text_settings']['font_size']
            )
            sig_font = load_font(
                config['award_text_settings']['font_path'],
                config['left_signatory']['font_size']
            )
            
            # Add name
            draw.text(
                (config['name_settings']['position']['x'], config['name_settings']['position']['y']),
                name,
                fill=config['name_settings']['color'],
                font=name_font
            )
            
            # Add award text with wrapping
            award_lines = wrap_text(
                config['award_text_settings']['text'],
                award_font,
                config['award_text_settings']['max_width']
            )
            y_offset = 0
            for line in award_lines:
                draw.text(
                    (config['award_text_settings']['position']['x'], 
                     config['award_text_settings']['position']['y'] + y_offset),
                    line,
                    fill=config['award_text_settings']['color'],
                    font=award_font
                )
                y_offset += config['award_text_settings']['font_size'] + 10
            
            # Add logos
            add_logo(
                certificate,
                config['left_logo']['filename'],
                config['left_logo']['position'],
                config['left_logo']['max_fraction']
            )
            add_logo(
                certificate,
                config['right_logo']['filename'],
                config['right_logo']['position'],
                config['right_logo']['max_fraction']
            )
            
            # Add signatures
            add_signature(
                certificate,
                config['left_signatory'],
                sig_font,
                draw,
                config['signature_max_size']['width'],
                config['signature_max_size']['height']
            )
            add_signature(
                certificate,
                config['right_signatory'],
                sig_font,
                draw,
                config['signature_max_size']['width'],
                config['signature_max_size']['height']
            )
            
            # Save certificate
            safe_name = "".join(c if c.isalnum() or c in (' ', '-', '_') else '_' for c in name)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"{safe_name}_{timestamp}.pdf"
            output_path = os.path.join(OUTPUT_DIR, filename)
            
            certificate.convert('RGB').save(output_path)
            generated_files.append(filename)
            print(f"Generated certificate for: {name}")
        
        return {
            "message": f"Successfully generated {len(generated_files)} certificate(s)",
            "certificate_type": config['certificate_type'],
            "files": generated_files,
            "download_urls": [f"/download/{f}" for f in generated_files],
            "note": "Use GET /download/{{filename}} to download individual certificates"
        }
    
    except Exception as e:
        raise HTTPException(500, f"Error generating certificates: {str(e)}")

@app.post("/preview", tags=["Generation"])
async def preview_certificate():
    """
    Generate a preview image (PNG) using current configuration and a sample name.
    Useful for frontend live preview.
    """
    config = load_config()
    template_file = f"template_{config['certificate_type']}.png"
    template_path = os.path.join(TEMPLATES_DIR, template_file)
    
    if not os.path.exists(template_path):
        raise HTTPException(404, "Template not found. Please upload it first.")
    
    try:
        certificate = Image.open(template_path).copy()
        draw = ImageDraw.Draw(certificate)
        
        name = "Sample Name"
        name_font = load_font(config['name_settings']['font_path'], config['name_settings']['font_size'])
        award_font = load_font(config['award_text_settings']['font_path'], config['award_text_settings']['font_size'])
        sig_font = load_font(config['award_text_settings']['font_path'], config['left_signatory']['font_size'])
        
        draw.text((config['name_settings']['position']['x'], config['name_settings']['position']['y']), 
                  name, fill=config['name_settings']['color'], font=name_font)
        
        award_lines = wrap_text(config['award_text_settings']['text'], award_font, config['award_text_settings']['max_width'])
        y_offset = 0
        for line in award_lines:
            draw.text((config['award_text_settings']['position']['x'], config['award_text_settings']['position']['y'] + y_offset),
                      line, fill=config['award_text_settings']['color'], font=award_font)
            y_offset += config['award_text_settings']['font_size'] + 10
        
        add_logo(certificate, config['left_logo']['filename'], config['left_logo']['position'], config['left_logo']['max_fraction'])
        add_logo(certificate, config['right_logo']['filename'], config['right_logo']['position'], config['right_logo']['max_fraction'])
        add_signature(certificate, config['left_signatory'], sig_font, draw)
        add_signature(certificate, config['right_signatory'], sig_font, draw)
        
        # Save to buffer
        img_byte_arr = io.BytesIO()
        certificate.convert('RGB').save(img_byte_arr, format='JPEG', quality=85)
        img_byte_arr.seek(0)
        
        return Response(content=img_byte_arr.getvalue(), media_type="image/jpeg")
    except Exception as e:
        raise HTTPException(500, f"Error generating preview: {str(e)}")

@app.post("/generate-zip", tags=["Generation"])
async def generate_zip(request: GenerateRequest):
    """
    Generate certificates and return them as a single ZIP file.
    """
    gen_result = await generate_certificates(request)
    if not gen_result.get("files"):
        raise HTTPException(500, "Failed to generate certificates")
    
    zip_filename = f"certificates_{datetime.now().strftime('%Y%md_%H%M%S')}.zip"
    zip_path = os.path.join(OUTPUT_DIR, zip_filename)
    
    with zipfile.ZipFile(zip_path, 'w') as zipf:
        for f in gen_result["files"]:
            zipf.write(os.path.join(OUTPUT_DIR, f), f)
            
    return FileResponse(zip_path, filename=zip_filename, media_type="application/zip")

@app.post("/batch-generate", tags=["Generation"])
async def batch_generate_certificates(request: BatchGenerateRequest):
    """
    Generate certificates for multiple participants with cloud-stored assets.
    
    **Features:**
    - Downloads template and assets from cloud storage URLs
    - Generates certificates for all participants
    - Uploads generated PDFs to cloud storage (Firebase)
    - Returns cloud URLs for each certificate
    
    **Request Body:**
    ```json
    {
        "eventId": "event_123",
        "eventTitle": "CSI Workshop 2025",
        "templateUrl": "https://...",
        "orgLogoUrl": "https://...",
        "leftSignature": {"url": "https://...", "name": "Dr. John", "title": "Director"},
        "rightSignature": {"url": "https://...", "name": "Prof. Jane", "title": "HOD"},
        "awardText": "For outstanding participation in",
        "certificateType": "participation",
        "participants": [{"userId": "123", "name": "John Doe", "email": "john@example.com"}]
    }
    ```
    
    **Returns:**
    - List of generated certificates with cloud storage URLs
    """
    try:
        # Create temp directory for this batch
        batch_id = str(uuid.uuid4())
        temp_dir = os.path.join(UPLOAD_DIR, f"batch_{batch_id}")
        os.makedirs(temp_dir, exist_ok=True)
        
        # Download template from cloud
        template_path = os.path.join(temp_dir, "template.png")
        try:
            response = requests.get(request.templateUrl, timeout=30)
            response.raise_for_status()
            with open(template_path, 'wb') as f:
                f.write(response.content)
        except Exception as e:
            raise HTTPException(500, f"Failed to download template: {str(e)}")
        
        # Download org logo from cloud
        org_logo_path = os.path.join(temp_dir, "org_logo.png")
        try:
            response = requests.get(request.orgLogoUrl, timeout=30)
            response.raise_for_status()
            with open(org_logo_path, 'wb') as f:
                f.write(response.content)
        except Exception as e:
            raise HTTPException(500, f"Failed to download org logo: {str(e)}")
        
        # Download left signature from cloud
        left_sig_path = os.path.join(temp_dir, "left_signature.png")
        try:
            response = requests.get(request.leftSignature.url, timeout=30)
            response.raise_for_status()
            with open(left_sig_path, 'wb') as f:
                f.write(response.content)
        except Exception as e:
            raise HTTPException(500, f"Failed to download left signature: {str(e)}")
        
        # Download right signature from cloud
        right_sig_path = os.path.join(temp_dir, "right_signature.png")
        try:
            response = requests.get(request.rightSignature.url, timeout=30)
            response.raise_for_status()
            with open(right_sig_path, 'wb') as f:
                f.write(response.content)
        except Exception as e:
            raise HTTPException(500, f"Failed to download right signature: {str(e)}")
        
        # Load fonts
        name_font = load_font("DancingScript-Regular.ttf", 85)
        award_font = load_font("times.ttf", 45)
        sig_font = load_font("times.ttf", 35)
        
        generated_certificates = []
        
        # Generate certificate for each participant
        for participant in request.participants:
            try:
                # Load template
                certificate = Image.open(template_path).copy()
                draw = ImageDraw.Draw(certificate)
                
                # 1. Fill Text Placeholders
                award_text = request.awardText.replace("{name}", participant.name).replace("{event_name}", request.eventTitle)

                # 2. Add Name (Centered)
                name_bbox = name_font.getbbox(participant.name)
                name_width = name_bbox[2] - name_bbox[0]
                name_x = (certificate.width - name_width) // 2
                draw.text((name_x, 596), participant.name, fill="black", font=name_font)
                
                # 3. Add Processed Award Text (Centered)
                award_lines = wrap_text(award_text, award_font, 1000)
                y_offset = 0
                for line in award_lines:
                    line_bbox = award_font.getbbox(line)
                    line_width = line_bbox[2] - line_bbox[0]
                    line_x = (certificate.width - line_width) // 2
                    draw.text((line_x, 720 + y_offset), line, fill="black", font=award_font)
                    y_offset += 55
                
                # 4. Add Org Logo (Center Top)
                org_logo = Image.open(org_logo_path).convert("RGBA")
                logo_scale = min(200 / org_logo.width if org_logo.width else 1.0, 200 / org_logo.height if org_logo.height else 1.0, 1.0)
                org_logo = org_logo.resize((int(org_logo.width * logo_scale), int(org_logo.height * logo_scale)), Image.LANCZOS)
                logo_x = (certificate.width - org_logo.width) // 2
                certificate.paste(org_logo, (logo_x, 170), org_logo)

                # 5. FIXED Add CampVerse logo (Right Side)
                fixed_logo_path = os.path.join(BASE_DIR, "logo.png")
                if os.path.exists(fixed_logo_path):
                    fixed_logo = Image.open(fixed_logo_path).convert("RGBA")
                    f_logo_scale = min(200 / fixed_logo.width, 200 / fixed_logo.height, 1.0)
                    fixed_logo = fixed_logo.resize((int(fixed_logo.width * f_logo_scale), int(fixed_logo.height * f_logo_scale)), Image.LANCZOS)
                    certificate.paste(fixed_logo, (1400, 170), fixed_logo)

                # 6. Add QR Code if present (Bottom Right)
                if hasattr(request, 'qrCode') and request.qrCode:
                    try:
                        qr_data = request.qrCode.split(",")[-1]
                        qr_bytes = base64.b64decode(qr_data)
                        qr_img = Image.open(io.BytesIO(qr_bytes)).convert("RGBA")
                        qr_img = qr_img.resize((150, 150), Image.LANCZOS)
                        certificate.paste(qr_img, (1450, 1150), qr_img)
                    except Exception as e:
                        print(f"Warning: Failed to add QR code: {e}")
                
                # 7. Add Signatories
                left_sig = Image.open(left_sig_path).convert("RGBA")
                sig_scale = min(300 / left_sig.width if left_sig.width else 1.0, 150 / left_sig.height if left_sig.height else 1.0, 1.0)
                left_sig = left_sig.resize((int(left_sig.width * sig_scale), int(left_sig.height * sig_scale)), Image.LANCZOS)
                certificate.paste(left_sig, (400, 1100), left_sig)
                draw.text((400, 1270), request.leftSignature.name, fill="black", font=sig_font)
                draw.text((400, 1310), request.leftSignature.title, fill="black", font=sig_font)
                
                # Add right signature
                right_sig = Image.open(right_sig_path).convert("RGBA")
                right_sig = right_sig.resize((int(right_sig.width * sig_scale), int(right_sig.height * sig_scale)), Image.LANCZOS)
                certificate.paste(right_sig, (1200, 1100), right_sig)
                draw.text((1200, 1270), request.rightSignature.name, fill="black", font=sig_font)
                draw.text((1200, 1310), request.rightSignature.title, fill="black", font=sig_font)
                
                # 7. Save certificate as PDF
                safe_name = "".join(c if c.isalnum() or c in (' ', '-', '_') else '_' for c in participant.name)
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                filename = f"{safe_name}_{timestamp}.pdf"
                output_path = os.path.join(OUTPUT_DIR, filename)
                
                certificate.convert('RGB').save(output_path)
                
                generated_certificates.append({
                    "userId": participant.userId,
                    "name": participant.name,
                    "email": participant.email,
                    "url": f"/download/{filename}",
                    "filename": filename
                })
                
                print(f"Generated certificate for: {participant.name}")
                
            except Exception as e:
                print(f"Error generating certificate for {participant.name}: {str(e)}")
                # Continue with other participants even if one fails
        
        # Clean up temp directory
        try:
            shutil.rmtree(temp_dir)
        except Exception as e:
            print(f"Warning: Could not clean up temp directory: {str(e)}")
        
        return {
            "message": f"Successfully generated {len(generated_certificates)} certificate(s)",
            "eventId": request.eventId,
            "eventTitle": request.eventTitle,
            "certificateType": request.certificateType,
            "totalRequested": len(request.participants),
            "totalGenerated": len(generated_certificates),
            "certificates": generated_certificates
        }
    except Exception as e:
        raise HTTPException(500, f"Error in batch generation: {str(e)}")

@app.post("/generate-certificate", tags=["Generation"])
async def generate_single_certificate(request: BackendCertificateRequest):
    """
    Generate a certificate using cloud assets and variable placeholders.
    """
    try:
        # Create unique batch ID for this request
        request_id = str(uuid.uuid4())
        temp_dir = os.path.join(UPLOAD_DIR, f"request_{request_id}")
        os.makedirs(temp_dir, exist_ok=True)

        # 1. Fetch Template (with cache and validation)
        template_url = request.templateUrl or (
            "https://raw.githubusercontent.com/Imkkrish/CampVerse/main/ML/certificate_generator/templates/template_participation.png"
            if request.certificateType == "participant" else 
            "https://raw.githubusercontent.com/Imkkrish/CampVerse/main/ML/certificate_generator/templates/template_achievement.png"
        )
        template_path = os.path.join(temp_dir, "template.png")
        download_file(template_url, template_path)

        # 2. Add Fixed CampVerse Logo
        fixed_logo_path = os.path.join(BASE_DIR, "logo.png")
        
        # 3. Process Text
        award_text = request.awardText.replace("{name}", request.userName).replace("{event_name}", request.eventTitle)
        
        # Load Certificate
        certificate = Image.open(template_path).copy()
        draw = ImageDraw.Draw(certificate)
        
        # Fonts
        name_font = load_font("DancingScript-Regular.ttf", 85)
        award_font = load_font("times.ttf", 45)
        sig_font = load_font("times.ttf", 35)

        # Add Name
        name_bbox = name_font.getbbox(request.userName)
        name_width = name_bbox[2] - name_bbox[0]
        name_x = (certificate.width - name_width) // 2
        draw.text((name_x, 596), request.userName, fill="black", font=name_font)

        # Add Award Text
        award_lines = wrap_text(award_text, award_font, 1000)
        y_offset = 0
        for line in award_lines:
            lb = award_font.getbbox(line)
            lw = lb[2] - lb[0]
            lx = (certificate.width - lw) // 2
            draw.text((lx, 720 + y_offset), line, fill="black", font=award_font)
            y_offset += 55

        # 4. QR Code integration (Production Hardening)
        if request.qrCode:
            try:
                qr_data = request.qrCode.split(",")[-1]
                qr_bytes = base64.b64decode(qr_data)
                qr_img = Image.open(io.BytesIO(qr_bytes)).convert("RGBA")
                qr_img = qr_img.resize((150, 150), Image.LANCZOS)
                certificate.paste(qr_img, (1450, 1150), qr_img)
            except Exception as e:
                print(f"QR Error: {e}")

        # 5. Add Host Logo
        if request.logoUrl:
            host_logo_path = os.path.join(temp_dir, "host_logo.png")
            download_file(request.logoUrl, host_logo_path)
            add_logo(certificate, host_logo_path, {"x": 200, "y": 170}, 0.18, temp_dir)

        # 6. Add Fixed Platform Logo
        if os.path.exists(fixed_logo_path):
            add_logo(certificate, fixed_logo_path, {"x": 1400, "y": 170}, 0.18, BASE_DIR)

        # 7. Add Signatories using the corrected function
        if request.leftSignatureUrl:
            sig_p = os.path.join(temp_dir, "sig_left.png")
            download_file(request.leftSignatureUrl, sig_p)
            add_signature_from_path(
                certificate, sig_p, 
                {"x": 400, "y": 1100},  # image position
                request.leftSignatoryName or "", 
                request.leftSignatoryTitle or "",
                {"x": 400, "y": 1270},  # text position
                sig_font, "black", draw
            )

        if request.rightSignatureUrl:
            sig_p = os.path.join(temp_dir, "sig_right.png")
            download_file(request.rightSignatureUrl, sig_p)
            add_signature_from_path(
                certificate, sig_p, 
                {"x": 1200, "y": 1100},  # image position
                request.rightSignatoryName or "", 
                request.rightSignatoryTitle or "",
                {"x": 1200, "y": 1270},  # text position
                sig_font, "black", draw
            )

        # Save and Cleanup
        safe_name = "".join(c if c.isalnum() or c in (' ', '-', '_') else '_' for c in request.userName)
        filename = f"{safe_name}_{request_id}.pdf"
        output_path = os.path.join(OUTPUT_DIR, filename)
        certificate.convert('RGB').save(output_path)
        
        shutil.rmtree(temp_dir)

        return {
            "success": True,
            "requestId": request_id,
            "certificateURL": f"/download/{filename}",
            "generationStatus": "generated"
        }

    except Exception as e:
        if 'temp_dir' in locals() and os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)
        raise HTTPException(500, f"Error: {str(e)}")

# Asset cache with expiry to prevent memory leaks
ASSET_CACHE = {}
CACHE_EXPIRY_SECONDS = 3600  # 1 hour
MAX_CACHE_ENTRIES = 100

def download_file(url, target_path):
    """
    Download a file with time-limited memory caching and SSRF protection.
    """
    import time
    current_time = time.time()
    
    # Simple SSRF Protection: Restrict to trusted domains/protocols
    if not url.startswith(("http://", "https://")):
        raise HTTPException(400, "Invalid URL protocol")
    
    # Check cache (with expiry)
    if url in ASSET_CACHE:
        cached_data, cached_time = ASSET_CACHE[url]
        if current_time - cached_time < CACHE_EXPIRY_SECONDS:
            with open(target_path, 'wb') as f:
                f.write(cached_data)
            return
        else:
            # Expired, remove from cache
            del ASSET_CACHE[url]

    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        
        # Store in cache with timestamp (limit size and file size)
        if len(response.content) < 5 * 1024 * 1024 and len(ASSET_CACHE) < MAX_CACHE_ENTRIES:
            ASSET_CACHE[url] = (response.content, current_time)
            
        with open(target_path, 'wb') as f:
            f.write(response.content)
    except Exception as e:
        raise HTTPException(500, f"Failed to fetch asset from {url}: {str(e)}")

@app.post("/batch-validate", tags=["Generation"])
async def batch_validate_certificate_generation(request: BatchGenerateRequest):
    """
    Validate that certificate generation is possible with given assets.
    Does NOT generate or store certificates - only validates assets are accessible.
    
    This endpoint is used before marking certificates as "ready" in the database.
    Actual certificate generation happens on-demand via /render-certificate.
    """
    try:
        # Create temp directory for validation
        batch_id = str(uuid.uuid4())
        temp_dir = os.path.join(UPLOAD_DIR, f"validate_{batch_id}")
        os.makedirs(temp_dir, exist_ok=True)
        
        validation_results = {
            "valid": True,
            "errors": [],
            "warnings": []
        }
        
        # Test download template
        try:
            response = requests.get(request.templateUrl, timeout=10)
            response.raise_for_status()
            template_path = os.path.join(temp_dir, "template.png")
            with open(template_path, 'wb') as f:
                f.write(response.content)
            # Verify it's a valid image
            Image.open(template_path)
        except Exception as e:
            validation_results["valid"] = False
            validation_results["errors"].append(f"Template URL invalid or inaccessible: {str(e)}")
        
        # Test download org logo
        try:
            response = requests.get(request.orgLogoUrl, timeout=10)
            response.raise_for_status()
            logo_path = os.path.join(temp_dir, "logo.png")
            with open(logo_path, 'wb') as f:
                f.write(response.content)
            Image.open(logo_path)
        except Exception as e:
            validation_results["valid"] = False
            validation_results["errors"].append(f"Org logo URL invalid or inaccessible: {str(e)}")
        
        # Test download signatures
        try:
            response = requests.get(request.leftSignature.url, timeout=10)
            response.raise_for_status()
            Image.open(io.BytesIO(response.content))
        except Exception as e:
            validation_results["valid"] = False
            validation_results["errors"].append(f"Left signature URL invalid or inaccessible: {str(e)}")
        
        try:
            response = requests.get(request.rightSignature.url, timeout=10)
            response.raise_for_status()
            Image.open(io.BytesIO(response.content))
        except Exception as e:
            validation_results["valid"] = False
            validation_results["errors"].append(f"Right signature URL invalid or inaccessible: {str(e)}")
        
        # Clean up temp directory
        try:
            shutil.rmtree(temp_dir)
        except Exception as e:
            print(f"Warning: Could not clean up validation temp directory: {str(e)}")
        
        if not validation_results["valid"]:
            raise HTTPException(400, f"Validation failed: {', '.join(validation_results['errors'])}")
        
        return {
            "message": "Certificate generation validation successful",
            "valid": True,
            "eventId": request.eventId,
            "totalParticipants": len(request.participants),
            "note": "Certificates are ready to be generated on-demand"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Error validating certificate generation: {str(e)}")

@app.post("/render-certificate", tags=["Generation"])
async def render_single_certificate(request: dict):
    """
    Render a single certificate on-demand and return it as PDF bytes.
    This endpoint does NOT store the certificate - it generates and returns it immediately.
    
    **Request Body:**
    ```json
    {
        "eventId": "event_123",
        "eventTitle": "CSI Workshop 2025",
        "templateUrl": "https://...",
        "orgLogoUrl": "https://...",
        "leftSignature": {"url": "https://...", "name": "Dr. John", "title": "Director"},
        "rightSignature": {"url": "https://...", "name": "Prof. Jane", "title": "HOD"},
        "awardText": "For outstanding participation in",
        "certificateType": "participation",
        "participant": {"userId": "123", "name": "John Doe", "email": "john@example.com"}
    }
    ```
    
    **Returns:** PDF file as binary data
    """
    try:
        # Extract data
        participant = request.get("participant")
        if not participant:
            raise HTTPException(400, "participant data is required")
        
        # Create temp directory for this render
        render_id = str(uuid.uuid4())
        temp_dir = os.path.join(UPLOAD_DIR, f"render_{render_id}")
        os.makedirs(temp_dir, exist_ok=True)
        
        # Download template
        template_path = os.path.join(temp_dir, "template.png")
        response = requests.get(request["templateUrl"], timeout=30)
        response.raise_for_status()
        with open(template_path, 'wb') as f:
            f.write(response.content)
        
        # Download org logo
        org_logo_path = os.path.join(temp_dir, "org_logo.png")
        response = requests.get(request["orgLogoUrl"], timeout=30)
        response.raise_for_status()
        with open(org_logo_path, 'wb') as f:
            f.write(response.content)
        
        # Download signatures
        left_sig_path = os.path.join(temp_dir, "left_signature.png")
        response = requests.get(request["leftSignature"]["url"], timeout=30)
        response.raise_for_status()
        with open(left_sig_path, 'wb') as f:
            f.write(response.content)
        
        right_sig_path = os.path.join(temp_dir, "right_signature.png")
        response = requests.get(request["rightSignature"]["url"], timeout=30)
        response.raise_for_status()
        with open(right_sig_path, 'wb') as f:
            f.write(response.content)
        
        # Load template
        certificate = Image.open(template_path).copy()
        draw = ImageDraw.Draw(certificate)
        
        # Load fonts
        name_font = load_font("DancingScript-Regular.ttf", 85)
        award_font = load_font("times.ttf", 45)
        sig_font = load_font("times.ttf", 35)
        
        # Add participant name (centered)
        name_bbox = name_font.getbbox(participant["name"])
        name_width = name_bbox[2] - name_bbox[0]
        name_x = (certificate.width - name_width) // 2
        draw.text((name_x, 596), participant["name"], fill="black", font=name_font)
        
        # Add award text with event title (centered)
        full_award_text = f"{request['awardText']} {request['eventTitle']}"
        award_lines = wrap_text(full_award_text, award_font, 1000)
        y_offset = 0
        for line in award_lines:
            line_bbox = award_font.getbbox(line)
            line_width = line_bbox[2] - line_bbox[0]
            line_x = (certificate.width - line_width) // 2
            draw.text((line_x, 720 + y_offset), line, fill="black", font=award_font)
            y_offset += 55
        
        # Process placeholders
        participant_data = request.get("participant", {})
        award_text = request.get("awardText", "").replace("{name}", participant_data.get("name", "")).replace("{event_name}", request.get("eventTitle", ""))

        # 1. Load template and draw context
        certificate = Image.open(template_path).copy()
        draw = ImageDraw.Draw(certificate)

        # 2. Fonts
        name_font = load_font("DancingScript-Regular.ttf", 85)
        award_font = load_font("times.ttf", 45)
        sig_font = load_font("times.ttf", 35)

        # 3. Add Name (Centered)
        p_name = participant_data.get("name", "Participant")
        name_bbox = name_font.getbbox(p_name)
        name_width = name_bbox[2] - name_bbox[0]
        name_x = (certificate.width - name_width) // 2
        draw.text((name_x, 596), p_name, fill="black", font=name_font)

        # 4. Add Processed Award Text (Centered)
        award_lines = wrap_text(award_text, award_font, 1000)
        y_off = 0
        for line in award_lines:
            lb = award_font.getbbox(line)
            lw = lb[2] - lb[0]
            lx = (certificate.width - lw) // 2
            draw.text((lx, 720 + y_off), line, fill="black", font=award_font)
            y_off += 55

        # 5. Add Logos (Host + CampVerse)
        org_logo = Image.open(org_logo_path).convert("RGBA")
        lscale = min(200 / org_logo.width, 200 / org_logo.height, 1.0)
        org_logo = org_logo.resize((int(org_logo.width * lscale), int(org_logo.height * lscale)), Image.LANCZOS)
        certificate.paste(org_logo, ((certificate.width - org_logo.width) // 2, 170), org_logo)

        fixed_logo_path = os.path.join(BASE_DIR, "logo.png")
        if os.path.exists(fixed_logo_path):
            fixed_logo = Image.open(fixed_logo_path).convert("RGBA")
            fscale = min(200 / fixed_logo.width, 200 / fixed_logo.height, 1.0)
            fixed_logo = fixed_logo.resize((int(fixed_logo.width * fscale), int(fixed_logo.height * fscale)), Image.LANCZOS)
            certificate.paste(fixed_logo, (1400, 170), fixed_logo)

        # 6. Add Signatories
        l_sig = Image.open(left_sig_path).convert("RGBA")
        s_scale = min(300 / l_sig.width, 150 / l_sig.height, 1.0)
        l_sig = l_sig.resize((int(l_sig.width * s_scale), int(l_sig.height * s_scale)), Image.LANCZOS)
        certificate.paste(l_sig, (400, 1100), l_sig)
        draw.text((400, 1270), request["leftSignature"]["name"], fill="black", font=sig_font)
        draw.text((400, 1310), request["leftSignature"]["title"], fill="black", font=sig_font)
        
        r_sig = Image.open(right_sig_path).convert("RGBA")
        r_sig = r_sig.resize((int(r_sig.width * s_scale), int(r_sig.height * s_scale)), Image.LANCZOS)
        certificate.paste(r_sig, (1200, 1100), r_sig)
        draw.text((1200, 1270), request["rightSignature"]["name"], fill="black", font=sig_font)
        draw.text((1200, 1310), request["rightSignature"]["title"], fill="black", font=sig_font)
        # Convert to RGB and save as PDF in memory
        pdf_buffer = io.BytesIO()
        certificate.convert('RGB').save(pdf_buffer, format='PDF')
        pdf_bytes = pdf_buffer.getvalue()
        
        # Clean up temp directory
        try:
            shutil.rmtree(temp_dir)
        except Exception as e:
            print(f"Warning: Could not clean up render temp directory: {str(e)}")
        
        # Return PDF as streaming response
        safe_name = "".join(c if c.isalnum() or c in (' ', '-', '_') else '_' for c in participant["name"])
        filename = f"{safe_name}_Certificate.pdf"
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Content-Length": str(len(pdf_bytes))
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Error rendering certificate: {str(e)}")

@app.get("/download/{filename}", tags=["Download"])
async def download_certificate(filename: str):
    """
    Download a generated certificate by filename.
    
    **Usage:**
    After generating certificates, use the filename from the response to download:
    - Example: GET /download/John_Doe_20250125_143022.pdf
    
    **Returns:** PDF file download
    """
    file_path = os.path.join(OUTPUT_DIR, filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(404, f"File not found: {filename}")
    
    return FileResponse(
        file_path,
        media_type="application/pdf",
        filename=filename
    )

@app.get("/files", tags=["Management"])
async def list_files():
    """
    List all uploaded and generated files.
    
    **Returns:**
    - Templates: Certificate template files
    - Logos and Signatures: Uploaded images
    - Fonts: Available font files
    - Generated Certificates: All previously generated PDFs
    """
    return {
        "templates": {
            "files": os.listdir(TEMPLATES_DIR) if os.path.exists(TEMPLATES_DIR) else [],
            "location": "templates/"
        },
        "logos_and_signatures": {
            "files": os.listdir(UPLOAD_DIR) if os.path.exists(UPLOAD_DIR) else [],
            "location": "uploads/"
        },
        "fonts": {
            "files": os.listdir(FONTS_DIR) if os.path.exists(FONTS_DIR) else [],
            "location": "fonts/"
        },
        "generated_certificates": {
            "files": os.listdir(OUTPUT_DIR) if os.path.exists(OUTPUT_DIR) else [],
            "location": "generated_certificates/",
            "count": len(os.listdir(OUTPUT_DIR)) if os.path.exists(OUTPUT_DIR) else 0
        }
    }

@app.delete("/clear-generated", tags=["Management"])
async def clear_generated():
    """
    Clear all generated certificates.
    
    **Warning:** This will permanently delete all PDF files in the generated_certificates directory.
    """
    try:
        count = 0
        for filename in os.listdir(OUTPUT_DIR):
            file_path = os.path.join(OUTPUT_DIR, filename)
            if os.path.isfile(file_path):
                os.unlink(file_path)
                count += 1
        return {
            "message": f"Successfully cleared {count} generated certificate(s)",
            "deleted_count": count
        }
    except Exception as e:
        raise HTTPException(500, f"Error clearing files: {str(e)}")

@app.get("/status", tags=["Info"])
async def check_status():
    """
    Check API status and readiness for certificate generation.
    
    **Returns:**
    - Current configuration
    - Uploaded files status
    - Ready status (whether all required files are uploaded)
    """
    config = load_config()
    
    template_file = f"template_{config['certificate_type']}.png"
    template_exists = os.path.exists(os.path.join(TEMPLATES_DIR, template_file))
    
    left_logo_exists = os.path.exists(os.path.join(UPLOAD_DIR, config['left_logo']['filename']))
    right_logo_exists = os.path.exists(os.path.join(UPLOAD_DIR, config['right_logo']['filename']))
    left_sig_exists = os.path.exists(os.path.join(UPLOAD_DIR, config['left_signatory']['filename']))
    right_sig_exists = os.path.exists(os.path.join(UPLOAD_DIR, config['right_signatory']['filename']))
    
    all_ready = (template_exists and left_logo_exists and right_logo_exists and 
                 left_sig_exists and right_sig_exists)
    
    missing = []
    if not template_exists:
        missing.append(f"Template: {template_file}")
    if not left_logo_exists:
        missing.append(f"Left logo: {config['left_logo']['filename']}")
    if not right_logo_exists:
        missing.append(f"Right logo: {config['right_logo']['filename']}")
    if not left_sig_exists:
        missing.append(f"Left signature: {config['left_signatory']['filename']}")
    if not right_sig_exists:
        missing.append(f"Right signature: {config['right_signatory']['filename']}")
    
    return {
        "status": "Ready for generation" if all_ready else "Missing required files",
        "ready": all_ready,
        "certificate_type": config['certificate_type'],
        "files_status": {
            "template": template_exists,
            "left_logo": left_logo_exists,
            "right_logo": right_logo_exists,
            "left_signature": left_sig_exists,
            "right_signature": right_sig_exists
        },
        "missing_files": missing if missing else None,
        "configuration": "Custom" if os.path.exists(CONFIG_FILE) else "Default",
        "next_steps": missing if missing else ["Upload recipient names via POST /generate"]
    }

if __name__ == "__main__":
    import uvicorn
    print("=" * 70)
    print("Certificate Generator API")
    print("=" * 70)
    print("\nStarting server...")
    print("API Documentation: http://localhost:7860/docs")
    print("API Root: http://localhost:7860/")
    print("Gradio UI: http://localhost:7860/ui")
    print("\nDefault Configuration Loaded")
    print("You can customize settings via /config/* endpoints or use defaults")
    print("=" * 70)
    uvicorn.run(app, host="0.0.0.0", port=7860)