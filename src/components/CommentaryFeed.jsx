import React from 'react';

export default function CommentaryFeed({ items = [] }) {
  return (
    <div className="commentary-feed">
      {items.map((item) => (
        <div
          key={item.id}
          className={`commentary-item fade-in ${item.type === 'ai' ? 'ai-comment' : item.type === 'event' ? 'event-comment' : ''}`}
        >
          <span className="commentary-timestamp">
            {item.type === 'loading' ? 'Cargando...' : `V${item.lap || 0}`}
          </span>
          {item.type === 'loading'
            ? <span className="loading-text">Generando comentario...</span>
            : item.text
          }
        </div>
      ))}
    </div>
  );
}
