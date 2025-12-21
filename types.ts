
export type UserStatus = 'online' | 'offline' | 'typing' | 'away' | 'dnd';

export interface User {
  id: string;
  name: string;
  avatar: string;
  status: UserStatus;
  lastSeen?: string;
  isFavorites?: boolean; 
  isGroup?: boolean; 
  bio?: string;
  phone?: string;
  username?: string;
  isVerified?: boolean; // New: Verified Badge
}

export type PrivacyValue = 'everybody' | 'contacts' | 'nobody';

export interface UserProfile {
  id: string;
  name: string;
  phone: string; 
  email?: string;
  bio: string;
  username: string;
  avatar: string;
  status: UserStatus;
  isAdmin?: boolean;      // New: Admin Access
  isVerified?: boolean;   // New: Verified Badge
  
  // Privacy Settings
  privacy_phone?: PrivacyValue;
  privacy_last_seen?: PrivacyValue;
  privacy_avatar?: PrivacyValue;
  privacy_forwards?: PrivacyValue;
  privacy_calls?: PrivacyValue;
  privacy_voice_msgs?: PrivacyValue;
  privacy_msgs?: PrivacyValue;
  privacy_birthday?: PrivacyValue;
  privacy_gifts?: PrivacyValue;
  privacy_bio?: PrivacyValue;
  privacy_music?: PrivacyValue;
  privacy_groups?: PrivacyValue;
}

export type MessageType = 'text' | 'image' | 'audio' | 'file';

export interface Reaction {
  emoji: string;
  senderId: string;
}

export interface Message {
  id: string;
  senderId: string; 
  receiverId?: string;
  groupId?: string;
  text: string; 
  timestamp: Date;
  isRead: boolean;
  type: MessageType;
  mediaUrl?: string;
  fileName?: string;
  fileSize?: string;
  duration?: string;
  isPinned?: boolean;
  isEdited?: boolean;
  reactions?: Reaction[];
  replyToId?: string;
}

export interface Chat {
  id: string;
  user: User;
  messages: Message[]; 
  unreadCount: number;
  hasStory: boolean;
  lastMessage: Message;
  isPinned?: boolean; 
  isMuted?: boolean;
}

export type CallType = 'audio' | 'video';
export type CallState = 'idle' | 'calling' | 'incoming' | 'connected' | 'ended';