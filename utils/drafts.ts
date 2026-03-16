// Утилиты для работы с черновиками

const DRAFTS_KEY = 'vellor_drafts';

export interface Draft {
  chatId: string;
  text: string;
  timestamp: number;
}

export const saveDraft = (chatId: string, text: string) => {
  if (!text.trim()) {
    removeDraft(chatId);
    return;
  }
  
  try {
    const drafts = getAllDrafts();
    drafts[chatId] = {
      chatId,
      text,
      timestamp: Date.now()
    };
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
  } catch (e) {
    console.error('Error saving draft:', e);
  }
};

export const getDraft = (chatId: string): string => {
  try {
    const drafts = getAllDrafts();
    return drafts[chatId]?.text || '';
  } catch (e) {
    console.error('Error getting draft:', e);
    return '';
  }
};

export const removeDraft = (chatId: string) => {
  try {
    const drafts = getAllDrafts();
    delete drafts[chatId];
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
  } catch (e) {
    console.error('Error removing draft:', e);
  }
};

export const getAllDrafts = (): Record<string, Draft> => {
  try {
    const stored = localStorage.getItem(DRAFTS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (e) {
    console.error('Error getting all drafts:', e);
    return {};
  }
};

export const hasDraft = (chatId: string): boolean => {
  const draft = getDraft(chatId);
  return draft.trim().length > 0;
};
