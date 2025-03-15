// Add a simple button to trigger authentication
document.addEventListener('DOMContentLoaded', function() {
    const testButton = document.createElement('button');
    testButton.textContent = 'Test Google Authentication';
    testButton.style.margin = '10px';
    testButton.addEventListener('click', testAuth);
    document.body.prepend(testButton);
  });
  
  function testAuth() {
    console.log('Testing OAuth authentication...');
    chrome.identity.getAuthToken({ interactive: true }, function(token) {
      if (chrome.runtime.lastError) {
        console.error('Error getting auth token:', chrome.runtime.lastError);
        return;
      }
      console.log('Got auth token:', token);
    });
  }