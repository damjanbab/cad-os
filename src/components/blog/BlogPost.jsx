import React, { useState, useEffect } from 'react';
import { marked } from 'marked';

export default function BlogPost({ article, onBackClick }) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Configure marked renderer options for better styling
  useEffect(() => {
    // Set up custom renderer options
    marked.setOptions({
      breaks: true, // Add line breaks in original markdown
      gfm: true,    // GitHub flavored markdown
    });
  }, []);

  useEffect(() => {
    async function fetchArticleContent() {
      try {
        // Primary fetch attempt
        const response = await fetch(`/assets/blog/${article.filename}`);
        
        if (response.ok) {
          const markdown = await response.text();
          const htmlContent = marked.parse(markdown);
          setContent(htmlContent);
          setLoading(false);
          return;
        }
        
        // Try fallback paths if primary fails
        console.log(`Primary path failed, trying fallbacks for: ${article.filename}`);
        
        // Attempt GitHub Pages path
        const fallbackResponse = await fetch(`/cad-os/assets/blog/${article.filename}`);
        if (fallbackResponse.ok) {
          const markdown = await fallbackResponse.text();
          const htmlContent = marked.parse(markdown);
          setContent(htmlContent);
          setLoading(false);
          return;
        }
        
        // Final fallback - direct from GitHub
        const githubResponse = await fetch(`https://raw.githubusercontent.com/haloedDepth/cad-os/main/assets/blog/${article.filename}`);
        if (githubResponse.ok) {
          const markdown = await githubResponse.text();
          const htmlContent = marked.parse(markdown);
          setContent(htmlContent);
          setLoading(false);
          return;
        }
        
        // If all attempts fail
        throw new Error(`Could not load article from any source: ${article.filename}`);
        
      } catch (err) {
        console.error('Error fetching article content:', err);
        setError('Failed to load article content. Please try again later.');
        setLoading(false);
      }
    }
    
    fetchArticleContent();
  }, [article]);

  // Apply custom styles to the blog post content
  const blogStyles = {
    container: {
      maxWidth: '900px',
      margin: '0 auto',
      padding: '0 20px',
    },
    backButton: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      backgroundColor: 'transparent',
      color: '#2563EB',
      border: 'none',
      padding: '0.75rem 0',
      marginBottom: '2rem',
      cursor: 'pointer',
      fontSize: '0.875rem',
      fontWeight: '600',
      transition: 'color 0.2s',
    },
    header: {
      marginBottom: '2.5rem',
      borderBottom: '1px solid #E2E8F0',
      paddingBottom: '1.5rem',
    },
    title: {
      fontSize: '2.5rem',
      fontWeight: '800',
      marginBottom: '1rem',
      color: '#1E293B',
      lineHeight: '1.2',
    },
    date: {
      fontSize: '0.95rem',
      color: '#64748B',
      fontWeight: '500',
    },
    content: {
      lineHeight: '1.8',
      color: '#334155',
      fontSize: '1.1rem',
    },
  };

  // CSS to be injected via style tag
  const cssRules = `
    .blog-content h1 {
      font-size: 2.25rem;
      font-weight: 800;
      margin-top: 2.5rem;
      margin-bottom: 1.5rem;
      color: #1E293B;
      line-height: 1.3;
    }
    
    .blog-content h2 {
      font-size: 1.875rem;
      font-weight: 700;
      margin-top: 2.25rem;
      margin-bottom: 1.25rem;
      color: #1E293B;
      line-height: 1.3;
    }
    
    .blog-content h3 {
      font-size: 1.5rem;
      font-weight: 700;
      margin-top: 2rem;
      margin-bottom: 1rem;
      color: #1E293B;
      line-height: 1.4;
    }
    
    .blog-content h4, .blog-content h5, .blog-content h6 {
      font-size: 1.25rem;
      font-weight: 600;
      margin-top: 1.75rem;
      margin-bottom: 0.75rem;
      color: #1E293B;
      line-height: 1.4;
    }
    
    .blog-content p {
      margin-bottom: 1.5rem;
      line-height: 1.8;
    }
    
    .blog-content ul, .blog-content ol {
      margin: 1.5rem 0 2rem;
      padding-left: 2rem;
    }
    
    .blog-content li {
      margin-bottom: 0.5rem;
    }
    
    .blog-content blockquote {
      border-left: 4px solid #3B82F6;
      padding-left: 1.5rem;
      margin-left: 0;
      margin-right: 0;
      margin-bottom: 1.5rem;
      font-style: italic;
      color: #4B5563;
    }
    
    .blog-content code {
      font-family: monospace;
      background-color: #EFF6FF;
      color: #2563EB;
      padding: 0.2rem 0.4rem;
      border-radius: 4px;
      font-size: 0.9em;
    }
    
    .blog-content pre {
      background-color: #1E293B;
      color: #F8FAFC;
      padding: 1.5rem;
      border-radius: 8px;
      overflow-x: auto;
      margin: 1.5rem 0 2rem;
    }
    
    .blog-content pre code {
      background-color: transparent;
      color: inherit;
      padding: 0;
      font-size: 0.9rem;
      line-height: 1.6;
    }
    
    .blog-content a {
      color: #2563EB;
      text-decoration: none;
      border-bottom: 1px solid currentColor;
      padding-bottom: 1px;
      transition: opacity 0.2s;
    }
    
    .blog-content a:hover {
      opacity: 0.8;
    }
    
    .blog-content hr {
      border: none;
      border-top: 1px solid #E2E8F0;
      margin: 2.5rem 0;
    }
    
    .blog-content table {
      width: 100%;
      border-collapse: collapse;
      margin: 2rem 0;
    }
    
    .blog-content th, .blog-content td {
      border: 1px solid #E2E8F0;
      padding: 0.75rem 1rem;
      text-align: left;
    }
    
    .blog-content th {
      background-color: #F8FAFC;
      font-weight: 600;
    }
    
    .blog-content tr:nth-child(even) {
      background-color: #F8FAFC;
    }
  `;

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
    <div style={blogStyles.container}>
      {/* Inject CSS rules */}
      <style>{cssRules}</style>
      
      <button
        onClick={onBackClick}
        style={blogStyles.backButton}
        onMouseOver={(e) => { e.currentTarget.style.color = '#1E40AF'; }}
        onMouseOut={(e) => { e.currentTarget.style.color = '#2563EB'; }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        Back to Articles
      </button>

      <div style={blogStyles.header}>
        <h1 style={blogStyles.title}>{article.title}</h1>
        <p style={blogStyles.date}>{article.date}</p>
      </div>

      <div 
        className="blog-content"
        style={blogStyles.content}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </div>
  );
}