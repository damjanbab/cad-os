import React, { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import BlogList from "../components/blog/BlogList.jsx";
import BlogPostWrapper from "../components/blog/BlogPostWrapper.jsx"; // We will create this next

export default function Blog() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch the list of blog articles
  useEffect(() => {
    async function fetchArticles() {
      try {
        // In a real application, you would fetch this from an API
        // For now, we'll use a static list that includes our technical article
        const articlesData = [
          {
            id: 'parametric-modeling-foundations',
            title: 'The Synergy Between Parametric Modeling and Rapid Prototyping',
            date: 'April 11, 2025',
            excerpt: 'Discover how the powerful combination of parametric modeling and rapid prototyping accelerates product development, enables complex designs, and delivers customized solutions across industries.',
            filename: 'parametric-modeling-and-rapid-prototyping.md'
          }
          // Additional articles would be added here
        ];
        
        setArticles(articlesData);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching blog articles:', err);
        setError('Failed to load blog articles');
        setLoading(false);
      }
    }
    
    fetchArticles();
  }, []);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100%' 
      }}>
        <p>Loading articles...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100%',
        color: '#e53e3e'
      }}>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ 
      // maxWidth: "1200px", // Removed
      // margin: "0 auto",    // Removed
      padding: "2rem",
      color: "#1E293B",
    }}>
      {/* Nested Routes for Blog List and Single Post */}
      <Routes>
        <Route
          index // Renders at the base path "/blog"
          element={
            <>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: "2rem",
                  gap: "1rem",
                }}
              >
                <div
                  style={{
                    width: "4px",
                    height: "2rem",
                    backgroundColor: "#2563EB",
                    borderRadius: "2px",
                  }}
                ></div>
                <h1 style={{ fontSize: "2.25rem", fontWeight: "800", margin: 0 }}>
                  Blog
                </h1>
              </div>

              <p
                style={{
                  fontSize: "1.125rem",
                  lineHeight: "1.7",
                  color: "#475569",
                  marginBottom: "2rem",
                }}
              >
                Explore our latest articles on parametric modeling, CAD
                techniques, and engineering insights.
              </p>

              <BlogList articles={articles} />
            </>
          }
        />
        <Route
          path=":slug" // Renders at "/blog/:slug"
          element={<BlogPostWrapper articles={articles} />}
        />
      </Routes>
    </div>
  );
}
