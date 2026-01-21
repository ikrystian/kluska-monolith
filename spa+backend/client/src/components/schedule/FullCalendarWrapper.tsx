'use client';

import { useRef, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import { pl } from 'date-fns/locale';
import type { EventInput } from '@fullcalendar/core';

export interface CalendarEvent {
    id: string;
    title: string;
    start: Date | string;
    end?: Date | string;
    allDay?: boolean;
    backgroundColor?: string;
    borderColor?: string;
    textColor?: string;
    extendedProps?: Record<string, any>;
}

interface FullCalendarWrapperProps {
    events: CalendarEvent[];
    onEventClick?: (eventId: string, event: CalendarEvent) => void;
    onDateClick?: (date: Date) => void;
    initialView?: 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'listWeek';
    headerToolbar?: boolean;
    height?: string | number;
    className?: string;
}

export function FullCalendarWrapper({
    events,
    onEventClick,
    onDateClick,
    initialView = 'dayGridMonth',
    headerToolbar = true,
    height = 'auto',
    className = '',
}: FullCalendarWrapperProps) {
    const calendarRef = useRef<FullCalendar>(null);

    const handleEventClick = (clickInfo: any) => {
        if (onEventClick) {
            const event = events.find(e => e.id === clickInfo.event.id);
            if (event) {
                onEventClick(clickInfo.event.id, event);
            }
        }
    };

    const handleDateClick = (clickInfo: any) => {
        if (onDateClick) {
            onDateClick(clickInfo.date);
        }
    };

    const fullCalendarEvents: EventInput[] = events.map(event => ({
        id: event.id,
        title: event.title,
        start: event.start,
        end: event.end,
        allDay: event.allDay,
        backgroundColor: event.backgroundColor,
        borderColor: event.borderColor,
        textColor: event.textColor,
        extendedProps: event.extendedProps,
    }));

    return (
        <div className={`fc-wrapper ${className}`}>
            <style>{`
                .fc-wrapper {
                    --fc-border-color: hsl(var(--border));
                    --fc-button-bg-color: hsl(var(--primary));
                    --fc-button-border-color: hsl(var(--primary));
                    --fc-button-text-color: hsl(var(--primary-foreground));
                    --fc-button-hover-bg-color: hsl(var(--primary) / 0.9);
                    --fc-button-hover-border-color: hsl(var(--primary) / 0.9);
                    --fc-button-active-bg-color: hsl(var(--primary) / 0.8);
                    --fc-button-active-border-color: hsl(var(--primary) / 0.8);
                    --fc-today-bg-color: hsl(var(--accent) / 0.3);
                    --fc-event-bg-color: hsl(var(--primary));
                    --fc-event-border-color: hsl(var(--primary));
                    --fc-event-text-color: hsl(var(--primary-foreground));
                    --fc-page-bg-color: hsl(var(--background));
                    --fc-neutral-bg-color: hsl(var(--secondary));
                    --fc-list-event-hover-bg-color: hsl(var(--accent));
                }

                .fc-wrapper .fc {
                    font-family: inherit;
                }

                .fc-wrapper .fc-toolbar-title {
                    font-size: 1.25rem !important;
                    font-weight: 600;
                }

                .fc-wrapper .fc-button {
                    padding: 0.5rem 1rem;
                    font-size: 0.875rem;
                    font-weight: 500;
                    border-radius: 0.375rem;
                    transition: all 0.2s;
                }

                .fc-wrapper .fc-button:focus {
                    box-shadow: 0 0 0 2px hsl(var(--background)), 0 0 0 4px hsl(var(--primary));
                }

                .fc-wrapper .fc-daygrid-day {
                    transition: background-color 0.2s;
                }

                .fc-wrapper .fc-daygrid-day:hover {
                    background-color: hsl(var(--accent) / 0.5);
                    cursor: pointer;
                }

                .fc-wrapper .fc-daygrid-day-number {
                    padding: 0.5rem;
                    font-weight: 500;
                }

                .fc-wrapper .fc-event {
                    border-radius: 0.25rem;
                    padding: 0.125rem 0.375rem;
                    font-size: 0.75rem;
                    cursor: pointer;
                }

                .fc-wrapper .fc-event:hover {
                    opacity: 0.9;
                }

                .fc-wrapper .fc-timegrid-slot {
                    height: 3rem;
                }

                .fc-wrapper .fc-timegrid-event {
                    border-radius: 0.25rem;
                }

                .fc-wrapper .fc-list-event {
                    cursor: pointer;
                }

                .fc-wrapper .fc-list-event:hover td {
                    background-color: hsl(var(--accent));
                }

                .fc-wrapper .fc-col-header-cell {
                    padding: 0.75rem 0;
                    font-weight: 500;
                    background-color: hsl(var(--secondary));
                }

                /* Mobile Responsive Styles */
                @media (max-width: 640px) {
                    .fc-wrapper .fc-toolbar {
                        flex-direction: column;
                        gap: 0.5rem;
                    }

                    .fc-wrapper .fc-toolbar-chunk {
                        display: flex;
                        justify-content: center;
                    }

                    .fc-wrapper .fc-toolbar-title {
                        font-size: 1rem !important;
                    }

                    .fc-wrapper .fc-button {
                        padding: 0.375rem 0.5rem;
                        font-size: 0.75rem;
                    }

                    .fc-wrapper .fc-button-group .fc-button {
                        padding: 0.25rem 0.4rem;
                    }

                    .fc-wrapper .fc-daygrid-day-number {
                        padding: 0.25rem;
                        font-size: 0.75rem;
                    }

                    .fc-wrapper .fc-daygrid-day-frame {
                        min-height: 3rem;
                    }

                    .fc-wrapper .fc-event {
                        font-size: 0.65rem;
                        padding: 0.0625rem 0.25rem;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                    }

                    .fc-wrapper .fc-daygrid-event-harness {
                        margin-bottom: 1px;
                    }

                    .fc-wrapper .fc-col-header-cell {
                        padding: 0.5rem 0;
                        font-size: 0.75rem;
                    }

                    .fc-wrapper .fc-col-header-cell-cushion {
                        padding: 0 !important;
                    }

                    .fc-wrapper .fc-daygrid-more-link {
                        font-size: 0.65rem;
                    }

                    .fc-wrapper .fc-button-group {
                        flex-wrap: wrap;
                        gap: 2px;
                    }

                    /* Hide some view buttons on very small screens */
                    .fc-wrapper .fc-timeGridDay-button,
                    .fc-wrapper .fc-listWeek-button {
                        display: none;
                    }
                }

                @media (max-width: 400px) {
                    .fc-wrapper .fc-toolbar-chunk:last-child {
                        display: none;
                    }

                    .fc-wrapper .fc-daygrid-day-top {
                        flex-direction: row;
                        justify-content: center;
                    }

                    .fc-wrapper .fc-daygrid-day-number {
                        font-size: 0.7rem;
                    }
                }
            `}</style>
            <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
                initialView={initialView}
                locale="pl"
                firstDay={1}
                events={fullCalendarEvents}
                eventClick={handleEventClick}
                dateClick={handleDateClick}
                headerToolbar={headerToolbar ? {
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
                } : false}
                buttonText={{
                    today: 'Dziś',
                    month: 'Miesiąc',
                    week: 'Tydzień',
                    day: 'Dzień',
                    list: 'Lista'
                }}
                height={height}
                eventDisplay="block"
                dayMaxEvents={3}
                moreLinkText={(n) => `+${n} więcej`}
                allDayText="Cały dzień"
                noEventsText="Brak wydarzeń do wyświetlenia"
            />
        </div>
    );
}
