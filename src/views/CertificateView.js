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

  render(playerName, score, mode = 'target', sprintHistory = []) {
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
  }
}
