
declare module '*.mp3' {
  const fileUrl: string;
  export default fileUrl;
}

// Shims for Capacitor plugins to prevent TypeScript errors if types are missing
declare module '@capacitor/push-notifications' {
  export const PushNotifications: any;
}

declare module '@capacitor/app' {
  export const App: any;
}

declare module '@capacitor/core' {
  export const Capacitor: any;
}
