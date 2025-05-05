import { init, greet, fetch_github_repos, get_language_color } from "./pkg/aznitro_website.js";

// Get the base URL for GitHub Pages deployment
const getBaseUrl = () => {
  const scriptPath = document.currentScript.src;
  return scriptPath.substring(0, scriptPath.lastIndexOf('/') + 1);
};

// Use dynamic import with the correct base URL
const loadWasm = async () => {
  const baseUrl = getBaseUrl();
  const wasmModule = await import(`${baseUrl}pkg/aznitro_website.js`);
  return wasmModule;
};

// Enhanced device detection utility with emulator support
function deviceDetection() {
  const detection = {
    isMobile: false,
    isTablet: false,
    isTouch: false,
    deviceType: 'desktop',
    orientation: 'landscape'
  };
  
  // Check for touch capability
  detection.isTouch = ('ontouchstart' in window) || 
                     (navigator.maxTouchPoints > 0) || 
                     (navigator.msMaxTouchPoints > 0);
  
  // Screen width based detection (more precise breakpoints)
  const width = window.innerWidth;
  const height = window.innerHeight;
  detection.orientation = width > height ? 'landscape' : 'portrait';
  
  // 更精確的寬度檢測 - S20 Ultra 視口寬度約為 412px
  if (width <= 480) {
    detection.isMobile = true;
    detection.deviceType = 'mobile';
  } else if (width <= 768) {
    detection.isTablet = true;
    detection.deviceType = 'tablet';
  }
  
  // Additional checks for mobile devices
  const userAgent = navigator.userAgent.toLowerCase();
  if (
    /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|mobile safari|samsung browser|windows phone/i.test(userAgent)
  ) {
    detection.isTouch = true;
    
    if (!detection.isTablet && !detection.isMobile) {
      // If not already detected as mobile/tablet by width, check user agent
      if (/ipad|tablet/i.test(userAgent)) {
        detection.isTablet = true;
        detection.deviceType = 'tablet';
      } else {
        detection.isMobile = true;
        detection.deviceType = 'mobile';
      }
    }
  }
  
  // 支援開發者工具模擬模式
  if (window.matchMedia('(max-device-width: 480px)').matches || 
      window.matchMedia('(max-width: 480px)').matches) {
    detection.isMobile = true;
    detection.deviceType = 'mobile';
    detection.isTouch = true;
  }
  
  // 直接檢查螢幕比例來判斷是否在模擬器中
  const aspectRatio = width / height;
  if (aspectRatio < 1 && width < 500) {
    detection.isMobile = true;
    detection.deviceType = 'mobile';
  }
  
  console.log(`Device detection: ${detection.deviceType}, width: ${width}px`);
  return detection;
}

const GITHUB_USERNAME = "AZNitro";
let allRepositories = [];
let currentRepoIndex = 0;
let autoSlideTimer;

// More concise time-based greeting
function getTimeBasedGreeting() {
  const hour = new Date().getHours();
  return hour < 5 ? "Late Night" : hour < 12 ? "Morning" : hour < 18 ? "Afternoon" : "Evening";
}

// Consolidated slide functions
function slideRepo(direction = null) {
  if (allRepositories.length <= 1) return;
  
  // Calculate new index
  if (direction === 'prev') {
    currentRepoIndex = currentRepoIndex > 0 ? currentRepoIndex - 1 : 0;
  } else {
    currentRepoIndex = (currentRepoIndex + 1) % allRepositories.length;
  }
  
  displayCurrentRepo(direction === 'prev' ? 'right' : direction === 'next' ? 'left' : null);
  resetAutoSlideTimer();
}

function resetAutoSlideTimer() {
  clearInterval(autoSlideTimer);
  autoSlideTimer = setInterval(() => slideRepo('next'), 5000);
}

// Optimized repo card display
function displayCurrentRepo(swipeDirection = null) {
  const container = document.getElementById("repo-container");
  if (!allRepositories.length) return;
  
  const repo = allRepositories[currentRepoIndex];
  const languageColor = repo.language ? get_language_color(repo.language) : "#8b949e";
  
  const oldCard = container.querySelector('.repo-card');
  
  // Animation handling
  if (oldCard) {
    oldCard.style.animation = swipeDirection ? 
      `slideOutTo${swipeDirection === 'left' ? 'Right' : 'Left'} 0.6s ease-out forwards` : 
      'slideOutToLeft 0.6s ease-out forwards';
    
    setTimeout(() => {
      container.innerHTML = '';
      createRepoCard(container, repo, languageColor, swipeDirection);
    }, 500);
  } else {
    createRepoCard(container, repo, languageColor, swipeDirection);
  }
  
  updateDots();
}

