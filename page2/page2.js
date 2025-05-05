// Remove the DOMContentLoaded listener since it may not fire
// when dynamically loading the script
// document.addEventListener('DOMContentLoaded', function() {
//   initPage2();
// });

// Make sure initPage2 is globally available
window.initPage2 = function() {
  setupBackButton();
  setupPage2Welcome();
}

// Handle the back button functionality
function setupBackButton() {
  const backBtn = document.getElementById('back-btn');
  if (backBtn) {
    // Remove any existing click listeners first to avoid duplicates
    backBtn.replaceWith(backBtn.cloneNode(true));
    const newBackBtn = document.getElementById('back-btn');
    
    newBackBtn.addEventListener('click', function() {
      const container = document.querySelector('.container');
      container.style.opacity = '0';
      setTimeout(() => {
        location.reload();
      }, 500);
    });
  } else {
    console.error('Back button not found in the DOM');
  }
}

// Setup content with typing animation instead of timeline
function setupPage2Welcome() {
  // Page title setup - remove "Welcome" text
  const pageTitle = document.querySelector('.page2-title');
  if (pageTitle) {
    pageTitle.textContent = "";
  }
  
  // Replace timeline with typing animation message
  const timelineContainer = document.querySelector('.journey-timeline');
  if (timelineContainer) {
    timelineContainer.innerHTML = '';
    
    const welcomeMessage = document.createElement('div');
    welcomeMessage.className = 'welcome-message';
    
    // Create paragraph for typing animation
    const paragraph = document.createElement('p');
    paragraph.className = 'typing-text';
    welcomeMessage.appendChild(paragraph);
    
    timelineContainer.appendChild(welcomeMessage);
    
    // Text for typing animation
    const text = "Hi! Whether you're here to get to know me or just happened to click this link, you're very to look around. I'm currently a full-time student, and these university years are truly proving to be some of the most important in my life. So, without further ado, let this journey take you into my story!";
    
    // Start typing animation
    typeText(paragraph, text, 0);
  }
}

// Function to create typing animation
function typeText(element, text, index) {
  if (index < text.length) {
    // Remove existing cursor if there is one
    const existingCursor = element.querySelector('.cursor');
    if (existingCursor) {
      existingCursor.remove();
    }
    
    // Add the new character
    const span = document.createElement('span');
    span.textContent = text.charAt(index);
    element.appendChild(span);
    
    // Add the cursor after the latest character
    const cursor = document.createElement('span');
    cursor.className = 'cursor';
    element.appendChild(cursor);
    
    // Scroll to the bottom if needed to keep cursor visible
    cursor.scrollIntoView({behavior: "smooth", block: "end"});
    
    // Continue typing
    setTimeout(function() {
      typeText(element, text, index + 1);
    }, 20); // Speed of typing
  } else {
    // Typing is complete, show the timeline title first
    setTimeout(function() {
      showTimelineTitle();
    }, 500); // Delay before showing the timeline title
  }
}

// Function to display "Here is timeline" text
function showTimelineTitle() {
  const timelineContainer = document.querySelector('.journey-timeline');
  
  // Create a container for the title
  const titleContainer = document.createElement('div');
  titleContainer.className = 'timeline-title-container';
  
  // Create the title element
  const titleElement = document.createElement('h2');
  titleElement.className = 'timeline-title';
  titleElement.textContent = 'Here is timeline';
  
  // Add title to the container
  titleContainer.appendChild(titleElement);
  timelineContainer.appendChild(titleContainer);
  
  // Show the title with animation
  setTimeout(() => {
    titleElement.classList.add('visible');
    
    // After the title is visible, show the timeline
    setTimeout(() => {
      addHorizontalTimeline();
    }, 1500); // Delay before showing the actual timeline
  }, 100);
}

