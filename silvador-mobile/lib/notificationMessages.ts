// Romanian translations for notifications, keyed by type.
// The server stores notifications in English; we override the user-facing
// text here so the UI is fully Romanian.
//
// Used by both NotificationCard (in-app list) and the live toast that
// fires on `notification:new` WebSocket events.

import type { NotificationType } from '../types';

export interface NotificationCopy {
  title: string;
  message: string;
}

export const notificationMessages: Record<NotificationType, NotificationCopy> = {
  outbid: {
    title: 'Ai fost depasit',
    message: 'O alta oferta a depasit-o pe a ta. Apasa pentru detalii.',
  },
  won: {
    title: 'Felicitari! Ai castigat',
    message: 'Ai castigat aceasta licitatie. Apasa pentru detalii.',
  },
  sold: {
    title: 'Licitatia ta s-a vandut',
    message: 'Lotul tau a fost vandut. Apasa pentru detalii.',
  },
  new_bid: {
    title: 'Oferta noua pe lotul tau',
    message: 'Cineva a plasat o oferta. Apasa pentru detalii.',
  },
  auction_ending: {
    title: 'Licitatie se incheie curand',
    message: 'O licitatie pe care o urmaresti se incheie in mai putin de o ora.',
  },
};

export function getNotificationCopy(type: NotificationType): NotificationCopy {
  return notificationMessages[type] ?? notificationMessages.new_bid;
}
