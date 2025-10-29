from PIL import Image, ImageDraw, ImageFont
import os

# ============================================================================
# CONFIGURATION SECTION - Modify all settings here
# ============================================================================

# --- Template Selection ---
# Choose certificate type: 'participation' or 'achievement'
CERTIFICATE_TYPE = 'participation'  # Change to 'achievement' as needed

# Template file paths (both should be in the same directory as this script)
TEMPLATE_PARTICIPATION = 'template_participation.png'
TEMPLATE_ACHIEVEMENT = 'template_achievement.png'

# --- Recipient Names ---
names = [
    "Om Vishesh"
]

# --- Name Settings ---
NAME_POSITION = (810, 596)  # (x, y) coordinates for the name
NAME_FONT_PATH = 'DancingScript-Regular.ttf'
NAME_FONT_SIZE = 85
NAME_COLOR = "black"

# --- Award Text Settings ---
AWARD_TEXT = "For outstanding participation in the CSI Workshop 2025"
AWARD_TEXT_POSITION = (575, 720)  # (x, y) coordinates - adjust based on your template
AWARD_TEXT_FONT_PATH = 'times.ttf'  # Can use different font
AWARD_TEXT_FONT_SIZE = 45
AWARD_TEXT_COLOR = "black"
AWARD_TEXT_MAX_WIDTH = 1000  # Maximum width before text wraps

# --- Left Logo Settings ---
LEFT_LOGO_PATH = 'csi logo.png'
LEFT_LOGO_POSITION = (200, 170)  # (x, y) coordinates
LEFT_LOGO_MAX_FRACTION = 0.18  # Max size as fraction of template width/height

# --- Right Logo Settings ---
RIGHT_LOGO_PATH = 'ccpc.png'  # Add your second logo file
RIGHT_LOGO_POSITION = (1500, 170)  # (x, y) coordinates
RIGHT_LOGO_MAX_FRACTION = 0.18  # Max size as fraction of template width/height

# --- Left Signatory Settings ---
LEFT_SIGNATURE_IMAGE = 'sign1.png'
LEFT_SIGNATURE_POSITION = (400, 1100)  # (x, y) for signature image
LEFT_SIGNATURE_NAME = "Dr. John Doe"
LEFT_SIGNATURE_TITLE = "President, CSI Chapter"
LEFT_SIGNATURE_TEXT_POSITION = (400, 1200)  # (x, y) for name/title text
LEFT_SIGNATURE_FONT_SIZE = 35
LEFT_SIGNATURE_COLOR = "black"

# --- Right Signatory Settings ---
RIGHT_SIGNATURE_IMAGE = 'sign2.png'
RIGHT_SIGNATURE_POSITION = (1200, 1100)  # (x, y) for signature image
RIGHT_SIGNATURE_NAME = "Prof. Jane Smith"
RIGHT_SIGNATURE_TITLE = "President, CCPC"
RIGHT_SIGNATURE_TEXT_POSITION = (1200, 1200)  # (x, y) for name/title text
RIGHT_SIGNATURE_FONT_SIZE = 35
RIGHT_SIGNATURE_COLOR = "black"

# --- Signature Image Settings ---
SIGNATURE_MAX_WIDTH = 300  # Maximum width for signature images
SIGNATURE_MAX_HEIGHT = 150  # Maximum height for signature images

# --- Output Settings ---
OUTPUT_DIRECTORY = 'Certificates'

# ============================================================================
# END OF CONFIGURATION SECTION
# ============================================================================


def load_font(font_path, size, script_dir):
    """Load a font with fallback to default"""
    full_path = os.path.join(script_dir, font_path)
    try:
        if os.path.exists(full_path):
            return ImageFont.truetype(full_path, size)
        else:
            return ImageFont.truetype(font_path, size)
    except Exception:
        print(f"Warning: could not load '{font_path}'. Falling back to default font.")
        return ImageFont.load_default()


def add_logo(certificate, logo_path, position, max_fraction, script_dir):
    """Add a logo to the certificate at specified position"""
    full_logo_path = os.path.join(script_dir, logo_path)
    try:
        if os.path.exists(full_logo_path):
            logo = Image.open(full_logo_path).convert("RGBA")
            
            # Compute max size for the logo
            max_logo_width = int(certificate.width * max_fraction)
            max_logo_height = int(certificate.height * max_fraction)
            
            # Preserve aspect ratio when resizing
            lw, lh = logo.size
            scale = min(max_logo_width / lw if lw else 1.0,
                       max_logo_height / lh if lh else 1.0,
                       1.0)
            new_size = (max(1, int(lw * scale)), max(1, int(lh * scale)))
            if new_size != logo.size:
                logo = logo.resize(new_size, Image.LANCZOS)
            
            # Get position
            if isinstance(position, (list, tuple)) and len(position) == 2:
                pos_x, pos_y = int(position[0]), int(position[1])
            else:
                pos_x, pos_y = 100, 100  # Default position
            
            # Clamp positions
            pos_x = max(0, min(pos_x, certificate.width - logo.width))
            pos_y = max(0, min(pos_y, certificate.height - logo.height))
            
            # Paste with alpha mask
            certificate.paste(logo, (pos_x, pos_y), logo)
            print(f"Placed logo '{logo_path}' at ({pos_x}, {pos_y})")
        else:
            print(f"Warning: Logo file '{logo_path}' not found at {full_logo_path}")
    except Exception as e:
        print(f"Warning: could not add logo '{logo_path}' ({e})")


