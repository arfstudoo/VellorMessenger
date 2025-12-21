
import { Chat } from './types';

export const MOCK_CHATS: Chat[] = [];

// Sound Configuration
// Trying local files first (assuming they are in public/sounds/), fallback to CDN
export const NOTIFICATION_SOUNDS = [
    { id: 'default', name: 'Standard', url: '/sounds/notification.mp3', fallback: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3' },
    { id: 'sound1', name: 'Pop', url: '/sounds/pop.mp3', fallback: 'https://assets.mixkit.co/active_storage/sfx/2346/2346-preview.mp3' },
    { id: 'sound2', name: 'Ping', url: '/sounds/ping.mp3', fallback: 'https://assets.mixkit.co/active_storage/sfx/2870/2870-preview.mp3' },
    { id: 'sound3', name: 'Notify', url: '/sounds/notify.mp3', fallback: 'https://assets.mixkit.co/active_storage/sfx/2578/2578-preview.mp3' },
    { id: 'sound4', name: 'Chime', url: '/sounds/chime.mp3', fallback: 'https://assets.mixkit.co/active_storage/sfx/2871/2871-preview.mp3' },
    { id: 'sound5', name: 'Futuristic', url: '/sounds/future.mp3', fallback: 'https://assets.mixkit.co/active_storage/sfx/1367/1367-preview.mp3' },
];

export const CALL_RINGTONE_URL = '/sounds/ringtone.mp3';
export const CALL_RINGTONE_FALLBACK = 'https://assets.mixkit.co/active_storage/sfx/1359/1359-preview.mp3';
