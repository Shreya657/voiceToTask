'use client'
import { useState, useEffect, useCallback } from 'react';
import Recorder from './component/Recorder';
import Snowfall from 'react-snowfall';

export default function Home() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // 1. Initial Load: Load tasks + Request Permissions
  useEffect(() => {
    const savedTasks = localStorage.getItem('voice-tasks');
    if (savedTasks) setTasks(JSON.parse(savedTasks));

    // 🔔 Force request permission immediately so mobile banners work
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // 2. Persistent Save: Sync tasks to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('voice-tasks', JSON.stringify(tasks));
  }, [tasks]);

  // 🎤 AI Voice Engine
  const speakTask = useCallback((text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(`Reminder: ${text}`);
    utterance.volume = 1;
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }, []);

  // 3. Service Worker Communication (Handle Mobile Clicks & Voice)
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js');

      const handleMessage = (event: MessageEvent) => {
        if (event.data.type === 'SPEAK_TASK') {
          speakTask(event.data.text);
        }
        
        // 🚀 MOBILE AUTO-DELETE: Triggered from sw.js when notification is tapped
        if (event.data.type === 'COMPLETE_TASK') {
          speakTask(event.data.text); 
          setTasks((currentTasks) => {
            const newTasks = currentTasks.filter(t => t.task !== event.data.text);
            localStorage.setItem('voice-tasks', JSON.stringify(newTasks));
            return newTasks;
          });
        }
      };

      navigator.serviceWorker.addEventListener('message', handleMessage);
      return () => navigator.serviceWorker.removeEventListener('message', handleMessage);
    }
  }, [speakTask]);

  // 4. Foreground Heartbeat: Handle Active Reminders & Auto-Delete
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      tasks.forEach((task, index) => {
        if (task.time && !task.notified) {
          const taskTime = new Date(task.time);
          if (
            taskTime.getHours() === now.getHours() && 
            taskTime.getMinutes() === now.getMinutes()
          ) {
            // Trigger Voice
            speakTask(task.task);

            // 🚀 Trigger Service Worker Notification (Best for Mobile Banners)
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.ready.then((registration) => {
                registration.showNotification("🔔 Task Due Now", {
                  body: task.task,
                  vibrate: [200, 100, 200],
                  tag: `task-${index}`,
                  renotify: true,
                } as any); 
              });
            }

            // 🚀 AUTO-DELETE: Clean up UI 5 seconds after notification
            setTimeout(() => {
              setTasks((prev) => {
                const updated = prev.filter((_, i) => i !== index);
                localStorage.setItem('voice-tasks', JSON.stringify(updated));
                return updated;
              });
            }, 5000); 
          }
        }
      });
    }, 10000);
    return () => clearInterval(interval);
  }, [tasks, speakTask]);

  // --- Helper Functions ---
  const updateTaskTime = (index: number, newTime: string) => {
    const updatedTasks = [...tasks];
    updatedTasks[index].time = newTime || null;
    updatedTasks[index].notified = false;
    setTasks([...updatedTasks]);

    if (newTime) {
      const delay = new Date(newTime).getTime() - Date.now();
      if (delay > 0) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.active?.postMessage({
            type: 'SCHEDULE_NOTIFICATION',
            title: '⏰ Task Reminder',
            body: updatedTasks[index].task,
            delay: delay
          });
        });
        alert("Reminder set! Task will auto-delete once completed.");
      }
    }
  };

  const handleNewTasks = (newTasks: any[]) => setTasks((prev) => [...prev, ...newTasks]);
  const updateTask = (index: number, field: string, value: string) => {
    const updatedTasks = [...tasks];
    (updatedTasks[index] as any)[field] = value;
    setTasks(updatedTasks);
  };
  const deleteTask = (index: number) => {
    const updated = tasks.filter((_, i) => i !== index);
    setTasks(updated);
  };

  return (
    <main className="relative min-h-screen snow-bg p-0 flex flex-col items-center overflow-hidden">
      <Snowfall 
        color="#ffffff"
        snowflakeCount={150}
        style={{ position: 'fixed', width: '100vw', height: '100vh', zIndex: 0 }}
      />
      
      <div className="relative z-10 w-full max-w-6xl flex flex-col items-center">
        <h1 className="text-3xl font-bold text-white mb-12 mt-8">Voice To-Task</h1>
        <Recorder onTasksReceived={handleNewTasks} />
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full mt-12">
          {tasks.map((t, i) => (
            <div key={i} className="group relative p-6 bg-slate-800/80 backdrop-blur-sm rounded-2xl border border-slate-700 shadow-xl transition-all hover:border-blue-500">
              <div className="absolute top-4 right-4 flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                <button onClick={() => setEditingIndex(editingIndex === i ? null : i)} className="text-slate-500 hover:text-blue-400">
                  {editingIndex === i ? '✅' : '✏️'}
                </button>
                <button onClick={() => deleteTask(i)} className="text-slate-500 hover:text-red-500">✕</button>
              </div>

              <span className="text-xs font-bold uppercase tracking-wider text-blue-400">{t.category}</span>
              
              <div className="mt-2">
                {editingIndex === i ? (
                  <input 
                    autoFocus 
                    className="bg-slate-700 text-white text-lg font-semibold p-1 rounded border border-blue-500 w-full focus:outline-none" 
                    value={t.task} 
                    onChange={(e) => updateTask(i, 'task', e.target.value)} 
                    onBlur={() => setEditingIndex(null)} 
                  />
                ) : (
                  <p className="text-white text-lg font-semibold">{t.task}</p>
                )}
              </div>

              <div className="mt-4">
                {t.time ? (
                  <div className="flex flex-col gap-2">
                    <p className="text-slate-400 text-sm flex items-center gap-1">
                      ⏰ {new Date(t.time).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                    </p>
                    <button onClick={() => updateTaskTime(i, "")} className="text-xs text-slate-500 hover:text-blue-400 underline w-fit">Change Time</button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <p className="text-slate-500 text-xs italic">No reminder set</p>
                    <input type="datetime-local" onChange={(e) => updateTaskTime(i, e.target.value)} className="bg-slate-700 text-white text-xs p-2 rounded-lg border border-slate-600" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
 