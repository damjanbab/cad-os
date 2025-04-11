import React, { useState, useEffect } from 'react';
import { marked } from 'marked';

export default function BlogPost({ article, onBackClick }) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchArticleContent() {
      try {
        // Fetch the markdown content from the assets folder
        const response = await fetch(`/assets/blog/${article.filename}`);
        
        if (!response.ok) {
          throw new Error(`Failed to load article (${response.status})`);
        }
        
        const markdown = await response.text();
        // Convert markdown to HTML
        const htmlContent = marked.parse(markdown);
        setContent(htmlContent);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching article content:', err);
        setError('Failed to load article content');
        setLoading(false);
      }
    }
    
    fetchArticleContent();
  }, [article]);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        padding: '2rem' 
      }}>
        <p>Loading article...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        padding: '2rem',
        color: '#e53e3e'
      }}>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={onBackClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          backgroundColor: 'transparent',
          color: '#2563EB',
          border: 'none',
          padding: '0.5rem 0',
          marginBottom: '1.5rem',
          cursor: 'pointer',
          fontSize: '0.875rem',
          fontWeight: '600'
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        Back to Articles
      </button>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ 
          fontSize: '2rem', 
          fontWeight: '800', 
          marginBottom: '0.5rem',
          color: '#1E293B'
        }}>
          {article.title}
        </h1>
        <p style={{ 
          fontSize: '0.875rem', 
          color: '#64748B' 
        }}>
          {article.date}
        </p>
      </div>

      <div 
        className="blog-content"
        style={{ lineHeight: '1.8' }}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </div>
  );
}