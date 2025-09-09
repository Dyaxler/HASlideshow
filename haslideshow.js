// Formatting for debug output
function info(obj) {
  console.log(
    '%c Background Slideshow %c ' + (typeof obj == "string" ? obj : JSON.stringify(obj)),
    'background: black; font-weight: bold; padding: 2px; border-radius: 2px',
    'background: transparent; font-weight: normal; padding: 0px; border-radius: 0px'
  );
}

function debug(obj) {
  console.debug(
    '%c Background Slideshow %c ' + (typeof obj == "string" ? obj : JSON.stringify(obj)),
    'background: black; font-weight: bold; padding: 2px; border-radius: 2px',
    'background: transparent; font-weight: normal; padding: 0px; border-radius: 0px'
  );
}

/////////////////////////////////////////////////////////////////
// This code block randomizes the background images. Mostly...
let imagesCount, seed;
const getPrimes = (min, max) => {
  const result = Array(max + 1)
    .fill(0)
    .map((_, i) => i);
  for (let i = 2; i <= Math.sqrt(max + 1); i++) {
    for (let j = i ** 2; j < max + 1; j += i) delete result[j];
  }
  return Object.values(result.slice(Math.max(min, 2)));
};
const getRandNum = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1) + min);
};
const getRandPrime = (min, max) => {
  const primes = getPrimes(min, max);
  return primes[getRandNum(0, primes.length - 1)];
};
seed = getRandPrime(1, 100000);
debug("Seed initialized: " + seed);
/////////////////////////////////////////////////////////////////

// Count the number of image files
function checkNumber(n, callback) {
  var http = new XMLHttpRequest();
  http.open('HEAD', path + n + ".jpg");
  http.onreadystatechange = function () {
    if (this.readyState == this.DONE) {
      debug("Checked image " + n + ".jpg, exists: " + (this.status != 404));
      callback(this.status != 404);
    }
  };
  http.send();
}

let upward = true;
function recur(n, interval) {
  checkNumber(n, function (exists) {
    debug("interval: " + interval + " n: " + n + (exists ? " exists" : " not found"));
    upward = upward && exists;
    if (upward) interval *= 2;
    else interval /= 2;
    if (exists) {
      if (interval >= 1) recur(n + interval, interval);
      else {
        imagesCount = n + 1;
        info(imagesCount + " pics available");
        debug("Images count set, starting slideshow");
        bs_start();
      }
    } else {
      if (interval >= 1) recur(n - interval, interval);
      else {
        imagesCount = n;
        info(imagesCount + " pics available");
        debug("Images count set, starting slideshow");
        bs_start();
      }
    }
  });
}

// Path where images are stored. NOTE: rename image files to 0.jpg, 1.jpg sequentially
const path = "/local/HASlideshow/backgrounds/";

checkNumber(0, function (exists) {
  if (exists) recur(2, 1);
  else {
    info("No local images found in HASlideshow/backgrounds, slideshow disabled");
  }
});

function bs_clearBackground() {
  const elem = bs_getBackgroundElement();
  debug("bs_clearBackground called");

  if (elem) {
    elem.style.setProperty('--lovelace-background', 'none', 'important');
    debug("Cleared background style");
  } else {
    debug("No elem for clearing theme background");
  }

  // Remove transition backgrounds from the container
  if (elem) {
    const bgOld = elem.querySelector('#bs-bg-old');
    if (bgOld) {
      bgOld.remove();
      debug("Removed bg-old layer");
    } else {
      debug("No bg-old layer to remove");
    }
    const bgNew = elem.querySelector('#bs-bg-new');
    if (bgNew) {
      bgNew.remove();
      debug("Removed bg-new layer");
    } else {
      debug("No bg-new layer to remove");
    }
  } else {
    debug("No elem for removing layers");
  }
}

////////////////////////////////////////////////////////////////////////////////////////////////////////
// This path might need updating from time to time after an HA update. No matter where the theme is
// applied, (Globally, by User, or by Dashboard) this should find the CSS vars injected by the
// HASlideshow theme. The deepest element where a theme could be applied are the individual Lovelace
// dashboards so we just need to make sure the path crawls deep enough to find the <hui-view-container>.
function bs_getBackgroundElement() {
  try {
    const elem = document.querySelector("body > home-assistant")
      .shadowRoot
      .querySelector("home-assistant-main")
      .shadowRoot
      .querySelector("ha-drawer > partial-panel-resolver > ha-panel-lovelace")
      .shadowRoot
      .querySelector("hui-root")
      .shadowRoot
      .querySelector("hui-view-container#view");
    debug("bs_getBackgroundElement: " + (elem ? "found" : "not found"));
    return elem;
  } catch (e) {
    debug("Error accessing background element DOM: " + e.message);
    return null;
  }
}
////////////////////////////////////////////////////////////////////////////////////////////////////////

