import React from 'react';
import ReactDOM from 'react-dom';

/**
 * ModalContainer component that uses React Portals to render its children
 * directly into the document.body to avoid parent CSS transforms/clipping.
 */
const ModalContainer = ({ children }) => {
  return ReactDOM.createPortal(
    children,
    document.body
  );
};

export default ModalContainer;
