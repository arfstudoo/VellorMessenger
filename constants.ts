
import { Chat } from './types';

export const MOCK_CHATS: Chat[] = [];

// Sound Configuration
// Using local files from the root (public) folder as requested.
// Ensure sound1.mp3, sound2.mp3, etc. exist in your public directory.
export const NOTIFICATION_SOUNDS = [
    { id: 'default', name: 'Standard', url: '/sound1.mp3' },
    { id: 'sound1', name: 'Pop', url: '/sound1.mp3' },
    { id: 'sound2', name: 'Ping', url: '/sound2.mp3' },
    { id: 'sound3', name: 'Notify', url: '/sound3.mp3' },
    { id: 'sound4', name: 'Chime', url: '/sound4.mp3' },
    { id: 'sound5', name: 'Futuristic', url: '/sound5.mp3' },
];

export const NOTIFICATION_SOUND_URL = NOTIFICATION_SOUNDS[0].url;