// Simplified card creation
function createRepoCard(container, repo, languageColor, swipeDirection = null) {
  const repoCard = document.createElement("div");
  repoCard.className = "repo-card";
  
  if (swipeDirection) {
    repoCard.classList.add(`slide-${swipeDirection}-in`);
  }
  
  repoCard.onclick = () => window.open(repo.html_url, '_blank');
  
  // Use template literal for cleaner HTML creation
  repoCard.innerHTML = `
    <div class="repo-preview">
      <img src="${repo.image_url || 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png'}" 
          alt="${repo.name}" 
          class="repo-img"
          onerror="this.onerror=null; this.src='https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png';">
    </div>
    <div class="repo-header">
      <span class="repo-name">${repo.name}</span>
    </div>
    <div class="repo-content">
      <div class="repo-description">${repo.description || "No description provided"}</div>
      <div class="repo-footer">
        ${repo.language ? `
          <div class="repo-language">
            <div class="language-color" style="background-color: ${languageColor}"></div>
            ${repo.language}
          </div>
        ` : ''}
        
        <div class="repo-stats">
          <span>${repo.stargazers_count} ★</span>
          <span>${repo.forks_count} ⑂</span>
        </div>
      </div>
    </div>
  `;
  
  container.appendChild(repoCard);
  
  // Add load handler for image fade-in
  const img = repoCard.querySelector('.repo-img');
  if (img) img.onload = () => img.classList.add('loaded');
}

// More efficient dot navigation
function updateDots() {
  const dotsContainer = document.getElementById("repo-dots");
  if (!dotsContainer) return;
  
  dotsContainer.innerHTML = "";
  
  for (let i = 0; i < allRepositories.length; i++) {
    const dot = document.createElement("div");
    dot.className = `repo-dot ${i === currentRepoIndex ? "active" : ""}`;
    
    // Simplified event handler with debouncing
    dot.onclick = () => {
      if (i === currentRepoIndex) return;
      
      const dots = document.querySelectorAll('.repo-dot');
      dots.forEach(d => d.style.pointerEvents = 'none');
      
      currentRepoIndex = i;
      displayCurrentRepo();
      resetAutoSlideTimer();
      
      setTimeout(() => dots.forEach(d => d.style.pointerEvents = 'auto'), 800);
    };
    
    // Simplified hover effects
    dot.addEventListener('mouseenter', () => {
      if (i !== currentRepoIndex) dot.style.transform = 'scale(1.3)';
    });
    
    dot.addEventListener('mouseleave', () => {
      if (i !== currentRepoIndex) dot.style.transform = 'scale(1)';
    });
    
    dotsContainer.appendChild(dot);
  }
}

// More efficient touch handling
function initTouchSwipe() {
  const repoContainer = document.getElementById("repo-container");
  if (!repoContainer) return;
  
  let touchStartX = 0;
  
  repoContainer.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });
  
  repoContainer.addEventListener('touchend', e => {
    const touchEndX = e.changedTouches[0].screenX;
    const swipeThreshold = 50;
    const diff = touchEndX - touchStartX;
    
    if (Math.abs(diff) >= swipeThreshold) {
      const oldCard = document.querySelector('.repo-card');
      if (oldCard) {
        oldCard.classList.add(diff < 0 ? 'slide-left-out' : 'slide-right-out');
        
        setTimeout(() => {
          if (diff < 0) {
            slideRepo('next');
          } else if (currentRepoIndex > 0) {
            slideRepo('prev');
          }
        }, 10);
      }
    }
  }, { passive: true });
}

