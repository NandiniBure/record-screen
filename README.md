# 🎥 Screen Recorder

A simple and powerful Electron-based screen recording application that captures screen, webcam, and combined video. All recordings are saved with a UUID-named folder structure, and a completion UI allows users to access the saved folder with ease.

## 📽️ Demo
 https://drive.google.com/file/d/1TAxnHZ1WyBo2-UCzPqImcYbjsQCmFIAG/view?usp=sharing
> 🔁 Replace the `your-video-id-here` in the link above with your actual YouTube video ID.

## 🚀 Features

- ✅ Record screen
- ✅ Record webcam
- ✅ Record both screen + webcam together
- ✅ Saves recordings in uniquely named (UUID) folders
- ✅ Simple and user-friendly interface

## 🛠️ Tech Stack

- **Electron.js** – Desktop application framework  
- **Node.js** – Backend logic  
- **JavaScript** – Application logic  
- **UUID** – To generate unique folder names  
- **File System (fs)** – To handle storage locally

## 🧪 Setup Instructions

```bash
# Clone the repository
git clone https://github.com/yourusername/screen-recorder.git
cd screen-recorder

# Install dependencies
npm install

# Run the application
npm start
