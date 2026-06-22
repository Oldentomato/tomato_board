export type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  description?: string;
  color?: string;
};

export type CreateEventInput = {
  title: string;
  start: string;
  end: string;
  description?: string;
  color?: string;
};

export type UpdateEventInput = Partial<CreateEventInput>;

export type CalendarEventsResponse = {
  events: CalendarEvent[];
};