// Memory-optimized typing animation with enhanced device detection
function setupTypingAnimation() {
  const typingElement = document.getElementById('typing-text');
  if (!typingElement || window.typingAnimationActive) return;
  
  window.typingAnimationActive = true;
  
  // 定義不同螢幕尺寸的文字內容
  const standardPhrases = [
    "Welcome to my personal website",
    "Exploring Rust and WebAssembly development",
    "University life and coding adventures",
    "Xbox gaming in between debugging sessions",
    "Internet governance internship experiences",
    "Journey to becoming a DevOps engineer",
    "Building the future with code"
  ];
  
  // 為手機準備較短的文字
  const mobilePhrases = [
    "Hello there!",
    "Rust & WASM dev",
    "Coding journey",
    "Xbox gaming",
    "DevOps path",
    "Tech enthusiast"
  ];
  
  // 為平板準備中等長度的文字
  const tabletPhrases = [
    "Welcome to my site",
    "Rust & WebAssembly explorer",
    "Coding & university life",
    "Gaming enthusiast",
    "DevOps journey",
    "Tech & governance"
  ];
  
  // 使用增強的裝置檢測
  function getDeviceBasedPhrases() {
    const device = deviceDetection();
    if (device.isMobile) return mobilePhrases;
    if (device.isTablet) return tabletPhrases;
    return standardPhrases;
  }
  
  // 根據當前裝置選擇合適的文字
  let phrases = getDeviceBasedPhrases();
  
  let phraseIndex = 0;
  let charIndex = 0;
  let isDeleting = false;
  let timeoutId = null;
  
  typingElement.textContent = '';
  
  // 監聽視窗大小變化，使用防抖動優化
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      // 檢查裝置類型是否變化
      const newPhrases = getDeviceBasedPhrases();
      
      if (phrases !== newPhrases) {
        phrases = newPhrases;
        
        // 平順過渡：完成目前文字後切換到新的文字集
        if (phraseIndex >= phrases.length) {
          phraseIndex = 0;
        }
      }
    }, 250); // 250ms 防抖動延遲
  });
  
  // Self-cleaning animation function
  function typeCharacter() {
    // Clear previous timeout to prevent memory leaks
    if (timeoutId) clearTimeout(timeoutId);
    
    const element = document.getElementById('typing-text');
    if (!element) {
      window.typingAnimationActive = false;
      return;
    }
    
    const currentPhrase = phrases[phraseIndex];
    let typingSpeed;
    const device = deviceDetection();
    
    if (isDeleting) {
      charIndex--;
      element.textContent = currentPhrase.substring(0, charIndex);
      // 手機模式下稍微加快刪除速度
      typingSpeed = device.isMobile ? 35 : device.isTablet ? 40 : 50;
    } else {
      element.textContent = currentPhrase.substring(0, charIndex + 1);
      charIndex++;
      // 手機模式下加快打字速度以提升用戶體驗
      typingSpeed = device.isMobile ? 60 : device.isTablet ? 70 : 100;
    }
    
    if (!isDeleting && charIndex >= currentPhrase.length) {
      isDeleting = true;
      // 手機模式下縮短暫停時間
      typingSpeed = device.isMobile ? 800 : device.isTablet ? 1000 : 1500; 
    } else if (isDeleting && charIndex <= 0) {
      isDeleting = false;
      phraseIndex = (phraseIndex + 1) % phrases.length;
      // 手機模式下縮短文字切換的停頓
      typingSpeed = device.isMobile ? 400 : device.isTablet ? 500 : 700;
    }
    
    timeoutId = setTimeout(typeCharacter, typingSpeed);
  }
  
  typeCharacter();
}

// Enhanced contact card setup with specific handling for Xbox and Discord
function setupContactCardCopy() {
  // First, let's clearly identify the cards we want to make copyable
  const discordCard = document.querySelector('.contact-card:nth-child(1)');
  const xboxCard = document.querySelector('.contact-card:nth-child(2)');
  const emailCard = document.querySelector('.email-card');
  
  // Function to handle the actual copying with fallback methods
  function copyTextToClipboard(text, card, titleElement) {
    // Try using the modern clipboard API first
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => {
          showCopySuccess(card, titleElement, text);
        })
        .catch(err => {
          console.error('Clipboard API failed:', err);
          // Try fallback method
          fallbackCopyTextToClipboard(text, card, titleElement);
        });
    } else {
      // Clipboard API not available, use fallback
      fallbackCopyTextToClipboard(text, card, titleElement);
    }
  }
  
  // Fallback copy method using textarea
  function fallbackCopyTextToClipboard(text, card, titleElement) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    
    // Make the textarea out of viewport
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    let successful = false;
    try {
      successful = document.execCommand('copy');
    } catch (err) {
      console.error('execCommand failed:', err);
    }
    
    document.body.removeChild(textArea);
    
    if (successful) {
      showCopySuccess(card, titleElement, text);
    } else {
      showCopyFailure(titleElement, text);
    }
  }
  
  // Success feedback
  function showCopySuccess(card, titleElement, originalText) {
    card.classList.add('copied');
    titleElement.setAttribute('data-original', originalText);
    titleElement.textContent = "Copied!";
    
    setTimeout(() => {
      card.classList.remove('copied');
      titleElement.textContent = originalText;
    }, 1500);
  }
  
  // Failure feedback
  function showCopyFailure(titleElement, originalText) {
    titleElement.textContent = "Copy failed!";
    setTimeout(() => {
      titleElement.textContent = originalText;
    }, 1500);
  }
  
  // Handle Discord card
  if (discordCard) {
    discordCard.addEventListener('click', function() {
      const titleElement = this.querySelector('.title');
      if (titleElement) {
        copyTextToClipboard(titleElement.textContent, this, titleElement);
      }
    });
  }
  
  // Handle Xbox card
  if (xboxCard) {
    xboxCard.addEventListener('click', function() {
      const titleElement = this.querySelector('.title');
      if (titleElement) {
        copyTextToClipboard(titleElement.textContent, this, titleElement);
      }
    });
  }
  
  // Handle email
  if (emailCard) {
    emailCard.addEventListener('click', function() {
      window.location.href = "mailto:fivepeok05@outlook.com";
    });
  }
  
  // Also set up any other contact cards as a fallback
  document.querySelectorAll('.contact-card').forEach(card => {
    // Skip cards we've already set up
    if (card === discordCard || card === xboxCard || card === emailCard) return;
    
    card.addEventListener('click', function() {
      const titleElement = this.querySelector('.title');
      if (titleElement) {
        copyTextToClipboard(titleElement.textContent, this, titleElement);
      }
    });
  });
}

