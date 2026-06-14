const API_BASE_URL = 'http://localhost:8001';

const elements = {
    complaintInput: document.getElementById('complaintInput'),
    audioFileInput: document.getElementById('audioFileInput'),
    recordBtn: document.getElementById('recordBtn'),
    clearAudioBtn: document.getElementById('clearAudioBtn'),
    audioItemsContainer: document.getElementById('audioItemsContainer'),
    audioStatus: document.getElementById('audioStatus'),
    analyzeBtn: document.getElementById('analyzeBtn'),
    searchBtn: document.getElementById('searchBtn'),
    analysisCard: document.getElementById('analysisCard'),
    solutionCard: document.getElementById('solutionCard'),
    historyCard: document.getElementById('historyCard'),
    sentimentValue: document.getElementById('sentimentValue'),
    urgencyBadge: document.getElementById('urgencyBadge'),
    keywordsList: document.getElementById('keywordsList'),
    summaryText: document.getElementById('summaryText'),
    solutionContent: document.getElementById('solutionContent'),
    similarClaimsList: document.getElementById('similarClaimsList'),
    loader: document.getElementById('loader'),
    themeToggle: document.getElementById('themeToggle')
};

let mediaRecorder = null;
let recordedChunks = [];
let isRecording = false;
let audioItems = [];
let nextAudioId = 1;

const initTheme = () => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.documentElement.classList.add('light-mode');
        elements.themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }
};

const toggleTheme = () => {
    const isLight = document.documentElement.classList.toggle('light-mode');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    elements.themeToggle.innerHTML = isLight ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
};

const createAudioItem = (file, source) => {
    const id = nextAudioId++;
    const name = source === 'upload' ? file.name : `Enregistrement ${id}`;
    const url = URL.createObjectURL(file);

    return {
        id,
        file,
        source,
        name,
        url,
        transcript: '',
        transcriptVisible: false,
        isTranscribing: false
    };
};

