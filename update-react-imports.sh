#!/bin/bash

# Find all files with default React import and update them to namespace import
find src -name "*.tsx" -exec sed -i '' 's/import React from '\''react'\''/import * as React from '\''react'\''/' {} \;

echo "Updated React imports in all TSX files" 