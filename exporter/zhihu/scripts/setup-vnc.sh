#!/bin/bash

echo "==================================="
echo "VNC Environment Setup Script"
echo "==================================="
echo ""

# Detect OS
if [ -f /etc/arch-release ]; then
    OS="arch"
elif [ -f /etc/debian_version ]; then
    OS="debian"
elif [ -f /etc/redhat-release ]; then
    OS="redhat"
else
    OS="unknown"
fi

echo "Detected OS: $OS"
echo ""

# Install dependencies based on OS
case $OS in
    arch)
        echo "Installing dependencies for Arch Linux..."
        sudo pacman -S --noconfirm xorg-server-xvfb x11vnc
        ;;
    debian)
        echo "Installing dependencies for Debian/Ubuntu..."
        sudo apt-get update
        sudo apt-get install -y xvfb x11vnc
        ;;
    redhat)
        echo "Installing dependencies for RHEL/CentOS/Fedora..."
        sudo dnf install -y xorg-x11-server-Xvfb x11vnc || sudo yum install -y xorg-x11-server-Xvfb x11vnc
        ;;
    *)
        echo "Unknown OS. Please install xvfb and x11vnc manually."
        exit 1
        ;;
esac

echo ""
echo "Checking installations..."

# Check if Xvfb is installed
if command -v Xvfb &> /dev/null; then
    echo "✓ Xvfb installed: $(which Xvfb)"
else
    echo "✗ Xvfb not found"
    exit 1
fi

# Check if x11vnc is installed
if command -v x11vnc &> /dev/null; then
    echo "✓ x11vnc installed: $(which x11vnc)"
else
    echo "✗ x11vnc not found"
    exit 1
fi

echo ""
echo "==================================="
echo "VNC environment setup complete!"
echo "==================================="
echo ""
echo "Next steps:"
echo "1. Copy .env.example to .env: cp .env.example .env"
echo "2. Install npm dependencies: npm install"
echo "3. Install Playwright browsers: npm run install:browser"
echo "4. Start the application: npm run dev"
echo ""
echo "To connect to VNC:"
echo "- Use any VNC client (e.g., vncviewer, TigerVNC, RealVNC)"
echo "- Connect to: localhost:5900 (or the port specified in .env)"
echo ""