const escapeHtml = (text) => {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

const renderAudioItems = () => {
    if (audioItems.length === 0) {
        elements.audioItemsContainer.innerHTML = '<p class="audio-empty">Aucun audio ajouté pour le moment.</p>';
    } else {
        elements.audioItemsContainer.innerHTML = audioItems.map(item => `
            <div class="audio-item ${item.transcriptVisible ? 'open' : ''}" data-id="${item.id}">
                <div class="audio-item-header">
                    <div class="audio-item-info">
                        <span class="audio-item-label">${item.source === 'upload' ? 'Upload' : 'Enregistrement'}</span>
                        <strong class="audio-item-title">${escapeHtml(item.name)}</strong>
                    </div>
                    <div class="audio-item-actions">
                        <button class="btn btn-tertiary icon-btn" type="button" data-action="toggle" data-id="${item.id}" title="Afficher / masquer la transcription">
                            <i class="fas fa-chevron-${item.transcriptVisible ? 'up' : 'down'}"></i>
                        </button>
                        <button class="btn btn-secondary icon-btn" type="button" data-action="remove" data-id="${item.id}" title="Supprimer cet audio">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="audio-item-player">
                    <audio controls src="${item.url}"></audio>
                </div>
                <div class="audio-item-transcript ${item.transcriptVisible ? '' : 'hidden'}">
                    ${item.isTranscribing ? 'Transcription en cours...' : escapeHtml(item.transcript || 'Aucune transcription disponible.')}
                </div>
            </div>
        `).join('');
    }

    updateAudioStatus();
};

const updateAudioStatus = () => {
    const uploadCount = audioItems.filter(item => item.source === 'upload').length;
    const recordCount = audioItems.filter(item => item.source === 'record').length;
    const parts = [];

    if (uploadCount > 0) {
        parts.push(`${uploadCount} fichier${uploadCount > 1 ? 's' : ''} uploadé${uploadCount > 1 ? 's' : ''}`);
    }
    if (recordCount > 0) {
        parts.push(`${recordCount} enregistrement${recordCount > 1 ? 's' : ''}`);
    }

    if (parts.length === 0) {
        elements.audioStatus.innerText = 'Aucun audio sélectionné.';
        elements.clearAudioBtn.classList.add('hidden');
    } else {
        elements.audioStatus.innerText = parts.join(' • ');
        elements.clearAudioBtn.classList.remove('hidden');
    }
};

const clearAudio = () => {
    audioItems.forEach(item => {
        if (item.url) {
            URL.revokeObjectURL(item.url);
        }
    });
    audioItems = [];
    elements.audioFileInput.value = '';
    renderAudioItems();
};

const addAudioFiles = async (files, source) => {
    const items = Array.from(files).map(file => createAudioItem(file, source));
    audioItems = [...items, ...audioItems];
    renderAudioItems();

    for (const item of items) {
        await transcribeAudioItem(item.id);
    }
};

const handleAudioFileChange = async () => {
    const files = Array.from(elements.audioFileInput.files);
    if (files.length === 0) {
        return;
    }

    await addAudioFiles(files, 'upload');
    elements.audioFileInput.value = '';
};

const handleAudioItemAction = (event) => {
    const button = event.target.closest('button');
    if (!button) return;

    const action = button.dataset.action;
    const itemId = Number(button.dataset.id);
    if (!itemId || !action) return;

    if (action === 'toggle') {
        toggleAudioItemTranscript(itemId);
    }
    if (action === 'remove') {
        removeAudioItem(itemId);
    }
};

const toggleAudioItemTranscript = (itemId) => {
    const item = audioItems.find(it => it.id === itemId);
    if (!item) return;
    item.transcriptVisible = !item.transcriptVisible;
    renderAudioItems();
};

const removeAudioItem = (itemId) => {
    const itemIndex = audioItems.findIndex(it => it.id === itemId);
    if (itemIndex === -1) return;
    const [item] = audioItems.splice(itemIndex, 1);
    if (item.url) {
        URL.revokeObjectURL(item.url);
    }
    renderAudioItems();
};

const addRecordedAudio = async (blob) => {
    const file = new File([blob], `Enregistrement ${nextAudioId}.webm`, { type: 'audio/webm' });
    await addAudioFiles([file], 'record');
};

const startRecording = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return alert('Votre navigateur ne prend pas en charge l\'enregistrement audio.');
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        recordedChunks = [];

        mediaRecorder.addEventListener('dataavailable', (event) => {
            if (event.data && event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        });

        mediaRecorder.addEventListener('stop', async () => {
            const blob = new Blob(recordedChunks, { type: 'audio/webm' });
            await addRecordedAudio(blob);
        });

        mediaRecorder.start();
        isRecording = true;
        elements.recordBtn.innerHTML = '<i class="fas fa-stop"></i> Arreter l\'enregistrement';
        elements.audioStatus.innerText = 'Enregistrement en cours...';
        elements.clearAudioBtn.classList.add('hidden');
    } catch (error) {
        console.error('Erreur d\'enregistrement :', error);
        alert('Impossible d\'acceder au micro. Verifiez les permissions de votre navigateur.');
    }
};

const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }
    isRecording = false;
    elements.recordBtn.innerHTML = '<i class="fas fa-microphone"></i> Enregistrer un audio';
};

const toggleRecording = () => {
    if (isRecording) {
        stopRecording();
    } else {
        startRecording();
    }
};