// Simplified journey navigation with scroll to top
function setupJourneyButton() {
  const journeyBtn = document.getElementById('journey-begin-btn');
  if (!journeyBtn) return;
  
  journeyBtn.addEventListener('click', function() {
    const container = document.querySelector('.container');
    container.style.opacity = '0';
    
    // Hide the arrow navigation
    document.querySelector('.arrow-navigation').style.display = 'none';
    
    // Update page navigation dots
    document.querySelectorAll('.page-dot').forEach(dot => {
      dot.classList.remove('active');
      if (dot.getAttribute('data-page') === '2') {
        dot.classList.add('active');
      }
    });
    
    setTimeout(() => {
      // Show intro animation before loading page2 content
      showPage2IntroAnimation().then(() => {
        // After animation completes, load page2 content
        loadPage2Content();
      });
    }, 500);
  });
  
  function showPage2IntroAnimation() {
    return new Promise((resolve) => {
      // Create intro animation container
      const introContainer = document.createElement('div');
      introContainer.className = 'intro-animation-container';
      
      // Explicitly set flex layout for better centering
      introContainer.style.display = 'flex';
      introContainer.style.flexDirection = 'column';
      introContainer.style.justifyContent = 'center';
      introContainer.style.alignItems = 'center';
      
      // Add transition for container fade out
      introContainer.style.transition = 'opacity 1s ease';
      
      // Create text elements
      const text1 = document.createElement('div');
      text1.className = 'intro-text';
      text1.textContent = 'Before we start';
      
      const text2 = document.createElement('div');
      text2.className = 'intro-text';
      text2.textContent = "Let's talk about myself";
      text2.style.opacity = '0';
      
      // Add elements to container
      introContainer.appendChild(text1);
      introContainer.appendChild(text2);
      
      // Add container to body
      document.body.appendChild(introContainer);
      
      // Sequence the animations
      setTimeout(() => {
        // Fade in first text
        text1.classList.add('fade-in');
        
        setTimeout(() => {
          // Fade out first text and fade in second text
          text1.classList.remove('fade-in');
          text1.classList.add('fade-out');
          
          setTimeout(() => {
            text2.style.opacity = '1';
            text2.classList.add('fade-in');
            
            setTimeout(() => {
              // Fade out second text
              text2.classList.remove('fade-in');
              text2.classList.add('fade-out');
              
              setTimeout(() => {
                // Fade out the entire container
                introContainer.style.opacity = '0';
                
                // Remove container after fade out completes
                setTimeout(() => {
                  document.body.removeChild(introContainer);
                  resolve(); // Animation complete
                }, 1000);
              }, 1000);
            }, 2000);
          }, 1000);
        }, 2000);
      }, 500);
    });
  }
  
  function loadPage2Content() {
    const container = document.querySelector('.container');
    const baseUrl = getBaseUrl();
    
    fetch(`${baseUrl}page2/page2.html`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to load page2.html: ${response.status}`);
        }
        return response.text();
      })
      .then(html => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const page2Container = doc.querySelector('.page2-container');
        
        if (page2Container) {
          container.innerHTML = page2Container.innerHTML;
          container.className = 'container page2-container';
          
          // Load page2 CSS if not already loaded
          if (!document.querySelector('link[href="page2/page2.css"]')) {
            const linkElem = document.createElement('link');
            linkElem.rel = 'stylesheet';
            linkElem.href = 'page2/page2.css';
            document.head.appendChild(linkElem);
          }
          
          // Create back button in top bar
          const greetBtn = document.getElementById('greet-btn');
          if (greetBtn) {
            greetBtn.style.display = 'none';
            
            const backBtn = document.createElement('button');
            backBtn.id = 'back-btn';
            backBtn.textContent = 'Back';
            document.querySelector('.top-bar')?.appendChild(backBtn);
          }
          
          // Make sure to scroll to top when navigating to page 2
          window.scrollTo(0, 0);
          
          setTimeout(() => {
            container.style.opacity = '1';
            
            // Load page2.js if not already loaded
            if (!document.querySelector('script[src="page2/page2.js"]')) {
              const scriptElem = document.createElement('script');
              scriptElem.src = 'page2/page2.js';
              
              // Add an onload handler to ensure initPage2 is called after script loads
              scriptElem.onload = function() {
                if (typeof initPage2 === 'function') {
                  initPage2();
                } else {
                  console.error('initPage2 function not found after loading page2.js');
                  
                  // Fallback solution: directly attach back button event listener
                  const backBtn = document.getElementById('back-btn');
                  if (backBtn) {
                    backBtn.addEventListener('click', function() {
                      const container = document.querySelector('.container');
                      container.style.opacity = '0';
                      setTimeout(() => {
                        location.reload();
                      }, 500);
                    });
                  }
                }
              };
              
              document.body.appendChild(scriptElem);
            } else {
              // If script is already loaded, initialize page2
              if (typeof initPage2 === 'function') {
                initPage2();
              }
            }
          }, 100);
        }
      })
      .catch(error => {
        console.error('Failed to load page2:', error);
        container.style.opacity = '1';
        document.querySelector('.arrow-navigation').style.display = 'flex';
      });
  }
}

// Add this function to create page navigation dots with cat icon
function createPageNavigation() {
  // Create the page navigation container
  const pageNavContainer = document.createElement('div');
  pageNavContainer.className = 'page-navigation';
  
  // Create cat icon container
  const catIconContainer = document.createElement('div');
  catIconContainer.className = 'nav-cat-icon';
  
  // Add the cat SVG to the container
  catIconContainer.innerHTML = `
    <svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" 
         x="0px" y="0px" viewBox="0 0 102.78 123.1" width="30" height="36" xml:space="preserve">
      <style type="text/css">
        .st0{fill-rule:evenodd;clip-rule:evenodd;stroke:#000000;stroke-width:0.216;stroke-miterlimit:2.6131;}
        .cat-icon{fill:#99CCFF;}
      </style>
      <g>
        <path class="st0 cat-icon" d="M53.79,29.73c1.54,0,2.78,1.25,2.78,2.78s-1.25,2.78-2.78,2.78S51,34.05,51,32.52S52.25,29.73,53.79,29.73
        L53.79,29.73z M58.1,118.65l0.06,0h0.31c0.48-0.01,0.57-0.06,0.94-0.3l0.36-0.23c4.77-3.01,7.04-7.46,7.57-12.92
        c0.56-5.8-0.8-12.77-3.26-20.4l0,0c-0.01-0.03-0.02-0.06-0.03-0.09L57.9,62.32c-0.6,0.26-1.19,0.51-1.79,0.75
        c-2.35,0.98-4.77,1.71-7.24,2.22c-2.66,0.57-5.33,0.88-8.01,0.93c-5.72,0.09-11.44-1.04-17.17-3.4l-3.65,14.36
        c-0.7,2.74-1.28,5.17-1.76,7.36c-0.51,2.32-0.97,4.58-1.39,6.88c-0.21,1.13-0.33,1.75-0.45,2.38c-1.33,6.85-2.74,14.15,1.09,19.9
        c1.09,1.64,2.5,2.85,4.2,3.66c1.74,0.82,3.8,1.25,6.16,1.31c0.05,0,0.09,0,0.14,0h2.79V95.37c0-1.18,0.96-2.14,2.14-2.14
        c1.18,0,2.14,0.96,2.14,2.14v23.28h11.49V95.37c0-1.18,0.96-2.14,2.14-2.14c1.18,0,2.14,0.96,2.14,2.14v23.28H58.1L58.1,118.65z
        M14.21,1.45l8.09,7.7c6-2.42,12.05-3.72,18.15-3.78c6.12-0.05,12.26,1.16,18.43,3.77l9.05-8.46c0.86-0.8,2.2-0.76,3,0.1
        c0.38,0.41,0.57,0.93,0.57,1.44h0l0.11,18.06c2.46,4.3,3.92,8.31,4.53,12.07l3.63-1.18c1.12-0.36,2.32,0.25,2.69,1.37
        c0.36,1.12-0.25,2.32-1.37,2.69l-4.61,1.5c0,0.1,0,0.2-0.01,0.29c-0.08,3.19-0.8,6.16-2.04,8.95l2.92,0.39
        c1.17,0.15,1.99,1.22,1.84,2.39c-0.15,1.17-1.22,1.99-2.39,1.84l-4.59-0.61c-0.29,0.44-0.6,0.87-0.92,1.3
        c-2.73,3.67-5.99,6.62-9.57,8.89l6.42,23.33h0c2.62,8.14,4.06,15.66,3.44,22.1c-0.49,5.13-2.25,9.56-5.69,13.05h10.46h0.11v0.01
        c6.98,0,12.4,0,17.7-5.14c3.08-2.98,4.37-6.8,4.26-10.6c-0.06-2.08-0.55-4.17-1.39-6.13c-0.85-1.97-2.05-3.79-3.54-5.33
        c-2.92-3.01-6.97-4.97-11.68-4.83c-1.17,0.03-2.15-0.89-2.19-2.07c-0.03-1.17,0.89-2.15,2.07-2.19c6-0.18,11.15,2.29,14.85,6.11
        c1.87,1.93,3.36,4.19,4.4,6.62c1.04,2.43,1.65,5.06,1.72,7.7c0.15,4.93-1.53,9.88-5.54,13.77c-6.55,6.34-12.71,6.34-20.67,6.34
        v0.01h-0.11H58.56l-0.2,0h-9.12c-0.17,0.04-0.35,0.07-0.53,0.07c-0.18,0-0.36-0.02-0.53-0.07h-14.7
        c-0.17,0.04-0.35,0.07-0.53,0.07c-0.18,0-0.36-0.02-0.53-0.07h-4.4c-0.08,0-0.15,0-0.23-0.01c-2.97-0.07-5.61-0.63-7.89-1.71
        c-2.41-1.14-4.4-2.85-5.94-5.16c-4.79-7.2-3.21-15.37-1.72-23.05c0.19-0.96,0.37-1.91,0.45-2.34c0.42-2.3,0.89-4.61,1.43-7.03
        c0.56-2.54,1.15-5.01,1.78-7.49l3.91-15.37c-4.32-2.53-7.98-5.91-10.53-10.02C9.14,50.51,9,50.28,8.87,50.06l-3.45,0.43
        c-1.17,0.14-2.23-0.69-2.38-1.86c-0.14-1.17,0.69-2.23,1.86-2.38l2.05-0.25c-1.08-2.92-1.64-6.11-1.59-9.53l-3.78-1.23
        c-1.12-0.36-1.73-1.57-1.37-2.69c0.36-1.12,1.57-1.73,2.69-1.37l2.85,0.93c0.6-3.71,1.9-7.65,4.02-11.8l0.84-17.41
        c0.06-1.17,1.05-2.08,2.23-2.03C13.38,0.89,13.85,1.11,14.21,1.45L14.21,1.45L14.21,1.45z M20.37,13.2l-5.73-5.45l-0.64,13.21l0,0
        c-0.01,0.3-0.09,0.6-0.24,0.88c-2.16,4.13-3.41,8.01-3.89,11.6l13.38,4.34c1.12,0.36,1.73,1.57,1.37,2.69
        c-0.36,1.12-1.57,1.73-2.69,1.37L9.66,37.85c0.11,2.74,0.7,5.28,1.67,7.59l11.01-1.37c1.17-0.14,2.23,0.69,2.38,1.86
        c0.14,1.17-0.69,2.24-1.86,2.38l-9.3,1.16c2.23,3.2,5.31,5.85,8.89,7.87c4.01,2.26,8.65,3.72,13.5,4.28
        c4.29,0.5,8.72,0.28,12.99-0.71c1.64-0.4,3.28-0.91,4.92-1.53c5.15-2.03,9.86-5.33,13.55-10.06l-7.62-1.02
        c-1.17-0.15-1.99-1.22-1.84-2.39c0.15-1.17,1.22-1.99,2.39-1.84l9.64,1.29c1.18-2.28,1.93-4.68,2.16-7.24l-11.42,3.7
        c-1.12,0.36-2.32-0.25-2.69-1.37c-0.36-1.12,0.25-2.32,1.37-2.69l12.63-4.1c-0.47-3.57-1.88-7.47-4.38-11.75h0
        c-0.18-0.31-0.29-0.68-0.29-1.07L67.28,7.11l-6.43,6.02c-0.61,0.64-1.58,0.85-2.43,0.47c-6.02-2.74-12-4.01-17.94-3.96
        c-5.94,0.05-11.87,1.43-17.8,3.98l0,0C21.92,13.94,21.01,13.8,20.37,13.2L20.37,13.2z M37.54,39.46c-1.18,0-2.14-0.96-2.14-2.14
        s0.96-2.14,2.14-2.14h6.61c1.18,0,2.14,0.96,2.14,2.14s-0.96,2.14-2.14,2.14h-1.2c0.08,1.25,0.3,2.35,0.63,3.28
        c0.49,1.4,1.23,2.42,2.12,3.07c0.87,0.64,1.91,0.97,3.03,0.99c0.86,0.02,1.77-0.14,2.71-0.47c1.11-0.39,2.33,0.19,2.72,1.3
        c0.39,1.11-0.19,2.33-1.3,2.72c-1.41,0.5-2.83,0.74-4.22,0.71c-2-0.04-3.87-0.63-5.46-1.81c-0.79-0.59-1.51-1.31-2.13-2.17
        c-0.55,0.89-1.2,1.59-1.95,2.15c-2.49,1.85-5.65,1.86-9.07,1.38c-1.17-0.16-1.98-1.24-1.82-2.4c0.16-1.17,1.24-1.98,2.4-1.82
        c2.44,0.34,4.61,0.41,5.93-0.58c1.2-0.9,1.98-2.8,2.09-6.35H37.54L37.54,39.46z M28.12,29.73c1.54,0,2.78,1.25,2.78,2.78
        s-1.25,2.78-2.78,2.78c-1.54,0-2.78-1.25-2.78-2.78S26.58,29.73,28.12,29.73L28.12,29.73z"/>
      </g>
    </svg>
  `;
  
  // Add page navigation dots after the cat icon
  const dotsContainer = document.createElement('div');
  dotsContainer.className = 'page-dots-container';
  dotsContainer.innerHTML = `
    <div class="page-dot active" data-page="1"></div>
    <div class="page-dot" data-page="2"></div>
  `;
  
  // Append cat icon and dots to the navigation container
  pageNavContainer.appendChild(catIconContainer);
  pageNavContainer.appendChild(dotsContainer);
  document.body.appendChild(pageNavContainer);
  
  // Add click event listeners to dots
  pageNavContainer.querySelectorAll('.page-dot').forEach(dot => {
    dot.addEventListener('click', function() {
      const targetPage = this.getAttribute('data-page');
      if (targetPage === '1') {
        if (!document.querySelector('.container').classList.contains('page2-container')) {
          return; // Already on page 1
        }
        location.reload(); // Go back to page 1
      } else if (targetPage === '2') {
        if (document.querySelector('.container').classList.contains('page2-container')) {
          return; // Already on page 2
        }
        // Trigger journey button click to navigate to page 2
        document.getElementById('journey-begin-btn')?.click();
      }
    });
  });
}

// Enhanced scroll detection with pause at the bottom before transitioning
function setupScrollToNextPage() {
  // Only apply this on the main page
  if (document.querySelector('.container.page2-container')) {
    return;
  }
  
  // Track navigation and bottom states
  let navigationTriggered = false;
  let isAtBottomState = false;
  let bottomTimer = null;
  
  // Function to handle navigation triggering
  function triggerNavigation() {
    if (navigationTriggered) return;
    
    navigationTriggered = true;
    const container = document.querySelector('.container');
    container.classList.add('page-transition');
    
    setTimeout(() => {
      const journeyBtn = document.getElementById('journey-begin-btn');
      if (journeyBtn) {
        journeyBtn.click();
      }
    }, 400);
  }
  
  // Check if we're near the bottom of the page
  function isNearBottom() {
    const scrollPosition = window.scrollY + window.innerHeight;
    const pageHeight = document.documentElement.scrollHeight;
    // Very strict requirement - must be very close to the bottom
    return scrollPosition >= pageHeight - 10;
  }
  
  // Show a visual indicator that we're at the bottom
  function showBottomIndicator() {
    // First clear any previous indicator
    hideBottomIndicator();
    
    const arrowNav = document.querySelector('.arrow-navigation');
    if (arrowNav) {
      arrowNav.classList.add('at-bottom');
      arrowNav.querySelector('.arrow-down')?.classList.add('pulse');
    }
  }
  
  // Hide the bottom indicator
  function hideBottomIndicator() {
    const arrowNav = document.querySelector('.arrow-navigation');
    if (arrowNav) {
      arrowNav.classList.remove('at-bottom');
      arrowNav.querySelector('.arrow-down')?.classList.remove('pulse');
    }
  }
  
  // Handle reaching the bottom - enter the "at bottom" state
  function handleAtBottom() {
    if (isAtBottomState) return;
    
    isAtBottomState = true;
    showBottomIndicator();
    
    // Auto-reset the bottom state if user scrolls away
    bottomTimer = setTimeout(() => {
      isAtBottomState = false;
      hideBottomIndicator();
    }, 5000); // Reset after 5 seconds if no action
  }
  
  // Scroll events with pause at bottom
  window.addEventListener('scroll', function() {
    if (navigationTriggered) return;
    
    if (isNearBottom()) {
      handleAtBottom();
    } else {
      // Reset bottom state when scrolling away
      if (isAtBottomState) {
        isAtBottomState = false;
        clearTimeout(bottomTimer);
        hideBottomIndicator();
      }
    }
  }, { passive: true });
  
  // Two-stage wheel events - first stop at bottom, then require another scroll
  window.addEventListener('wheel', function(e) {
    if (navigationTriggered) return;
    
    if (isNearBottom()) {
      // First recognize we're at the bottom
      if (!isAtBottomState) {
        handleAtBottom();
        return;
      }
      
      // Only if we're already at bottom state AND user scrolls down again
      if (isAtBottomState && e.deltaY > 100) {
        triggerNavigation();
      }
    }
  }, { passive: true });
  
  // Two-stage touch events
  let touchStartY = 0;
  
  window.addEventListener('touchstart', function(e) {
    touchStartY = e.touches[0].clientY;
  }, { passive: true });
  
  window.addEventListener('touchend', function(e) {
    if (navigationTriggered) return;
    
    const touchEndY = e.changedTouches[0].clientY;
    const touchDiff = touchStartY - touchEndY;
    
    if (isNearBottom()) {
      // First recognize we're at the bottom
      if (!isAtBottomState) {
        handleAtBottom();
        return;
      }
      
      // Only if we're already at bottom AND user swipes substantially
      if (isAtBottomState && touchDiff > 80) {
        triggerNavigation();
      }
    }
  }, { passive: true });
}

// Initialize the application with device detection
async function initApp() {
  try {
    // 在應用載入時檢測裝置類型並添加相應的類到 body
    const device = deviceDetection();
    document.body.classList.add(device.deviceType);
    
    if (device.isTouch) {
      document.body.classList.add('touch-device');
    }
    
    if (device.orientation) {
      document.body.classList.add(device.orientation);
    }
    
    // 監聽方向變化
    window.addEventListener('resize', () => {
      const currentDevice = deviceDetection();
      
      // 更新方向類
      document.body.classList.remove('landscape', 'portrait');
      document.body.classList.add(currentDevice.orientation);
      
      // 更新裝置類型類（如果發生變化）
      if (!document.body.classList.contains(currentDevice.deviceType)) {
        document.body.classList.remove('mobile', 'tablet', 'desktop');
        document.body.classList.add(currentDevice.deviceType);
      }
    });

    await init();
    
    document.getElementById("greet-btn")?.addEventListener("click", () => greet("WebAssembly"));
    
    setupContactCardCopy();
    
    // 設定問候訊息，根據裝置類型調整問候長度
    const greetingElement = document.querySelector('.playlist-header');
    if (greetingElement) {
      const device = deviceDetection();
      const greetingPrefix = getTimeBasedGreeting();
      
      // Use same format for all devices
      const greetingMessages = [
        "Welcome to my collection",
        "Discover something new today",
        "Thanks for visiting",
        "Explore today's features",
        "Happy to see you here"
      ];
      
      // Same greeting format for all devices
      greetingElement.textContent = `${greetingPrefix}, ${
        greetingMessages[Math.floor(Math.random() * greetingMessages.length)]
      }`;
    }
    
    // Try to load repos from cache first
    const storageKey = `github_repos_${GITHUB_USERNAME}`;
    let repos;
    
    try {
      repos = JSON.parse(localStorage.getItem(storageKey) || "null");
    } catch (e) {
      console.error("Error parsing cached data:", e);
    }
    
    // Fetch if no cache or cache error
    if (!repos) {
      repos = await fetch_github_repos(GITHUB_USERNAME);
      
      // Cache the results
      if (Array.isArray(repos)) {
        localStorage.setItem(storageKey, JSON.stringify(repos));
      }
    }
    
    if (!Array.isArray(repos) || repos.length === 0) {
      document.getElementById("repo-container").innerHTML = 
        "<div class='loading'>No repositories found</div>";
      return;
    }
    
    allRepositories = repos;
    displayCurrentRepo();
    initTouchSwipe();
    resetAutoSlideTimer();
    setupJourneyButton();
    
    // Initialize typing animation with slight delay
    clearTimeout(window.typingAnimationTimer);
    window.typingAnimationTimer = setTimeout(setupTypingAnimation, 1000);
    
    // Add page navigation dots
    createPageNavigation();
    
    // Setup scroll to next page functionality
    setupScrollToNextPage();
    
  } catch (error) {
    document.getElementById("repo-container").innerHTML = 
      `<div class="repo-error"><p>Failed to initialize: ${error.message || error}</p></div>`;
  }
}

// Start the application
initApp();