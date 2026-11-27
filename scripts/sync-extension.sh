#!/usr/bin/env bash
# Points the extension at this project's backend (from .env) and rebuilds the ZIP. Run after remix/key change.
set -e
cd "$(dirname "$0")/.."
URL=$(grep '^VITE_SUPABASE_URL=' .env | cut -d'"' -f2)
KEY=$(grep '^VITE_SUPABASE_PUBLISHABLE_KEY=' .env | cut -d'"' -f2)
sed -i -E "s#^const SB_URL = \".*\";#const SB_URL = \"$URL\";#; s#^const SB_KEY = \".*\";#const SB_KEY = \"$KEY\";#" extension/api.js
python3 - "$URL" <<'PY'
import json,sys
m=json.load(open('extension/manifest.json'))
m['host_permissions']=[sys.argv[1]+'/*']+[h for h in m['host_permissions'] if 'lovable.cloud' not in h]
json.dump(m,open('extension/manifest.json','w'),indent=2)
PY
rm -f public/stikdesi-extension.zip
(cd extension && nix run nixpkgs#zip -- -qr ../public/stikdesi-extension.zip .)
