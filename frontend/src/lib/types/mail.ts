export type MailMessage = {
  id: string;
  subject: string;
  from: string;
  snippet: string;
  date: string;
  isRead: boolean;
  webLink?: string;
};

export type MailSummary = {
  unreadCount: number;
  recent: MailMessage[];
};

export type MailMessagesResponse = {
  messages: MailMessage[];
  total: number;
};
