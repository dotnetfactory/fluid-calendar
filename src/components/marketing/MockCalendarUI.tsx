"use client";

import { useState, useEffect } from "react";

import { CalendarDaysIcon, ClockIcon, SparklesIcon } from "@heroicons/react/24/outline";

interface MockEvent {
  id: string;
  title: string;
  time: string;
  duration: number; // in minutes
  color: string;
  type: 'meeting' | 'task';
  isAutoScheduled?: boolean;
}

const mockEvents: MockEvent[] = [
  {
    id: '1',
    title: 'Team Standup',
    time: '9:00 AM',
    duration: 30,
    color: 'bg-blue-500',
    type: 'meeting'
  },
  {
    id: '2',
    title: 'Review Design Mockups',
    time: '9:30 AM', 
    duration: 45,
    color: 'bg-green-500',
    type: 'task',
    isAutoScheduled: true
  },
  {
    id: '3',
    title: 'Client Presentation',
    time: '11:00 AM',
    duration: 60,
    color: 'bg-red-500',
    type: 'meeting'
  },
  {
    id: '4',
    title: 'Write Blog Post Draft',
    time: '1:00 PM',
    duration: 90,
    color: 'bg-purple-500',
    type: 'task',
    isAutoScheduled: true
  },
  {
    id: '5',
    title: 'Code Review Session',
    time: '3:00 PM',
    duration: 30,
    color: 'bg-orange-500',
    type: 'task',
    isAutoScheduled: true
  }
];

