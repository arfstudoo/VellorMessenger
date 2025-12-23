
// Mock for @capacitor/push-notifications
export const PushNotifications = {
  checkPermissions: async () => ({ receive: 'granted' }),
  requestPermissions: async () => ({ receive: 'granted' }),
  register: async () => { console.log('Mock PushNotifications: Register'); },
  addListener: (eventName: string, cb: any) => {
    console.log(`Mock PushNotifications: Listener added for ${eventName}`);
    return { remove: () => {} };
  },
  removeAllListeners: () => {},
};

// Mock for @capacitor/app
export const App = {
  addListener: (eventName: string, cb: any) => {
    console.log(`Mock App: Listener added for ${eventName}`);
    return { remove: () => {} };
  },
  removeAllListeners: () => {},
};

// Mock for @capacitor/core (if needed, though usually core is present)
export const Capacitor = {
  getPlatform: () => 'web',
  isNativePlatform: () => false,
};
