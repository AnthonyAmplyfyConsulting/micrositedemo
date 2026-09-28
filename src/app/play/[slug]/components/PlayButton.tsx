'use client'

interface PlayButtonProps {
  onPlay: () => void;
}

export default function PlayButton({ onPlay }: PlayButtonProps) {
  return (
    <div className="play-cradle">
      <button 
        className="play-button" 
        onClick={onPlay} 
        aria-label="Play to win rewards"
      >
        <span className="button-texture" aria-hidden="true" />
        <span className="button-sheen" aria-hidden="true" />
        <svg className="play-symbol" viewBox="0 0 80 80" aria-hidden="true">
          <path 
            d="M25 15c-4-2.3-8 .1-8 4.7v40.6c0 4.6 4 7 8 4.7l36-20.3c4-2.3 4-7.1 0-9.4Z" 
            fill="#ffffff"
          />
        </svg>
      </button>
    </div>
  )
}
