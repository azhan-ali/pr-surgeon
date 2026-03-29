#!/bin/bash

# Ensure script stops on first error
set -e

echo "Installing dependencies..."
npm install

echo "Linking package globally..."
npm link

echo "pr-surgeon setup complete! You can now run 'pr-surgeon scan' or 'npx pr-surgeon scan'"
