// Test ID selectors for BDD tests
// Using IDs instead of text-based selectors for better stability across language changes

const BUTTON_IDS = {
  // Main page buttons
  ADD_NEW_TOPIC: '#add-new-topic-btn',
  ADD_NEW_TRACK: '#add-new-track-btn',
  
  // Topic form buttons
  ADD_KEYWORD: '#add-keyword-btn',
  TOPIC_FORM_SUBMIT: '#topic-form-submit-btn',
  TOPIC_FORM_CANCEL: '#topic-form-cancel-btn',
  
  // Track form buttons
  TRACK_FORM_SUBMIT: '#track-form-submit-btn',
  TRACK_FORM_CANCEL: '#track-form-cancel-btn',
  
  // Delete dialog buttons
  DELETE_DIALOG_CONFIRM: '#delete-dialog-confirm-btn',
  DELETE_DIALOG_CANCEL: '#delete-dialog-cancel-btn'
};

// Dynamic ID generators for topic-specific buttons
const getTopicButtonId = (topicId, action) => {
  return `#${action}-topic-${topicId}-btn`;
};

// Dynamic ID generators for track-specific buttons
const getTrackButtonId = (trackId, action) => {
  return `#${action}-track-${trackId}-btn`;
};

// Test constants
const TEST_TOPIC_ID = 'test-topic-1';
const TEST_TRACK_ID = 'test-track-1';

module.exports = {
  BUTTON_IDS,
  getTopicButtonId,
  getTrackButtonId,
  TEST_TOPIC_ID,
  TEST_TRACK_ID
}; 