def add_signature(certificate, sig_image_path, sig_position, sig_name, sig_title, 
                 text_position, font, color, script_dir, draw):
    """Add signature image and text to certificate"""
    full_sig_path = os.path.join(script_dir, sig_image_path)
    try:
        if os.path.exists(full_sig_path):
            sig_image = Image.open(full_sig_path).convert("RGBA")
            
            # Resize signature if needed
            sw, sh = sig_image.size
            scale = min(SIGNATURE_MAX_WIDTH / sw if sw else 1.0,
                       SIGNATURE_MAX_HEIGHT / sh if sh else 1.0,
                       1.0)
            new_size = (max(1, int(sw * scale)), max(1, int(sh * scale)))
            if new_size != sig_image.size:
                sig_image = sig_image.resize(new_size, Image.LANCZOS)
            
            # Position and paste signature
            pos_x, pos_y = int(sig_position[0]), int(sig_position[1])
            pos_x = max(0, min(pos_x, certificate.width - sig_image.width))
            pos_y = max(0, min(pos_y, certificate.height - sig_image.height))
            
            certificate.paste(sig_image, (pos_x, pos_y), sig_image)
            print(f"Placed signature '{sig_image_path}' at ({pos_x}, {pos_y})")
            
            # Add name and title text below signature
            text_x, text_y = int(text_position[0]), int(text_position[1])
            draw.text((text_x, text_y), sig_name, fill=color, font=font)
            draw.text((text_x, text_y + 40), sig_title, fill=color, font=font)
            
        else:
            print(f"Warning: Signature file '{sig_image_path}' not found at {full_sig_path}")
    except Exception as e:
        print(f"Warning: could not add signature '{sig_image_path}' ({e})")


def wrap_text(text, font, max_width):
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


# Main execution
script_dir = os.path.dirname(os.path.abspath(__file__))
certificates_dir = os.path.join(script_dir, OUTPUT_DIRECTORY)
os.makedirs(certificates_dir, exist_ok=True)

# Select template based on configuration
template_file = TEMPLATE_PARTICIPATION if CERTIFICATE_TYPE == 'participation' else TEMPLATE_ACHIEVEMENT
template_path = os.path.join(script_dir, template_file)

if not os.path.exists(template_path):
    print(f"Error: Certificate template not found at {template_path}")
    print(f"Please ensure '{template_file}' exists in the script directory.")
    exit(1)

print(f"Using template: {template_file} ({CERTIFICATE_TYPE})")
print(f"Generating certificates for {len(names)} recipient(s)...\n")

for index, name in enumerate(names, start=1):
    # Load template
    certificate_template = Image.open(template_path)
    draw = ImageDraw.Draw(certificate_template)
    
    # Load fonts
    name_font = load_font(NAME_FONT_PATH, NAME_FONT_SIZE, script_dir)
    award_font = load_font(AWARD_TEXT_FONT_PATH, AWARD_TEXT_FONT_SIZE, script_dir)
    sig_font = load_font(AWARD_TEXT_FONT_PATH, LEFT_SIGNATURE_FONT_SIZE, script_dir)
    
    # Add name
    draw.text(NAME_POSITION, name, fill=NAME_COLOR, font=name_font)
    
    # Add award text (with wrapping if needed)
    award_lines = wrap_text(AWARD_TEXT, award_font, AWARD_TEXT_MAX_WIDTH)
    y_offset = 0
    for line in award_lines:
        draw.text((AWARD_TEXT_POSITION[0], AWARD_TEXT_POSITION[1] + y_offset), 
                 line, fill=AWARD_TEXT_COLOR, font=award_font)
        y_offset += AWARD_TEXT_FONT_SIZE + 10
    
    # Add left logo
    add_logo(certificate_template, LEFT_LOGO_PATH, LEFT_LOGO_POSITION, 
            LEFT_LOGO_MAX_FRACTION, script_dir)
    
    # Add right logo
    add_logo(certificate_template, RIGHT_LOGO_PATH, RIGHT_LOGO_POSITION, 
            RIGHT_LOGO_MAX_FRACTION, script_dir)
    
    # Add left signature
    add_signature(certificate_template, LEFT_SIGNATURE_IMAGE, LEFT_SIGNATURE_POSITION,
                 LEFT_SIGNATURE_NAME, LEFT_SIGNATURE_TITLE, LEFT_SIGNATURE_TEXT_POSITION,
                 sig_font, LEFT_SIGNATURE_COLOR, script_dir, draw)
    
    # Add right signature
    add_signature(certificate_template, RIGHT_SIGNATURE_IMAGE, RIGHT_SIGNATURE_POSITION,
                 RIGHT_SIGNATURE_NAME, RIGHT_SIGNATURE_TITLE, RIGHT_SIGNATURE_TEXT_POSITION,
                 sig_font, RIGHT_SIGNATURE_COLOR, script_dir, draw)
    
    # Save as PDF
    pdf_path = os.path.join(certificates_dir, f"{name}.pdf")
    certificate_template.convert('RGB').save(pdf_path)
    
    print(f'{index}. Certificate generated for {name}\n')

print(f"All certificates saved to: {certificates_dir}")