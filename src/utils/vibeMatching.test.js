import { describe, it, expect } from 'vitest';
import { getVibeSuggestions, getDailyVibePlaylist } from './vibeMatching';

describe('vibeMatching', () => {
  const songs = [
    { id: 1, title: 'Drive Fast', artist: ['A'], moods: ['Driving'], vibeTags: ['Driving'] },
    { id: 2, title: 'Night Ride', artist: ['B'], moods: ['Driving'], vibeTags: ['Driving'] },
    { id: 3, title: 'Slow Sunset', artist: ['C'], moods: ['Relaxing'], vibeTags: ['Relaxing'] },
    { id: 4, title: 'Deep Dream', artist: ['D'], moods: ['Deep Sleep'], vibeTags: ['Deep Sleep'] },
    { id: 5, title: 'Focus Flow', artist: ['E'], moods: ['Focus & Work'], vibeTags: ['Focus & Work'] },
    { id: 6, title: 'Dinner Date', artist: ['F'], moods: ['Romance or Date Night'], vibeTags: ['Romance or Date Night'] },
    { id: 7, title: 'Gym Pulse', artist: ['G'], moods: ['Workout & Gym'], vibeTags: ['Workout & Gym'] }
  ];

  it('matches songs by vibe including explicit vibe tags', () => {
    const driving = getVibeSuggestions(songs, 'Driving');
    expect(driving.some(song => song.id === 1)).toBe(true);
    expect(driving.some(song => song.id === 2)).toBe(true);
  });

  it('caps daily playlists at 40 items per vibe', () => {
    const many = Array.from({ length: 80 }, (_, index) => ({
      id: index + 10,
      title: `Driving Song ${index + 1}`,
      artist: ['Driver'],
      moods: ['Driving'],
      vibeTags: ['Driving']
    }));

    const playlist = getDailyVibePlaylist(many, 'Driving', '2026-08-14');
    expect(playlist.length).toBe(40);
  });
});
