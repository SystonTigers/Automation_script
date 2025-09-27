#!/bin/bash

# Bulk fix for ES6 static field syntax in Google Apps Script files
# Converts static field declarations to getter methods

echo "🔧 Starting bulk ES6 static field syntax fixes..."

# Function to fix static fields in a file
fix_static_fields() {
    local file="$1"
    echo "Fixing: $file"

    # Create a temporary file
    local temp_file="${file}.tmp"

    # Process the file with multiple sed commands to fix static field patterns
    sed -E '
        # Fix: static FIELD_NAME = {
        s/^(\s*)static\s+([A-Z_][A-Z0-9_]*)\s*=\s*\{/\1static get\2() {\
\1  return {/

        # Fix: static fieldName = new Map()
        s/^(\s*)static\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*new\s+Map\(\)\s*;/\1static get\2() {\
\1  if (!this._\2) this._\2 = new Map();\
\1  return this._\2;\
\1}/

        # Fix: static fieldName = new Set()
        s/^(\s*)static\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*new\s+Set\(\)\s*;/\1static get\2() {\
\1  if (!this._\2) this._\2 = new Set();\
\1  return this._\2;\
\1}/

        # Fix: static fieldName = []
        s/^(\s*)static\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*\[\]\s*;/\1static get\2() {\
\1  if (!this._\2) this._\2 = [];\
\1  return this._\2;\
\1}/

    ' "$file" > "$temp_file"

    # Replace original file if changes were made
    if ! cmp -s "$file" "$temp_file"; then
        mv "$temp_file" "$file"
        echo "✅ Fixed static fields in $file"
        return 0
    else
        rm "$temp_file"
        return 1
    fi
}

# Find all .gs files and fix them
fixed_count=0
for file in src/*.gs; do
    if [[ -f "$file" ]]; then
        if fix_static_fields "$file"; then
            ((fixed_count++))
        fi
    fi
done

echo "🎉 Bulk fix complete! Fixed $fixed_count files."
echo "⚠️  Note: You may still need to manually fix closing braces for object literals and update references."