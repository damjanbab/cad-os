import React from "react";

export default function About() {
  return (
    <div style={{ 
      maxWidth: "1200px",
      margin: "0 auto",
      padding: "2rem",
      color: "#1E293B"
    }}>
      <div style={{ marginBottom: "4rem" }}>
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          marginBottom: "2rem", 
          gap: "1rem" 
        }}>
          <div style={{ 
            width: "4px", 
            height: "2rem", 
            backgroundColor: "#2563EB", 
            borderRadius: "2px" 
          }}></div>
          <h1 style={{ fontSize: "2.25rem", fontWeight: "800", margin: 0 }}>About CAD-OS</h1>
        </div>

        <p style={{ fontSize: "1.125rem", lineHeight: "1.7", color: "#475569", marginBottom: "1.5rem" }}>
          CAD-OS is a parametric CAD application built with modern web technologies to provide accessible, 
          powerful 3D modeling capabilities right in your browser. Our goal is to make complex CAD features 
          available to everyone without requiring specialized software installation.
        </p>

        <p style={{ fontSize: "1.125rem", lineHeight: "1.7", color: "#475569", marginBottom: "1.5rem" }}>
          Built on the foundation of the Replicad framework, CAD-OS leverages the OpenCascade geometry kernel
          for robust solid modeling operations. Combined with React for the user interface and Three.js for
          visualization, CAD-OS delivers a seamless experience for creating and manipulating 3D models.
        </p>

        <p style={{ fontSize: "1.125rem", lineHeight: "1.7", color: "#475569" }}>
          Whether you're designing mechanical parts, creating architectural models, or exploring geometric 
          concepts, CAD-OS offers the tools you need with a simple, intuitive interface.
        </p>
      </div>

      <div style={{ 
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: "2rem",
        marginBottom: "4rem"
      }}>
        <div style={{ 
          padding: "2rem", 
          borderRadius: "0.5rem", 
          backgroundColor: "white", 
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
          border: "1px solid #E2E8F0"
        }}>
          <div style={{ 
            color: "#2563EB", 
            marginBottom: "1rem" 
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 10v12"></path>
              <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z"></path>
            </svg>
          </div>
          <h3 style={{ 
            fontSize: "1.25rem", 
            fontWeight: "700", 
            marginBottom: "0.75rem" 
          }}>Open Source</h3>
          <p style={{ color: "#475569" }}>
            CAD-OS is completely open source and free to use. We believe in the power of community-driven development and welcome contributions from developers of all skill levels.
          </p>
        </div>

        <div style={{ 
          padding: "2rem", 
          borderRadius: "0.5rem", 
          backgroundColor: "white", 
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
          border: "1px solid #E2E8F0"
        }}>
          <div style={{ 
            color: "#2563EB", 
            marginBottom: "1rem" 
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2"></path>
              <path d="M9 10h9a2 2 0 0 1 2 2v1"></path>
              <path d="m18 11 3-3-3-3"></path>
            </svg>
          </div>
          <h3 style={{ 
            fontSize: "1.25rem", 
            fontWeight: "700", 
            marginBottom: "0.75rem" 
          }}>Browser-Based</h3>
          <p style={{ color: "#475569" }}>
            Run complex CAD operations directly in your browser without installing any software. CAD-OS works on any device with a modern web browser, including tablets and mobile devices.
          </p>
        </div>

        <div style={{ 
          padding: "2rem", 
          borderRadius: "0.5rem", 
          backgroundColor: "white", 
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
          border: "1px solid #E2E8F0"
        }}>
          <div style={{ 
            color: "#2563EB", 
            marginBottom: "1rem" 
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path>
            </svg>
          </div>
          <h3 style={{ 
            fontSize: "1.25rem", 
            fontWeight: "700", 
            marginBottom: "0.75rem" 
          }}>Powerful Engine</h3>
          <p style={{ color: "#475569" }}>
            Based on the industry-standard OpenCascade geometry kernel, CAD-OS provides robust solid modeling operations with the reliability expected from professional CAD software.
          </p>
        </div>
      </div>

      <div style={{ 
        backgroundColor: "#F8FAFC", 
        padding: "3rem",
        borderRadius: "0.5rem",
        marginBottom: "4rem"
      }}>
        <h2 style={{ 
          fontSize: "1.75rem", 
          fontWeight: "700", 
          marginBottom: "2rem",
          textAlign: "center"
        }}>Technology Stack</h2>

        <div style={{ 
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "2rem"
        }}>
          <TechItem 
            name="Replicad" 
            description="JavaScript CAD framework based on OpenCascade geometry kernel"
            link="https://replicad.xyz/"
          />
          <TechItem 
            name="React & React DOM" 
            description="Library for building user interfaces with component-based architecture"
            link="https://react.dev/"
          />
          <TechItem 
            name="Three.js" 
            description="3D graphics library for rendering complex geometry in the browser"
            link="https://threejs.org/"
          />
          <TechItem 
            name="React Three Fiber" 
            description="React renderer for Three.js, making 3D graphics declarative"
            link="https://docs.pmnd.rs/react-three-fiber"
          />
          <TechItem 
            name="Web Workers" 
            description="Background processing for performance-intensive CAD operations"
            link="https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API"
          />
          <TechItem 
            name="Vite" 
            description="Modern build tool and development server for fast iteration"
            link="https://vitejs.dev/"
          />
        </div>
      </div>

      {/* Contact Section */}
      <div id="contact" style={{ 
        padding: "3rem", 
        backgroundColor: "#1E293B", 
        color: "white", 
        borderRadius: "0.5rem",
        marginBottom: "4rem"
      }}>
        <h2 style={{ 
          fontSize: "1.75rem", 
          fontWeight: "700", 
          marginBottom: "1.5rem",
          textAlign: "center"
        }}>Contact Us</h2>
        
        <p style={{ 
          textAlign: "center", 
          maxWidth: "700px", 
          margin: "0 auto", 
          marginBottom: "2.5rem",
          color: "#CBD5E1"
        }}>
          Have questions, suggestions, or want to contribute to CAD-OS? We'd love to hear from you!
          Reach out to our team using any of the methods below.
        </p>

        <div style={{ 
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "2rem",
          maxWidth: "900px",
          margin: "0 auto"
        }}>
          <ContactItem 
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
            }
            title="Email"
            content="contact@cad-os.example.com"
            link="mailto:contact@cad-os.example.com"
          />
          
          <ContactItem 
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
              </svg>
            }
            title="GitHub"
            content="github.com/cad-os"
            link="https://github.com/"
          />
          
          <ContactItem 
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 4.01c-1 .49-1.98.689-3 .99-1.121-1.265-2.783-1.335-4.38-.737S11.977 6.323 12 8v1c-3.245.083-6.135-1.395-8-4 0 0-4.182 7.433 4 11-1.872 1.247-3.739 2.088-6 2 3.308 1.803 6.913 2.423 10.034 1.517 3.58-1.04 6.522-3.723 7.651-7.742a13.84 13.84 0 0 0 .497-3.753C20.18 7.773 21.692 5.25 22 4.009z"></path>
              </svg>
            }
            title="Twitter"
            content="@cad_os"
            link="https://twitter.com/"
          />
          
          <ContactItem 
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
              </svg>
            }
            title="Discord"
            content="discord.gg/cad-os"
            link="https://discord.com/"
          />
        </div>
        
        <div style={{ 
          marginTop: "3rem", 
          display: "flex", 
          justifyContent: "center", 
          gap: "1.5rem" 
        }}>
          <SocialIcon 
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
              </svg>
            }
            link="https://github.com/"
          />
          <SocialIcon 
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 4.01c-1 .49-1.98.689-3 .99-1.121-1.265-2.783-1.335-4.38-.737S11.977 6.323 12 8v1c-3.245.083-6.135-1.395-8-4 0 0-4.182 7.433 4 11-1.872 1.247-3.739 2.088-6 2 3.308 1.803 6.913 2.423 10.034 1.517 3.58-1.04 6.522-3.723 7.651-7.742a13.84 13.84 0 0 0 .497-3.753C20.18 7.773 21.692 5.25 22 4.009z"></path>
              </svg>
            }
            link="https://twitter.com/"
          />
          <SocialIcon 
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
                <rect x="2" y="9" width="4" height="12"></rect>
                <circle cx="4" cy="4" r="2"></circle>
              </svg>
            }
            link="https://linkedin.com/"
          />
          <SocialIcon 
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" y1="6.5" x2="17.5" y2="6.5"></line>
              </svg>
            }
            link="https://instagram.com/"
          />
          <SocialIcon 
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
              </svg>
            }
            link="https://discord.com/"
          />
        </div>
      </div>

      <footer style={{ 
        textAlign: "center", 
        padding: "2rem 0", 
        color: "#64748B", 
        borderTop: "1px solid #E2E8F0" 
      }}>
        <p style={{ marginBottom: "0.5rem" }}>
          © {new Date().getFullYear()} CAD-OS. All rights reserved.
        </p>
        <p style={{ fontSize: "0.875rem" }}>
          Released under the MIT License. Built with React, Three.js, and Replicad.
        </p>
      </footer>
    </div>
  );
}

