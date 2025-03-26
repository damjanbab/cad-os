import React, { useState } from "react";
import Home from "./tabs/Home.jsx";
import CadApp from "./tabs/CadApp.jsx";
import About from "./tabs/About.jsx";

export default function Layout() {
  const [activeTab, setActiveTab] = useState("home");

  // Define a clean tab switching function
  const switchTab = (tab) => {
    setActiveTab(tab);
  };

  return (
    <div style={{ 
      height: "100vh", 
      display: "flex", 
      flexDirection: "column",
      overflow: "hidden"
    }}>
      {/* Navigation Bar */}
      <nav style={{
        backgroundColor: "#1E293B",
        color: "white",
        padding: "0.75rem 1.5rem",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
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
        </div>
      </nav>

      {/* Content Area */}
      <div style={{ 
        flex: "1", 
        overflow: "auto" 
      }}>
        {activeTab === "home" && <Home />}
        {activeTab === "app" && <CadApp />}
        {activeTab === "about" && <About />}
      </div>
    </div>
  );
}