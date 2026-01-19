import gradio as gr
import requests
import pandas as pd
import io
from PIL import Image
import os

API_URL = "http://localhost:7860"

def get_preview():
    try:
        response = requests.post(f"{API_URL}/preview")
        if response.status_code == 200:
            return Image.open(io.BytesIO(response.content))
        else:
            return None
    except Exception as e:
        print(f"Error getting preview: {e}")
        return None

def update_config(cert_type, name_x, name_y, name_size, award_text, award_x, award_y, award_size, award_width):
    # Update Certificate Type
    requests.post(f"{API_URL}/config/certificate-type", data={"certificate_type": cert_type})
    
    # Update Name Settings
    requests.post(f"{API_URL}/config/name-settings", json={
        "position": {"x": int(name_x), "y": int(name_y)},
        "font_size": int(name_size),
        "font_path": "DancingScript-Regular.ttf",
        "color": "black"
    })
    
    # Update Award Text
    requests.post(f"{API_URL}/config/award-text", json={
        "text": award_text,
        "position": {"x": int(award_x), "y": int(award_y)},
        "font_size": int(award_size),
        "max_width": int(award_width),
        "font_path": "times.ttf",
        "color": "black"
    })
    
    return get_preview()

def upload_assets(template_part, template_ach, logo_l, logo_r, sig_l, sig_r):
    status = []
    if template_part:
        with open(template_part, "rb") as f:
            requests.post(f"{API_URL}/upload-template", files={"file": f}, data={"template_type": "participation"})
            status.append("Participation Template Uploaded")
    if template_ach:
        with open(template_ach, "rb") as f:
            requests.post(f"{API_URL}/upload-template", files={"file": f}, data={"template_type": "achievement"})
            status.append("Achievement Template Uploaded")
    if logo_l:
        with open(logo_l, "rb") as f:
            requests.post(f"{API_URL}/upload-logo", files={"file": f}, data={"logo_type": "left"})
            status.append("Left Logo Uploaded")
    if logo_r:
        with open(logo_r, "rb") as f:
            requests.post(f"{API_URL}/upload-logo", files={"file": f}, data={"logo_type": "right"})
            status.append("Right Logo Uploaded")
    if sig_l:
        with open(sig_l, "rb") as f:
            requests.post(f"{API_URL}/upload-signature", files={"file": f}, data={"signature_type": "left"})
            status.append("Left Signature Uploaded")
    if sig_r:
        with open(sig_r, "rb") as f:
            requests.post(f"{API_URL}/upload-signature", files={"file": f}, data={"signature_type": "right"})
            status.append("Right Signature Uploaded")
    
    return ", ".join(status) if status else "No files uploaded", get_preview()

def generate_bulk(csv_file):
    if csv_file is None:
        return None, "Please upload a CSV file"
    
    try:
        df = pd.read_csv(csv_file.name)
        if "name" not in df.columns and "Name" not in df.columns:
            return None, "CSV must have a 'name' or 'Name' column"
        
        name_col = "name" if "name" in df.columns else "Name"
        names = df[name_col].dropna().tolist()
        
        response = requests.post(f"{API_URL}/generate-zip", json={"names": names})
        if response.status_code == 200:
            zip_path = "certificates.zip"
            with open(zip_path, "wb") as f:
                f.write(response.content)
            return zip_path, f"Successfully generated {len(names)} certificates"
        else:
            return None, f"Error: {response.text}"
    except Exception as e:
        return None, f"Processing Error: {str(e)}"

# Define Gradio Interface
with gr.Blocks(title="Certificate Generator UI") as demo:
    gr.Markdown("# 🏆 Certificate Generator Professional")
    gr.Markdown("Configure your certificate template and generate bulk certificates.")
    
    with gr.Tab("1. Asset Upload"):
        with gr.Row():
            with gr.Column():
                templ_p = gr.File(label="Participation Template (PNG)")
                templ_a = gr.File(label="Achievement Template (PNG)")
            with gr.Column():
                l_logo = gr.File(label="Left Logo (PNG)")
                r_logo = gr.File(label="Right Logo (PNG)")
            with gr.Column():
                l_sig = gr.File(label="Left Signature (PNG)")
                r_sig = gr.File(label="Right Signature (PNG)")
        
        upload_btn = gr.Button("Upload & Refresh Preview", variant="primary")
        upload_status = gr.Textbox(label="Upload Status")

    with gr.Tab("2. Layout Customization"):
        with gr.Row():
            with gr.Column():
                c_type = gr.Dropdown(["participation", "achievement"], label="Certificate Type", value="participation")
                gr.Markdown("### Name Settings")
                n_x = gr.Slider(0, 2000, value=810, label="Name X")
                n_y = gr.Slider(0, 2000, value=596, label="Name Y")
                n_size = gr.Slider(10, 200, value=85, label="Name Font Size")
                
                gr.Markdown("### Award Text Settings")
                a_text = gr.Textbox(label="Award Text", value="For outstanding participation in the CSI Workshop 2025")
                a_x = gr.Slider(0, 2000, value=810, label="Award X")
                a_y = gr.Slider(0, 2000, value=720, label="Award Y")
                a_size = gr.Slider(10, 100, value=45, label="Award Font Size")
                a_width = gr.Slider(200, 1500, value=1000, label="Max Width")
                
                refresh_btn = gr.Button("Update Layout & Preview", variant="primary")
            
            with gr.Column():
                preview_img = gr.Image(label="Live Preview")

    with gr.Tab("3. Bulk Generation"):
        gr.Markdown("Upload a CSV file with a **name** column to generate certificates in bulk.")
        csv_input = gr.File(label="Recipients CSV")
        gen_btn = gr.Button("Generate Certificates (ZIP)", variant="primary")
        gen_status = gr.Textbox(label="Generation Status")
        zip_output = gr.File(label="Download ZIP")

    # Event Handlers
    upload_btn.click(upload_assets, inputs=[templ_p, templ_a, l_logo, r_logo, l_sig, r_sig], outputs=[upload_status, preview_img])
    refresh_btn.click(update_config, inputs=[c_type, n_x, n_y, n_size, a_text, a_x, a_y, a_size, a_width], outputs=[preview_img])
    gen_btn.click(generate_bulk, inputs=[csv_input], outputs=[zip_output, gen_status])

if __name__ == "__main__":
    demo.launch(server_name="0.0.0.0", server_port=7861) # Run on different port if standalone