function bs_checkBackgroundElement(featureVar) {
  const elem = bs_getBackgroundElement();

  if (!elem) {
    let base = featureVar.replace('--bs-', '').replace('-enabled', '');
    if (base === 'doubletap') base = 'double-tap';
    debug(`Background element not found, cannot check ${base}`);
    return null;
  }

  const currentView = elem.querySelector('hui-view');
  if (!currentView) {
    let base = featureVar.replace('--bs-', '').replace('-enabled', '');
    if (base === 'doubletap') base = 'double-tap';
    debug(`Current view not found, cannot check ${base}`);
    return null;
  }

  const value = getComputedStyle(currentView).getPropertyValue(featureVar).trim();
  let base = featureVar.replace('--bs-', '').replace('-enabled', '');
  if (base === 'doubletap') base = 'double-tap';
  const featureName = base.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('-');

  debug(`Retrieved ${featureName}: ${value}`);
  return value;
}

///////////////////////////////////////////////////////////////////////////////////////////////////
// If the theme doesn't specify these values it falls back to default to prevent errors.

// This retrieves how often the background changes images - default 10 seconds
let updateIntervalValue = bs_checkBackgroundElement('--bs-updateInterval');
let updateInterval = updateIntervalValue ? parseInt(updateIntervalValue, 10) : 10;
debug("Initial updateInterval: " + updateInterval);

// This retrieves the speed of the image transition animation - default 1000 milliseconds
let transitionDurationValue = bs_checkBackgroundElement('--bs-transitionDuration');
let transitionDuration = transitionDurationValue ? parseInt(transitionDurationValue, 10) : 1000;
debug("Initial transitionDuration: " + transitionDuration);
///////////////////////////////////////////////////////////////////////////////////////////////////

let current;
let previouslyEnabled = false;
function bs_ensureBackgroundLayers() {
  const view = bs_getBackgroundElement();
  debug("bs_ensureBackgroundLayers called");

  if (!view) return;

  // Override any theme background
  view.style.setProperty('--lovelace-background', 'none', 'important');
  debug("Overrode theme background");

  let bgOld = view.querySelector('#bs-bg-old');
  let bgNew = view.querySelector('#bs-bg-new');

  if (!bgOld) {
    bgOld = document.createElement('div');
    bgOld.id = 'bs-bg-old';
    bgOld.style.position = 'fixed';
    bgOld.style.top = '0';
    bgOld.style.left = '0';
    bgOld.style.width = '100%';
    bgOld.style.height = '100%';
    bgOld.style.backgroundSize = 'cover';
    bgOld.style.backgroundPosition = 'center';
    bgOld.style.backgroundRepeat = 'no-repeat';
    bgOld.style.transition = `opacity ${transitionDuration / 1000}s ease-in-out`;
    bgOld.style.opacity = '0';
    bgOld.style.zIndex = '-2';
    // Anti-flicker for transitions
    bgOld.style.webkitBackfaceVisibility = 'hidden';
    bgOld.style.backfaceVisibility = 'hidden';
    // Hardware acceleration
    bgOld.style.transform = 'translate3d(0,0,0)';
    // GPU optimization for opacity changes
    bgOld.style.willChange = 'opacity';
    view.insertBefore(bgOld, view.firstChild);
    debug("Created bg-old layer");
  } else {
    debug("bg-old layer already exists");
    // Ensure anti-flicker styles on existing layer
    bgOld.style.webkitBackfaceVisibility = 'hidden';
    bgOld.style.backfaceVisibility = 'hidden';
    bgOld.style.transform = 'translate3d(0,0,0)';
    bgOld.style.willChange = 'opacity';
  }

  if (!bgNew) {
    bgNew = document.createElement('div');
    bgNew.id = 'bs-bg-new';
    bgNew.style.position = 'fixed';
    bgNew.style.top = '0';
    bgNew.style.left = '0';
    bgNew.style.width = '100%';
    bgNew.style.height = '100%';
    bgNew.style.backgroundSize = 'cover';
    bgNew.style.backgroundPosition = 'center';
    bgNew.style.backgroundRepeat = 'no-repeat';
    bgNew.style.transition = `opacity ${transitionDuration / 1000}s ease-in-out`;
    bgNew.style.opacity = '0';
    bgNew.style.zIndex = '-1';
    // Anti-flicker for transitions
    bgNew.style.webkitBackfaceVisibility = 'hidden';
    bgNew.style.backfaceVisibility = 'hidden';
    // Hardware acceleration
    bgNew.style.transform = 'translate3d(0,0,0)';
    // GPU optimization for opacity changes
    bgNew.style.willChange = 'opacity';
    view.insertBefore(bgNew, view.firstChild);
    debug("Created bg-new layer");
  } else {
    debug("bg-new layer already exists");
    // Ensure anti-flicker styles on existing layer
    bgNew.style.webkitBackfaceVisibility = 'hidden';
    bgNew.style.backfaceVisibility = 'hidden';
    bgNew.style.transform = 'translate3d(0,0,0)';
    bgNew.style.willChange = 'opacity';
  }

  // Update transition duration if changed
  [bgOld, bgNew].forEach(bg => {
    if (bg) {
      bg.style.transition = `opacity ${transitionDuration / 1000}s ease-in-out`;
    }
  });
  debug("Updated transition styles on layers");
}

