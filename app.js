const API_BASE_URL = 'http://localhost:8001';

const elements = {
    complaintInput: document.getElementById('complaintInput'),
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

// --- Theme Management ---

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

// --- Actions ---

const analyzeComplaint = async () => {
    const text = elements.complaintInput.value.trim();
    if (!text) return alert("Veuillez saisir une plainte.");

    toggleLoader(true);
    
    try {
        const response = await fetch(`${API_BASE_URL}/analyze/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ texte: text })
        });

        const data = await response.json();
        displayAnalysis(data);
    } catch (error) {
        console.error("Erreur d'analyse:", error);
        alert("Erreur lors de la communication avec le service IA. Vérifiez qu'il est bien lancé sur le port 8001.");
    } finally {
        toggleLoader(false);
    }
};

const generateSolution = async () => {
    const text = elements.complaintInput.value.trim();
    if (!text) return alert("Veuillez saisir une plainte.");

    toggleLoader(true);
    
    try {
        const response = await fetch(`${API_BASE_URL}/search/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ texte_actuel: text })
        });

        const data = await response.json();
        displaySolutionAndHistory(data);
    } catch (error) {
        console.error("Erreur de recherche:", error);
        alert("Erreur lors de la recherche sémantique. Vérifiez le service IA.");
    } finally {
        toggleLoader(false);
    }
};

// --- UI Updates ---

const displayAnalysis = (data) => {
    elements.analysisCard.classList.remove('hidden');
    
    // Sentiment
    elements.sentimentValue.innerText = data.sentiment.replace('_', ' ');
    elements.sentimentValue.className = `value ${data.sentiment}`;
    
    // Urgency
    elements.urgencyBadge.innerText = data.urgence;
    elements.urgencyBadge.className = `badge ${data.urgence.toLowerCase()}`;
    
    // Keywords
    elements.keywordsList.innerHTML = '';
    data.mots_cles_detectes.forEach(tag => {
        const span = document.createElement('span');
        span.className = 'tag';
        span.innerText = tag;
        elements.keywordsList.appendChild(span);
    });
    
    // Summary
    elements.summaryText.innerText = data.resume;
    
    elements.analysisCard.scrollIntoView({ behavior: 'smooth' });
};

const displaySolutionAndHistory = (data) => {
    elements.solutionCard.classList.remove('hidden');
    elements.historyCard.classList.remove('hidden');
    
    // Typwriter effect for solution
    typeWriter(data.message, elements.solutionContent);
    
    // History list
    elements.similarClaimsList.innerHTML = '';
    if (data.similar_claims.length === 0) {
        elements.similarClaimsList.innerHTML = '<p class="text-muted">Aucun cas similaire trouvé.</p>';
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

// Utils
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
    const speed = 10; // ms
    
    const tick = () => {
        if (i < text.length) {
            element.innerHTML += text.charAt(i);
            i++;
            setTimeout(tick, speed);
        }
    };
    tick();
};

// Event Listeners
document.addEventListener('DOMContentLoaded', initTheme);
elements.themeToggle.addEventListener('click', toggleTheme);
elements.analyzeBtn.addEventListener('click', analyzeComplaint);
elements.searchBtn.addEventListener('click', generateSolution);
