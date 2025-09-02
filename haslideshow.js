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
/////////////////////////////////////////////////////////////////

// Count the number of image files
function checkNumber(n, callback) {
  var http = new XMLHttpRequest();
  http.open('HEAD', path + n + ".jpg");
  http.onreadystatechange = function () {
    if (this.readyState == this.DONE) {
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

  if (elem) {
    elem.style.setProperty('--lovelace-background', 'none', 'important');
    debug("Cleared background style");
  }

  // Also hide transition backgrounds
  const bgOld = bs_getBackgroundElement()?.querySelector('#bs-bg-old');
  const bgNew = bs_getBackgroundElement()?.querySelector('#bs-bg-new');

  if (bgOld) bgOld.style.opacity = '0';
  if (bgNew) bgNew.style.opacity = '0';
}

////////////////////////////////////////////////////////////////////////////////////////////////////////
// This path might need updating from time to time after an HA update. No matter where the theme is
// applied, (Globally, by User, or by Dashboard) this should find the CSS vars injected by the
// HASlideshow theme. The deepest element where a theme could be applied are the individual Lovelace
// dashboards so we just need to make sure the path crawls deep enough to find the <hui-view-container>.
function bs_getBackgroundElement() {
  try {
    return document.querySelector("body > home-assistant")
      .shadowRoot
      .querySelector("home-assistant-main")
      .shadowRoot
      .querySelector("ha-drawer > partial-panel-resolver > ha-panel-lovelace")
      .shadowRoot
      .querySelector("hui-root")
      .shadowRoot
      .querySelector("hui-view-container#view");
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

  const value = getComputedStyle(elem).getPropertyValue(featureVar).trim();
  let base = featureVar.replace('--bs-', '').replace('-enabled', '');
  if (base === 'doubletap') base = 'double-tap';
  const featureName = base.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('-');

  debug(`Retrieved ${featureName}: ${value}`);
  return value;
}

///////////////////////////////////////////////////////////////////////////////////////////////////
// If the theme doesn't specify these values it falls back to default to prevent errors.

// This retrieves how often the background changes images - default 10 seconds
const updateIntervalValue = bs_checkBackgroundElement('--bs-updateInterval');
const updateInterval = updateIntervalValue ? parseInt(updateIntervalValue, 10) : 10;

// This retrieves the speed of the image transition animation - default 1000 milliseconds
const transitionDurationValue = bs_checkBackgroundElement('--bs-transitionDuration');
const transitionDuration = transitionDurationValue ? parseInt(transitionDurationValue, 10) : 1000;
///////////////////////////////////////////////////////////////////////////////////////////////////

let current;
function bs_ensureBackgroundLayers() {
  const view = bs_getBackgroundElement();

  if (!view) return;

  // Override any theme background
  view.style.setProperty('--lovelace-background', 'none', 'important');

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
    view.insertBefore(bgOld, view.firstChild);
    debug("Created bg-old layer");
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
    view.insertBefore(bgNew, view.firstChild);
    debug("Created bg-new layer");
  }
}

function bs_setInitialBackground(url) {
  const bgOld = bs_getBackgroundElement()?.querySelector('#bs-bg-old');

  if (bgOld) {
    bgOld.style.backgroundImage = `url("${url}")`;
    bgOld.style.opacity = '1';
    debug(`Set initial background on old layer: ${url}`);
  }
}

function bs_transitionToNewBackground(url) {
  const bgOld = bs_getBackgroundElement()?.querySelector('#bs-bg-old');
  const bgNew = bs_getBackgroundElement()?.querySelector('#bs-bg-new');

  if (!bgOld || !bgNew) return;

  // Preload image
  const img = new Image();
  img.src = url;
  img.onload = () => {
    bgNew.style.backgroundImage = `url("${url}")`;
    bgNew.style.opacity = '1';
    debug(`Starting transition to new background: ${url}`);

    // After transition, swap layers
    setTimeout(() => {
      bgOld.style.backgroundImage = `url("${url}")`;
      bgNew.style.opacity = '0';
      debug(`Completed transition, swapped to ${url}`);
    }, transitionDuration);
  };
}

function bs_update() {
  const bgElement = bs_getBackgroundElement();

  if (bgElement) {
    if (bs_checkBackgroundElement('--bs-slideshow-enabled') === 'enabled') {
      debug("Slideshow enabled in theme, performing update");
      bs_ensureBackgroundLayers();

      let url;
      if (imagesCount) {
        if (current === undefined) {
          current = Math.floor(Math.random() * imagesCount);
          debug(`Initialized current to ${current}`);
        }
        current = (current + seed) % imagesCount;
        url = path + current + ".jpg?t=" + Date.now(); // Cache buster
        debug(`Cycling to image ${current}`);
      }

      if (url) {
        if (bgElement.querySelector('#bs-bg-old')?.style.opacity !== '1') {
          // First time or after disable, set initial without transition
          bs_setInitialBackground(url);
        } else {
          // Transition
          bs_transitionToNewBackground(url);
        }
        info("Updated background to " + url);
      } else {
        debug("No images available, skipping update");
      }
    } else {
      debug("Slideshow not enabled in theme, clearing background");
      bs_clearBackground();
    }
  } else {
    debug("Background element not found, skipping update");
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
  }
}

let intervalId;
function bs_start() {
  bs_register_tap();
  bs_update(); // Initial immediate update

  intervalId = setInterval(() => {
    debug("Interval update event");
    bs_update();
  }, updateInterval * 1000);

  debug(`Started interval updates every ${updateInterval} seconds`);

  // Listen for navigation to re-check enablement
  window.addEventListener('location-changed', () => {
    debug("Detected navigation (location-changed event)");
    bs_update();
  });
}
