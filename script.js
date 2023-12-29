// Wait for the DOM to be fully loaded before executing the script
document.addEventListener('DOMContentLoaded', () => {
    // Get references to various HTML elements
    const urlInput = document.getElementById('url');
    const fileInput = document.getElementById('file');
    const getSubtitlesButton = document.getElementById('get-subtitles');
    const webhookResponse = document.getElementById('webhook-response');
    const transcriptContainer = document.getElementById('transcript-container');
    const fullTranscript = document.getElementById('full-transcript');
    const toggleTranscriptButton = document.getElementById('toggle-transcript');
    const downloadSRTButton = document.getElementById('download-srt');
    const downloadVTTButton = document.getElementById('download-vtt');
    const loadingSpinner = document.getElementById('loading-spinner');
    const processingMessage = document.getElementById('processing-message');
    const warningMessage = document.getElementById('warning-message');

    // Function to hide the warning message
    const hideWarningMessage = () => {
        warningMessage.style.display = 'none';
    };

    // Function to show the warning message
    const showWarningMessage = () => {
        warningMessage.style.display = 'block';
    };

    // Function to start the processing indicators
    const startProcessing = () => {
        getSubtitlesButton.style.display = 'none';
        loadingSpinner.style.display = 'inline-block';
        processingMessage.style.display = 'inline';
    };

    // Function to stop the processing indicators
    const stopProcessing = () => {
        getSubtitlesButton.style.display = 'none';
        loadingSpinner.style.display = 'none';
        processingMessage.style.display = 'none';
    };

    // Function to display the transcription data in the UI
    const displayTranscription = (transcriptionData) => {
        fullTranscript.textContent = transcriptionData.full_transcript;
        downloadSRTButton.style.display = 'block';
        downloadVTTButton.style.display = 'block';

        const audioName = urlInput.value.split('/').pop() || fileInput.files[0]?.name || 'audio';
        const srtContent = transcriptionData.subtitles.find(sub => sub.format === 'srt').subtitles;
        const vttContent = transcriptionData.subtitles.find(sub => sub.format === 'vtt').subtitles;

        // Event listener for downloading SRT file
        downloadSRTButton.addEventListener('click', () => {
            downloadSubtitle(audioName + '.srt', srtContent, 'text/srt');
        });

        // Event listener for downloading VTT file
        downloadVTTButton.addEventListener('click', () => {
            downloadSubtitle(audioName + '.vtt', vttContent, 'text/vtt');
        });

        transcriptContainer.style.display = 'block';

        // Event listener to toggle transcript visibility
        toggleTranscriptButton.addEventListener('click', () => {
            const displayStyle = fullTranscript.style.display;
            fullTranscript.style.display = displayStyle === 'none' ? 'block' : 'none';
        });
    };

    // Function to download a subtitle file
    const downloadSubtitle = (fileName, content, contentType) => {
        const subtitleLink = document.createElement('a');
        const subtitleBlob = new Blob([content], { type: contentType });
        subtitleLink.href = URL.createObjectURL(subtitleBlob);
        subtitleLink.download = fileName;
        subtitleLink.click();
    };

    // Function to handle transcription data
    const handleTranscriptionData = (transcriptionData) => {
        displayTranscription(transcriptionData);
        stopProcessing(); // Call stopProcessing here to stop the processing indicators
    };

    // Function to handle the "Get Subtitles" button click
    const handleGetSubtitlesClick = async () => {
        hideWarningMessage();
    
        const audio_url = urlInput.value;
        const file = fileInput.files[0];
    
        if (!audio_url && !file) {
            showWarningMessage();
            return;
        }
    
        try {
            startProcessing();
    
            const formData = new FormData();
            if (file) {
                formData.append('audio', file);
            } else {
                formData.append('audio_url', audio_url);
            }
    
            const response = await fetch('https://getsubtitlesserverv2.onrender.com/get-subtitles', {
                method: 'POST',
                body: formData,
            });
    
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
    
            const data = await response.json();
            console.log('Gladia API Response:', data);
    
            if (data.payload && data.payload.transcription) {
                displayTranscription(data.payload.transcription);
                // Move stopProcessing inside the if block
                stopProcessing();
            }
    
        } catch (error) {
            console.error('Error fetching subtitles:', error);
        
            // Log the Gladia API response if available
            if (error.response) {
                console.log('Gladia API Error Response:', error.response.data);
            }
        
            webhookResponse.textContent = 'Error fetching subtitles.';
        } finally {
            //stopProcessing();
        }
    };

    // Event listener for the "Get Subtitles" button click
    getSubtitlesButton.addEventListener('click', handleGetSubtitlesClick);

    // WebSocket connection setup
    const socket = new WebSocket('wss://getsubtitlesserverv2.onrender.com');

    // Event listener for WebSocket connection open
    socket.addEventListener('open', (event) => {
        console.log('WebSocket connection opened:', event);
    });

    // Event listener for WebSocket messages
    socket.addEventListener('message', (event) => {
        const data = JSON.parse(event.data);
        console.log('WebSocket message received:', data);

        if (data.payload && data.payload.transcription) {
            handleTranscriptionData(data.payload.transcription);
        }
    });

    // Event listener for WebSocket connection close
    socket.addEventListener('close', (event) => {
        console.log('WebSocket connection closed:', event);
    });
});
