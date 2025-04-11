import React from 'react';
import { useParams, Link } from 'react-router-dom';
import BlogPost from './BlogPost.jsx'; // Import the actual BlogPost component

export default function BlogPostWrapper({ articles }) {
  const { slug } = useParams(); // Get the 'slug' parameter from the URL

  // Find the article that matches the slug
  const article = articles.find(a => a.id === slug);

  // Handle case where article is not found
  if (!article) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <h2>Article Not Found</h2>
        <p>The blog post you're looking for doesn't seem to exist.</p>
        <Link 
          to="/blog" 
          style={{ 
            display: 'inline-block', 
            marginTop: '1rem', 
            padding: '0.5rem 1rem', 
            backgroundColor: '#2563EB', 
            color: 'white', 
            textDecoration: 'none', 
            borderRadius: '0.25rem' 
          }}
        >
          Back to Blog List
        </Link>
      </div>
    );
  }

  // Render the actual BlogPost component with the found article
  // Note: We pass the article data but remove the onBackClick prop as navigation is handled by Link now
  return <BlogPost article={article} />;
}
