import React, { useState, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';

const PageTransition = ({ children, loadingMessage = "Loading page..." }) => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate page loading time
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <LoadingSpinner message={loadingMessage} />;
  }

  return <>{children}</>;
};

export default PageTransition;