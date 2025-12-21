
import { Chat } from './types';

export const MOCK_CHATS: Chat[] = [];

// Sound Configuration
// Files are referenced from the public root directory
export const NOTIFICATION_SOUNDS = [
    { id: 'default', name: 'Crystal Glass', url: 'https://cdn.pixabay.com/audio/2021/08/09/audio_97a493d56d.mp3' },
    { id: 'sound1', name: 'Sound 1', url: '/sound1.mp3' },
    { id: 'sound2', name: 'Sound 2', url: '/sound2.mp3' },
    { id: 'sound3', name: 'Sound 3', url: '/sound3.mp3' },
    { id: 'sound4', name: 'Sound 4', url: '/sound4.mp3' },
    { id: 'sound5', name: 'Sound 5', url: '/sound5.mp3' },
];

export const NOTIFICATION_SOUND_URL = NOTIFICATION_SOUNDS[0].url;
