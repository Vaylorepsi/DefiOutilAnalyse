const { optimiserSite } = require('./optimizer');

// On lance l'optimisation sur notre dossier de test
optimiserSite('./test-input', './test-output')
    .then(rapport => {
        console.log("--- RAPPORT FINAL ---");
        console.log(JSON.stringify(rapport, null, 2));
    });