export function MockCalendarUI() {
  const [highlightAI, setHighlightAI] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);

  // Auto-show AI magic after 3 seconds (more gentle)
  useEffect(() => {
    const timeout = setTimeout(() => {
      setHighlightAI(true);
    }, 3000);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        {/* Calendar Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Today&apos;s Schedule</h3>
              <p className="text-blue-100 text-sm">Tuesday, January 14, 2025</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-white/20 px-3 py-2 rounded-lg text-sm">
                <div className={`w-2 h-2 rounded-full transition-colors duration-500 ${highlightAI ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                <span className="font-medium">
                  {highlightAI ? 'AI Active' : 'AI Ready'}
                </span>
              </div>
              <button
                onClick={() => setHighlightAI(!highlightAI)}
                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-3 py-2 rounded-lg transition-all duration-200 text-sm font-medium"
              >
                <SparklesIcon className="h-4 w-4" />
                {highlightAI ? 'Hide AI Magic' : 'Show AI Magic'}
              </button>
            </div>
          </div>
        </div>

        {/* Time Grid */}
        <div className="p-6">
          <div className="grid grid-cols-12 gap-1">
            {/* Time Labels */}
            <div className="col-span-2 space-y-6">
              {['9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM'].map((time) => (
                <div key={time} className="text-xs text-gray-500 font-medium h-16 flex items-start">
                  {time}
                </div>
              ))}
            </div>

            {/* Calendar Content */}
            <div className="col-span-10 relative">
              {/* Hour Lines */}
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="absolute w-full border-t border-gray-100" style={{ top: `${i * 64}px` }} />
              ))}

              {/* Events */}
              <div className="relative">
                {mockEvents.map((event, index) => {
                  const startHour = parseInt(event.time.split(':')[0]);
                  const startMinute = parseInt(event.time.split(':')[1]);
                  const adjustedHour = event.time.includes('PM') && startHour !== 12 ? startHour + 12 : startHour;
                  const baseHour = 9; // 9 AM start
                  const topPosition = ((adjustedHour - baseHour) * 64) + ((startMinute / 60) * 64);
                  const height = (event.duration / 60) * 64;

                  return (
                    <div
                      key={event.id}
                      onClick={() => setSelectedEvent(selectedEvent === event.id ? null : event.id)}
                      className={`absolute left-0 right-0 rounded-lg p-3 transition-all duration-300 transform hover:scale-102 cursor-pointer ${
                        event.isAutoScheduled && highlightAI 
                          ? `${event.color} ring-2 ring-yellow-400 ring-opacity-30 shadow-lg` 
                          : event.color
                      } ${
                        selectedEvent === event.id ? 'scale-102 shadow-xl z-50' : 'hover:shadow-md'
                      }`}
                      style={{
                        top: `${topPosition}px`,
                        height: `${Math.max(height, 32)}px`,
                        zIndex: selectedEvent === event.id ? 50 : 10 + index
                      }}
                    >
                      <div className="flex items-start justify-between text-white">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {event.type === 'meeting' ? (
                              <CalendarDaysIcon className="h-3 w-3 flex-shrink-0" />
                            ) : (
                              <ClockIcon className="h-3 w-3 flex-shrink-0" />
                            )}
                            <p className="text-sm font-medium truncate">{event.title}</p>
                          </div>
                          <p className="text-xs opacity-90">{event.time} · {event.duration}m</p>
                        </div>
                        {event.isAutoScheduled && highlightAI && (
                          <div className="flex-shrink-0 ml-2">
                            <div className="bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                              <SparklesIcon className="h-3 w-3" />
                              AI
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Event Details Popup */}
                      {selectedEvent === event.id && (
                        <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-2xl border border-gray-200 p-4 z-50 w-72 opacity-0 animate-fade-in">
                          <div className="flex items-start gap-3">
                            <div className={`w-4 h-4 rounded ${event.color} flex-shrink-0 mt-1`}></div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-gray-900 mb-1">{event.title}</h4>
                              <div className="text-sm text-gray-600 space-y-1">
                                <p>⏰ {event.time} ({event.duration} minutes)</p>
                                <p>📋 {event.type === 'meeting' ? 'Meeting' : 'Task'}</p>
                                {event.isAutoScheduled && (
                                  <p className="text-blue-600 font-medium flex items-center gap-1">
                                    <SparklesIcon className="h-4 w-4" />
                                    Auto-scheduled by AI
                                  </p>
                                )}
                              </div>
                              {event.isAutoScheduled && (
                                <div className="mt-3 bg-blue-50 rounded-lg p-3">
                                  <p className="text-xs text-blue-700">
                                    <strong>Why this time slot?</strong> Based on your energy patterns and meeting gaps, this is optimal for {event.type === 'task' ? 'focused work' : 'collaboration'}.
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Subtle AI Scheduling Indicators */}
              {highlightAI && (
                <div className="absolute -right-8 top-20 bg-yellow-50 border border-yellow-200 text-yellow-800 px-3 py-2 rounded-lg text-xs font-medium shadow-sm opacity-0 animate-fade-in">
                  <div className="flex items-center gap-1">
                    <SparklesIcon className="h-3 w-3" />
                    AI scheduled
                  </div>
                  <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1 w-2 h-2 bg-yellow-200 rotate-45"></div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Enhanced Footer Stats */}
        <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-6 py-4 border-t">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-gray-700">
                  <span className="font-bold text-green-600">3 tasks</span> auto-scheduled
                </span>
              </div>
              <div className="flex items-center gap-2">
                <SparklesIcon className="h-4 w-4 text-blue-500" />
                <span className="text-gray-700">
                  <span className="font-bold text-blue-600">2.5 hours</span> saved this week
                </span>
              </div>
              <div className="flex items-center gap-2">
                <ClockIcon className="h-4 w-4 text-purple-500" />
                <span className="text-gray-700">
                  <span className="font-bold text-purple-600">94%</span> efficiency score
                </span>
              </div>
            </div>
            <div className="text-gray-600 bg-white px-3 py-1 rounded-full text-xs font-medium">
              Next: Update project timeline (4:00 PM)
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Hint */}
      <div className="text-center mt-6">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <p className="text-gray-600 text-sm">
            ✨ <strong>Click &quot;Show AI Magic&quot;</strong> to see auto-scheduled tasks
          </p>
          <span className="text-gray-400">•</span>
          <p className="text-gray-600 text-sm">
            📅 <strong>Click any event</strong> to see AI scheduling insights
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { 
            opacity: 0; 
            transform: translateY(5px); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
        }
        .hover\\:scale-102:hover {
          transform: scale(1.02);
        }
      `}</style>
    </div>
  );
}