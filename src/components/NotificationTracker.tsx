import React, { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export const NotificationTracker: React.FC = () => {
  const { user } = useAuth();
  const notifiedCards = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;

    // Request permission for notifications
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }

    const checkDueCards = async () => {
      if ('Notification' in window && Notification.permission === 'granted') {
        const now = new Date().toISOString();
        
        // Fetch cards that are due right now
        const { data } = await supabase
          .from('cards')
          .select('id, word')
          .eq('user_id', user.id)
          .lte('next_review_date', now);

        if (data && data.length > 0) {
          // Find cards we haven't notified about in this session
          const newDueCards = data.filter(card => !notifiedCards.current.has(card.id));
          
          if (newDueCards.length > 0) {
            new Notification('Time to Review! 📚', {
              body: `You have ${newDueCards.length} German card(s) ready for review (e.g., "${newDueCards[0].word}").`,
              icon: '/vite.svg', // Default vite icon
            });

            // Mark as notified
            newDueCards.forEach(card => notifiedCards.current.add(card.id));
          }
        }
      }
    };

    // Check immediately on load
    checkDueCards();

    // Check every 5 minutes (300,000 ms)
    const interval = setInterval(checkDueCards, 300000);

    return () => clearInterval(interval);
  }, [user]);

  return null; // This is a logic-only component, it renders nothing
};
