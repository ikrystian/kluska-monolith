'use client';

import { useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import type { EventInput } from '@fullcalendar/core';
import './fullcalendar.css';

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
