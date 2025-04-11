import React from "react";
import { Routes, Route, NavLink } from "react-router-dom";
import Home from "./tabs/Home.jsx";
import CadApp from "./tabs/CadApp.jsx";
import About from "./tabs/About.jsx";
import ToolsPage from "./tabs/tools/ToolsPage.jsx";
import Blog from "./tabs/Blog.jsx";

// Style function for NavLink active state
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

export default function Layout() {

  return (
    <div style={{ 
      height: "100vh", 
      display: "flex", 
      flexDirection: "column",
      overflow: "hidden",
      margin: 0,
      padding: 0
    }}>
      {/* Navigation Bar */}
      <nav style={{
        backgroundColor: "#1E293B",
        color: "white",
        padding: "0.75rem 1.5rem",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        margin: 0,
        flexShrink: 0
      }}>
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          gap: "1rem" 
        }}>
          <h1 style={{ 
            margin: 0, 
            fontSize: "1.5rem", 
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
          gap: "0.5rem" 
        }}>
          <NavLink to="/" style={getNavLinkStyle}>
            Home
          </NavLink>
          <NavLink to="/app" style={getNavLinkStyle}>
            App
          </NavLink>
          <NavLink to="/blog" style={getNavLinkStyle}>
            Blog
          </NavLink>
          <NavLink to="/about" style={getNavLinkStyle}>
            About
          </NavLink>
          <NavLink to="/tools" style={getNavLinkStyle}>
            Tools
          </NavLink>
        </div>
      </nav>

      {/* Content Area - Rendered by Routes */}
      <div style={{ flex: 1, overflow: "auto" }}> {/* Added wrapper for consistent overflow handling */}
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
