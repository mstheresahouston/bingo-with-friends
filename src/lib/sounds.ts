// Sound utility functions using Web Audio API
const audioContext = typeof window !== 'undefined' ? new (window.AudioContext || (window as any).webkitAudioContext)() : null;

export const playCallSound = () => {
  if (!audioContext) return;
  
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.1);
  
  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.2);
};

export const playBingoSound = () => {
  if (!audioContext) return;
  
  // Play a celebratory sequence of notes
  const notes = [523.25, 659.25, 783.99, 1046.50]; // C, E, G, C (major chord)
  const duration = 0.15;
  
  notes.forEach((frequency, index) => {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    
    const startTime = audioContext.currentTime + (index * duration);
    gainNode.gain.setValueAtTime(0.3, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
    
    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
  });
};

export const speakCall = (value: string, gameType: string, voiceGender: 'male' | 'female' = 'female') => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  
  // Cancel any ongoing speech
  window.speechSynthesis.cancel();
  
  const speak = () => {
    const utterance = new SpeechSynthesisUtterance();
    
    if (gameType === "numbers") {
      // For numbers, announce with the BINGO letter
      const num = parseInt(value);
      let letter = "";
      
      if (num >= 1 && num <= 15) letter = "B";
      else if (num >= 16 && num <= 30) letter = "I";
      else if (num >= 31 && num <= 45) letter = "N";
      else if (num >= 46 && num <= 60) letter = "G";
      else if (num >= 61 && num <= 75) letter = "O";
      
      utterance.text = `${letter} ${num}`;
    } else {
      // For words, just say the word
      utterance.text = value;
    }
    
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    // Select voice based on gender preference
    const voices = window.speechSynthesis.getVoices();
    
    if (voices.length > 0) {
      const preferredVoice = voices.find(voice => {
        const voiceName = voice.name.toLowerCase();
        if (voiceGender === 'male') {
          return voiceName.includes('male') || voiceName.includes('david') || voiceName.includes('james') || voiceName.includes('daniel');
        } else {
          return voiceName.includes('female') || voiceName.includes('samantha') || voiceName.includes('victoria') || voiceName.includes('karen');
        }
      });
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
    }
    
    window.speechSynthesis.speak(utterance);
  };
  
  // Ensure voices are loaded before speaking
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) {
    // Wait for voices to load
    window.speechSynthesis.addEventListener('voiceschanged', () => {
      speak();
    }, { once: true });
  } else {
    speak();
  }
};
