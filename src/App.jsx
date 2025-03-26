import React, { useEffect } from "react";
import Layout from "./Layout.jsx";

// Add an event listener to handle tab switching from child components
export default function App() {
  useEffect(() => {
    const handleTabSwitch = (event) => {
      // This event would be dispatched by child components
      // to communicate tab changes to the Layout component
      if (event.detail) {
        window.dispatchEvent(new CustomEvent('switchToTab', { detail: event.detail }));
      }
    };

    window.addEventListener('switchTab', handleTabSwitch);
    
    return () => {
      window.removeEventListener('switchTab', handleTabSwitch);
    };
  }, []);

  return <Layout />;
}