#!/bin/bash
# Install dependencies
npm install

# Install system packages
apt-get update
apt-get install -y python3 python3-pip ffmpeg

# Install yt-dlp
pip3 install yt-dlp

echo "Build complete!"
