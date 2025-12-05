let myChart = null;

async function lancerOptimisation() {
    const url = document.getElementById('urlInput').value;
    if (!url) return alert("Veuillez entrer une URL !");

    // UI : On affiche le loader
    document.getElementById('loader').classList.remove('hidden');
    document.getElementById('results').classList.add('hidden');

    try {
        // Appel au Backend
        const reponse = await fetch('/api/optimize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: url })
        });
        
        const json = await reponse.json();

        if (json.success) {
            afficherResultats(json.data);
        } else {
            alert("Erreur : " + json.message);
        }

    } catch (e) {
        console.error(e);
        alert("Erreur de communication avec le serveur.");
    } finally {
        document.getElementById('loader').classList.add('hidden');
    }
}

function afficherResultats(data) {
    document.getElementById('results').classList.remove('hidden');

    // Mise à jour des textes
    const avantKo = (data.resume.poidsAvant / 1024).toFixed(2);
    const apresKo = (data.resume.poidsApres / 1024).toFixed(2);
    
    document.getElementById('poidsAvant').innerText = avantKo + " Ko";
    document.getElementById('poidsApres').innerText = apresKo + " Ko";
    document.getElementById('gainTotal').innerText = "-" + data.resume.pourcentageGain + "%";

    // Remplissage du tableau
    const tbody = document.getElementById('fileList');
    tbody.innerHTML = '';
    
    data.fichiers.forEach(f => {
        const tr = document.createElement('tr');
        tr.className = "border-b border-gray-700/50 hover:bg-gray-700/50 transition";
        tr.innerHTML = `
            <td class="py-2 truncate max-w-xs" title="${f.nom}">${f.nom}</td>
            <td class="py-2"><span class="px-2 py-1 rounded text-xs ${getBadgeColor(f.type)}">${f.type}</span></td>
            <td class="py-2 text-right text-green-400">-${(f.gain / 1024).toFixed(1)} Ko</td>
        `;
        tbody.appendChild(tr);
    });

    // Création du graphique Chart.js
    const ctx = document.getElementById('myChart').getContext('2d');
    
    if (myChart) myChart.destroy(); // On détruit l'ancien si il existe

    myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Poids Original', 'Poids Optimisé'],
            datasets: [{
                label: 'Poids en Ko',
                data: [avantKo, apresKo],
                backgroundColor: ['#ef4444', '#22c55e'], // Rouge et Vert
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
        }
    });
}

function getBadgeColor(type) {
    if (type === 'image') return 'bg-purple-900 text-purple-200';
    if (type === 'css') return 'bg-blue-900 text-blue-200';
    if (type === 'js') return 'bg-yellow-900 text-yellow-200';
    return 'bg-gray-700';
}