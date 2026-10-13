#!/bin/bash
# Script to sideload galgot-f1-v0.3.0.apk via adb to Blackview Active 5
# Requirements: adb installed, device connected, usb debugging enabled

APK_PATH="galgot-f1-v0.3.0.apk"

if [ ! -f "$APK_PATH" ]; then
    echo "Error: APK file $APK_PATH not found in the current directory."
    echo "Please place the APK in the current directory or modify APK_PATH in the script."
else
    echo "Checking for connected ADB devices..."
    adb devices

    echo "Installing $APK_PATH to the device..."
    # -r means replace existing application
    # -d means allow version code downgrade
    adb install -r -d "$APK_PATH"

    if [ $? -eq 0 ]; then
        echo "Installation successful!"
    else
        echo "Installation failed. Please check the adb output for more details."
    fi
fi
