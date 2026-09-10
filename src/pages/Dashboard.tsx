import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { Plus, BookOpen } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { user, signOut } = useAuth();
  const [decks, setDecks] = useState<any[]>([]);
  const [newDeckName, setNewDeckName] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchDecks = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('decks')
      .select('id, name, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setDecks(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDecks();
  }, [user]);

  const handleCreateDeck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeckName.trim() || !user) return;

    const { error } = await supabase
      .from('decks')
      .insert([{ name: newDeckName, user_id: user.id }]);

    if (error) {
      alert(`Error creating deck: ${error.message}`);
    } else {
      setNewDeckName('');
      fetchDecks();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">My Decks</h1>
          <button 
            onClick={signOut}
            className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            Sign Out
          </button>
        </div>

        <form onSubmit={handleCreateDeck} className="mb-8 flex gap-4">
          <input
            type="text"
            placeholder="New Deck Name..."
            value={newDeckName}
            onChange={(e) => setNewDeckName(e.target.value)}
            className="flex-1 px-4 py-2 rounded-lg border dark:bg-gray-800 dark:border-gray-700 focus:ring-2 focus:ring-blue-500"
          />
          <button 
            type="submit"
            disabled={!newDeckName.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
          >
            <Plus size={20} /> Create
          </button>
        </form>

        {loading ? (
          <div>Loading decks...</div>
        ) : decks.length === 0 ? (
          <div className="text-center py-12 text-gray-500 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700">
            No decks yet. Create your first deck above!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {decks.map(deck => (
              <Link 
                key={deck.id} 
                to={`/deck/${deck.id}`}
                className="block p-6 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 hover:shadow-md transition-shadow group"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                    <BookOpen size={24} />
                  </div>
                  <h3 className="text-xl font-semibold group-hover:text-blue-600 transition-colors">{deck.name}</h3>
                </div>
                <div className="text-sm text-gray-500 mt-4 flex justify-between">
                  <span>View Cards</span>
                  <span>&rarr;</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
