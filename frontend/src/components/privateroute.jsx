import { Navigate } from "react-router-dom";
import React from 'react';

const PrivateRoute = ({ isAuthenticated, element, children }) => {
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  
  // Handle element prop (JSX or component)
  if (element) {
    if (React.isValidElement(element)) {
      return element;
    }
    const Element = element;
    return <Element />;
  }
  
  // Handle children
  return children;
};

export default PrivateRoute;