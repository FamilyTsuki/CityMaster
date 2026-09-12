import { I18nService } from '../services/I18nService.js';

export class CertificateView {
  #certPlayerName;
  #certScore;
  #certPercentileText;
  #certRankComparison;
  #recapContainer;
  #recapBody;

  constructor() {
    this.#certPlayerName = document.getElementById('cert-player-name');
    this.#certScore = document.getElementById('cert-score');
    this.#certPercentileText = document.getElementById('cert-percentile-text');
    this.#certRankComparison = document.getElementById('cert-rank-comparison');
    this.#recapContainer = document.getElementById('sprint-recap');
    this.#recapBody = document.getElementById('sprint-recap-body');
  }

  render(playerName, score, mode = 'target', sprintHistory = [], testNumber = null) {
    const numericScore = Number(score) || 0;

    let displayName = playerName;
    if (!displayName || displayName === 'Joueur' || displayName === 'Guest') {
      try {
        const rawUser = localStorage.getItem('user');
        if (rawUser) {
          const userObj = JSON.parse(rawUser);
          if (userObj && userObj.username) {
            displayName = userObj.username;
          }
        }
      } catch (e) {}
    }

    if (this.#certPlayerName) {
      if (displayName && displayName !== 'Joueur' && displayName !== 'Guest') {
        this.#certPlayerName.textContent = displayName;
        this.#certPlayerName.style.display = 'block';
      } else {
        this.#certPlayerName.textContent = '';
        this.#certPlayerName.style.display = 'none';
      }
    }

    if (this.#certScore) {
      this.#certScore.textContent = numericScore;
    }

    if (this.#certRankComparison && this.#certPercentileText) {
      if (numericScore > 0) {
        const topPercent = this.#calculatePercentile(numericScore, mode);
        this.#certPercentileText.textContent = `Top ${topPercent}% des joueurs`;
        this.#certRankComparison.classList.remove('hidden');
      } else {
        this.#certRankComparison.classList.add('hidden');
      }
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

            let userRankIndex = -1;

            data.forEach((entry, index) => {
              const tr = document.createElement('tr');
              if (entry.username === displayName && entry.score === numericScore) {
                tr.classList.add('current-user-row');
                userRankIndex = index;
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

            if (userRankIndex !== -1 && data.length > 0 && this.#certPercentileText && this.#certRankComparison && numericScore > 0) {
              const rankNumber = userRankIndex + 1;
              this.#certPercentileText.textContent = `Rang #${rankNumber} sur ${data.length} joueurs`;
              this.#certRankComparison.classList.remove('hidden');
            }
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

  #calculatePercentile(score, mode) {
    if (mode === 'sprint') {
      if (score >= 4000) return 5;
      if (score >= 3000) return 15;
      if (score >= 2000) return 30;
      if (score >= 1200) return 45;
      if (score >= 600) return 65;
      if (score >= 200) return 80;
      return 90;
    }
    // target mode (max 5000)
    if (score >= 4600) return 5;
    if (score >= 4000) return 15;
    if (score >= 3200) return 30;
    if (score >= 2200) return 50;
    if (score >= 1200) return 70;
    if (score >= 500) return 85;
    return 95;
  }
}
