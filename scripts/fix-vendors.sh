#!/bin/bash
# Post-build script to fix 'self is not defined' error in vendors.js

set -e

echo "🔧 Fixing vendors.js self reference issue..."

VENDORS_FILE=".next/server/vendors.js"

if [ -f "$VENDORS_FILE" ]; then
    # Backup original file
    cp "$VENDORS_FILE" "$VENDORS_FILE.backup"

    # Add polyfill at the beginning of the file
    TEMP_FILE=$(mktemp)

    cat > "$TEMP_FILE" << 'EOF'
// Fix for 'self is not defined' in server environment
if (typeof self === 'undefined') {
  var self = globalThis || global;
}
if (typeof window === 'undefined') {
  var window = globalThis || global;
}
if (!globalThis.webpackChunk_N_E) {
  globalThis.webpackChunk_N_E = [];
}

EOF

    # Append the original vendors.js content
    cat "$VENDORS_FILE" >> "$TEMP_FILE"

    # Replace the original file
    mv "$TEMP_FILE" "$VENDORS_FILE"

    echo "✅ Fixed vendors.js self reference issue"
else
    echo "❌ vendors.js file not found, skipping fix"
fi
