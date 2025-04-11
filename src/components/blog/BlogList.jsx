import React from 'react';

export default function BlogList({ articles, onArticleSelect }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {articles.map(article => (
        <div 
          key={article.id} 
          style={{
            padding: '1.5rem',
            border: '1px solid #E2E8F0',
            borderRadius: '0.5rem',
            backgroundColor: 'white',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            cursor: 'pointer',
            transition: 'transform 0.2s, box-shadow 0.2s'
          }}
          onClick={() => onArticleSelect(article)}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 10px 15px rgba(0, 0, 0, 0.05)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
          }}
        >
          <h2 style={{ 
            fontSize: '1.5rem', 
            fontWeight: '700', 
            marginBottom: '0.5rem',
            color: '#1E293B'
          }}>
            {article.title}
          </h2>
          <p style={{ 
            fontSize: '0.875rem', 
            color: '#64748B', 
            marginBottom: '1rem' 
          }}>
            {article.date}
          </p>
          <p style={{ 
            fontSize: '1rem', 
            lineHeight: '1.6', 
            color: '#475569', 
            marginBottom: '1.25rem' 
          }}>
            {article.excerpt}
          </p>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            color: '#2563EB',
            fontWeight: '600',
            fontSize: '0.875rem'
          }}>
            Read more
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: "0.25rem" }}>
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </div>
        </div>
      ))}
    </div>
  );
}