// Helper component for technology items
function TechItem({ name, description, link }) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      padding: "1.5rem",
      backgroundColor: "white",
      borderRadius: "0.375rem",
      boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
      border: "1px solid #E2E8F0",
      height: "100%"
    }}>
      <h3 style={{ fontSize: "1.125rem", fontWeight: "700", marginBottom: "0.625rem", color: "#1E293B" }}>
        {name}
      </h3>
      <p style={{ color: "#64748B", fontSize: "0.875rem", marginBottom: "1rem", flex: "1" }}>
        {description}
      </p>
      <a 
        href={link} 
        target="_blank" 
        rel="noopener noreferrer"
        style={{
          color: "#2563EB",
          textDecoration: "none",
          fontWeight: "600",
          fontSize: "0.875rem",
          display: "inline-flex",
          alignItems: "center",
          marginTop: "auto"
        }}
      >
        Learn more
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: "0.25rem" }}>
          <line x1="5" y1="12" x2="19" y2="12"></line>
          <polyline points="12 5 19 12 12 19"></polyline>
        </svg>
      </a>
    </div>
  );
}

// Helper component for contact items
function ContactItem({ icon, title, content, link }) {
  return (
    <a 
      href={link} 
      target="_blank" 
      rel="noopener noreferrer"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "1.5rem",
        backgroundColor: "rgba(255, 255, 255, 0.05)",
        borderRadius: "0.5rem",
        textDecoration: "none",
        color: "white",
        transition: "transform 0.2s, background-color 0.2s",
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.05)";
      }}
    >
      <div style={{ 
        marginBottom: "1rem", 
        color: "#60A5FA" 
      }}>
        {icon}
      </div>
      <h3 style={{ 
        fontSize: "1.125rem", 
        fontWeight: "600", 
        marginBottom: "0.5rem" 
      }}>
        {title}
      </h3>
      <p style={{ 
        color: "#E2E8F0", 
        fontSize: "0.875rem", 
        textAlign: "center" 
      }}>
        {content}
      </p>
    </a>
  );
}

// Helper component for social icons
function SocialIcon({ icon, link }) {
  return (
    <a 
      href={link} 
      target="_blank" 
      rel="noopener noreferrer"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "3rem",
        height: "3rem",
        borderRadius: "50%",
        backgroundColor: "rgba(255, 255, 255, 0.1)",
        color: "white",
        transition: "transform 0.2s, background-color 0.2s",
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.2)";
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
      }}
    >
      {icon}
    </a>
  );
}