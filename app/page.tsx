'use client'
import { useState, useEffect } from 'react';
import Recorder from './component/Recorder';

export default function Home() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);


   const speakTask = (text: string) => {
      window.speechSynthesis.cancel(); // Clear queue
      const utterance = new SpeechSynthesisUtterance(`Reminder: ${text}`);
      utterance.rate = 0.9; 
      window.speechSynthesis.speak(utterance);
    };

  // 1. Load tasks from localStorage on first render
  useEffect(() => {
    const savedTasks = localStorage.getItem('voice-tasks');
    if (savedTasks) {
      setTasks(JSON.parse(savedTasks));
    }
  }, []);

  // 2. Save tasks to localStorage whenever the 'tasks' array changes
  useEffect(() => {
    if (tasks.length > 0) {
      localStorage.setItem('voice-tasks', JSON.stringify(tasks));
    }
  }, [tasks]);

  
 // 3. Notification & Voice Engine
  useEffect(() => {
    if ("Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission();
    }

   

    const interval = setInterval(() => {
      const now = new Date();
      
      tasks.forEach((task, index) => {
        if (task.time && !task.notified) {
          const taskTime = new Date(task.time);

          if (
            taskTime.getHours() === now.getHours() && 
            taskTime.getMinutes() === now.getMinutes()
          ) {
            // A. Visual Notification
            if (Notification.permission === "granted") {
               new Notification("🔔 Task Due Now", {
                body: task.task,
                requireInteraction: true,
              });
            } else {
               // Fallback for mobile if notifications are blocked
               alert(`REMINDER: ${task.task}`); 
            }

            // B. Audible Voice
            speakTask(task.task);

            // C. Vibration
            if ("vibrate" in navigator) {
              navigator.vibrate([200, 100, 200]);
            }

            // D. Mark as notified
            const updated = [...tasks];
            updated[index].notified = true;
            setTasks([...updated]); // Use spread to ensure state update
          }
        }
      });
    }, 10000); // Check every 10 seconds for mobile responsiveness

    return () => clearInterval(interval);
  }, [tasks]);

  useEffect(() => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      console.log('Service Worker Registered!', reg);
    });
  }
}, []);
  const handleNewTasks = (newTasks: any[]) => {
    setTasks((prev) => [...prev, ...newTasks]);
  };

  useEffect(() => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data.type === 'SPEAK_TASK') {
        speakTask(event.data.text);
      }
    });
  }
}, []);

  const updateTask = (index: number, field: string, value: string) => {
    const updatedTasks = [...tasks];
    (updatedTasks[index] as any)[field] = value;
    setTasks(updatedTasks);
  };

 const updateTaskTime = (index: number, newTime: string) => {
  const updatedTasks = [...tasks];
  updatedTasks[index].time = newTime || null;
  setTasks(updatedTasks);
  localStorage.setItem('voice-tasks', JSON.stringify(updatedTasks));

  if (newTime) {
    const targetTime = new Date(newTime).getTime();
    const now = new Date().getTime();
    const delay = targetTime - now;

    if (delay > 0) {
      // Send the task to the "Ghost Script" (Service Worker)
      navigator.serviceWorker.ready.then((registration) => {
        navigator.serviceWorker.controller?.postMessage({
          type: 'SCHEDULE_NOTIFICATION',
          title: '⏰ Task Reminder',
          body: updatedTasks[index].task,
          delay: delay
        });
      });
      alert("Reminder scheduled in background!");
    }
  }
};

  const deleteTask = (index: number) => {
    const updated = tasks.filter((_, i) => i !== index);
    setTasks(updated);
    if (updated.length === 0) localStorage.removeItem('voice-tasks');
  };

  return (
    <main className="min-h-screen bg-slate-900 p-8 flex flex-col items-center">
      <h1 className="text-4xl font-bold text-white mb-12 mt-8">Voice To-Do 2025</h1>
      
      <Recorder onTasksReceived={handleNewTasks} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl mt-12">
        {tasks.map((t, i) => (
          <div key={i} className="group relative p-6 bg-slate-800 rounded-2xl border border-slate-700 shadow-xl transition-all hover:border-blue-500">
            
            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={() => setEditingIndex(editingIndex === i ? null : i)}
                className="text-slate-500 hover:text-blue-400"
              >
                {editingIndex === i ? '✅' : '✏️'}
              </button>
              <button onClick={() => deleteTask(i)} className="text-slate-500 hover:text-red-500">
                ✕
              </button>
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
  ⏰ {new Date(t.time).toLocaleString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit', 
    hour12: true 
  })}
</p>
                  <button onClick={() => updateTaskTime(i, "")} className="text-xs text-slate-500 hover:text-blue-400 underline w-fit">
                    Change Time
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <p className="text-slate-500 text-xs italic">No reminder set</p>
                  <input 
                    type="datetime-local" 
                    onChange={(e) => updateTaskTime(i, e.target.value)}
                    className="bg-slate-700 text-white text-xs p-2 rounded-lg border border-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}