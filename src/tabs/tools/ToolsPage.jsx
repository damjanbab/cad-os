import React, { useState } from 'react';
import VideoGeneratorTool from './VideoGeneratorTool';

// Define styles similar to CadApp for consistency
const tabButtonStyle = (isActive) => ({
  padding: "8px 16px", // Consistent padding
  border: "none",
  borderBottom: isActive ? "3px solid #2563EB" : "3px solid transparent", // Underline effect
  background: "none", // Transparent background
  color: isActive ? "#2563EB" : "#333", // Highlight active color
  cursor: "pointer",
  fontWeight: isActive ? "600" : "400", // Bold active tab
  fontSize: "1rem", // Consistent font size
  marginRight: '10px', // Space between tabs
  transition: "border-color 0.2s, color 0.2s",
});

export default function ToolsPage() {
  const [activeToolTab, setActiveToolTab] = useState('video'); // Default to video tool

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Sub-navigation Tabs */}
      <div style={{
        padding: '10px 20px',
        borderBottom: '1px solid #e0e0e0',
        backgroundColor: '#f9f9f9',
        flexShrink: 0,
      }}>
        <button
          onClick={() => setActiveToolTab('video')}
          style={tabButtonStyle(activeToolTab === 'video')}
        >
          Video Generation
        </button>
        {/* Add buttons for future tools here */}
        {/* <button
          onClick={() => setActiveToolTab('other')}
          style={tabButtonStyle(activeToolTab === 'other')}
        >
          Another Tool
        </button> */}
      </div>

      {/* Content Area for the selected tool */}
      <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
        {activeToolTab === 'video' && <VideoGeneratorTool />}
        {/* Add rendering for other tools based on activeToolTab */}
        {/* {activeToolTab === 'other' && <div>Another Tool Content</div>} */}
      </div>
    </div>
  );
}
