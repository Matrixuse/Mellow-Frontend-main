import React from 'react';

const SongList = ({ songs, currentSongIndex, onSongSelect }) => {
    return (
        <ul className="flex-grow overflow-y-auto p-4 space-y-2">
            {songs.map((song, index) => (
                <li
                    key={song.id}
                    onClick={() => onSongSelect(index)}
                    className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${index === currentSongIndex ? 'bg-indigo-600/30' : 'hover:bg-gray-700/50'}`}
                    aria-current={index === currentSongIndex}
                >
                    <img src={song.cover} alt={song.title} className="w-12 h-12 rounded-md mr-4" />
                    <div className="flex-grow">
                        <p className={`font-medium ${index === currentSongIndex ? 'text-indigo-300' : 'text-white'}`}>{song.title}</p>
                        <p className="text-sm text-gray-400">{Array.isArray(song.artist) ? song.artist.join(', ') : (song.artist || '')}</p>
                    </div>
                    <span className="text-sm text-gray-400">{song.duration}</span>
                </li>
            ))}
        </ul>
    );
};

export default SongList;