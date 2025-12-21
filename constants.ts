
import { Chat } from './types';

export const MOCK_CHATS: Chat[] = [];

// Sound Configuration
// using external CDN links because local files are missing
export const NOTIFICATION_SOUNDS = [
    { id: 'default', name: 'Crystal Glass', url: 'https://cdn.pixabay.com/audio/2021/08/09/audio_97a493d56d.mp3' },
    { id: 'sound1', name: 'Pop', url: 'https://cdn.pixabay.com/audio/2022/03/15/audio_c8c8a73467.mp3' },
    { id: 'sound2', name: 'Ping', url: 'https://cdn.pixabay.com/audio/2021/08/04/audio_12b0c7443c.mp3' },
    { id: 'sound3', name: 'Notification', url: 'https://cdn.pixabay.com/audio/2022/03/10/audio_c230d77d01.mp3' },
    { id: 'sound4', name: 'Chime', url: 'https://cdn.pixabay.com/audio/2021/08/09/audio_0ac4267695.mp3' },
    { id: 'sound5', name: 'Sci-Fi', url: 'https://cdn.pixabay.com/audio/2022/01/18/audio_d0a13f69d2.mp3' },
];

export const NOTIFICATION_SOUND_URL = NOTIFICATION_SOUNDS[0].url;
