import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { generateCardData } from '../lib/gemini';
import { Sparkles, ArrowLeft, PlayCircle, Edit3, Trash2 } from 'lucide-react';

export const DeckView: React.FC = () => {
  const { deckId } = useParams();
  const { user } = useAuth();
  const [deck, setDeck] = useState<any>(null);
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dueCount, setDueCount] = useState(0);

  // Tabs state
  const [mode, setMode] = useState<'ai' | 'manual'>('ai');

  // AI Form State
  const [word, setWord] = useState('');
  const [generating, setGenerating] = useState(false);

  // Manual Form State
  const [manualWord, setManualWord] = useState('');
  const [manualSentence, setManualSentence] = useState('');
  const [manualExplanation, setManualExplanation] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchDeckAndCards = async () => {
    if (!user || !deckId) return;
    
    // Fetch Deck
    const { data: deckData } = await supabase
      .from('decks')
      .select('*')
      .eq('id', deckId)
      .single();
    if (deckData) setDeck(deckData);

    // Fetch Cards
    const { data: cardsData } = await supabase
      .from('cards')
      .select('*')
      .eq('deck_id', deckId)
      .order('created_at', { ascending: false });
    
    if (cardsData) {
      setCards(cardsData);
      
      const now = new Date().toISOString();
      const due = cardsData.filter(c => c.next_review_date <= now).length;
      setDueCount(due);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDeckAndCards();
  }, [deckId, user]);

  const handleAddCardAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!word.trim() || !user || !deckId) return;

    setGenerating(true);
    try {
      const cardData = await generateCardData(word);

      const { error } = await supabase.from('cards').insert([{
        deck_id: deckId,
        user_id: user.id,
        word: word,
        sentence: cardData.sentence,
        explanation: cardData.explanation,
        language: 'de'
      }]);

      if (error) throw error;
      
      setWord('');
      fetchDeckAndCards();
    } catch (error: any) {
      console.error(error);
      alert(`Failed to generate card: ${error.message || 'Unknown error'}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleAddCardManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualWord.trim() || !manualSentence.trim() || !user || !deckId) return;

    setSaving(true);
    try {
      const { error } = await supabase.from('cards').insert([{
        deck_id: deckId,
        user_id: user.id,
        word: manualWord.trim(),
        sentence: manualSentence.trim(),
        explanation: manualExplanation.trim(),
        language: 'de'
      }]);

      if (error) throw error;
      
      setManualWord('');
      setManualSentence('');
      setManualExplanation('');
      fetchDeckAndCards();
    } catch (error: any) {
      console.error(error);
      alert(`Failed to save card: ${error.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!confirm('Are you sure you want to delete this card?')) return;
    
    const { error } = await supabase.from('cards').delete().eq('id', cardId);
    if (!error) {
      fetchDeckAndCards();
    } else {
      alert(`Error deleting card: ${error.message}`);
    }
  };

  const formatTimeRemaining = (dateString: string) => {
    const nextDate = new Date(dateString);
    const now = new Date();
    const diffMs = nextDate.getTime() - now.getTime();

    if (diffMs <= 0) return "Due now";

    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `in ${diffMins}m`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `in ${diffHours}h`;

    const diffDays = Math.floor(diffHours / 24);
    return `in ${diffDays}d`;
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (!deck) return <div className="p-8">Deck not found</div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-8">
      <div className="max-w-4xl mx-auto">
        <Link to="/" className="inline-flex items-center text-blue-600 hover:underline mb-6">
          <ArrowLeft size={16} className="mr-1" /> Back to Dashboard
        </Link>
        
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">{deck.name}</h1>
          {dueCount > 0 && (
            <Link 
              to={`/review/${deck.id}`} 
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
            >
              <PlayCircle size={24} /> Start Review ({dueCount} due)
            </Link>
          )}
        </div>

        {/* Add Card Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 shadow-sm mb-8 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b dark:border-gray-700">
            <button
              onClick={() => setMode('ai')}
              className={`flex-1 py-4 font-medium flex items-center justify-center gap-2 transition-colors ${
                mode === 'ai' 
                  ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600 dark:bg-gray-700/50 dark:text-blue-400' 
                  : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/30'
              }`}
            >
              <Sparkles size={18} /> Generate with AI
            </button>
            <button
              onClick={() => setMode('manual')}
              className={`flex-1 py-4 font-medium flex items-center justify-center gap-2 transition-colors ${
                mode === 'manual' 
                  ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600 dark:bg-gray-700/50 dark:text-blue-400' 
                  : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/30'
              }`}
            >
              <Edit3 size={18} /> Manual Entry
            </button>
          </div>

          <div className="p-6">
            {mode === 'ai' ? (
              <form onSubmit={handleAddCardAI} className="flex gap-4">
                <input
                  type="text"
                  placeholder="Enter a German word (e.g., Apfel, Fenster)..."
                  value={word}
                  onChange={(e) => setWord(e.target.value)}
                  className="flex-1 px-4 py-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                  disabled={generating}
                />
                <button 
                  type="submit"
                  disabled={!word.trim() || generating}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
                >
                  {generating ? 'Generating...' : 'Create Card'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleAddCardManual} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">German Word *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., der Apfel"
                    value={manualWord}
                    onChange={(e) => setManualWord(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Context Sentence *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Ich esse einen roten Apfel zum Frühstück."
                    value={manualSentence}
                    onChange={(e) => setManualSentence(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Definition / Context Hint (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g., Eine Obstsorte / eine Frucht"
                    value={manualExplanation}
                    onChange={(e) => setManualExplanation(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                    disabled={saving}
                  />
                </div>
                <div className="flex justify-end pt-2">
                  <button 
                    type="submit"
                    disabled={!manualWord.trim() || !manualSentence.trim() || saving}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Card'}
                  </button>
                </div>
              </form>
            )}
            
            {mode === 'ai' && (
              <p className="text-sm text-gray-500 mt-4">
                AI will automatically generate a German example sentence and a German definition/synonym.
              </p>
            )}
          </div>
        </div>

        {/* Cards List */}
        <div>
          <h2 className="text-xl font-semibold mb-4">All Cards ({cards.length})</h2>
          <div className="space-y-4">
            {cards.map(card => (
              <div key={card.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl border dark:border-gray-700 flex justify-between group">
                <div className="flex-1 pr-4">
                  <h3 className="font-bold text-lg">{card.word}</h3>
                  <p className="text-gray-600 dark:text-gray-400 italic mb-2">{card.sentence}</p>
                  
                  {card.explanation && (
                    <div className="text-sm border-t dark:border-gray-700 pt-2 mt-2">
                      <p className="font-semibold">Definition:</p>
                      <p className="text-gray-500">{card.explanation}</p>
                    </div>
                  )}
                </div>
                <div className="text-right text-sm text-gray-500 flex flex-col justify-between items-end min-w-[120px]">
                  <div>
                    <p className={`font-semibold ${new Date(card.next_review_date) <= new Date() ? 'text-green-600 dark:text-green-400' : ''}`}>
                      {formatTimeRemaining(card.next_review_date)}
                    </p>
                    <p className="text-xs text-gray-400">Reps: {card.repetition}</p>
                  </div>
                  <button 
                    onClick={() => handleDeleteCard(card.id)}
                    className="text-red-400 hover:text-red-600 p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete Card"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
