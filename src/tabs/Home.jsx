import React from "react";

export default function Home() {
  return (
    <div style={{ 
      maxWidth: "1200px",
      margin: "0 auto",
      padding: "2rem",
      color: "#1E293B"
    }}>
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        marginBottom: "4rem",
        textAlign: "center"
      }}>
        <h1 style={{ 
          fontSize: "3rem", 
          fontWeight: "800",
          marginBottom: "1rem",
          background: "linear-gradient(90deg, #2563EB, #0EA5E9)",
          backgroundClip: "text",
          WebkitBackgroundClip: "text",
          color: "transparent"
        }}>
          CAD-OS
        </h1>
        <p style={{ 
          fontSize: "1.25rem", 
          maxWidth: "800px",
          lineHeight: "1.7",
          color: "#475569"
        }}>
          A powerful parametric CAD application built with Replicad, React, and Three.js.
          Design, visualize, and generate technical drawings for your 3D models with ease.
        </p>
        <div style={{ marginTop: "2rem", display: "flex", gap: "1rem" }}>
          <button 
            onClick={() => window.location.href = "https://github.com/your-repo/cad-os"}
            style={{
              backgroundColor: "#1E293B",
              color: "white",
              border: "none",
              padding: "0.75rem 1.5rem",
              borderRadius: "0.375rem",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              cursor: "pointer",
              transition: "background-color 0.2s"
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
            </svg>
            GitHub Repository
          </button>
          <button 
            onClick={() => window.open("https://replicad.xyz/", "_blank")}
            style={{
              backgroundColor: "white",
              color: "#1E293B",
              border: "1px solid #CBD5E1",
              padding: "0.75rem 1.5rem",
              borderRadius: "0.375rem",
              fontWeight: "600",
              cursor: "pointer",
              transition: "background-color 0.2s"
            }}
          >
            Learn Replicad
          </button>
        </div>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
        gap: "2rem",
        marginBottom: "4rem"
      }}>
        <FeatureCard 
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"></path>
            </svg>
          }
          title="Parametric Design"
          description="Create complex 3D models by adjusting parameters in real-time. All models are fully configurable and instantly updated."
        />
        <FeatureCard 
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v18h18"></path>
              <path d="m3 9 4-4 5 5 4-4 5 5"></path>
            </svg>
          }
          title="Technical Drawings"
          description="Generate orthographic projections automatically from your 3D models. Perfect for manufacturing and documentation."
        />
        <FeatureCard 
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"></path>
              <path d="M12 2v2"></path>
              <path d="M12 20v2"></path>
              <path d="m4.93 4.93 1.41 1.41"></path>
              <path d="m17.66 17.66 1.41 1.41"></path>
              <path d="M2 12h2"></path>
              <path d="M20 12h2"></path>
              <path d="m6.34 17.66-1.41 1.41"></path>
              <path d="m19.07 4.93-1.41 1.41"></path>
            </svg>
          }
          title="360° Visualization"
          description="Explore models from all angles with interactive controls. Includes high-quality rendering and exploded views for complex assemblies."
        />
      </div>

      <div style={{
        backgroundColor: "#F1F5F9",
        padding: "2rem",
        borderRadius: "0.5rem",
        marginBottom: "4rem"
      }}>
        <h2 style={{ marginBottom: "1.5rem", fontSize: "1.5rem", fontWeight: "700" }}>
          Getting Started
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
            <div style={{ 
              backgroundColor: "#2563EB", 
              color: "white", 
              width: "2rem", 
              height: "2rem", 
              borderRadius: "50%", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              flexShrink: 0
            }}>
              1
            </div>
            <div>
              <h3 style={{ marginBottom: "0.5rem", fontSize: "1.125rem", fontWeight: "600" }}>
                Select a Model
              </h3>
              <p style={{ color: "#475569" }}>
                Choose from various predefined model types including basic shapes, compound shapes, and complex assemblies.
              </p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
            <div style={{ 
              backgroundColor: "#2563EB", 
              color: "white", 
              width: "2rem", 
              height: "2rem", 
              borderRadius: "50%", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              flexShrink: 0
            }}>
              2
            </div>
            <div>
              <h3 style={{ marginBottom: "0.5rem", fontSize: "1.125rem", fontWeight: "600" }}>
                Adjust Parameters
              </h3>
              <p style={{ color: "#475569" }}>
                Modify dimensions and properties to customize the model exactly to your specifications.
              </p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
            <div style={{ 
              backgroundColor: "#2563EB", 
              color: "white", 
              width: "2rem", 
              height: "2rem", 
              borderRadius: "50%", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              flexShrink: 0
            }}>
              3
            </div>
            <div>
              <h3 style={{ marginBottom: "0.5rem", fontSize: "1.125rem", fontWeight: "600" }}>
                Visualize and Export
              </h3>
              <p style={{ color: "#475569" }}>
                View your model in 3D, check technical drawings, or create exploded views for assembly visualization.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div style={{
        textAlign: "center",
        marginBottom: "2rem"
      }}>
        <h2 style={{ fontSize: "1.875rem", fontWeight: "700", marginBottom: "1rem" }}>
          Ready to start designing?
        </h2>
        <p style={{ color: "#475569", marginBottom: "2rem" }}>
          Jump into the application and create your first parametric model in minutes.
        </p>
        <button 
          onClick={() => {
            // Get parent component to switch to app tab
            window.dispatchEvent(new CustomEvent('switchTab', { detail: 'app' }));
          }}
          style={{
            backgroundColor: "#2563EB",
            color: "white",
            border: "none",
            padding: "0.75rem 2rem",
            borderRadius: "0.375rem",
            fontWeight: "600",
            cursor: "pointer",
            fontSize: "1.125rem",
            boxShadow: "0 4px 6px rgba(37, 99, 235, 0.25)",
            transition: "transform 0.2s, box-shadow 0.2s"
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 6px 8px rgba(37, 99, 235, 0.3)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 4px 6px rgba(37, 99, 235, 0.25)";
          }}
        >
          Launch App
        </button>
      </div>
    </div>
  );
}

// Helper component for feature cards
function FeatureCard({ icon, title, description }) {
  return (
    <div style={{
      backgroundColor: "white",
      borderRadius: "0.5rem",
      padding: "1.5rem",
      boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
      border: "1px solid #E2E8F0",
      transition: "transform 0.2s, box-shadow 0.2s"
    }}
    onMouseOver={(e) => {
      e.currentTarget.style.transform = "translateY(-4px)";
      e.currentTarget.style.boxShadow = "0 10px 15px rgba(0, 0, 0, 0.05)";
    }}
    onMouseOut={(e) => {
      e.currentTarget.style.transform = "translateY(0)";
      e.currentTarget.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.1)";
    }}
    >
      <div style={{ 
        color: "#2563EB", 
        marginBottom: "1rem", 
        display: "inline-flex",
        padding: "0.75rem",
        backgroundColor: "#EFF6FF",
        borderRadius: "0.5rem"
      }}>
        {icon}
      </div>
      <h3 style={{ 
        fontSize: "1.25rem", 
        fontWeight: "700", 
        marginBottom: "0.75rem" 
      }}>
        {title}
      </h3>
      <p style={{ 
        color: "#475569",
        lineHeight: "1.5"
      }}>
        {description}
      </p>
    </div>
  );
}