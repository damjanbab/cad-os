import React, { useState, useEffect } from "react";
import Home from "./tabs/Home.jsx";
import CadApp from "./tabs/CadApp.jsx";
import About from "./tabs/About.jsx";
import ToolsPage from "./tabs/tools/ToolsPage.jsx"; // Import the new Tools page

export default function Layout() {
  const [activeTab, setActiveTab] = useState("home");

  // Define a clean tab switching function
  const switchTab = (tab) => {
    setActiveTab(tab);
  };

  // Listen for events from child components
  useEffect(() => {
    const handleSwitchToTab = (event) => {
      if (event.detail) {
        switchTab(event.detail);
      }
    };

    window.addEventListener('switchToTab', handleSwitchToTab);
    return () => window.removeEventListener('switchToTab', handleSwitchToTab);
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
          <button 
            onClick={() => switchTab("home")}
            style={{
              backgroundColor: activeTab === "home" ? "#2563EB" : "transparent",
              color: "white",
              border: "none",
              padding: "0.5rem 1rem",
              borderRadius: "0.25rem",
              cursor: "pointer",
              fontWeight: activeTab === "home" ? "600" : "400",
              transition: "background-color 0.2s"
            }}
          >
            Home
          </button>

          <button 
            onClick={() => switchTab("app")}
            style={{
              backgroundColor: activeTab === "app" ? "#2563EB" : "transparent",
              color: "white",
              border: "none",
              padding: "0.5rem 1rem",
              borderRadius: "0.25rem",
              cursor: "pointer",
              fontWeight: activeTab === "app" ? "600" : "400",
              transition: "background-color 0.2s"
            }}
          >
            App
          </button>

          <button 
            onClick={() => switchTab("about")}
            style={{
              backgroundColor: activeTab === "about" ? "#2563EB" : "transparent",
              color: "white",
              border: "none",
              padding: "0.5rem 1rem",
              borderRadius: "0.25rem",
              cursor: "pointer",
              fontWeight: activeTab === "about" ? "600" : "400",
              transition: "background-color 0.2s"
            }}
          >
            About
          </button>
          {/* New Tools Button */}
          <button
            onClick={() => switchTab("tools")}
            style={{
              backgroundColor: activeTab === "tools" ? "#2563EB" : "transparent",
              color: "white",
              border: "none",
              padding: "0.5rem 1rem",
              borderRadius: "0.25rem",
              cursor: "pointer",
              fontWeight: activeTab === "tools" ? "600" : "400",
              transition: "background-color 0.2s"
            }}
          >
            Tools
          </button>
        </div>
      </nav>

      {/* Content Area - Direct render without wrapper div */}
      {activeTab === "home" && (
        <div style={{ flex: 1, overflow: "auto" }}>
          <Home />
        </div>
      )}
      {activeTab === "app" && <CadApp />}
      {activeTab === "about" && (
        <div style={{ flex: 1, overflow: "auto" }}>
          <About />
        </div>
      )}
      {/* Render Tools Page */}
      {activeTab === "tools" && (
        <div style={{ flex: 1, overflow: "auto" }}>
          <ToolsPage />
        </div>
      )}
    </div>
  );
}