// Function to add horizontal timeline
function addHorizontalTimeline() {
  const timelineContainer = document.querySelector('.journey-timeline');
  
  // Create horizontal timeline container
  const horizontalTimeline = document.createElement('div');
  horizontalTimeline.className = 'horizontal-timeline';
  
  // Create 6 timeline points with connecting dots
  const timelinePoints = [];
  const timelineContents = [];
  
  const pointLabels = ['2020', '2021', '2022', '2023', '2024', '2025'];
  const pointContents = [
    'Began my five-year university journey - an unexpected learning path, but one I\'ve never regretted.',
    'Learned the two major languages, Java and Python. Also came across the author of the C# book I used for self-study back in junior high.',
    'Fell in love with Rust, discovering it unintentionally on Reddit. It\'s incredibly beautiful, yet also intensely challenging (\'torturous\').',
    'Earned the AZ-900 certification, officially kicking off my cloud journey. Relying on free tiers and GCP events, I gained hands-on experience with the three major cloud platforms.',
    'Osutify was born. As a university student, I successfully completed this project that year. There were times I thought about giving up, but I persevered, and succeeded.',
    'Embracing the mindset of a computer science professional, building upon the foundation from previous years, I\'m steadily moving forward and completing projects. I have firmly set my sights on advancing towards becoming a DevOps Engineer.'
  ];
  
  // Create main timeline container for diamonds and dots
  const timelineDiamonds = document.createElement('div');
  timelineDiamonds.className = 'timeline-diamonds';
  horizontalTimeline.appendChild(timelineDiamonds);
  
  for (let i = 0; i < 6; i++) {
    // Create timeline point wrapper
    const pointWrapper = document.createElement('div');
    pointWrapper.className = 'diamond-wrapper';
    
    // Create diamond point
    const point = document.createElement('div');
    point.className = 'diamond-point';
    point.setAttribute('data-index', i);
    
    // Third point (2022) should be initially active
    if (i === 2) {
      point.classList.add('active');
    }
    
    // Create connecting dots (except after last point)
    if (i < 5) {
      const dotsContainer = document.createElement('div');
      dotsContainer.className = 'connecting-dots';
      
      // Create 3 dots
      for (let j = 0; j < 3; j++) {
        const dot = document.createElement('div');
        dot.className = 'dot';
        dotsContainer.appendChild(dot);
      }
      
      timelineDiamonds.appendChild(pointWrapper);
      timelineDiamonds.appendChild(dotsContainer);
    } else {
      // Last point doesn't need dots after it
      timelineDiamonds.appendChild(pointWrapper);
    }
    
    pointWrapper.appendChild(point);
    timelinePoints.push(point);
    
    // Create content for this point
    const content = document.createElement('div');
    content.className = 'timeline-content-h';
    content.setAttribute('data-index', i);
    content.style.display = 'none';  // Initially hidden
    content.innerHTML = `<h3>${pointLabels[i]}</h3><p>${pointContents[i]}</p>`;
    timelineContents.push(content);
    
    // Add click event to show content
    point.addEventListener('click', function() {
      const index = parseInt(this.getAttribute('data-index'));
      showTimelineContent(index, timelinePoints, timelineContents);
    });
  }
  
  // Add horizontal timeline to the page
  timelineContainer.appendChild(horizontalTimeline);
  
  // Add content container
  const contentContainer = document.createElement('div');
  contentContainer.className = 'timeline-content-container';
  timelineContents.forEach(content => contentContainer.appendChild(content));
  timelineContainer.appendChild(contentContainer);
  
  // Show animation for timeline
  setTimeout(() => {
    horizontalTimeline.classList.add('visible');
    // Show 2022 content by default
    showTimelineContent(2, timelinePoints, timelineContents);
  }, 100);
}

// Function to show timeline content
function showTimelineContent(index, points, contents) {
  // Highlight the selected point
  points.forEach((point, i) => {
    if (i === index) {
      point.classList.add('active');
    } else {
      point.classList.remove('active');
    }
  });
  
  // Show the selected content
  contents.forEach((content, i) => {
    if (i === index) {
      content.style.display = 'block';
      setTimeout(() => {
        content.classList.add('active');
      }, 50);
    } else {
      content.classList.remove('active');
      setTimeout(() => {
        if (!content.classList.contains('active')) {
          content.style.display = 'none';
        }
      }, 300);
    }
  });
}