function bs_transitionToNewBackground(url, isInitial = false) {
  const bgElement = bs_getBackgroundElement();
  if (!bgElement) {
    debug("No bgElement for transition");
    return;
  }
  const bgOld = bgElement.querySelector('#bs-bg-old');
  const bgNew = bgElement.querySelector('#bs-bg-new');
  debug("bs_transitionToNewBackground called for: " + url + ", isInitial: " + isInitial);

  if (!bgOld || !bgNew) {
    debug("Missing bgOld or bgNew, aborting transition");
    return;
  }

  // Preload image
  const img = new Image();
  img.src = url;
  img.onload = () => {
    debug("Image preloaded successfully");
    if (isInitial) {
      // For initial: fade in on bgOld only, no cross-fade/swap
      bgOld.style.backgroundImage = `url("${url}")`;
      bgOld.style.opacity = '1';
      debug(`Initial fade-in to background: ${url}`);
    } else {
      // Standard cross-fade: set bgNew and fade in
      bgNew.style.backgroundImage = `url("${url}")`;
      bgNew.style.opacity = '1';
      debug(`Starting cross-fade transition to new background: ${url}`);

      // After transition, swap layers
      setTimeout(() => {
        bgOld.style.backgroundImage = `url("${url}")`;
        bgOld.style.opacity = '1';
        bgNew.style.opacity = '0';
        debug(`Completed cross-fade, swapped to ${url}`);
      }, transitionDuration);
    }
  };
  img.onerror = () => {
    debug("Image preload failed for: " + url);
  };
}

