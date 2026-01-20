import os
import sys
import argparse
import json
from huggingface_hub import HfApi, create_repo

def sync_secrets(api, repo_id, secrets_dict):
    """Sync secrets to Hugging Face Spaces."""
    print(f"Syncing secrets to {repo_id}...")
    for key, value in secrets_dict.items():
        if not value or key.startswith('VITE_') or key == 'NODE_ENV':
            # Skip empty values or frontend-only variables
            continue
        try:
            api.add_space_secret(repo_id=repo_id, key=key, value=str(value))
            print(f"  ✅ Set {key}")
        except Exception as e:
            print(f"  ❌ Failed to set {key}: {e}")

def main():
    parser = argparse.ArgumentParser(description="Deploy and sync secrets to Hugging Face Spaces")
    parser.add_argument("--repo_id", required=True, help="Space ID (e.g., username/space-name)")
    parser.add_argument("--token", required=True, help="Hugging Face Write Token")
    parser.add_argument("--secrets_json", help="JSON string of secrets")
    parser.add_argument("--env_file", help="Path to .env file to sync from")
    
    args = parser.parse_args()
    api = HfApi(token=args.token)

    # 1. Ensure Space exists
    try:
        create_repo(
            repo_id=args.repo_id, 
            token=args.token, 
            repo_type="space", 
            space_sdk="docker", 
            private=False,
            exist_ok=True
        )
        print(f"🚀 Space {args.repo_id} is ready.")
    except Exception as e:
        print(f"❌ Error creating space: {e}")
        sys.exit(1)

    # 2. Collect secrets
    secrets_to_sync = {}
    
    # Load from JSON (GitHub Actions)
    if args.secrets_json:
        try:
            secrets_to_sync.update(json.loads(args.secrets_json))
        except Exception as e:
            print(f"❌ Error parsing secrets JSON: {e}")

    # Load from .env file (Local)
    if args.env_file and os.path.exists(args.env_file):
        with open(args.env_file, 'r') as f:
            for line in f:
                if line.strip() and not line.startswith('#') and '=' in line:
                    key, value = line.strip().split('=', 1)
                    secrets_to_sync[key] = value.strip().strip('"').strip("'")

    # 3. Sync
    if secrets_to_sync:
        sync_secrets(api, args.repo_id, secrets_to_sync)
        # Always ensure PORT is 7860 for HF
        api.add_space_secret(repo_id=args.repo_id, key="PORT", value="7860")
        print("✅ Mandatory PORT=7860 ensured.")
    else:
        print("ℹ️ No secrets provided to sync.")

if __name__ == "__main__":
    main()
