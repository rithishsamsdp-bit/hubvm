import { useState, useCallback } from 'react';

/**
 * Custom hook to manage the Document Picture-in-Picture lifecycle.
 * @returns {object} { isSupported, pipWindow, openPiP, closePiP, isPiPOpen }
 */
const useDocumentPiP = () => {
  const [pipWindow, setPipWindow] = useState(null);
  
  // Check browser support (DPIP is mainly Chrome/Edge)
  const isSupported = 'documentPictureInPicture' in window;

  const closePiP = useCallback(() => {
    if (pipWindow) {
      pipWindow.close();
      setPipWindow(null);
    }
  }, [pipWindow]);

  const openPiP = useCallback(async ({ width = 300, height = 450 } = {}) => {
    if (!isSupported) {
      console.error('Document Picture-in-Picture API not supported in this browser.');
      return;
    }
    
    // If a window is already open, close it first
    if (pipWindow) {
        closePiP();
    }

    try {
      // 1. Request the new PiP window
      const newWindow = await window.documentPictureInPicture.requestWindow({ width, height });
      setPipWindow(newWindow);

      // 2. CRITICAL: Copy Stylesheets
      // This ensures your component is styled correctly in the new context
      window.document.head
        .querySelectorAll('link[rel="stylesheet"], style')
        .forEach((node) => {
          newWindow.document.head.appendChild(node.cloneNode(true));
        });

      // 3. Set up cleanup: Listen for the user closing the window
      newWindow.addEventListener('pagehide', () => {
        setPipWindow(null); // Reset the state in the main app
      });

    } catch (error) {
      console.error('Failed to open PiP window:', error);
      setPipWindow(null);
    }
  }, [isSupported, pipWindow, closePiP]);

  return { 
    isSupported, 
    pipWindow, 
    openPiP, 
    closePiP, 
    isPiPOpen: !!pipWindow 
  };
};

export default useDocumentPiP;