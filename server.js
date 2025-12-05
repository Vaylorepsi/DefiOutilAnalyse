const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs-extra');
const path = require('path');
const { optimiserSite } = require('./optimizer'); // Ton module

const app = express();
app.use(express.static('public')); // Sert les fichiers du dossier public
app.use(bodyParser.json());

// --- MOCK SCRAPER (SIMULATION) ---
// En attendant ton collègue, cette fonction simule le téléchargement du site
// Elle copie juste ton dossier 'test-input' vers 'temp/brut' pour que ça marche
async function simulerScraper(url, dossierCible) {
    console.log(`🔎 Simulation du scraping de ${url}...`);
    // ASTUCE HACKATHON : Crée un dossier 'test-input' avec des fichiers bidons
    // pour tester si ton collègue n'est pas prêt.
    if (fs.existsSync('./test-input')) {
        await fs.copy('./test-input', dossierCible);
    } else {
        // Si pas de test-input, on crée un fichier bidon
        await fs.ensureDir(dossierCible);
        await fs.writeFile(path.join(dossierCible, 'fake.css'), '.bad { color: red; }');
    }
    return true; // Simulation réussie
}

// --- LA ROUTE API ---
app.post('/api/optimize', async (req, res) => {
    const url = req.body.url;
    const dossierBrut = path.join(__dirname, 'temp', 'brut');
    const dossierOptimise = path.join(__dirname, 'temp', 'optimise');

    try {
        // 1. Nettoyage
        await fs.emptyDir(dossierBrut);
        
        // 2. Scraping (Remplace 'simulerScraper' par la fonction de ton pote plus tard)
        await simulerScraper(url, dossierBrut);

        // 3. TON MODULE D'OPTIMISATION
        const rapport = await optimiserSite(dossierBrut, dossierOptimise);

        // 4. Renvoi du JSON au frontend
        res.json({ success: true, data: rapport });

    } catch (error) {
        console.error(error);
        res.json({ success: false, message: error.message });
    }
});

app.listen(3000, () => {
    console.log('🚀 Serveur lancé sur http://localhost:3000');
});