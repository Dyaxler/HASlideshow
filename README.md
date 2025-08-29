# HASlideshow
_A background slideshow for your [Home Assistant](https://www.home-assistant.io/) dashboard._

This script shows random photos from your own collection as a background for your HA dashboard.

Useful to show your preferred dashboard on a clean Raspberry Pi Touch Display 2. Did I mention that I HATE Amazon Echo Shows?

<img width="1280" height="720" alt="screenshot" src="https://github.com/user-attachments/assets/31b90650-5f84-4289-bbb1-e5bdf429fff2" />

## Manual install
1. Download the `haslideshow.js` script and place it into the `www/HASlideshow` folder of your Home Assistant installation.

2. In Home Assistant, navigate to `Settings` > `Dashboards`, open the three-dots menu and select `resources`; alternatively, point your browser to `/config/lovelace/resources`.

3. Add a new resource as a _javascript module_ pointing to the `/local/HASlideshow/haslideshow.js` URL.

## Setup your HASlideshow Theme
1. Using File editor in Home Assistant, place the following code into your `themes.yaml` file; don't forget to update the values with your preference to use Double-Tap or your own updateInterval and transitionDuration values. Double check your `configuration.yaml` to see which "theme" file is being loaded/referenced. You might not be using `themes.yaml` as your main theme config file. You'll know you did it correctly in a later step when we go to apply the `HASlideshow` theme in your Lovelace Dashboard settings. If you've already created and are using your own custom theme for a specific Dashboard, then you can add the block below to the bottom of your custom theme; just omit the `HASlideshow:` line and add the raw VAR's to your custom theme file.

```
HASlideshow:
  # This enables HASlideshow
  bs-slideshow-enabled: enabled
  
  # Double-tap the background to force a change
  bs-doubletap-enabled: enabled

  # This value is in seconds
  bs-updateInterval: 600

  # This value is in milliseconds
  bs-transitionDuration: 1000
```

2. After the theme file has been saved go to `Developer Tools > Actions`. In the `Action field` hit the drop down and search for `Reload themes` then click `Perform action`. This will reload your theme files without having to reboot Home Assistant.

3. Navigate to the Lovelace Dashboard tab you wish to run HASlideshow and click the Pencil Icon (Edit dashboard).

4. Again, click the Pencil Icon next to the name or icon of the tab you're on (Edit view).

5. You should be looking at a bunch of settings for your Dashboard. Find the field marked `Theme` and click the drop-down arrow. If you've done step 1 correctly, you should see `HASlideshow` listed here. Select it and click `Save`.

You should immediately see one of the background images pop up and at first, they will rotate every 10 seconds (fallback default). This is by design until you fully refresh your browser (default 600 seconds = 5 min). Use `CTRL + SHIFT + R` to bypass the cache (works with most Windows OS Browsers - not sure what key strokes are on the Mac) and apply the CSS Vars with your preferred settings. This is sometimes necessary to perform this step if you're not immediately seeing images appear or if the Double-Tap feature doesn't work. Certain browsers are persnickety.

## Features
* Double tap anywhere on the screen to skip to the next image (Works with either a mouse pointer or a finger on touch screens).
* Specify your own Background Update Interval (in seconds).
* Specify your own Transition Animation Duration (in milliseconds).

## Where do I put the images?
1. Create a `backgrounds` folder under `www/HASlideshow`
2. Drop your images there
3. Rename the images according to the following naming convention:

```
  0.jpg
  1.jpg
  ...
```

Make sure that the numerical sequence has no gaps. Or you can download the 10 images I've provided in this repo. It just needs to be in a sub-directory below the location of the `haslideshow.js` file.

## Troubleshooting
Any change to the JS Script or the contents of the `www` folder might require clearing the cache of your browser or the companion mobile app. I've never had to do this if I made changes to the theme file and reloaded it. A quick refresh should be sufficient.
