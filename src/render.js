const { desktopCapturer, remote } = require('electron');
const { Menu } = remote;
const { writeFile, mkdir } = require('fs');
const path = require('path');

let screenRecorder;
let webcamRecorder;
let combinedRecorder;

let recordedScreenChunks = [];
let recordedWebcamChunks = [];
let recordedCombinedChunks = [];

let screenStream;
let webcamStream;

let sessionUUID = '';
let stopCount = 0;

const videoElement = document.querySelector('video');
const videoSelectButtons = document.querySelectorAll('.videoSelectBtn');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');

videoSelectButtons.forEach(btn => btn.addEventListener('click', getVideoSources));

startBtn.onclick = () => {
  if (screenRecorder && screenRecorder.state === 'inactive') screenRecorder.start();
  if (webcamRecorder && webcamRecorder.state === 'inactive') webcamRecorder.start();
  if (combinedRecorder && combinedRecorder.state === 'inactive') combinedRecorder.start();

  startBtn.disabled = true;
  stopBtn.disabled = false;
  startBtn.classList.add('is-danger');
};

stopBtn.onclick = () => {
  if (screenRecorder && screenRecorder.state === 'recording') screenRecorder.stop();
  if (webcamRecorder && webcamRecorder.state === 'recording') webcamRecorder.stop();
  if (combinedRecorder && combinedRecorder.state === 'recording') combinedRecorder.stop();

  stopBtn.disabled = true;
  startBtn.disabled = false;
  startBtn.classList.remove('is-danger');
};

async function getVideoSources() {
  const inputSources = await desktopCapturer.getSources({
    types: ['window', 'screen']
  });

  const videoOptionsMenu = Menu.buildFromTemplate(
    inputSources.map(source => ({
      label: source.name,
      click: () => selectSource(source)
    }))
  );

  videoOptionsMenu.popup();
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0,
          v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function selectSource(source) {
  startBtn.disabled = false;

  const includeWebcam = document.getElementById('includeWebcam').checked;

  recordedScreenChunks.length = 0;
  recordedWebcamChunks.length = 0;
  recordedCombinedChunks.length = 0;

  const recordingNameInput = document.getElementById('recordingNameInput');
  const inputName = recordingNameInput?.value?.trim();
  sessionUUID = inputName || generateUUID();
  stopCount = 0;

  const screenConstraints = {
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: source.id
      }
    }
  };

  screenStream = await navigator.mediaDevices.getUserMedia(screenConstraints);

  if (includeWebcam) {
    webcamStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
  } else {
    webcamStream = null;
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const [screenTrack] = screenStream.getVideoTracks();
  const screenSettings = screenTrack.getSettings();

  canvas.width = screenSettings.width || 1280;
  canvas.height = screenSettings.height || 720;

  const screenVideo = document.createElement('video');
  screenVideo.srcObject = screenStream;
  screenVideo.play();

  let webcamVideo;
  if (includeWebcam && webcamStream) {
    webcamVideo = document.createElement('video');
    webcamVideo.srcObject = webcamStream;
    webcamVideo.play();
  }

  function drawFrame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);
    if (includeWebcam && webcamVideo) {
      ctx.drawImage(webcamVideo, canvas.width - 330, canvas.height - 250, 320, 240);
    }
    requestAnimationFrame(drawFrame);
  }
  drawFrame();

  const combinedStream = canvas.captureStream(30);
  videoElement.srcObject = combinedStream;
  videoElement.play();

  screenRecorder = new MediaRecorder(screenStream, { mimeType: 'video/webm; codecs=vp9' });
  screenRecorder.ondataavailable = e => {
    if (e.data.size > 0) recordedScreenChunks.push(e.data);
  };
  screenRecorder.onstop = handleRecordingStop;

  if (includeWebcam && webcamStream) {
    webcamRecorder = new MediaRecorder(webcamStream, { mimeType: 'video/webm; codecs=vp9' });
    webcamRecorder.ondataavailable = e => {
      if (e.data.size > 0) recordedWebcamChunks.push(e.data);
    };
    webcamRecorder.onstop = handleRecordingStop;
  } else {
    webcamRecorder = null;
  }

  combinedRecorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm; codecs=vp9' });
  combinedRecorder.ondataavailable = e => {
    if (e.data.size > 0) recordedCombinedChunks.push(e.data);
  };
  combinedRecorder.onstop = handleRecordingStop;
}

function handleRecordingStop() {
  stopCount++;
  const expectedStops = webcamRecorder ? 3 : 2;

  if (stopCount === expectedStops) {
    saveRecordings();
  }
}

async function saveRecordings() {
  const folderPath = path.join('videos', sessionUUID);
  document.getElementById('recordingCompleteScreen').style.display = 'block';

  const openFolderBtn = document.getElementById('openFolderBtn');
  openFolderBtn.onclick = () => {
    const { shell } = require('electron');
    const folderFullPath = path.join(__dirname, 'videos', sessionUUID);
    shell.openPath(folderFullPath);
  };

  mkdir(folderPath, { recursive: true }, async (err) => {
    if (err) {
      console.error('Error creating folder:', err);
      return;
    }

    // Save screen recording (optional)
    if (recordedScreenChunks.length) {
      const screenBlob = new Blob(recordedScreenChunks, { type: 'video/webm; codecs=vp9' });
      const screenBuffer = Buffer.from(await screenBlob.arrayBuffer());
      const screenFilePath = path.join(folderPath, 'screen.webm');

      writeFile(screenFilePath, screenBuffer, (err) => {
        if (err) console.error('Error saving screen recording:', err);
        else console.log('Screen recording saved to', screenFilePath);
      });
    }

    let webcamExists = false;

    // Save webcam recording
    if (recordedWebcamChunks.length) {
      webcamExists = true;

      const webcamBlob = new Blob(recordedWebcamChunks, { type: 'video/webm; codecs=vp9' });
      const webcamBuffer = Buffer.from(await webcamBlob.arrayBuffer());
      const webcamFilePath = path.join(folderPath, 'webcam.webm');

      writeFile(webcamFilePath, webcamBuffer, (err) => {
        if (err) console.error('Error saving webcam recording:', err);
        else console.log('Webcam recording saved to', webcamFilePath);
      });
    }

    // Save final combined recording ONLY IF webcam was recorded
    if (webcamExists && recordedCombinedChunks.length) {
      const combinedBlob = new Blob(recordedCombinedChunks, { type: 'video/webm; codecs=vp9' });
      const combinedBuffer = Buffer.from(await combinedBlob.arrayBuffer());
      const combinedFilePath = path.join(folderPath, 'final.webm');

      writeFile(combinedFilePath, combinedBuffer, (err) => {
        if (err) console.error('Error saving combined recording:', err);
        else console.log('Combined recording saved to', combinedFilePath);
      });
    } else {
      console.log('Final combined video not saved because webcam recording was not present.');
    }

    recordedScreenChunks.length = 0;
    recordedWebcamChunks.length = 0;
    recordedCombinedChunks.length = 0;
  });
}
