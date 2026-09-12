import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { calculateSM2 } from '../lib/sm2';
import { Volume2, CheckCircle, ArrowLeft, Pencil, X, Check } from 'lucide-react';

export const Review: React.FC = () => {
  const { deckId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [cards, setCards] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [loading, setLoading] = useState(true);

  // Edit mode state
  const [editMode, setEditMode] = useState(false);
  const [editWord, setEditWord] = useState('');
  const [editSentence, setEditSentence] = useState('');
  const [editExplanation, setEditExplanation] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchDueCards = useCallback(async () => {
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
  }, [deckId, user]);

  useEffect(() => {
    fetchDueCards();
  }, [fetchDueCards]);

  // Fix 1: Use Page Visibility API to prevent card changing when tab is switched
  useEffect(() => {
    const handleVisibilityChange = () => {
      // Do nothing when user returns - just keep current state as is
      if (document.visibilityState === 'visible') {
        // Intentionally empty - prevents re-fetch which was causing card change
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
    }
  }, []);

  const speak = (text: string, lang: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang || 'de-DE';
      const voices = window.speechSynthesis.getVoices();
      const googleVoice = voices.find(v => v.lang.includes('de') && v.name.includes('Google'));
      if (googleVoice) {
        utterance.voice = googleVoice;
      } else {
        const germanVoice = voices.find(v => v.lang.includes('de'));
        if (germanVoice) utterance.voice = germanVoice;
      }
      window.speechSynthesis.speak(utterance);
    }
  };

  const getIntervalLabel = (quality: number) => {
    if (!cards[currentIndex]) return '';
    const card = cards[currentIndex];
    if (quality === 1) return '< 10m';
    if (card.repetition === 0 && quality === 2) return '12h';
    const result = calculateSM2(quality, card.repetition, card.interval, card.ease_factor);
    if (result.interval >= 365) return `${(result.interval / 365).toFixed(1)}y`;
    if (result.interval >= 30) return `${(result.interval / 30).toFixed(1)}mo`;
    return `${result.interval}d`;
  };

  const handleGrade = async (quality: number) => {
    const card = cards[currentIndex];
    const sm2 = calculateSM2(quality, card.repetition, card.interval, card.ease_factor);
    await supabase
      .from('cards')
      .update({
        interval: sm2.interval,
        repetition: sm2.repetition,
        ease_factor: sm2.easeFactor,
        next_review_date: sm2.nextReviewDate
      })
      .eq('id', card.id);
    setShowBack(false);
    setEditMode(false);
    setCurrentIndex(prev => prev + 1);
  };

  // Fix 2: Go back to previous card
  const handlePreviousCard = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setShowBack(false);
      setEditMode(false);
    }
  };

  // Fix 3: Enter edit mode for current card
  const handleStartEdit = () => {
    const card = cards[currentIndex];
    setEditWord(card.word);
    setEditSentence(card.sentence);
    setEditExplanation(card.explanation || '');
    setEditMode(true);
  };

  const handleSaveEdit = async () => {
    const card = cards[currentIndex];
    setSaving(true);
    const { error } = await supabase
      .from('cards')
      .update({
        word: editWord.trim(),
        sentence: editSentence.trim(),
        explanation: editExplanation.trim()
      })
      .eq('id', card.id);

    if (!error) {
      // Update local state too so we see the changes immediately
      const updatedCards = [...cards];
      updatedCards[currentIndex] = {
        ...card,
        word: editWord.trim(),
        sentence: editSentence.trim(),
        explanation: editExplanation.trim()
      };
      setCards(updatedCards);
      setEditMode(false);
    }
    setSaving(false);
  };

  if (loading) return <div className="p-8 text-center">Loading due cards...</div>;
  
  if (currentIndex >= cards.length) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-4">
        <CheckCircle size={64} className="text-green-500 mb-4" />
        <h1 className="text-3xl font-bold mb-2">Review Complete!</h1>
        <p className="text-gray-500 mb-8">You have no more due cards for this deck today. 🎉</p>
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white flex flex-col items-center p-4 pt-8">
      
      {/* Top Bar */}
      <div className="w-full max-w-2xl flex items-center justify-between mb-4">
        {/* Back to Deck button */}
        <button
          onClick={() => navigate(`/deck/${deckId}`)}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium"
        >
          <ArrowLeft size={16} /> Back to Deck
        </button>

        <span className="text-sm text-gray-500 font-medium">
          Card {currentIndex + 1} of {cards.length}
        </span>

        <div className="w-24" />
      </div>

      {/* Card */}
      <div className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 md:p-10 min-h-[400px] flex flex-col items-center justify-center relative border dark:border-gray-700">
        
        {/* Edit button (top-right of card) */}
        {!editMode && (
          <button
            onClick={handleStartEdit}
            className="absolute top-4 right-4 text-gray-400 hover:text-blue-500 transition-colors p-1"
            title="Edit this card"
          >
            <Pencil size={18} />
          </button>
        )}

        {editMode ? (
          /* ===== EDIT MODE ===== */
          <div className="w-full space-y-4">
            <h3 className="text-lg font-bold text-blue-600 mb-4">✏️ Edit Card</h3>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Word</label>
              <input
                type="text"
                value={editWord}
                onChange={e => setEditWord(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 text-lg font-bold"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Context Sentence</label>
              <textarea
                value={editSentence}
                onChange={e => setEditSentence(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Definition / Synonym (Optional)</label>
              <textarea
                value={editExplanation}
                onChange={e => setEditExplanation(e.target.value)}
                rows={2}
                className="w-full px-4 py-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-medium disabled:opacity-50"
              >
                <Check size={18} /> {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={() => setEditMode(false)}
                className="flex-1 flex items-center justify-center gap-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 py-2 rounded-lg font-medium"
              >
                <X size={18} /> Cancel
              </button>
            </div>
          </div>
        ) : (
          /* ===== REVIEW MODE ===== */
          <>
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
              <div className="w-full mt-8 pt-8 border-t dark:border-gray-700 text-center">
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
                  <button onClick={() => handleGrade(1)} className="py-3 px-2 rounded-lg font-bold text-red-700 bg-red-100 hover:bg-red-200 transition-colors flex flex-col items-center">
                    <span>Again</span>
                    <span className="text-xs font-normal opacity-75">{getIntervalLabel(1)}</span>
                  </button>
                  <button onClick={() => handleGrade(2)} className="py-3 px-2 rounded-lg font-bold text-orange-700 bg-orange-100 hover:bg-orange-200 transition-colors flex flex-col items-center">
                    <span>Hard</span>
                    <span className="text-xs font-normal opacity-75">{getIntervalLabel(2)}</span>
                  </button>
                  <button onClick={() => handleGrade(4)} className="py-3 px-2 rounded-lg font-bold text-green-700 bg-green-100 hover:bg-green-200 transition-colors flex flex-col items-center">
                    <span>Good</span>
                    <span className="text-xs font-normal opacity-75">{getIntervalLabel(4)}</span>
                  </button>
                  <button onClick={() => handleGrade(5)} className="py-3 px-2 rounded-lg font-bold text-blue-700 bg-blue-100 hover:bg-blue-200 transition-colors flex flex-col items-center">
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
          </>
        )}
      </div>
    </div>
  );
};
