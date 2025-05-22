import React from 'react';

const PageNavigation = ({
  currentPage,
  totalPages,
  onPrevPage,
  onNextPage,
  isSliding,
  // Pass relevant styling constants as props
  PAGE_NAVIGATION_BUTTONS_TOP,
  PAGE_NAVIGATION_BUTTONS_Z_INDEX,
  PAGE_NAVIGATION_BUTTONS_PADDING,
  PAGE_NAVIGATION_BUTTON_FONT_SIZE,
  PAGE_NAVIGATION_BUTTON_DISABLED_OPACITY,
  PAGE_COUNT_TEXT_COLOR,
  PAGE_COUNT_TEXT_FONT_FAMILY,
  PAGE_COUNT_TEXT_FONT_SIZE,
}) => {
  return (
    <div style={{
      position: 'absolute',
      top: PAGE_NAVIGATION_BUTTONS_TOP,
      left: 0,
      right: 0,
      zIndex: PAGE_NAVIGATION_BUTTONS_Z_INDEX,
      width: '100%',
      display: 'flex',
      justifyContent: 'space-between',
      pointerEvents: 'auto',
      padding: PAGE_NAVIGATION_BUTTONS_PADDING,
    }}>
      <button
        disabled={currentPage === 0 || isSliding}
        onClick={onPrevPage}
        style={{
          fontSize: PAGE_NAVIGATION_BUTTON_FONT_SIZE,
          opacity: (currentPage === 0 || isSliding) ? PAGE_NAVIGATION_BUTTON_DISABLED_OPACITY : 1,
          // Basic styling, can be enhanced with CSS classes
          background: 'none',
          border: 'none',
          color: (currentPage === 0 || isSliding) ? '#aaa' : '#fff', // Example color
          cursor: (currentPage === 0 || isSliding) ? 'default' : 'pointer',
          padding: '5px 10px',
        }}
      >
        ← Prev
      </button>
      <span style={{
        color: PAGE_COUNT_TEXT_COLOR,
        fontFamily: PAGE_COUNT_TEXT_FONT_FAMILY,
        fontSize: PAGE_COUNT_TEXT_FONT_SIZE,
        alignSelf: 'center', // Vertically center the page count
      }}>
        Page {currentPage + 1} / {totalPages}
      </span>
      <button
        disabled={currentPage === totalPages - 1 || isSliding}
        onClick={onNextPage}
        style={{
          fontSize: PAGE_NAVIGATION_BUTTON_FONT_SIZE,
          opacity: (currentPage === totalPages - 1 || isSliding) ? PAGE_NAVIGATION_BUTTON_DISABLED_OPACITY : 1,
          // Basic styling, can be enhanced with CSS classes
          background: 'none',
          border: 'none',
          color: (currentPage === totalPages - 1 || isSliding) ? '#aaa' : '#fff', // Example color
          cursor: (currentPage === totalPages - 1 || isSliding) ? 'default' : 'pointer',
          padding: '5px 10px',
        }}
      >
        Next →
      </button>
    </div>
  );
};

export default PageNavigation;
