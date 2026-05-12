import React from 'react';

const PageNavigation = ({
  currentPage,
  totalPages,
  onPrevPage,
  onNextPage,
  canCreateNextPage = false,
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
  const previousDisabled = currentPage === 0 || isSliding;
  const nextDisabled = (currentPage === totalPages - 1 && !canCreateNextPage) || isSliding;

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
      alignItems: 'center',
      pointerEvents: 'none',
      padding: PAGE_NAVIGATION_BUTTONS_PADDING,
    }}>
      <button
        disabled={previousDisabled}
        onClick={onPrevPage}
        style={{
          fontSize: PAGE_NAVIGATION_BUTTON_FONT_SIZE,
          opacity: previousDisabled ? PAGE_NAVIGATION_BUTTON_DISABLED_OPACITY : 1,
          background: 'rgba(12, 9, 7, 0.72)',
          border: '1px solid rgba(247, 211, 153, 0.38)',
          borderRadius: '999px',
          color: previousDisabled ? '#aaa' : '#fff',
          cursor: previousDisabled ? 'default' : 'pointer',
          padding: '0.35rem 0.8rem',
          pointerEvents: 'auto',
        }}
      >
        ← Prev
      </button>
      <span style={{
        color: PAGE_COUNT_TEXT_COLOR,
        fontFamily: PAGE_COUNT_TEXT_FONT_FAMILY,
        fontSize: PAGE_COUNT_TEXT_FONT_SIZE,
        alignSelf: 'center',
        background: 'rgba(12, 9, 7, 0.72)',
        border: '1px solid rgba(247, 211, 153, 0.28)',
        borderRadius: '999px',
        padding: '0.28rem 0.72rem',
      }}>
        Page {currentPage + 1} / {totalPages}
      </span>
      <button
        disabled={nextDisabled}
        onClick={onNextPage}
        style={{
          fontSize: PAGE_NAVIGATION_BUTTON_FONT_SIZE,
          opacity: nextDisabled ? PAGE_NAVIGATION_BUTTON_DISABLED_OPACITY : 1,
          background: 'rgba(12, 9, 7, 0.72)',
          border: '1px solid rgba(247, 211, 153, 0.38)',
          borderRadius: '999px',
          color: nextDisabled ? '#aaa' : '#fff',
          cursor: nextDisabled ? 'default' : 'pointer',
          padding: '0.35rem 0.8rem',
          pointerEvents: 'auto',
        }}
      >
        Next →
      </button>
    </div>
  );
};

export default PageNavigation;