const transcribeAudioItem = async (itemId) => {
    const item = audioItems.find(it => it.id === itemId);
    if (!item || item.isTranscribing) return '';

    item.isTranscribing = true;
    renderAudioItems();

    const formData = new FormData();
    const fieldName = item.source === 'upload' ? 'audio_upload' : 'audio_recording';
    formData.append(fieldName, item.file);

    try {
        const response = await fetch(`${API_BASE_URL}/transcribe/`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        const transcript = String(data.texte_transcrit || data.transcription || '').trim();
        item.transcript = transcript || 'Aucune transcription recue.';
        return item.transcript;
    } catch (error) {
        console.error('Erreur transcription audio :', error);
        item.transcript = 'Erreur : impossible de transcrire cet audio.';
        return item.transcript;
    } finally {
        item.isTranscribing = false;
        renderAudioItems();
    }
};

const ensureAllTranscripts = async () => {
    const pendingItems = audioItems.filter(item => !item.transcript && !item.isTranscribing);
    await Promise.all(pendingItems.map(item => transcribeAudioItem(item.id)));
};

const analyzeComplaint = async () => {
    await sendRequest('/analyze/');
};

const generateSolution = async () => {
    await sendRequest('/search/');
};

const sendRequest = async (endpoint) => {
    const texte = elements.complaintInput.value.trim();
    const hasText = texte.length > 0;
    const hasAudio = audioItems.length > 0;

    if (!hasText && !hasAudio) {
        return alert('Veuillez saisir une plainte ou uploader/enregistrer un audio.');
    }

    toggleLoader(true);

    try {
        let requestText = texte;

        if (hasAudio) {
            await ensureAllTranscripts();
            const audioText = audioItems.map(item => item.transcript).filter(Boolean).join(' ');
            requestText = requestText ? `${requestText} ${audioText}` : audioText;
        }

        const bodyPayload = endpoint.includes('/search/')
            ? { texte_actuel: requestText }
            : { texte: requestText };

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyPayload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Reponse invalide du serveur');
        }

        const data = await response.json();
        if (endpoint.includes('/search/')) {
            displaySolutionAndHistory(data);
        } else {
            displayAnalysis(data);
        }
    } catch (error) {
        console.error('Erreur de requete :', error);
        alert('Erreur lors de la communication avec le service IA. Verifiez qu\'il est bien lance sur le port 8001.');
    } finally {
        toggleLoader(false);
    }
};

const displayAnalysis = (data) => {
    elements.analysisCard.classList.remove('hidden');
    
    elements.sentimentValue.innerText = data.sentiment.replace('_', ' ');
    elements.sentimentValue.className = `value ${data.sentiment}`;
    
    elements.urgencyBadge.innerText = data.urgence;
    elements.urgencyBadge.className = `badge ${data.urgence.toLowerCase()}`;
    
    elements.keywordsList.innerHTML = '';
    data.mots_cles_detectes.forEach(tag => {
        const span = document.createElement('span');
        span.className = 'tag';
        span.innerText = tag;
        elements.keywordsList.appendChild(span);
    });
    
    elements.summaryText.innerText = data.resume;
    
    elements.analysisCard.scrollIntoView({ behavior: 'smooth' });
};

const displaySolutionAndHistory = (data) => {
    elements.solutionCard.classList.remove('hidden');
    elements.historyCard.classList.remove('hidden');
    
    typeWriter(data.message, elements.solutionContent);
    
    elements.similarClaimsList.innerHTML = '';
    if (data.similar_claims.length === 0) {
        elements.similarClaimsList.innerHTML = '<p class="text-muted">Aucun cas similaire trouve.</p>';
    } else {
        data.similar_claims.forEach(claim => {
            const item = document.createElement('div');
            item.className = 'history-item';
            item.innerHTML = `
                <div class="history-meta">
                    <span class="score"><i class="fas fa-bullseye"></i> Match: ${Math.round((1 - claim.score_similarite/2) * 100)}%</span>
                    <span class="hist-cat">${claim.categorie}</span>
                </div>
                <div class="hist-solution">${claim.solution_suggeree}</div>
            `;
            elements.similarClaimsList.appendChild(item);
        });
    }
};

const toggleLoader = (show) => {
    if (show) {
        elements.loader.classList.remove('hidden');
    } else {
        elements.loader.classList.add('hidden');
    }
};

const typeWriter = (text, element) => {
    element.innerHTML = '';
    let i = 0;
    const speed = 10;
    
    const tick = () => {
        if (i < text.length) {
            element.innerHTML += text.charAt(i);
            i++;
            setTimeout(tick, speed);
        }
    };
    tick();
};

elements.audioItemsContainer.addEventListener('click', handleAudioItemAction);

window.addEventListener('DOMContentLoaded', () => {
    initTheme();
    renderAudioItems();
});

elements.themeToggle.addEventListener('click', toggleTheme);
elements.audioFileInput.addEventListener('change', handleAudioFileChange);
elements.recordBtn.addEventListener('click', toggleRecording);
elements.clearAudioBtn.addEventListener('click', clearAudio);
elements.analyzeBtn.addEventListener('click', analyzeComplaint);
elements.searchBtn.addEventListener('click', generateSolution);
