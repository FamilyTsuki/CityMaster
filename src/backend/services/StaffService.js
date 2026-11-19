import { User, getUserRole, ZONE_ROLES } from '../models/User.js';
import { UserZone } from '../models/UserZone.js';
import { ModeratorApplication } from '../models/ModeratorApplication.js';

/**
 * Droits d'équipe : rôle d'un compte et communes de sa zone.
 *
 * Règles tenues ici, et non dans les modèles, pour rester vraies quel que soit
 * le point d'entrée (candidature, page admin, import au démarrage) :
 * - une commune accordée à un joueur en fait un modérateur ;
 * - un modérateur qui n'a plus de commune redevient joueur (un super-modérateur
 *   garde son rôle, attribué à la main) ;
 * - un compte rendu joueur perd toutes ses communes ;
 * - toute commune retirée retire aussi la candidature acceptée correspondante.
 */
export class StaffService {
  /**
   * @param {object|null} user Compte (User.findForSession / findByUsername).
   * @returns {Promise<{role: string, cities: Array<{key: string, name: string}>}>}
   */
  static async getAccess(user) {
    if (!user) return { role: 'player', cities: [] };
    const role = getUserRole(user);
    const cities = ZONE_ROLES.includes(role) ? await UserZone.getCities(user.username) : [];
    return { role, cities };
  }

  /**
   * Comptes de l'équipe avec leurs communes.
   * @returns {Promise<Array<{id: number, username: string, role: string, cities: Array}>>}
   */
  static async listStaff() {
    const [staff, zones] = await Promise.all([User.listStaff(), UserZone.getAllByUser()]);
    return staff.map((member) => ({
      ...member,
      cities: ZONE_ROLES.includes(member.role) ? zones.get(member.username.toLowerCase().trim()) || [] : [],
    }));
  }

  /**
   * Ajoute une commune à la zone d'un compte. Un joueur devient modérateur ;
   * un administrateur garde son rôle (la zone est alors sans effet).
   * @returns {Promise<object|null>} Compte mis à jour, null s'il n'existe pas.
   */
  static async grantCity(username, city, grantedBy) {
    const user = await User.findByUsername(username);
    if (!user) return null;
    await UserZone.add(user.username, city.key, city.name || city.key, grantedBy);
    if (getUserRole(user) === 'player') {
      return User.setRole(user.username, 'moderator');
    }
    return user;
  }

  /**
   * Retire une commune de la zone d'un compte.
   * @returns {Promise<object|null>} Compte mis à jour, null s'il n'existe pas.
   */
  static async revokeCity(username, cityKey, revokedBy) {
    const user = await User.findByUsername(username);
    if (!user) return null;
    await UserZone.remove(user.username, cityKey);
    await ModeratorApplication.revokeApproved(user.username, cityKey, revokedBy);
    if (getUserRole(user) === 'moderator' && (await UserZone.getCities(user.username)).length === 0) {
      return User.setRole(user.username, 'player');
    }
    return user;
  }

  /**
   * Change le rôle d'un compte. Le retour au rôle de joueur vide sa zone.
   * @returns {Promise<object|null>} Compte mis à jour, null s'il n'existe pas.
   */
  static async setRole(username, role, changedBy) {
    const user = await User.setRole(username, role);
    if (!user) return null;
    if (role === 'player') {
      await UserZone.clear(user.username);
      await ModeratorApplication.revokeApproved(user.username, null, changedBy);
    }
    return user;
  }

  /**
   * Reprend dans les zones les candidatures acceptées (versions 2.23.x, où la
   * candidature était la seule trace du rôle). Sans effet si c'est déjà fait :
   * une commune retirée depuis a vu sa candidature passer en « revoked ».
   * @returns {Promise<number>} Nombre de candidatures acceptées parcourues.
   */
  static async importApprovedApplications() {
    const approved = await ModeratorApplication.getAll('approved');
    for (const application of approved) {
      await StaffService.grantCity(
        application.username,
        { key: application.city_key, name: application.city_name },
        application.reviewed_by,
      );
    }
    return approved.length;
  }
}
