import '@testing-library/jest-dom';

// Window mocks for DOM test environment
window.scrollTo = () => {};
window.confirm = () => true;
window.alert = () => {};