function bs_update(isNavigation = false) {
  debug("bs_update called, isNavigation: " + isNavigation);
  const bgElement = bs_getBackgroundElement();

  if (!bgElement) {
    debug("Background element not found, skipping update");
    return;
  }

  // Update interval and duration from current view
  const currentUpdateIntervalValue = bs_checkBackgroundElement('--bs-updateInterval');
  if (currentUpdateIntervalValue) {
    const newInterval = parseInt(currentUpdateIntervalValue, 10);
    if (newInterval && newInterval !== updateInterval) {
      updateInterval = newInterval;
      debug(`Updated interval to ${updateInterval}`);
      // Note: Interval is already running; to change, would need to restart timer, but for simplicity, keep running
    }
  }

  const currentTransitionDurationValue = bs_checkBackgroundElement('--bs-transitionDuration');
  if (currentTransitionDurationValue) {
    const newDuration = parseInt(currentTransitionDurationValue, 10);
    if (newDuration && newDuration !== transitionDuration) {
      transitionDuration = newDuration;
      debug(`Updated transition duration to ${transitionDuration}`);
    }
  }

  const currentlyEnabled = bs_checkBackgroundElement('--bs-slideshow-enabled') === 'enabled';
  debug("Currently enabled: " + currentlyEnabled + ", previouslyEnabled: " + previouslyEnabled);

  if (currentlyEnabled) {
    debug("Slideshow enabled in theme, performing update");
    bs_ensureBackgroundLayers();

    const bgOld = bgElement.querySelector('#bs-bg-old');
    const bgNew = bgElement.querySelector('#bs-bg-new');

    let url;
    let shouldCycleAndTransition = true;
    let isInitialSetup = (current === undefined);

    if (isNavigation) {
      if (previouslyEnabled && current !== undefined && imagesCount) {
        // Resume previous image instantly without blanking or transition
        if (bgOld && bgNew && bgOld.style.opacity === '1' && bgNew.style.opacity === '0') {
          // Layers already in correct state (persisted from previous tab) – no need to re-set
          debug("Navigation resume: layers already correct, skipping re-set");
          shouldCycleAndTransition = false;
          isInitialSetup = false;
        } else {
          // Fallback: set previous image instantly (omit cache buster for speed/cache hit)
          const url = path + current + ".jpg";  // No ?t= for instant resume
          if (bgOld && bgNew) {
            bgOld.style.backgroundImage = `url("${url}")`;
            bgOld.style.opacity = '1';
            bgNew.style.opacity = '0';
          }
          debug("Navigation resume: set previous image (fallback)");
          shouldCycleAndTransition = false;
          isInitialSetup = false;
        }
      } else {
        // Fresh enable on navigation: blank and prepare for initial
        if (bgOld) bgOld.style.opacity = '0';
        if (bgNew) bgNew.style.opacity = '0';
        debug("Blanking for fresh enable on navigation");
        isInitialSetup = true;
      }
    } else {
      // Non-navigation (interval, initial, doubletap): no special blanking, proceed to cycle/transition
      debug("Non-navigation update: proceeding to cycle and transition");
    }

    if (shouldCycleAndTransition && imagesCount) {
      if (current === undefined) {
        current = Math.floor(Math.random() * imagesCount);
        debug(`Initialized current to ${current}`);
      } else {
        current = (current + seed) % imagesCount;
      }
      url = path + current + ".jpg?t=" + Date.now(); // Cache buster
      debug(`Cycling to image ${current}`);
      // Transition to new (or initial)
      bs_transitionToNewBackground(url, isInitialSetup);
      info("Updated background to " + url);
    } else if (shouldCycleAndTransition) {
      debug("No images available or condition not met, skipping cycle/transition");
    }

    previouslyEnabled = true;
  } else {
    debug("Slideshow not enabled in theme, clearing background");
    bs_clearBackground();
    previouslyEnabled = false;
  }
}

var bs_lastTap = 0;
function bs_handle_tap(e) {
  const now = Date.now();
  if (now - bs_lastTap < 500) {
    // detect double tap
    debug("Double tap event - manual update");
    if (bs_checkBackgroundElement('--bs-doubletap-enabled') === 'enabled' && bs_checkBackgroundElement('--bs-slideshow-enabled') === 'enabled') {
      bs_update();
    } else {
      debug("Double tap ignored - slideshow or double-tap not enabled");
    }
  }
  bs_lastTap = now;
}

var bs_tap_handler = null;
function bs_register_tap() {
  if (bs_tap_handler == null) {
    bs_tap_handler = 1;
    document.body.addEventListener('pointerdown', bs_handle_tap);
    debug("Registered tap handler");
  } else {
    debug("Tap handler already registered");
  }
}

let intervalId;
function bs_start() {
  debug("bs_start called");
  bs_register_tap();
  bs_update(); // Initial immediate update

  if (intervalId) {
    clearInterval(intervalId);
    debug("Cleared existing interval");
  }
  intervalId = setInterval(() => {
    debug("Interval update event");
    bs_update(false);
  }, updateInterval * 1000);

  debug(`Started interval updates every ${updateInterval} seconds`);

  // Listen for HA navigation event
  window.addEventListener('location-changed', () => {
    debug("Detected navigation (location-changed event)");
    // Defer to allow DOM to update – increased to 100ms for reliability
    setTimeout(() => bs_update(true), 100);
  });
  debug("HA location-changed listener registered");

  // Additional listener for popstate (for synthetic navigation like swipes)
  window.addEventListener('popstate', () => {
    debug("Detected popstate event (likely swipe navigation)");
    // Defer to allow DOM to update – increased to 100ms for reliability
    setTimeout(() => bs_update(true), 100);
  });
  debug("popstate listener registered");
}
