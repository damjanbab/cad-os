import React from "react";

export default function About() {
  return (
    <div style={{ 
      maxWidth: "1200px",
      margin: "0 auto",
      padding: "2rem",
      color: "#1E293B",
      overflowX: "hidden" // Prevent horizontal scrolling
    }}>
      {/* Professional Profile Section */}
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
          <h1 style={{ fontSize: "2.25rem", fontWeight: "800", margin: 0 }}>About Me</h1>
        </div>

        <div style={{ display: "flex", gap: "2rem", alignItems: "flex-start", marginBottom: "2rem" }}>
          {/* Profile Image */}
          <div style={{ 
            flexShrink: 0, 
            width: "180px", 
            height: "180px", 
            borderRadius: "50%", 
            overflow: "hidden",
            border: "4px solid #E2E8F0",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)"
          }}>
            {/* Direct reference to GitHub raw content */}
            <img 
              src="https://raw.githubusercontent.com/damjanbab/cad-os/main/assets/profile.jpg"
              alt="Damjan Babic" 
              style={{ width: "100%", height: "100%", objectFit: "cover" }} 
              onError={(e) => {
                // Fallback options
                const fallbackPaths = [
                  "./assets/profile.jpg",
                  "/cad-os/assets/profile.jpg",
                  "https://raw.githubusercontent.com/haloedDepth/cad-os/main/assets/profile.jpg"
                ];
                
                const currentSrc = e.target.src;
                const nextPath = fallbackPaths.find(path => path !== currentSrc);
                
                if (nextPath) {
                  e.target.src = nextPath;
                } else {
                  // If all paths fail, use a placeholder
                  e.target.src = "https://via.placeholder.com/180x180?text=Profile";
                }
              }}
            />
          </div>

          {/* Bio Text */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: "1.125rem", lineHeight: "1.7", color: "#475569", marginBottom: "1rem" }}>
              I'm a 31-year-old Croatian professional with a background in Marine Engineering and over a decade of experience in 3D modeling using commercial software. My expertise lies in parametric and programmatic CAD solutions that deliver precise, adaptable models for engineering and manufacturing applications.
            </p>

            <p style={{ fontSize: "1.125rem", lineHeight: "1.7", color: "#475569", marginBottom: "1rem" }}>
              Through self-study, I've developed strong programming skills in JavaScript, Python, Clojure, and various frontend technologies, allowing me to create custom solutions that merge engineering precision with modern web technologies. This combination enables me to offer unique, cost-effective services that traditional CAD approaches can't match.
            </p>

            <p style={{ fontSize: "1.125rem", lineHeight: "1.7", color: "#475569" }}>
              This site serves as my professional portfolio, showcasing the capabilities of my parametric CAD services while demonstrating the technical implementation through interactive demos that potential clients can explore.
            </p>
          </div>
        </div>
      </div>

      {/* Expertise Section */}
      <div style={{ 
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
        gap: "2rem",
        marginBottom: "4rem"
      }}>
        <ExpertiseCard 
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
            </svg>
          }
          title="Engineering Background"
          description="With a formal education in Marine Engineering, I bring a strong technical foundation to every project. This background ensures that all models meet rigorous engineering standards and real-world functionality requirements."
        />

        <ExpertiseCard 
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
              <polyline points="2 17 12 22 22 17"></polyline>
              <polyline points="2 12 12 17 22 12"></polyline>
            </svg>
          }
          title="3D Modeling Expertise"
          description="Over 10 years of experience with commercial 3D modeling software has given me proficiency in creating complex models across various industries. I specialize in parametric design that allows for rapid iterations and modifications."
        />

        <ExpertiseCard 
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 10h-4V4h-4v6H6l6 6 6-6z"></path>
              <path d="M8 18h8"></path>
            </svg>
          }
          title="Programming Skills"
          description="Self-taught programming knowledge in JavaScript, Python, Clojure, and frontend technologies enables me to create custom parametric solutions that bridge the gap between traditional CAD and modern web applications."
        />
      </div>

      {/* Technology Stack */}
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
        }}>
          Technology Stack
        </h2>

        <div style={{ 
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "2rem"
        }}>
          <TechItem 
            name="Replicad" 
            description="JavaScript CAD framework based on OpenCascade geometry kernel, enabling powerful programmatic 3D modeling"
            link="https://replicad.xyz/"
          />
          <TechItem 
            name="Three.js" 
            description="3D graphics library for rendering complex geometry in the browser with high performance"
            link="https://threejs.org/"
          />
          <TechItem 
            name="React Three Fiber" 
            description="React renderer for Three.js, making 3D graphics declarative and easier to work with"
            link="https://docs.pmnd.rs/react-three-fiber"
          />
          <TechItem 
            name="Web-Based Production" 
            description="Client-side rendering and processing for secure, real-time collaboration and feedback"
            link="#"
          />
          <TechItem 
            name="Parametric Design" 
            description="Custom parametric approach allowing for instant model updates based on changing parameters"
            link="#"
          />
          <TechItem 
            name="Open Source Core" 
            description="Built on open-source technologies to provide cost-effective solutions without compromising quality"
            link="#"
          />
        </div>
      </div>

      {/* Service Process */}
      <div style={{ marginBottom: "4rem" }}>
        <h2 style={{ fontSize: "1.75rem", fontWeight: "700", marginBottom: "2rem" }}>
          My Service Process
        </h2>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          <div style={{ width: "100%", maxWidth: "100%" }}>
            <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
              <div style={{
                fontSize: "2rem",
                fontWeight: "800",
                color: "#2563EB",
                lineHeight: "1",
                flexShrink: 0
              }}>
                01
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ 
                  fontSize: "1.25rem", 
                  fontWeight: "700", 
                  marginBottom: "0.5rem" 
                }}>
                  Client Consultation
                </h3>
                <p style={{ 
                  color: "#475569", 
                  fontSize: "1rem", 
                  lineHeight: "1.6" 
                }}>
                  We begin with a detailed discussion about your project needs, including technical requirements, use cases, and design parameters. This consultation ensures I fully understand your vision.
                </p>
              </div>
            </div>
          </div>
          
          <div style={{ width: "100%", maxWidth: "100%" }}>
            <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
              <div style={{
                fontSize: "2rem",
                fontWeight: "800",
                color: "#2563EB",
                lineHeight: "1",
                flexShrink: 0
              }}>
                02
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ 
                  fontSize: "1.25rem", 
                  fontWeight: "700", 
                  marginBottom: "0.5rem" 
                }}>
                  Parametric Model Development
                </h3>
                <p style={{ 
                  color: "#475569", 
                  fontSize: "1rem", 
                  lineHeight: "1.6" 
                }}>
                  I create a parametric model framework that captures the essential components and relationships of your design, making it easy to adjust and refine throughout the development process.
                </p>
              </div>
            </div>
          </div>
          
          <div style={{ width: "100%", maxWidth: "100%" }}>
            <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
              <div style={{
                fontSize: "2rem",
                fontWeight: "800",
                color: "#2563EB",
                lineHeight: "1",
                flexShrink: 0
              }}>
                03
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ 
                  fontSize: "1.25rem", 
                  fontWeight: "700", 
                  marginBottom: "0.5rem" 
                }}>
                  Interactive Collaboration
                </h3>
                <p style={{ 
                  color: "#475569", 
                  fontSize: "1rem", 
                  lineHeight: "1.6" 
                }}>
                  You'll receive secure access to view your model's development in real-time, allowing you to provide feedback and request adjustments as the work progresses.
                </p>
              </div>
            </div>
          </div>
          
          <div style={{ width: "100%", maxWidth: "100%" }}>
            <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
              <div style={{
                fontSize: "2rem",
                fontWeight: "800",
                color: "#2563EB",
                lineHeight: "1",
                flexShrink: 0
              }}>
                04
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ 
                  fontSize: "1.25rem", 
                  fontWeight: "700", 
                  marginBottom: "0.5rem" 
                }}>
                  Technical Drawing Generation
                </h3>
                <p style={{ 
                  color: "#475569", 
                  fontSize: "1rem", 
                  lineHeight: "1.6" 
                }}>
                  Once the 3D model meets your requirements, I generate detailed technical drawings suitable for manufacturing, including dimensions, tolerances, and material specifications.
                </p>
              </div>
            </div>
          </div>
          
          <div style={{ width: "100%", maxWidth: "100%" }}>
            <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
              <div style={{
                fontSize: "2rem",
                fontWeight: "800",
                color: "#2563EB",
                lineHeight: "1",
                flexShrink: 0
              }}>
                05
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ 
                  fontSize: "1.25rem", 
                  fontWeight: "700", 
                  marginBottom: "0.5rem" 
                }}>
                  Rendering & Visualization
                </h3>
                <p style={{ 
                  color: "#475569", 
                  fontSize: "1rem", 
                  lineHeight: "1.6" 
                }}>
                  High-quality renders and visualizations bring your design to life, perfect for presentations, marketing materials, or assembly instructions.
                </p>
              </div>
            </div>
          </div>
          
          <div style={{ width: "100%", maxWidth: "100%" }}>
            <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
              <div style={{
                fontSize: "2rem",
                fontWeight: "800",
                color: "#2563EB",
                lineHeight: "1",
                flexShrink: 0
              }}>
                06
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ 
                  fontSize: "1.25rem", 
                  fontWeight: "700", 
                  marginBottom: "0.5rem" 
                }}>
                  Delivery & Support
                </h3>
                <p style={{ 
                  color: "#475569", 
                  fontSize: "1rem", 
                  lineHeight: "1.6" 
                }}>
                  You receive all files in your preferred formats, along with documentation and continued support to ensure the models meet your needs as they move into production.
                </p>
              </div>
            </div>
          </div>
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
        }}>
          Let's Work Together
        </h2>
        
        <p style={{ 
          textAlign: "center", 
          maxWidth: "700px", 
          margin: "0 auto", 
          marginBottom: "2.5rem",
          color: "#CBD5E1"
        }}>
          Have a project in mind or need a custom 3D modeling solution? I'd love to hear about your requirements and discuss how my services can bring your ideas to reality.
        </p>

        <div style={{ 
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
          maxWidth: "700px",
          margin: "0 auto"
        }}>
          <a href="mailto:damjanbab@icloud.com" style={{ textDecoration: "none" }}>
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "1.5rem",
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              borderRadius: "0.5rem",
              transition: "background-color 0.2s",
              cursor: "pointer"
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.05)";
            }}>
              <div style={{ 
                marginBottom: "1rem", 
                color: "#60A5FA" 
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
              </div>
              <h3 style={{ 
                fontSize: "1.125rem", 
                fontWeight: "600", 
                marginBottom: "0.5rem",
                color: "white"
              }}>
                Email
              </h3>
              <p style={{ 
                color: "#E2E8F0", 
                fontSize: "0.875rem", 
                textAlign: "center" 
              }}>
                damjanbab@icloud.com
              </p>
            </div>
          </a>
          
          <a href="https://github.com/haloedDepth" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "1.5rem",
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              borderRadius: "0.5rem",
              transition: "background-color 0.2s",
              cursor: "pointer"
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.05)";
            }}>
              <div style={{ 
                marginBottom: "1rem", 
                color: "#60A5FA" 
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
                </svg>
              </div>
              <h3 style={{ 
                fontSize: "1.125rem", 
                fontWeight: "600", 
                marginBottom: "0.5rem",
                color: "white"
              }}>
                GitHub
              </h3>
              <p style={{ 
                color: "#E2E8F0", 
                fontSize: "0.875rem", 
                textAlign: "center" 
              }}>
                github.com/haloedDepth
              </p>
            </div>
          </a>
          
          <a href="https://www.linkedin.com/in/damjanbabic/" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "1.5rem",
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              borderRadius: "0.5rem",
              transition: "background-color 0.2s",
              cursor: "pointer"
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.05)";
            }}>
              <div style={{ 
                marginBottom: "1rem", 
                color: "#60A5FA" 
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
                  <rect x="2" y="9" width="4" height="12"></rect>
                  <circle cx="4" cy="4" r="2"></circle>
                </svg>
              </div>
              <h3 style={{ 
                fontSize: "1.125rem", 
                fontWeight: "600", 
                marginBottom: "0.5rem",
                color: "white"
              }}>
                LinkedIn
              </h3>
              <p style={{ 
                color: "#E2E8F0", 
                fontSize: "0.875rem", 
                textAlign: "center" 
              }}>
                linkedin.com/in/damjanbabic
              </p>
            </div>
          </a>
        </div>
        
        <div style={{ 
          marginTop: "3rem", 
          display: "flex", 
          justifyContent: "center", 
          gap: "1.5rem" 
        }}>
          <a 
            href="https://github.com/haloedDepth" 
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
              transition: "background-color 0.2s",
              cursor: "pointer"
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.2)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
            </svg>
          </a>
          <a 
            href="https://www.linkedin.com/in/damjanbabic/" 
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
              transition: "background-color 0.2s",
              cursor: "pointer"
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.2)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
              <rect x="2" y="9" width="4" height="12"></rect>
              <circle cx="4" cy="4" r="2"></circle>
            </svg>
          </a>
          <a 
            href="mailto:damjanbab@icloud.com"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "3rem",
              height: "3rem",
              borderRadius: "50%",
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              color: "white",
              transition: "background-color 0.2s",
              cursor: "pointer"
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.2)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
              <polyline points="22,6 12,13 2,6"></polyline>
            </svg>
          </a>
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
          Built with React, Three.js, and Replicad.
        </p>
      </footer>
    </div>
  );
}

// Helper component for expertise cards (static, no hover effects)
function ExpertiseCard({ icon, title, description }) {
  return (
    <div style={{
      backgroundColor: "white",
      borderRadius: "0.5rem",
      padding: "1.5rem",
      boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
      border: "1px solid #E2E8F0"
    }}>
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

// Helper component for technology items (static, no hover effects)
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
      {link !== "#" && (
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
      )}
    </div>
  );
}