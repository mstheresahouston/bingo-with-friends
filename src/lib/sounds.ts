// Sound utility functions using Web Audio API
const audioContext = typeof window !== 'undefined' ? new (window.AudioContext || (window as any).webkitAudioContext)() : null;

export const playCallSound = (volume: number = 1) => {
  if (!audioContext) return;
  
  // Ensure audio context is unlocked (some browsers start it suspended)
  try {
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
  } catch {}
  
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.1);
  
  const vol = Math.max(0, Math.min(1, volume));
  gainNode.gain.setValueAtTime(0.3 * vol, audioContext.currentTime);
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

export const speakCall = (
  value: string,
  gameType: string,
  voiceGender: 'male' | 'female' = 'female',
  volume: number = 1
) => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  
  // Cancel any ongoing speech
  try { window.speechSynthesis.cancel(); } catch {}
  
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
    // Use pitch to differentiate between male and female voices
    utterance.pitch = voiceGender === 'male' ? 0.7 : 1.2;
    utterance.volume = Math.max(0, Math.min(1, volume));
    
    // Select voice based on gender preference
    const voices = window.speechSynthesis.getVoices();
    
    if (voices.length > 0) {
      let preferredVoice;
      
      if (voiceGender === 'male') {
        // Try to find a male voice
        preferredVoice = voices.find(voice => {
          const name = voice.name.toLowerCase();
          const uri = voice.voiceURI.toLowerCase();
          return name.includes('male') && !name.includes('female') ||
                 name.includes('david') || name.includes('james') || 
                 name.includes('daniel') || name.includes('alex') ||
                 uri.includes('male') && !uri.includes('female');
        });
        
        // Fallback to voices that typically sound male
        if (!preferredVoice) {
          preferredVoice = voices.find(voice => 
            voice.name.includes('Google UK English Male') ||
            voice.name.includes('Microsoft Mark') ||
            voice.lang.startsWith('en') && voice.name.includes('Male')
          );
        }
      } else {
        // Try to find a female voice
        preferredVoice = voices.find(voice => {
          const name = voice.name.toLowerCase();
          const uri = voice.voiceURI.toLowerCase();
          return name.includes('female') ||
                 name.includes('samantha') || name.includes('victoria') || 
                 name.includes('karen') || name.includes('zira') ||
                 uri.includes('female');
        });
        
        // Fallback to voices that typically sound female
        if (!preferredVoice) {
          preferredVoice = voices.find(voice => 
            voice.name.includes('Google UK English Female') ||
            voice.name.includes('Microsoft Zira') ||
            voice.lang.startsWith('en') && voice.name.includes('Female')
          );
        }
      }
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
        console.log(`Using ${voiceGender} voice:`, preferredVoice.name);
      } else {
        console.log(`No specific ${voiceGender} voice found, using pitch adjustment (${utterance.pitch})`);
      }
    } else {
      console.log(`Using pitch ${utterance.pitch} for ${voiceGender} voice`);
    }
    
    try { window.speechSynthesis.resume(); } catch {}
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
