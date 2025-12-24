'use client'
import { useState } from 'react';
import { useRecorder } from '../hook/useRecorder';

export default function Recorder({ onTasksReceived }: { onTasksReceived: (tasks: any[]) => void }) {
  const [loading, setLoading] = useState(false);

  const { isRecording, start, stop } = useRecorder(async (blob) => {
    setLoading(true);
    const formData = new FormData();
    formData.append('file', blob, 'audio.webm');

    const res = await fetch('/api/transcribe', { method: 'POST', body: formData });
    const data = await res.json();
    console.log('Transcription Response:', data);
    
    if (data.tasks) onTasksReceived(data.tasks);
    setLoading(false);

    
  });
  

  return (
    <div className="flex flex-col items-center gap-4 p-8 bg-white/10 rounded-3xl backdrop-blur-md border border-white/20">
      <button
        onMouseDown={start}
        onMouseUp={stop}
        onTouchStart={(e) => { e.preventDefault(); start(); }}
  onTouchEnd={(e) => { e.preventDefault(); stop(); }}
        className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all ${
          isRecording ? 'bg-red-500 scale-110' : 'bg-blue-600 hover:bg-blue-500'
        }`}
      >
        {isRecording && (
          <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75" />
        )}
        <span className="text-white text-2xl">🎙️</span>
      </button>
      <p className="text-white font-medium">
        {loading ? 'Thinking...' : isRecording ? 'Listening...' : 'Hold to Speak'}
      </p>
    </div>
  );
}