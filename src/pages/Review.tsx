import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { calculateSM2 } from '../lib/sm2';
import { Volume2, CheckCircle } from 'lucide-react';

export const Review: React.FC = () => {
  const { deckId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [cards, setCards] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDueCards = async () => {
      if (!user || !deckId) return;
      const now = new Date().toISOString();
      const { data } = await supabase
        .from('cards')
        .select('*')
        .eq('deck_id', deckId)
        .lte('next_review_date', now)
        .order('next_review_date', { ascending: true });
      
      if (data) setCards(data);
      setLoading(false);
    };
    fetchDueCards();
  }, [deckId, user]);

  useEffect(() => {
    // Pre-load voices on component mount
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
    }
  }, []);

  const speak = (text: string, lang: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang || 'de-DE';
      
      const voices = window.speechSynthesis.getVoices();
      // Try to find a Google German voice specifically
      const googleVoice = voices.find(v => v.lang.includes('de') && v.name.includes('Google'));
      
      if (googleVoice) {
        utterance.voice = googleVoice;
      } else {
        // Fallback to any available German voice
        const germanVoice = voices.find(v => v.lang.includes('de'));
        if (germanVoice) {
          utterance.voice = germanVoice;
        }
      }

      window.speechSynthesis.speak(utterance);
    }
  };

  const getIntervalLabel = (quality: number) => {
    if (!cards[currentIndex]) return '';
    const card = cards[currentIndex];
    
    if (quality === 1) return '< 10m';
    if (card.repetition === 0 && quality === 2) return '12h';
    
    // Simulate SM-2 calculation to get exact upcoming interval
    const result = calculateSM2(quality, card.repetition, card.interval, card.ease_factor);
    
    // Add logic to display months or years if the interval gets very large (optional polish)
    if (result.interval >= 365) return `${(result.interval / 365).toFixed(1)}y`;
    if (result.interval >= 30) return `${(result.interval / 30).toFixed(1)}mo`;
    
    return `${result.interval}d`;
  };

  const handleGrade = async (quality: number) => {
    const card = cards[currentIndex];
    
    // Calculate new SM-2 values
    const sm2 = calculateSM2(quality, card.repetition, card.interval, card.ease_factor);
    
    // Update in database
    await supabase
      .from('cards')
      .update({
        interval: sm2.interval,
        repetition: sm2.repetition,
        ease_factor: sm2.easeFactor,
        next_review_date: sm2.nextReviewDate
      })
      .eq('id', card.id);

    // Go to next card
    setShowBack(false);
    setCurrentIndex(prev => prev + 1);
  };

  if (loading) return <div className="p-8 text-center">Loading due cards...</div>;
  
  if (currentIndex >= cards.length) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-4">
        <CheckCircle size={64} className="text-green-500 mb-4" />
        <h1 className="text-3xl font-bold mb-2">Review Complete!</h1>
        <p className="text-gray-500 mb-8">You have no more due cards for this deck today.</p>
        <button 
          onClick={() => navigate(`/deck/${deckId}`)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium"
        >
          Back to Deck
        </button>
      </div>
    );
  }

  const card = cards[currentIndex];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white flex flex-col items-center p-4 pt-12">
      <div className="w-full max-w-2xl text-center mb-4">
        <span className="text-sm text-gray-500 font-medium">
          Card {currentIndex + 1} of {cards.length}
        </span>
      </div>

      <div className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 md:p-12 min-h-[400px] flex flex-col items-center justify-center relative border dark:border-gray-700">
        
        {/* Front */}
        <div className="text-center w-full">
          <div className="flex justify-center items-center gap-3 mb-4">
            <h2 className="text-4xl md:text-5xl font-bold">{card.word}</h2>
            <button 
              onClick={() => speak(card.word, card.language || 'de-DE')}
              className="text-blue-500 hover:text-blue-600 p-2 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
              title="Listen to word"
            >
              <Volume2 size={28} />
            </button>
          </div>
        </div>

        {/* Back */}
        {showBack ? (
          <div className="w-full mt-8 pt-8 border-t dark:border-gray-700 text-center animate-fade-in">
            <h3 className="text-xl font-semibold mb-2 text-gray-500 dark:text-gray-400">Context Sentence</h3>
            <p className="text-xl md:text-2xl text-gray-800 dark:text-gray-200 italic mb-6">
              {card.sentence}
              <button 
                onClick={() => speak(card.sentence, card.language || 'de-DE')}
                className="inline-block ml-2 text-blue-500 hover:text-blue-600 transition-colors align-middle"
                title="Listen to sentence"
              >
                <Volume2 size={24} />
              </button>
            </p>

            {card.explanation && (
              <>
                <h3 className="text-lg font-semibold mb-2 text-gray-500 dark:text-gray-400">Definition / Synonym</h3>
                <p className="text-lg text-gray-700 dark:text-gray-300 mb-8">{card.explanation}</p>
              </>
            )}
            
            {/* Grading Buttons */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 justify-center w-full mt-8">
              <button 
                onClick={() => handleGrade(1)} 
                className="py-3 px-2 rounded-lg font-bold text-red-700 bg-red-100 hover:bg-red-200 transition-colors flex flex-col items-center"
              >
                <span>Again</span>
                <span className="text-xs font-normal opacity-75">{getIntervalLabel(1)}</span>
              </button>
              <button 
                onClick={() => handleGrade(2)} 
                className="py-3 px-2 rounded-lg font-bold text-orange-700 bg-orange-100 hover:bg-orange-200 transition-colors flex flex-col items-center"
              >
                <span>Hard</span>
                <span className="text-xs font-normal opacity-75">{getIntervalLabel(2)}</span>
              </button>
              <button 
                onClick={() => handleGrade(4)} 
                className="py-3 px-2 rounded-lg font-bold text-green-700 bg-green-100 hover:bg-green-200 transition-colors flex flex-col items-center"
              >
                <span>Good</span>
                <span className="text-xs font-normal opacity-75">{getIntervalLabel(4)}</span>
              </button>
              <button 
                onClick={() => handleGrade(5)} 
                className="py-3 px-2 rounded-lg font-bold text-blue-700 bg-blue-100 hover:bg-blue-200 transition-colors flex flex-col items-center"
              >
                <span>Easy</span>
                <span className="text-xs font-normal opacity-75">{getIntervalLabel(5)}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full mt-auto pt-12">
            <button 
              onClick={() => setShowBack(true)}
              className="w-full py-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl font-bold text-lg transition-colors border dark:border-gray-600"
            >
              Show Answer
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
