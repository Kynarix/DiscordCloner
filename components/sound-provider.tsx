"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type SoundType = 'click' | 'success' | 'error' | 'bell';

interface SoundContextType {
    isSoundEnabled: boolean;
    toggleSound: () => void;
    playSound: (type: SoundType) => void;
}

const SoundContext = createContext<SoundContextType | undefined>(undefined);

export function SoundProvider({ children }: { children: ReactNode }) {
    const [isSoundEnabled, setIsSoundEnabled] = useState(true);

    useEffect(() => {
        const saved = localStorage.getItem('sound-enabled');
        if (saved !== null) {
            setIsSoundEnabled(saved === 'true');
        }
    }, []);

    const toggleSound = () => {
        setIsSoundEnabled(prev => {
            const newValue = !prev;
            localStorage.setItem('sound-enabled', String(newValue));
            return newValue;
        });
    };

    const playSound = (type: SoundType) => {
        if (!isSoundEnabled) return;

        let audioSrc = '';
        // In a real app, these would be paths to actual audio files in /public folder
        // For now, we can use simple beep approximations or just log if no files exist
        // or setup a synthesis for demo purposes if files are missing.
        // Assuming we will add files later, let's keep the structure ready.

        // Placeholder Logic:
        // switch (type) {
        //     case 'click': audioSrc = '/sounds/click.mp3'; break;
        //     case 'success': audioSrc = '/sounds/success.mp3'; break;
        //     case 'error': audioSrc = '/sounds/error.mp3'; break;
        // }
        // const audio = new Audio(audioSrc);
        // audio.play().catch(e => console.error("Audio play failed", e)); 
    };

    return (
        <SoundContext.Provider value={{ isSoundEnabled, toggleSound, playSound }}>
            {children}
        </SoundContext.Provider>
    );
}

export const useSound = () => {
    const context = useContext(SoundContext);
    if (!context) {
        throw new Error('useSound must be used within a SoundProvider');
    }
    return context;
};
