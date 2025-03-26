import React from "react";

export default function Home() {
  return (
    <div style={{ 
      maxWidth: "1200px",
      margin: "0 auto",
      padding: "2rem",
      color: "#1E293B"
    }}>
      {/* Hero Section */}
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
          Parametric CAD Services
        </h1>
        <p style={{ 
          fontSize: "1.25rem", 
          maxWidth: "800px",
          lineHeight: "1.7",
          color: "#475569"
        }}>
          Professional 3D modeling, technical drawings, and high-quality rendering
          services for engineering and manufacturing needs.
        </p>
        <div style={{ marginTop: "2rem", display: "flex", gap: "1rem" }}>
          <button 
            onClick={() => window.dispatchEvent(new CustomEvent('switchTab', { detail: 'app' }))}
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
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
            View Demo Models
          </button>
          <button 
            onClick={() => {
              const contactSection = document.getElementById('contact');
              if (contactSection) {
                contactSection.scrollIntoView({ behavior: 'smooth' });
              } else {
                window.dispatchEvent(new CustomEvent('switchTab', { detail: 'about' }));
              }
            }}
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
            Contact Me
          </button>
        </div>
      </div>

      {/* Services Section */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
        gap: "2rem",
        marginBottom: "4rem"
      }}>
        <ServiceCard 
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"></path>
            </svg>
          }
          title="Parametric 3D Modeling"
          description="Custom 3D models created with a parametric approach, allowing for quick adjustments based on changing requirements. Real-time updates and development monitoring available."
        />
        <ServiceCard 
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v18h18"></path>
              <path d="m3 9 4-4 5 5 4-4 5 5"></path>
            </svg>
          }
          title="Technical Drawings"
          description="Automated generation of manufacturing-ready technical drawings in any format you need. Includes orthographic projections, dimensions, and manufacturing specifications."
        />
        <ServiceCard 
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
          title="High-Quality Rendering"
          description="Professional visualizations of your models through high-quality images and videos with customizable camera angles, lighting, and environments."
        />
      </div>

      {/* Process Section */}
      <div style={{
        backgroundColor: "#F1F5F9",
        padding: "2rem",
        borderRadius: "0.5rem",
        marginBottom: "4rem"
      }}>
        <h2 style={{ marginBottom: "1.5rem", fontSize: "1.5rem", fontWeight: "700" }}>
          How It Works
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
                Define Requirements
              </h3>
              <p style={{ color: "#475569" }}>
                We'll discuss your project needs, including dimensions, functionality, and aesthetic preferences to establish clear parameters for your model.
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
                Real-Time Development
              </h3>
              <p style={{ color: "#475569" }}>
                Access a password-protected workspace where you can monitor progress and provide feedback as your model is being developed.
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
                Parameter Refinement
              </h3>
              <p style={{ color: "#475569" }}>
                Request adjustments to your model parameters at any time. Thanks to the parametric approach, most changes can be implemented instantly.
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
              4
            </div>
            <div>
              <h3 style={{ marginBottom: "0.5rem", fontSize: "1.125rem", fontWeight: "600" }}>
                Final Delivery
              </h3>
              <p style={{ color: "#475569" }}>
                Receive your completed 3D models, technical drawings, and renderings in the formats you need for manufacturing or presentation.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Technical Capabilities */}
      <div style={{
        marginBottom: "4rem"
      }}>
        <h2 style={{ marginBottom: "1.5rem", fontSize: "1.5rem", fontWeight: "700" }}>
          Technical Capabilities
        </h2>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "1.5rem"
        }}>
          <TechCapability
            title="Assembly Constructions"
            description="Automated assembly constructions with options for exploded views or step-by-step assembly instructions with labeled components."
          />
          <TechCapability
            title="Parametric Design"
            description="Dynamic models that update instantly when dimensions or parameters change, allowing for rapid iteration and refinement."
          />
          <TechCapability
            title="Engineering Specifications"
            description="Detailed technical drawings with precise measurements, tolerances, and manufacturing notes for production."
          />
          <TechCapability
            title="Real-Time Collaboration"
            description="Secure access to your model's development progress, allowing for immediate feedback and adjustments."
          />
          <TechCapability
            title="Custom Rendering"
            description="Photorealistic visualizations with adjustable lighting, materials, camera angles, and environments."
          />
          <TechCapability
            title="Cost-Effective Solutions"
            description="Built with open-source technologies to offer professional services at competitive rates."
          />
        </div>
      </div>

      {/* CTA Section */}
      <div style={{
        textAlign: "center",
        marginBottom: "2rem",
        padding: "3rem",
        backgroundColor: "#1E293B",
        borderRadius: "0.5rem",
        color: "white"
      }}>
        <h2 style={{ fontSize: "1.875rem", fontWeight: "700", marginBottom: "1rem" }}>
          Ready to bring your design to life?
        </h2>
        <p style={{ color: "#CBD5E1", marginBottom: "2rem", maxWidth: "800px", margin: "0 auto 2rem" }}>
          Explore the demo models to see the capabilities, then get in touch to discuss your specific project needs and requirements.
        </p>
        <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
          <button 
            onClick={() => window.dispatchEvent(new CustomEvent('switchTab', { detail: 'app' }))}
            style={{
              backgroundColor: "#2563EB",
              color: "white",
              border: "none",
              padding: "0.75rem 2rem",
              borderRadius: "0.375rem",
              fontWeight: "600",
              cursor: "pointer",
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
            Try Demo Models
          </button>
          <button 
            onClick={() => window.dispatchEvent(new CustomEvent('switchTab', { detail: 'about' }))}
            style={{
              backgroundColor: "transparent",
              color: "white",
              border: "1px solid #CBD5E1",
              padding: "0.75rem 2rem",
              borderRadius: "0.375rem",
              fontWeight: "600",
              cursor: "pointer",
              transition: "background-color 0.2s"
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            Contact Me
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper component for service cards
function ServiceCard({ icon, title, description }) {
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

// Helper component for tech capabilities
function TechCapability({ title, description }) {
  return (
    <div style={{
      padding: "1.25rem",
      borderRadius: "0.5rem",
      backgroundColor: "#F8FAFC",
      border: "1px solid #E2E8F0"
    }}>
      <h3 style={{ 
        fontSize: "1.125rem", 
        fontWeight: "600", 
        marginBottom: "0.75rem",
        color: "#1E293B"
      }}>
        {title}
      </h3>
      <p style={{ 
        color: "#475569",
        fontSize: "0.9375rem",
        lineHeight: "1.5"
      }}>
        {description}
      </p>
    </div>
  );
}