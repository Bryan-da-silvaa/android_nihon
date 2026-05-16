import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { countTotalDueCards, getEarliestNextReviewDate } from './srs/engine';

// Configuration par défaut du comportement des notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Demande les permissions pour les notifications
 */
export async function requestNotificationPermissions() {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  return finalStatus === 'granted';
}

/**
 * Planifie une notification intelligente pour la prochaine révision disponible
 * @param testSeconds Optionnel : nombre de secondes pour un test immédiat
 */
export async function scheduleSRSReviewNotification(testSeconds?: number) {
  // 1. Annuler les anciennes notifications pour repartir sur du propre
  await Notifications.cancelAllScheduledNotificationsAsync();

  let secondsToWait = 0;
  let title = "📖 Nouvelle révision prête !";
  let body = "Une nouvelle carte est disponible pour ton étude SRS. Viens relever le défi !";

  if (testSeconds) {
    secondsToWait = testSeconds;
    title = "🧪 Test Nihon réussi !";
    body = "Si tu vois ce message, tes notifications fonctionnent parfaitement.";
  } else {
    // 2. Vérifier s'il y a des cartes déjà dues (dans le passé)
    const dueCount = await countTotalDueCards();
    
    if (dueCount > 0) {
      // Si des cartes attendent déjà, on notifie très bientôt (1 minute)
      secondsToWait = 60;
      title = "📚 Révisions en attente";
      body = `Tu as encore ${dueCount} cartes qui attendent d'être révisées !`;
    } else {
      // 3. Sinon, chercher la toute prochaine dans le futur
      const nextDate = await getEarliestNextReviewDate();

      if (!nextDate) {
        console.log("Aucune révision future prévue. Notification non planifiée.");
        return;
      }

      const now = new Date();
      secondsToWait = Math.floor((nextDate.getTime() - now.getTime()) / 1000);

      // Sécurité : minimum 60s
      if (secondsToWait < 60) secondsToWait = 60;
    }
  }

  console.log(`Notification planifiée dans ${secondsToWait} secondes`);

  // 4. Planifier la notification
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: { type: 'srs_review' },
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: secondsToWait,
      repeats: false,
    },
  });
}

/**
 * Met à jour le badge de l'application (iOS)
 */
export async function updateAppBadge() {
  if (Platform.OS === 'ios') {
    const dueCount = await countTotalDueCards();
    await Notifications.setBadgeCountAsync(dueCount);
  }
}

/**
 * Planifie un rappel de Streak pour le LENDEMAIN à 19h00.
 * À appeler à chaque fois que l'utilisateur valide une session.
 * S'il étudie le lendemain avant 19h, cette fonction sera rappelée et repoussera l'alerte au jour d'après !
 */
export async function scheduleTomorrowStreakReminder() {
  await Notifications.cancelScheduledNotificationAsync('daily_streak_reminder').catch(() => {});

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(19, 0, 0, 0);

  await Notifications.scheduleNotificationAsync({
    identifier: 'daily_streak_reminder',
    content: {
      title: "🔥 Garde ta flamme !",
      body: "Il est l'heure ! Fais une petite session de japonais pour ne pas perdre ton streak d'aujourd'hui.",
      sound: true,
      data: { type: 'streak_reminder' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: tomorrow.getTime(),
    },
  });
  console.log("Rappel Streak planifié pour le", tomorrow.toLocaleString());
}
