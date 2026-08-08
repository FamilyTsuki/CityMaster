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
        this.#recapBody.replaceChildren();
        sprintHistory.forEach(record => {
          const tr = document.createElement('tr');
          const distText = record.distance === -1 ? i18n.t('sprint.time_out') : `${record.distance}m`;
          const bonusText = record.timeBonus > 0 ? ` (+${record.timeBonus})` : '';

          const tdName = document.createElement('td');
          const strongName = document.createElement('strong');
          strongName.textContent = record.name || '';
          tdName.appendChild(strongName);

          const tdDist = document.createElement('td');
          tdDist.textContent = distText;

          const tdPoints = document.createElement('td');
          tdPoints.textContent = `${record.points} pts${bonusText}`;

          tr.append(tdName, tdDist, tdPoints);
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

        const loadingTr = document.createElement('tr');
        const loadingTd = document.createElement('td');
        loadingTd.colSpan = 3;
        loadingTd.className = 'text-center';
        loadingTd.textContent = 'Chargement...';
        loadingTr.appendChild(loadingTd);
        testBody.replaceChildren(loadingTr);
        
        fetch(`/api/scores/test/${testNumber}`)
          .then(res => res.json())
          .then(data => {
            testBody.replaceChildren();
            if (!Array.isArray(data) || data.length === 0) {
              const emptyTr = document.createElement('tr');
              const emptyTd = document.createElement('td');
              emptyTd.colSpan = 3;
              emptyTd.className = 'text-center';
              emptyTd.textContent = 'Aucun score pour ce test.';
              emptyTr.appendChild(emptyTd);
              testBody.replaceChildren(emptyTr);
              return;
            }

            data.forEach((entry, index) => {
              const tr = document.createElement('tr');
              if (entry.username === playerName && entry.score === score) {
                tr.classList.add('current-user-row');
              }

              const tdRank = document.createElement('td');
              tdRank.textContent = `#${index + 1}`;

              const tdUser = document.createElement('td');
              tdUser.textContent = entry.username || '';

              const tdScore = document.createElement('td');
              tdScore.textContent = `${entry.score} pts`;

              tr.append(tdRank, tdUser, tdScore);
              testBody.appendChild(tr);
            });
          })
          .catch(() => {
            const errTr = document.createElement('tr');
            const errTd = document.createElement('td');
            errTd.colSpan = 3;
            errTd.className = 'text-center';
            errTd.textContent = 'Erreur de chargement.';
            errTr.appendChild(errTd);
            testBody.replaceChildren(errTr);
          });
      } else {
        testContainer.classList.add('hidden');
      }
    }
  }
}
