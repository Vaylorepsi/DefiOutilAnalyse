const fs = require('fs-extra');
const path = require('path');
const glob = require('glob');
const sharp = require('sharp'); // Images
const { PurgeCSS } = require('purgecss'); // CSS inutile
const CleanCSS = require('clean-css'); // Minification CSS
const { minify: minifierJs } = require('terser'); // Minification JS
const { minify: minifierHtml } = require('html-minifier-terser'); // Minification HTML

// CONFIGURATION
const QUALITE_IMG = 80; // Qualité WebP (0-100)

/**
 * Fonction principale qui optimise tout le site
 */
async function optimiserSite(dossierSource, dossierDestination) {
    console.log(`\n⚙️  DÉBUT OPTIMISATION : ${dossierSource} -> ${dossierDestination}`);

    // 1. PRÉPARATION : On copie le site brut vers le dossier de destination
    // On ne touche jamais au dossier source par sécurité.
    await fs.emptyDir(dossierDestination);
    await fs.copy(dossierSource, dossierDestination);

    // On prépare le rapport (Le JSON final)
    const rapport = {
        succes: true,
        fichiers: [], // Liste détaillée
        resume: {
            poidsAvant: 0,
            poidsApres: 0,
            gainTotal: 0,
            pourcentageGain: 0
        }
    };

    // --- PARTIE 1 : LES IMAGES (Conversion WebP) ---
    console.log("   📸 Traitement des images...");
    const images = glob.sync(`${dossierDestination}/**/*.{jpg,jpeg,png}`);
    
    for (const cheminImage of images) {
        try {
            const statsAvant = await fs.stat(cheminImage);
            const infoFichier = path.parse(cheminImage);
            const nouveauChemin = path.join(infoFichier.dir, infoFichier.name + '.webp');

            // Conversion magique avec Sharp
            await sharp(cheminImage)
                .webp({ quality: QUALITE_IMG })
                .toFile(nouveauChemin);

            // On supprime l'ancienne image (JPG/PNG)
            await fs.remove(cheminImage);
            
            const statsApres = await fs.stat(nouveauChemin);
            ajouterAuRapport(rapport, infoFichier.base, 'image', statsAvant.size, statsApres.size);
        } catch (e) {
            console.error(`Erreur image ${cheminImage}:`, e.message);
        }
    }

    // --- PARTIE 2 : LE CSS (Purge + Minification) ---
    console.log("   🎨 Traitement du CSS...");
    const fichiersCss = glob.sync(`${dossierDestination}/**/*.css`);
    const fichiersHtml = glob.sync(`${dossierDestination}/**/*.html`); // Nécessaire pour que PurgeCSS lise le HTML

    for (const cheminCss of fichiersCss) {
        try {
            const statsAvant = await fs.stat(cheminCss);

            // A. PURGE : On enlève le CSS inutilisé
            const resultatPurge = await new PurgeCSS().purge({
                content: fichiersHtml, // On regarde le HTML
                css: [cheminCss]       // On nettoie ce CSS
            });
            // Sécurité : si Purge échoue, on garde le CSS original
            let cssContenu = resultatPurge[0] ? resultatPurge[0].css : await fs.readFile(cheminCss, 'utf8');

            // B. MINIFICATION : On compacte le tout
            const cssMinifie = new CleanCSS().minify(cssContenu).styles;

            await fs.writeFile(cheminCss, cssMinifie);
            
            const statsApres = await fs.stat(cheminCss);
            ajouterAuRapport(rapport, path.basename(cheminCss), 'css', statsAvant.size, statsApres.size);
        } catch (e) {
            console.error(`Erreur CSS ${cheminCss}:`, e.message);
        }
    }

    // --- PARTIE 3 : LE JAVASCRIPT (Minification) ---
    console.log("   📜 Traitement du JS...");
    const fichiersJs = glob.sync(`${dossierDestination}/**/*.js`);
    
    for (const cheminJs of fichiersJs) {
        try {
            const statsAvant = await fs.stat(cheminJs);
            const codeJs = await fs.readFile(cheminJs, 'utf8');

            // Minification avec Terser
            const resultat = await minifierJs(codeJs);
            
            if (resultat.code) {
                await fs.writeFile(cheminJs, resultat.code);
                const statsApres = await fs.stat(cheminJs);
                ajouterAuRapport(rapport, path.basename(cheminJs), 'js', statsAvant.size, statsApres.size);
            }
        } catch (e) {
            console.error(`Erreur JS ${cheminJs}:`, e.message);
        }
    }

    // --- PARTIE 4 : LE HTML (Mise à jour liens + Minification) ---
    console.log("   🏗️ Traitement du HTML...");
    for (const cheminHtml of fichiersHtml) {
        try {
            const statsAvant = await fs.stat(cheminHtml);
            let html = await fs.readFile(cheminHtml, 'utf8');

            // A. Mise à jour des liens images (ex: logo.jpg -> logo.webp)
            // C'est vital car on a supprimé les .jpg à l'étape 1 !
            html = html
                .replace(/\.jpg"/g, '.webp"')
                .replace(/\.jpeg"/g, '.webp"')
                .replace(/\.png"/g, '.webp"')
                .replace(/\.jpg'/g, ".webp'") // cas des simple quotes
                .replace(/\.png'/g, ".webp'");

            // B. Minification HTML
            const htmlMinifie = await minifierHtml(html, {
                removeAttributeQuotes: true,
                collapseWhitespace: true,
                removeComments: true,
                minifyCSS: true, // Minifie aussi le CSS <style> interne
                minifyJS: true   // Minifie aussi le JS <script> interne
            });

            await fs.writeFile(cheminHtml, htmlMinifie);
            
            const statsApres = await fs.stat(cheminHtml);
            ajouterAuRapport(rapport, path.basename(cheminHtml), 'html', statsAvant.size, statsApres.size);
        } catch (e) {
             console.error(`Erreur HTML ${cheminHtml}:`, e.message);
        }
    }

    // Calcul des totaux finaux
    rapport.resume.gainTotal = rapport.resume.poidsAvant - rapport.resume.poidsApres;
    if (rapport.resume.poidsAvant > 0) {
        rapport.resume.pourcentageGain = ((rapport.resume.gainTotal / rapport.resume.poidsAvant) * 100).toFixed(2);
    }

    console.log(`✅ FINI ! Gain total : ${(rapport.resume.gainTotal / 1024).toFixed(2)} Ko (-${rapport.resume.pourcentageGain}%)`);
    return rapport;
}

// Petite fonction utilitaire pour remplir le tableau proprement
function ajouterAuRapport(rapport, nom, type, avant, apres) {
    rapport.fichiers.push({
        nom: nom,
        type: type,
        avant: avant,
        apres: apres,
        gain: avant - apres
    });
    rapport.resume.poidsAvant += avant;
    rapport.resume.poidsApres += apres;
}

module.exports = { optimiserSite };