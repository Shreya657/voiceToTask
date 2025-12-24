'use client'
import { useState, useRef } from 'react';

export const useRecorder = (onFinish: (blob: Blob) => void) => {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  const start = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder.current = new MediaRecorder(stream);
    chunks.current = [];

    mediaRecorder.current.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.current.push(e.data);
    };

    mediaRecorder.current.onstop = () => {
      const audioBlob = new Blob(chunks.current, { type: 'audio/webm' });
      onFinish(audioBlob);
    };

    mediaRecorder.current.start();
    setIsRecording(true);
  };

  const stop = () => {
    mediaRecorder.current?.stop();
    setIsRecording(false);
  };

  return { isRecording, start, stop };
};