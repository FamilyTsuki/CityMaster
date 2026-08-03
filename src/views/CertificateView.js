import { I18nService } from '../services/I18nService.js';

export class CertificateView {
  #certPlayerName;
  #certScore;
  #recapContainer;
  #recapBody;

  constructor() {
    this.#certPlayerName = document.getElementById('cert-player-name');
    this.#certScore = document.getElementById('cert-score');
    this.#recapContainer = document.getElementById('sprint-recap');
    this.#recapBody = document.getElementById('sprint-recap-body');
  }

  render(playerName, score, mode = 'target', sprintHistory = [], testNumber = null) {
    if (this.#certPlayerName) {
      this.#certPlayerName.textContent = playerName;
    }
    if (this.#certScore) {
      this.#certScore.textContent = score;
    }

    if (this.#recapContainer && this.#recapBody) {
      if (mode === 'sprint' && sprintHistory && sprintHistory.length > 0) {
        const i18n = I18nService.getInstance();
        this.#recapBody.innerHTML = '';
        sprintHistory.forEach(record => {
          const tr = document.createElement('tr');
          const distText = record.distance === -1 ? i18n.t('sprint.time_out') : `${record.distance}m`;
          const bonusText = record.timeBonus > 0 ? ` (+${record.timeBonus})` : '';
          tr.innerHTML = `
            <td><strong>${record.name}</strong></td>
            <td>${distText}</td>
            <td>${record.points} pts${bonusText}</td>
          `;
          this.#recapBody.appendChild(tr);
        });
        this.#recapContainer.classList.remove('hidden');
      } else {
        this.#recapContainer.classList.add('hidden');
      }
    }

    const testContainer = document.getElementById('test-leaderboard-container');
    const testTitle = document.getElementById('test-leaderboard-title');
    const testBody = document.getElementById('test-leaderboard-body');
    
    if (testContainer && testBody && testTitle) {
      if (testNumber) {
        testTitle.textContent = `Classement du Test n°${testNumber}`;
        testContainer.classList.remove('hidden');
        testBody.innerHTML = `<tr><td colspan="3" class="text-center">Chargement...</td></tr>`;
        
        fetch(`/api/scores/test/${testNumber}`)
          .then(res => res.json())
          .then(data => {
            testBody.innerHTML = '';
            if (data.length === 0) {
              testBody.innerHTML = `<tr><td colspan="3" class="text-center">Aucun score pour ce test.</td></tr>`;
              return;
            }
            data.forEach((entry, index) => {
              const tr = document.createElement('tr');
              if (entry.username === playerName && entry.score === score) {
                tr.classList.add('current-user-row');
              }
              tr.innerHTML = `
                <td>#${index + 1}</td>
                <td>${entry.username}</td>
                <td>${entry.score} pts</td>
              `;
              testBody.appendChild(tr);
            });
          })
          .catch(err => {
            testBody.innerHTML = `<tr><td colspan="3" class="text-center">Erreur de chargement.</td></tr>`;
          });
      } else {
        testContainer.classList.add('hidden');
      }
    }
  }
}
