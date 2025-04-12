import React, { useState, useEffect } from "react";
import { Routes, Route, NavLink } from "react-router-dom";
import Home from "./tabs/Home.jsx";
import CadApp from "./tabs/CadApp.jsx";
import About from "./tabs/About.jsx";
import ToolsPage from "./tabs/tools/ToolsPage.jsx";
import Blog from "./tabs/Blog.jsx";

// Style function for NavLink active state (desktop)
const getNavLinkStyle = ({ isActive }) => ({
  backgroundColor: isActive ? "#2563EB" : "transparent",
  color: "white",
  border: "none",
  padding: "0.5rem 1rem",
  borderRadius: "0.25rem",
  cursor: "pointer",
  fontWeight: isActive ? "600" : "400",
  transition: "background-color 0.2s",
  textDecoration: "none", // Remove default underline from links
});

// Style function for responsive NavLink (mobile-friendly)
const getNavLinkStyleMobile = ({ isActive }) => {
  const isMobile = window.innerWidth < 480;
  return {
    backgroundColor: isActive ? "#2563EB" : "transparent",
    color: "white",
    border: "none",
    padding: isMobile ? "0.4rem 0.6rem" : "0.5rem 1rem", // Smaller padding on mobile
    borderRadius: "0.25rem",
    cursor: "pointer",
    fontWeight: isActive ? "600" : "400",
    transition: "background-color 0.2s",
    textDecoration: "none", // Remove default underline from links
    fontSize: isMobile ? "0.85rem" : "inherit", // Smaller font on mobile
    whiteSpace: "nowrap", // Prevent text wrapping within the link
  };
};

export default function Layout() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 480);
  
  // Add resize listener to update mobile state
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 480);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div style={{ 
      height: "100vh", 
      display: "flex", 
      flexDirection: "column",
      overflow: "hidden",
      margin: 0,
      padding: 0
    }}>
      {/* Navigation Bar with Responsive Design */}
      <nav style={{
        backgroundColor: "#1E293B",
        color: "white",
        padding: "0.75rem 1rem", // Reduced horizontal padding
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        margin: 0,
        flexShrink: 0,
        flexWrap: isMobile ? "wrap" : "nowrap", // Wrap on very small screens
      }}>
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          gap: "0.5rem", // Reduced gap
          marginBottom: isMobile ? "0.5rem" : 0, // Add space if wrapped
          flex: isMobile ? "1 0 100%" : "0 1 auto", // Full width on small screens
        }}>
          <h1 style={{ 
            margin: 0, 
            fontSize: isMobile ? "1.25rem" : "1.5rem", // Smaller on mobile
            fontWeight: "600",
            color: "#F8FAFC"
          }}>
            CAD-OS
          </h1>
          <span style={{ 
            fontSize: "0.8rem", 
            backgroundColor: "#0EA5E9", 
            padding: "0.2rem 0.5rem", 
            borderRadius: "0.25rem",
            color: "white"
          }}>
            v0.18.1
          </span>
        </div>

        <div style={{ 
          display: "flex", 
          gap: "0.25rem", // Reduced gap between links
          overflowX: "auto", // Allow horizontal scrolling if needed
          justifyContent: isMobile ? "space-between" : "flex-end", // Space evenly on small screens
          width: isMobile ? "100%" : "auto", // Full width on small screens
        }}>
          <NavLink to="/" style={getNavLinkStyleMobile}>
            Home
          </NavLink>
          <NavLink to="/app" style={getNavLinkStyleMobile}>
            App
          </NavLink>
          <NavLink to="/blog" style={getNavLinkStyleMobile}>
            Blog
          </NavLink>
          <NavLink to="/about" style={getNavLinkStyleMobile}>
            About
          </NavLink>
          <NavLink to="/tools" style={getNavLinkStyleMobile}>
            Tools
          </NavLink>
        </div>
      </nav>

      {/* Content Area - Rendered by Routes */}
      <div style={{ 
        flex: 1, 
        overflowY: "scroll", 
        overflowX: "hidden",
        paddingLeft: window.innerWidth < 768 ? "1rem" : "2rem",  // Smaller padding on mobile
        paddingRight: window.innerWidth < 768 ? "1rem" : "2rem"  // Smaller padding on mobile
      }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/app" element={<CadApp />} />
          <Route path="/blog/*" element={<Blog />} /> {/* Use /* for nested routes */}
          <Route path="/about" element={<About />} />
          <Route path="/tools" element={<ToolsPage />} />
        </Routes>
      </div>
    </div>
  );
}