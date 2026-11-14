import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'leniwakluska.com',
  appName: 'LeniwaKluska',
  webDir: 'dist',
  plugins: {
    // iOS only: show a push that arrives while the app is open. On Android the
    // app shows its own in-app toast instead (NativePushBridge).
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    // res/drawable/ic_stat_notification.xml, tinted with the brand orange.
    LocalNotifications: {
      smallIcon: 'ic_stat_notification',
      iconColor: '#FF6A29',
    },
  },
};

export default config;
