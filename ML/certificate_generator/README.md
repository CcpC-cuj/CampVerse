---
title: Certificate Generator
emoji: 🏆
colorFrom: blue
colorTo: green
sdk: docker
sdk_version: "1.0"
app_file: api_main.py
app_port: 7860
pinned: false
---

# Certificate Generator API

A FastAPI-based service for generating professional certificates with customizable templates, logos, signatures, and text.

## Features

- Generate certificates with custom templates
- Support for multiple certificate types (participation/achievement)
- Configurable logo placement and sizing
- Digital signature support with signatory details
- Custom font support
- Automated text wrapping and positioning
- PDF output format

## Prerequisites

- Python 3.8+
- Required Python packages (see `requirements.txt`)
- Storage space for templates, uploads, and generated certificates

## Installation

1. Clone the repository
2. Install dependencies:

```bash
pip install -r requirements.txt
```

## Directory Structure

The API automatically creates the following directory structure:

```
certificate_generator/
├── uploads/           # For logos and signatures
├── templates/         # Certificate template images
├── fonts/            # Custom font files
└── generated_certificates/  # Output directory for PDFs
```

## Configuration

The API uses a JSON-based configuration system with these main components:

- Certificate type (participation/achievement)
- Name settings (position, font, size)
- Award text settings
- Logo settings (left/right)
- Signatory settings (left/right)

Default configuration is provided but can be customized via API endpoints.

## API Endpoints

### Information

- `GET /` - API documentation and workflow
- `GET /status` - Check API readiness and configuration status

### Configuration

- `GET /config` - Get current configuration
- `GET /config/defaults` - Get default configuration
- `POST /config/certificate-type` - Set certificate type
- `POST /config/name-settings` - Configure name placement
- `POST /config/award-text` - Configure award text
- `POST /config/logo-left` - Configure left logo
- `POST /config/logo-right` - Configure right logo
- `POST /config/signatory-left` - Configure left signatory
- `POST /config/signatory-right` - Configure right signatory
- `POST /config/reset` - Reset to default configuration

### File Upload

- `POST /upload-template` - Upload certificate template
- `POST /upload-logo` - Upload logo image
- `POST /upload-signature` - Upload signature image
- `POST /upload-font` - Upload custom font file

### Certificate Generation

- `POST /generate` - Generate certificates for list of names
- `GET /download/{filename}` - Download generated certificate

### Management

- `GET /files` - List all uploaded and generated files
- `DELETE /clear-generated` - Clear generated certificates

## Usage Example

1. Upload certificate template:

```bash
curl -X POST "http://localhost:7860/upload-template" \
  -H "accept: application/json" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@template.png" \
  -F "template_type=participation"
```

2. Configure settings:

```bash
curl -X POST "http://localhost:7860/config/award-text" \
  -H "accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "For outstanding participation in the CSI Workshop 2025",
    "position": {"x": 810, "y": 720},
    "font_size": 45,
    "max_width": 1000
  }'
```

3. Generate certificates:

```bash
curl -X POST "http://localhost:7860/generate" \
  -H "accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{
    "names": ["John Doe", "Jane Smith"]
  }'
```

## Running the API

Start the server:

```bash
python api_main.py
```

The API will be available at:

- API Documentation: http://localhost:7860/docs
- API Root: http://localhost:7860/

## Error Handling

The API provides detailed error messages for:

- Missing required files
- Invalid file formats
- Configuration errors
- Generation failures

## Security Considerations

- CORS is enabled for all origins
- File type validation for uploads
- Size limits for uploaded files
- Path traversal prevention

## Additional Notes

- Recommended template resolution: 2000x1500 pixels or higher
- Supported image formats: PNG (recommended), JPEG
- Font format: TTF only
- Default font: DancingScript-Regular.ttf
- Certificate output format: PDF
